import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// How many seconds the pre-match countdown lasts before trading starts.
const COUNTDOWN_SECONDS = 10;

// If a room somehow has no duration saved, fall back to 2 minutes.
const DEFAULT_DURATION_SECONDS = 120;

type JoinRoomRequest = {
  roomId?: unknown;
};

// POST /api/rooms/join
// The second player calls this to join a waiting room. When they do we:
//   1. mark them as player two,
//   2. move the room into the "countdown" state,
//   3. set the countdown / start / end timestamps that the whole game runs on.
// We do NOT create the match_players rows here — the socket server (which has the
// service-role key) creates those when the match starts. That keeps all game-state
// writes on the server side, which is what our Row Level Security expects.
export async function POST(request: Request) {
  // --- read and validate the body ------------------------------------------
  let body: JoinRoomRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body.roomId !== "string" || body.roomId.trim().length === 0) {
    return Response.json({ error: "roomId is required." }, { status: 400 });
  }

  const roomId = body.roomId.trim();

  // --- make sure the caller is logged in -----------------------------------
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  // --- load the room we are trying to join ---------------------------------
  const { data: room, error: roomError } = await supabase
    .from("matches")
    .select("id, player_one_user_id, player_two_user_id, status, duration_seconds")
    .eq("id", roomId)
    .maybeSingle(); // returns null instead of erroring when not found

  if (roomError) {
    return Response.json({ error: roomError.message }, { status: 500 });
  }

  if (!room) {
    return Response.json({ error: "Room not found." }, { status: 404 });
  }

  // You cannot join your own room (you are already player one).
  if (room.player_one_user_id === user.id) {
    return Response.json({ error: "You cannot join your own room." }, { status: 400 });
  }

  // The room must still be waiting for a second player.
  if (room.status !== "waiting" || room.player_two_user_id !== null) {
    return Response.json({ error: "This room is no longer open." }, { status: 409 });
  }

  // --- make sure this user is not already in another active game -----------
  const { count: activeGames, error: activeError } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .or(`player_one_user_id.eq.${user.id},player_two_user_id.eq.${user.id}`)
    .neq("status", "completed");

  if (activeError) {
    return Response.json({ error: activeError.message }, { status: 500 });
  }

  if (activeGames && activeGames > 0) {
    return Response.json(
      { error: "You already have an active game. Finish it before joining another." },
      { status: 409 }
    );
  }

  // --- work out the three timestamps the game runs on ----------------------
  const durationSeconds = room.duration_seconds ?? DEFAULT_DURATION_SECONDS;

  const countdownStartsAt = new Date(); // now
  const startsAt = new Date(countdownStartsAt.getTime() + COUNTDOWN_SECONDS * 1000);
  const endsAt = new Date(startsAt.getTime() + durationSeconds * 1000);

  // --- update the room: add player two and start the countdown -------------
  // Joining is a trusted server action: we've already confirmed the caller is
  // logged in and that the room is open. We do the write with the admin
  // (service-role) client so it isn't blocked by row-level security — a normal
  // user is not allowed to write to a room they don't own.
  //
  // We repeat the "still waiting / still empty" checks inside the update so that
  // if two people click Join at the same moment, only the first one wins.
  const admin = createSupabaseAdminClient();
  const { data: updated, error: updateError } = await admin
    .from("matches")
    .update({
      player_two_user_id: user.id,
      status: "countdown",
      countdown_starts_at: countdownStartsAt.toISOString(),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
    })
    .eq("id", roomId)
    .eq("status", "waiting")
    .is("player_two_user_id", null)
    .select("id")
    .maybeSingle();

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  // If nothing came back, someone else joined first.
  if (!updated) {
    return Response.json({ error: "This room was just taken." }, { status: 409 });
  }

  // The room id is also the match id — the client uses it to open /rooms/[roomId].
  return Response.json({ roomId: updated.id });
}
