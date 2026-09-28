import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ALLOWED_CAPITAL,
  ALLOWED_DURATIONS,
  ALLOWED_SYMBOLS,
  DEFAULT_SYMBOL,
  MATCH_DURATION_SECONDS,
  isRoomId,
  roomNameError,
} from "@/lib/match/rules";

const ALLOWED_CAPITAL_SET = new Set(ALLOWED_CAPITAL);
const ALLOWED_DURATION = new Set(ALLOWED_DURATIONS);

type CreateRoomRequest = {
  symbol?: unknown;
  startingCapital?: unknown;
  durationSeconds?: unknown;
  name?: unknown;
  invitedUserId?: unknown; // a friend's id, or empty for a public room
};

type DeleteRoomRequest = {
  roomId?: unknown;
};

type MatchRoom = {
  id: string;
  name: string | null;
  player_one_user_id: string;
  player_two_user_id: string | null;
  status: string;
  symbol: string;
  starting_capital: number | string;
  duration_seconds: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

function getRoomDuration(room: Pick<MatchRoom, "starts_at" | "ends_at">) { // only need starts_at and ends_at no need to pass the wholeobj
  if (!room.starts_at || !room.ends_at) {
    return MATCH_DURATION_SECONDS;
  }

  const startsAt = new Date(room.starts_at).getTime();
  const endsAt = new Date(room.ends_at).getTime();
  const durationSeconds = Math.round((endsAt - startsAt) / 1000); // convert milliseconds to seconds

  return Number.isFinite(durationSeconds) && durationSeconds > 0
    ? durationSeconds
    : MATCH_DURATION_SECONDS;
}

function getRoomAgeMinutes(createdAt: string) {
  const ageMs = Date.now() - new Date(createdAt).getTime();

  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return 0;
  }

  return Math.max(0, Math.round(ageMs / 60000));
}

function formatRoom(
  room: MatchRoom,
  currentUserId: string,
  creatorProfiles: Map<string, { username: string; avatar_url: string | null }>
) {
  const isOwner = room.player_one_user_id === currentUserId;
  const profile = creatorProfiles.get(room.player_one_user_id);
  const creatorName = profile?.username ?? room.player_one_user_id.slice(0, 8);
  const creatorAvatar = profile?.avatar_url ?? null;

  return {
    id: room.id,
    name: room.name?.trim() || (isOwner ? "Your Room" : `${creatorName}'s Room`),
    creator: isOwner ? "you" : creatorName,
    creator_avatar_url: creatorAvatar,
    players: room.player_two_user_id ? 2 : 1,
    capacity: 2,
    ageMin: getRoomAgeMinutes(room.created_at),
    duration: room.duration_seconds ?? getRoomDuration(room),
    capital: Number(room.starting_capital),
    symbol: room.symbol,
    ownedByCurrentUser: isOwner,
  };
}

function getStartingCapital(value: unknown) {
  const capital = Number(value);

  if (!Number.isFinite(capital) || !ALLOWED_CAPITAL_SET.has(capital)) {
    return null;
  }

  return capital;
}

// Match length: not sent at all = the default (1 minute). Anything else must
// be one of the allowed lengths, or we return null and the request gets a 400
// (a bad value is refused, not silently swapped for the default).
function getDurationSeconds(value: unknown) {
  if (value === undefined) {
    return MATCH_DURATION_SECONDS;
  }

  const duration = Number(value);

  if (!Number.isFinite(duration) || !ALLOWED_DURATION.has(duration)) {
    return null;
  }

  return duration;
}

