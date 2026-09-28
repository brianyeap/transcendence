import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { MATCH_DURATION_SECONDS, isRoomId } from "@/lib/match/rules";

const COUNTDOWN_SECONDS = 10;

type JoinRoomRequest = {
  roomId?: unknown;
};

export async function POST(request: Request) {
  // Error messages in the player's language (read from their "locale" cookie).
  const t = await getTranslations("RoomErrors");

  // read and validate the body
  let body: JoinRoomRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: t("invalidRequest") }, { status: 400 });
  }

  if (typeof body.roomId !== "string" || body.roomId.trim().length === 0) {
    return Response.json({ error: t("roomIdRequired") }, { status: 400 });
  }

  const roomId = body.roomId.trim();

  // Not even shaped like a room id? Say so now (400), don't ask the database.
  if (!isRoomId(roomId)) {
    return Response.json({ error: t("invalidRoomId") }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return Response.json({ error: t("loginRequired") }, { status: 401 });
  }

  const { data: room, error: roomError } = await supabase
    .from("matches")
    .select("id, player_one_user_id, player_two_user_id, status, duration_seconds, invited_user_id")
    .eq("id", roomId)
    .maybeSingle(); // returns null instead of erroring when not found

  if (roomError) {
    // Keep the real database error in the server log, send a friendly one to the player.
    console.error("POST /api/rooms/join room lookup failed:", roomError.message);
    return Response.json({ error: t("serverError") }, { status: 500 });
  }

  if (!room) {
    return Response.json({ error: t("roomNotFound") }, { status: 404 });
  }

  if (room.player_one_user_id === user.id) {
    return Response.json({ error: t("cannotJoinOwnRoom") }, { status: 400 });
  }

  // An invite room can only be joined by the friend it was made for.
  if (room.invited_user_id && room.invited_user_id !== user.id) {
    return Response.json({ error: t("roomForSomeoneElse") }, { status: 403 });
  }

  // The room must still be waiting for a second player.
  if (room.status !== "waiting" || room.player_two_user_id !== null) {
    return Response.json({ error: t("roomNotOpen") }, { status: 409 });
  }

  // --- make sure this user is not already in another active game -----------
  const { count: activeGames, error: activeError } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .or(`player_one_user_id.eq.${user.id},player_two_user_id.eq.${user.id}`)
    .neq("status", "completed");

  if (activeError) {
    console.error("POST /api/rooms/join active game check failed:", activeError.message);
    return Response.json({ error: t("serverError") }, { status: 500 });
  }

  if (activeGames && activeGames > 0) {
    return Response.json(
      { error: t("alreadyInGameJoin") },
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
    // 23505 = the database's "one open match per player" rule (migration 0014)
    // said no: another request put this player in a match a moment ago.
    if (updateError.code === "23505") {
      return Response.json({ error: t("alreadyInGameJoin") }, { status: 409 });
    }
    console.error("POST /api/rooms/join update failed:", updateError.message);
    return Response.json({ error: t("serverError") }, { status: 500 });
  }

  // If nothing came back, someone else joined first.
  if (!updated) {
    return Response.json({ error: t("roomTaken") }, { status: 409 });
  }

  // The room id is also the match id — the client uses it to open /rooms/[roomId].
  return Response.json({ roomId: updated.id });
}
