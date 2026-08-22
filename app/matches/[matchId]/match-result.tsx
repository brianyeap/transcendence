"use client";

import type React from "react";
import { ArrowLeft } from "lucide-react";
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
          Final result
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

function ResultLoading() {
  return <LoadingLine announce>Loading the final result…</LoadingLine>;
}

function ResultUnavailable({ match }: { match: Match }) {
  return (
    <MessageScreen
      heading="This match has finished"
      actions={
        <>
          <ActionLink href={`/history/${match.id}`} tone="primary">
            View match summary
          </ActionLink>
          <ActionLink href="/" tone="secondary">
            <ArrowLeft className="size-4" aria-hidden />
            Back to games
          </ActionLink>
        </>
      }
    >
      The final figures are not available on this screen. The match summary has the full
      record.
    </MessageScreen>
  );
}
