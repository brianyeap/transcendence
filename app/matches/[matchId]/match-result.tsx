"use client";

import type React from "react";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionLink, CentredScreen, LoadingLine, MessageScreen } from "./message-screen";
import { MatchResultCard } from "./match-result-card";
import { useCompletedResult } from "./use-completed-result";
import type { Match, MatchEnded } from "@/lib/match/types";

export function MatchResult({
  match,
  ended,
  viewerUserId,
}: {
  match: Match;
  ended: MatchEnded | null;
  viewerUserId: string | null;
}): React.ReactElement {
  const settled = useCompletedResult(match.id, viewerUserId);

  const result = ended ?? (settled.status === "ready" ? settled.result : null);

  if (result === null || viewerUserId === null) {
    return settled.status === "loading" ? <ResultLoading /> : <ResultUnavailable match={match} />;
  }

  return (
    <CentredScreen>
      <div className="w-full max-w-lg rounded-xl border border-white/[.07] bg-[#0f131b] p-6 sm:p-7">
        <p className="mb-4 text-center text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
          <ResultLabel />
        </p>
        <MatchResultCard
          result={result}
          match={match}
          viewerUserId={viewerUserId}
          headingLevel={1}
        />
      </div>
    </CentredScreen>
  );
}

function ResultLabel() {
  const t = useTranslations("MatchResult");

  return <>{t("finalResult")}</>;
}

function ResultLoading() {
  const t = useTranslations("MatchResult");

  return <LoadingLine>{t("loadingFinalResult")}</LoadingLine>;
}

function ResultUnavailable({ match }: { match: Match }) {
  const t = useTranslations("MatchResult");

  return (
    <MessageScreen
      heading={t("matchFinished")}
      actions={
        <>
          <ActionLink href={`/history/${match.id}`} tone="primary">
            {t("viewMatchSummary")}
          </ActionLink>
          <ActionLink href="/" tone="secondary">
            <ArrowLeft className="size-4" />
            {t("backToGames")}
          </ActionLink>
        </>
      }
    >
      {t("figuresUnavailable")}
    </MessageScreen>
  );
}