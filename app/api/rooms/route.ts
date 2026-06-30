import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_CAPITAL = new Set([5000, 10000, 20000]);
const DEFAULT_SYMBOL = "BTCUSDT";

type CreateRoomRequest = {
  symbol?: unknown;
  startingCapital?: unknown;
  durationSeconds?: unknown;
};

type DeleteRoomRequest = {
  roomId?: unknown;
};

type MatchRoom = {
  id: string;
  player_one_user_id: string;
  player_two_user_id: string | null;
  status: string;
  symbol: string;
  starting_capital: number | string;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

function getRoomDuration(room: Pick<MatchRoom, "starts_at" | "ends_at">) { // only need starts_at and ends_at no need to pass the whole room object
  if (!room.starts_at || !room.ends_at) {
    return 120;  // default duration 
  }

  const startsAt = new Date(room.starts_at).getTime();
  const endsAt = new Date(room.ends_at).getTime();
  const durationSeconds = Math.round((endsAt - startsAt) / 1000); // convert milliseconds to seconds

  return Number.isFinite(durationSeconds) && durationSeconds > 0 // check if time i num and dur > 0
    ? durationSeconds
    : 120;
}

function getRoomAgeMinutes(createdAt: string) {
  const ageMs = Date.now() - new Date(createdAt).getTime();

  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return 0;
  }

  return Math.max(0, Math.round(ageMs / 60000));
}

function formatRoom(room: MatchRoom, currentUserId: string) {
  const isOwner = room.player_one_user_id === currentUserId;

  return {
    id: room.id,
    name: isOwner ? "Your Room" : `Room ${room.id.slice(0, 8)}`,  // first 8 char
    creator: isOwner ? "you" : room.player_one_user_id.slice(0, 8),
    players: room.player_two_user_id ? 2 : 1,
    capacity: 2,
    ageMin: getRoomAgeMinutes(room.created_at),
    duration: getRoomDuration(room),
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
      "id, player_one_user_id, player_two_user_id, status, symbol, starting_capital, starts_at, ends_at, created_at"
    )
    .eq("status", "waiting") // only get waiting
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const sortedRooms = (rooms as MatchRoom[])
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
    .map((room) => formatRoom(room, user.id));

  return Response.json({ rooms: sortedRooms });
}

export async function POST(request: Request) {
  let body: CreateRoomRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const startingCapital = getStartingCapital(body.startingCapital);
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
    player_one_user_id: user.id,
    status: "waiting",
    symbol,
    starting_capital: startingCapital,
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
      {
        error: insertError.message,
        parsed: {
          request: body,
          insert: insertPayload,
        },
      },
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
        user.id
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

  const { data: debugRoom, error: debugError } = await supabase
    .from("matches")
    .select("id, player_one_user_id, status")
    .eq("id", roomId)
    .maybeSingle(); // null if not found, single if found

  console.log("[DELETE /api/rooms] debug", {
    roomId,
    userId: user.id,
    debugRoom,
    debugError: debugError?.message,
  });

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
      {
        error: "Room not found or you do not have permission to delete it.",
        debug: { roomId, userId: user.id, foundRoom: debugRoom },
      },
      { status: 404 }
    );
  }

  return Response.json({ roomId });
}
