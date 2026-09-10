"use client";

import type React from "react";
import { ArrowLeft, CircleSlash2 } from "lucide-react";
import { ActionLink, MessageScreen } from "./message-screen";
import type { Match } from "@/lib/match/types";

export function MatchCancelled({ match }: { match: Match }): React.ReactElement {
  return (
    <MessageScreen
      badge={
        <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-white/[.12] bg-white/[.04] px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[.08em] text-[#9aa6b6]">
          <CircleSlash2 className="size-3.5" />
          Cancelled
        </span>
      }
      heading="Match cancelled"
      actions={
        <ActionLink href="/" tone="primary" className="w-full">
          <ArrowLeft className="size-4" />
          Back to games
        </ActionLink>
      }
    >
      This {match.symbol} match was cancelled before it started. No trades were placed and no
      capital changed hands.
    </MessageScreen>
  );
}