// Find the match this user is currently playing, if any. "Playing" means the
// second player has joined and the engine has taken over: the room is counting
// down or trading is live. Waiting rooms are excluded — those are already in the
// open-rooms list.
async function findActiveMatch(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string
) {
  const { data: match } = await supabase
    .from("matches")
    .select("id, name, status, player_one_user_id, player_two_user_id, ends_at") // selecting the columns we need
    .or(`player_one_user_id.eq.${userId},player_two_user_id.eq.${userId}`) // i can be either player one or player two
    .in("status", ["countdown", "active"]) // only countodwn and active status
    .order("created_at", { ascending: false }) // newwest first
    .limit(1)
    .maybeSingle(); // oe item or null

  if (!match) {
    return null;
  }

  // Who you are up against, so the banner can say "vs <name>".
  const opponentId =
    match.player_one_user_id === userId
      ? match.player_two_user_id
      : match.player_one_user_id;

  let opponent = "your opponent";

  if (opponentId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", opponentId)
      .maybeSingle();

    opponent = profile?.username ?? opponentId.slice(0, 8);
  }

  return {
    id: match.id,
    name: match.name?.trim() || "Your match",
    status: match.status,
    opponent,
    endsAt: match.ends_at,
  };
}

export async function GET(request: Request) {
  // Error messages in the player's language (read from their "locale" cookie).
  const t = await getTranslations("RoomErrors");

  // Parse pagination params from the query string.
  const url = new URL(request.url);
  const pageParam = parseInt(url.searchParams.get("page") ?? "0", 10);
  const pageSizeParam = parseInt(url.searchParams.get("pageSize") ?? "6", 10);
  const page = Number.isFinite(pageParam) && pageParam >= 0 ? pageParam : 0;
  const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0 && pageSizeParam <= 50 ? pageSizeParam : 6;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();  // getting user and if there is any error

  if (userError || !user) {
    return Response.json({ error: t("loginRequired") }, { status: 401 });
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;

  // Fetch the current page of waiting rooms.
  // Supabase doesn't support sorting by a computed expression via the JS client,
  // so we fetch this page ordered purely by creation time. The own-room-first
  // pinning is handled separately below: if the user owns a room we ensure it
  // always appears on page 0 regardless of creation order.
  const { data: rooms, error, count } = await supabase
    .from("matches")
    .select(
      "id, name, player_one_user_id, player_two_user_id, status, symbol, starting_capital, duration_seconds, starts_at, ends_at, created_at",
      { count: "exact" }
    )
    .eq("status", "waiting")
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    // Keep the real database error in the server log, send a friendly one to the player.
    console.error("GET /api/rooms failed:", error.message);
    return Response.json({ error: t("serverError") }, { status: 500 });
  }

  const matchRooms = rooms as MatchRoom[];

  const creatorIds = [...new Set(matchRooms.map((room) => room.player_one_user_id))]; // dedupe and array of creator id
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", creatorIds.length > 0 ? creatorIds : ["none"]);

  const creatorProfiles = new Map<string, { username: string; avatar_url: string | null }>(
    (profiles ?? []).map((profile) => [
      profile.id,
      { username: profile.username, avatar_url: profile.avatar_url }
    ])
  );

  // Keep own room first within this page slice.
  const sortedRooms = matchRooms
    .toSorted((roomA, roomB) => {
      const roomAIsMine = roomA.player_one_user_id === user.id;
      const roomBIsMine = roomB.player_one_user_id === user.id;

      if (roomAIsMine !== roomBIsMine) {
        return roomAIsMine ? -1 : 1;
      }

      return (
        new Date(roomB.created_at).getTime() -
        new Date(roomA.created_at).getTime()
      );
    })
    .map((room) => formatRoom(room, user.id, creatorProfiles));

  const activeMatch = await findActiveMatch(supabase, user.id);
  const totalCount = count ?? 0;

  return Response.json({ rooms: sortedRooms, activeMatch, totalCount, page, pageSize });
}

