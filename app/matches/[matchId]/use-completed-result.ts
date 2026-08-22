"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MatchEnded } from "@/lib/match/types";

export type SettledResult =
  | { status: "loading" }
  | { status: "ready"; result: MatchEnded }
  | { status: "unavailable" };

export function useCompletedResult(
  matchId: string,
  viewerUserId: string | null
): SettledResult {
  const [state, setState] = useState<SettledResult>({ status: "loading" });

  useEffect(() => {
    if (viewerUserId === null) return;

    let cancelled = false;

    async function read() {
      const supabase = createSupabaseBrowserClient();

      const [matchResponse, playerResponse] = await Promise.all([
        supabase
          .from("matches")
          .select("final_price, winner_user_id")
          .eq("id", matchId)
          .maybeSingle(),
        supabase.from("match_players").select("user_id, final_capital").eq("match_id", matchId),
      ]);

      if (cancelled) return;

      const matchRow = matchResponse.data;
      const playerRows = playerResponse.data ?? [];

      const yours = playerRows.find((row) => row.user_id === viewerUserId);
      const theirs = playerRows.find((row) => row.user_id !== viewerUserId);

      if (
        matchRow === null ||
        matchRow === undefined ||
        yours === undefined ||
        theirs === undefined ||
        yours.final_capital === null ||
        theirs.final_capital === null
      ) {
        setState({ status: "unavailable" });
        return;
      }

      setState({
        status: "ready",
        result: {
          finalPrice: matchRow.final_price === null ? null : Number(matchRow.final_price),
          winnerUserId: matchRow.winner_user_id,
          yourFinalCapital: Number(yours.final_capital),
          opponentFinalCapital: Number(theirs.final_capital),
        },
      });
    }

    read().catch(() => {
      if (!cancelled) setState({ status: "unavailable" });
    });

    return () => {
      cancelled = true;
    };
  }, [matchId, viewerUserId]);

  return state;
}
