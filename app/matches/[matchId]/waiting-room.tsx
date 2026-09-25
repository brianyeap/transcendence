"use client";

import type React from "react";
import { ArrowLeft, Loader } from "lucide-react";
import { useTranslations } from "next-intl";
import { fmtUSD } from "../../components/duel/format";
import { ActionLink, CentredScreen } from "./message-screen";
import { PlayerPair } from "./player-slot";
import type { Match } from "@/lib/match/types";

export function WaitingRoom({
  match,
  viewerUserId,
}: {
  match: Match;
  viewerUserId: string | null;
}): React.ReactElement {
  const t = useTranslations("WaitingRoom");

  return (
    <CentredScreen>
      <div className="w-full max-w-lg rounded-xl border border-white/[.07] bg-[#0f131b] p-6 sm:p-7">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-[#4d86ff]/30 bg-[#4d86ff]/10 px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[.08em] text-[#4d86ff]">
            <Loader className="size-3.5 motion-safe:animate-spin" />
            {t("open")}
          </span>

          <h1 className="mt-3.5 text-[27px] font-bold tracking-[-.02em]">
            {t("title")}
          </h1>

          <p className="mt-1.5 text-[13px] text-[#9aa6b6]">
            {t("description")}
          </p>
        </div>

        <PlayerPair match={match} viewerUserId={viewerUserId} />

        <MatchSettings match={match} />

        <div className="mt-6">
          <ActionLink href="/" tone="secondary" className="w-full">
            <ArrowLeft className="size-4" />
            {t("backToGames")}
          </ActionLink>

          <p className="mt-2.5 text-center text-[11.5px] text-[#5d6877]">
            {t("awayMessage")}
          </p>
        </div>
      </div>
    </CentredScreen>
  );
}

function MatchSettings({ match }: { match: Match }) {
  const t = useTranslations("WaitingRoom");

  return (
    <div className="mt-5 rounded-[7px] border border-white/[.07] bg-[#151b25] px-4 py-3.5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
            {t("market")}
          </p>

          <p className="mt-1 font-mono text-[15px] font-semibold tabular-nums text-[#eef2f8]">
            {match.symbol}
          </p>
        </div>

        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
            {t("startingCapital")}
          </p>

          <p className="mt-1 font-mono text-[15px] font-semibold tabular-nums text-[#eef2f8]">
            {fmtUSD(Math.round(match.startingCapital))}
          </p>

          <p className="mt-0.5 text-[10.5px] text-[#5d6877]">
            {t("eachPlayer")}
          </p>
        </div>
      </div>
    </div>
  );
}