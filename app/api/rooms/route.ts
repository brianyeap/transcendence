import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MATCH_DURATION_SECONDS } from "@/lib/match/rules";

const ALLOWED_CAPITAL = new Set([5000, 10000, 20000]);
const ALLOWED_DURATION = new Set([MATCH_DURATION_SECONDS]);

// max room name
const MAX_NAME_LENGTH = 40;

type CreateRoomRequest = {
  symbol?: unknown;
  startingCapital?: unknown;
  durationSeconds?: unknown;
  name?: unknown;
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

// `creatorNames` maps a user id -> that user's username (looked up from the
// `profiles` table). If a name is missing we fall back to a slice of the id.
function formatRoom(
  room: MatchRoom,
  currentUserId: string,
  creatorNames: Map<string, string>
) {
  const isOwner = room.player_one_user_id === currentUserId;
  const creatorName =
    creatorNames.get(room.player_one_user_id) ?? room.player_one_user_id.slice(0, 8);

  return {
    id: room.id,
    name: room.name?.trim() || (isOwner ? "Your Room" : `${creatorName}'s Room`), // fallback if no name (legacy rooms)
    creator: isOwner ? "you" : creatorName,
    players: room.player_two_user_id ? 2 : 1,
    capacity: 2,
    ageMin: getRoomAgeMinutes(room.created_at),
    // Prefer the saved duration; fall back to deriving it from the timestamps.
    duration: room.duration_seconds ?? getRoomDuration(room),
    capital: Number(room.starting_capital),
    symbol: "BTC/USDT",
    ownedByCurrentUser: isOwner,
  };
}

function getStartingCapital(value: unknown) {
  const capital = Number(value);

  if (!Number.isFinite(capital) || !ALLOWED_CAPITAL.has(capital)) {
    return null;
  }

  return capital;
}

// Clean up the room name the creator typed. We return null (not an error) when
// it is missing or blank, because the name is optional — formatRoom falls back
// to "<creator>'s Room" in that case.
function getRoomName(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const name = value.trim();

  return name.length === 0 ? null : name.slice(0, MAX_NAME_LENGTH);
}

// Turn the durationSeconds from the request into a valid number of seconds.
// If it's missing or not one of the allowed choices, fall back to the default.
function getDurationSeconds(value: unknown) {
  const duration = Number(value);

  if (!Number.isFinite(duration) || !ALLOWED_DURATION.has(duration)) {
    return MATCH_DURATION_SECONDS;
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
    .select("id, name, status, player_one_user_id, player_two_user_id, ends_at")
    .or(`player_one_user_id.eq.${userId},player_two_user_id.eq.${userId}`)
    .in("status", ["countdown", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

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

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();  // getting user and if there is any error

  if (userError || !user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: rooms, error } = await supabase // basically result.data is rooms and result.error is error
    .from("matches")
    .select(
      "id, name, player_one_user_id, player_two_user_id, status, symbol, starting_capital, duration_seconds, starts_at, ends_at, created_at"
    )
    .eq("status", "waiting") // only get waiting
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const matchRooms = rooms as MatchRoom[];

  // Look up the username for every room creator in one query, then build a
  // { userId -> username } map that formatRoom can read from.
  //
  // This needs the "read all profiles" policy from migration 0003. Without it
  // RLS only lets you read your OWN profile row, so every other player's room
  // would fall back to showing a chunk of their user id.
  const creatorIds = [...new Set(matchRooms.map((room) => room.player_one_user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username")
    .in("id", creatorIds);

  const creatorNames = new Map<string, string>(
    (profiles ?? []).map((profile) => [profile.id, profile.username])
  );

  const sortedRooms = matchRooms
    .toSorted((roomA, roomB) => { // sorted func will handlw which to compare i jst have to return - or +
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
    .map((room) => formatRoom(room, user.id, creatorNames));

  // A match you are already in (countdown or active) never shows up in the list
  // above, because that list is only rooms still WAITING for a second player.
  // Without this the lobby has no way back into a game you are in the middle of
  // — reloading or clicking "Games" would strand you outside your own match.
  const activeMatch = await findActiveMatch(supabase, user.id);

  return Response.json({ rooms: sortedRooms, activeMatch });
}

export async function POST(request: Request) {
  let body: CreateRoomRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const startingCapital = getStartingCapital(body.startingCapital);
  const durationSeconds = getDurationSeconds(body.durationSeconds);
  const name = getRoomName(body.name);
  const symbol = "BTC/USDT";

  if (startingCapital === null) {
    return Response.json(
      { error: "Invalid starting capital." },
      { status: 400 }
    );
  }

  if (symbol === null) {
    return Response.json(
      { error: "Invalid symbol." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { count: existingGameCount, error: existingGameError } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .or(`player_one_user_id.eq.${user.id},player_two_user_id.eq.${user.id}`)
    .neq("status", "completed");

  if (existingGameError) {
    return Response.json({ error: existingGameError.message }, { status: 500 });
  }

  if (existingGameCount && existingGameCount > 0) {
    return Response.json(
      { error: "You already have an active game. End or delete it before creating another." },
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
    duration_seconds: durationSeconds, // remember how long the match should last
  };

  const { error: insertError } = await supabase.from("matches").insert(insertPayload);

  if (insertError) {
    if (insertError.code === "23505") { // unique_violation code, unique constraint
      return Response.json(
        { error: "You already have an active game. End or delete it before creating another." },
        { status: 409 }
      );
    }

    return Response.json(
      { error: "Could not create the room." },
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
        new Map() // creator is always the current user here, so no lookup needed
      ),
    },
    { status: 201 } // created status
  );
}

export async function DELETE(request: Request) {
  let body: DeleteRoomRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.roomId !== "string" || body.roomId.trim().length === 0) {
    return Response.json({ error: "roomId is required." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const roomId = body.roomId.trim();

  const { count, error: deleteError } = await supabase
    .from("matches")
    .delete({ count: "exact" }) // return the number of rows deleted
    .eq("id", roomId)
    .eq("player_one_user_id", user.id)
    .eq("status", "waiting");

  if (deleteError) {
    return Response.json({ error: deleteError.message }, { status: 500 });
  }

  if (!count || count === 0) {
    return Response.json(
      { error: "Room not found or you do not have permission to delete it." },
      { status: 404 }
    );
  }

  return Response.json({ roomId });
}
