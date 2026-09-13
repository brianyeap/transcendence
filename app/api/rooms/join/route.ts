import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MATCH_DURATION_SECONDS } from "@/lib/match/rules";

const COUNTDOWN_SECONDS = 10;

type JoinRoomRequest = {
  roomId?: unknown;
};

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

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

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

  const durationSeconds = room.duration_seconds ?? MATCH_DURATION_SECONDS;
  const countdownStartsAt = new Date();
  const startsAt = new Date(countdownStartsAt.getTime() + COUNTDOWN_SECONDS * 1000); // now + count down
  const endsAt = new Date(startsAt.getTime() + durationSeconds * 1000); // start + duration

  const admin = createSupabaseAdminClient(); // uing admin to bypass rls so we cna update the match even though the user is not the owner
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