export async function POST(request: Request) {
  // Error messages in the player's language (read from their "locale" cookie).
  const t = await getTranslations("RoomErrors");

  let body: CreateRoomRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: t("invalidRequest") }, { status: 400 });
  }

  const startingCapital = getStartingCapital(body.startingCapital);
  const durationSeconds = getDurationSeconds(body.durationSeconds);

  const rawName = typeof body.name === "string" ? body.name : "";
  const nameError = roomNameError(rawName);
  if (nameError !== null) {
    return Response.json({ error: t(nameError) }, { status: 400 });
  }
  const name = rawName.trim() || null; // null = user's name room

  // Market: one of the allowed ones. Not sent at all = the default (BTC).
  const symbol = body.symbol === undefined ? DEFAULT_SYMBOL : body.symbol;

  if (startingCapital === null) {
    return Response.json(
      { error: t("invalidCapital") },
      { status: 400 }
    );
  }

  if (durationSeconds === null) {
    return Response.json(
      { error: t("invalidDuration") },
      { status: 400 }
    );
  }

  if (typeof symbol !== "string" || !ALLOWED_SYMBOLS.includes(symbol)) {
    return Response.json(
      { error: t("invalidSymbol") },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: t("loginRequired") }, { status: 401 });
  }

  // "Play with" a friend: make sure they really are an accepted friend.
  // (The dropdown only shows friends, but anyone can send any id by hand.)
  const invitedUserId =
    typeof body.invitedUserId === "string" && body.invitedUserId !== "" ? body.invitedUserId : null;

  if (invitedUserId) {
    const { data: friend } = await supabase
      .from("friends_with_status") // only ever returns MY friendships
      .select("id")
      .eq("id", invitedUserId)
      .eq("status", "accepted")
      .maybeSingle();

    if (!friend) {
      return Response.json({ error: t("friendsOnly") }, { status: 403 });
    }
  }

  const { count: existingGameCount, error: existingGameError } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true }) // just need the count no row needed
    .or(`player_one_user_id.eq.${user.id},player_two_user_id.eq.${user.id}`)
    .neq("status", "completed"); // not equal to completed so basically everything else

  if (existingGameError) {
    console.error("POST /api/rooms active game check failed:", existingGameError.message);
    return Response.json({ error: t("serverError") }, { status: 500 });
  }

  if (existingGameCount && existingGameCount > 0) { // first iss to check fo rnull
    return Response.json(
      { error: t("alreadyInGameCreate") },
      { status: 409 }
    );
  }

  const insertPayload = {
    id: crypto.randomUUID(),
    name, // null when the creator left the field blank
    player_one_user_id: user.id,
    status: "waiting",
    symbol,
    starting_capital: startingCapital,
    duration_seconds: durationSeconds,
    invited_user_id: invitedUserId, // null = public room
  };

  const { error: insertError } = await supabase.from("matches").insert(insertPayload); // creating new match

  if (insertError) {
    // 23505 = the database's "one open match per player" rule (migration 0014)
    // said no: another request put this player in a match a moment ago.
    if (insertError.code === "23505") {
      return Response.json(
        { error: t("alreadyInGameCreate") },
        { status: 409 }
      );
    }

    return Response.json(
      { error: t("couldNotCreate") },
      { status: 500 }
    );
  }

  const createdAt = new Date().toISOString();

  return Response.json(
    {
      room: formatRoom(
        {
          ...insertPayload,
          player_two_user_id: null,
          starts_at: null,
          ends_at: null,
          created_at: createdAt,
        },
        user.id,
        new Map() // just passing as empty cause format room needs it but we dont have any other users yet
      ),
    },
    { status: 201 } // created status
  );
}

export async function DELETE(request: Request) {
  // Error messages in the player's language (read from their "locale" cookie).
  const t = await getTranslations("RoomErrors");

  let body: DeleteRoomRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: t("invalidRequest") }, { status: 400 });
  }

  if (typeof body.roomId !== "string" || body.roomId.trim().length === 0) {
    return Response.json({ error: t("roomIdRequired") }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: t("loginRequired") }, { status: 401 });
  }

  const roomId = body.roomId.trim();

  // Not even shaped like a room id? Say so now (400), don't ask the database.
  if (!isRoomId(roomId)) {
    return Response.json({ error: t("invalidRoomId") }, { status: 400 });
  }

  const { count, error: deleteError } = await supabase
    .from("matches")
    .delete({ count: "exact" }) // return the number of rows deleted
    .eq("id", roomId)
    .eq("player_one_user_id", user.id)
    .eq("status", "waiting");

  if (deleteError) {
    console.error("DELETE /api/rooms failed:", deleteError.message);
    return Response.json({ error: t("serverError") }, { status: 500 });
  }

  if (!count || count === 0) {
    return Response.json(
      { error: t("roomNotDeletable") },
      { status: 404 }
    );
  }

  return Response.json({ roomId });
}
