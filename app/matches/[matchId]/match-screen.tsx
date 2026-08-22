"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import {
  MatchTransportProvider,
  useMatchConnection,
  type ConnectionStatus,
  type MatchConnection,
} from "@/lib/match/match-connection";
import type { MatchStatus } from "@/lib/match/types";
import { ConnectionBanner } from "./connection-banner";
import { CountdownScreen } from "./countdown-screen";
import { MatchCancelled } from "./match-cancelled";
import { MatchChart } from "./match-chart";
import { MatchEndedPanel } from "./match-ended-panel";
import { MatchHeader } from "./match-header";
import { MatchResult } from "./match-result";
import { OrderPanel } from "./order-panel";
import { PositionPanel } from "./position-panel";
import { RecentTrades } from "./recent-trades";
import { WaitingRoom } from "./waiting-room";

export function MatchScreen({ matchId }: { matchId: string }) {
  return (
    <MatchTransportProvider>
      <MatchScreenInner matchId={matchId} />
    </MatchTransportProvider>
  );
}

function MatchScreenInner({ matchId }: { matchId: string }) {
  const connection = useMatchConnection(matchId);

  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {statusSpeech(
          connection.match?.status ?? null,
          connection.ended !== null,
          connection.connection
        )}
      </p>

      <MatchPhase connection={connection} />
    </>
  );
}
function statusSpeech(
  status: MatchStatus | null,
  ended: boolean,
  connection: ConnectionStatus
): string {
  if (ended) {
    return "The match has ended. The result is shown in a dialog.";
  }
  switch (status) {
    case null:
      return connection === "disconnected"
        ? "The match could not be loaded. A retry control is available."
        : "Loading the match.";
    case "waiting":
      return "Waiting for an opponent to join.";
    case "countdown":
      return "Both players are in. The match starts shortly.";
    case "active":
      return "The match is live. Trading is open.";
    case "completed":
      return "This match has finished.";
    case "cancelled":
      return "This match was cancelled before it started.";
  }
}
function MatchPhase({ connection }: { connection: MatchConnection }) {
  const { match } = connection;
  if (match === null) {
    return (
      <MatchUnavailable
        connection={connection.connection}
        onRetry={connection.reconnect}
      />
    );
  }
  const viewerUserId = connection.viewer?.userId ?? null;
  if (connection.ended !== null) {
    return <ActiveMatch connection={connection} match={match} />;
  }
  switch (match.status) {
    case "waiting":
      return <WaitingRoom match={match} viewerUserId={viewerUserId} />;
    case "countdown":
      return (
        <CountdownScreen
          match={match}
          viewerUserId={viewerUserId}
          serverNow={connection.serverNow}
        />
      );
    case "completed":

      return (
        <MatchResult match={match} ended={connection.ended} viewerUserId={viewerUserId} />
      );
    case "cancelled":
      return <MatchCancelled match={match} />;
    case "active":
      return <ActiveMatch connection={connection} match={match} />;
  }
}

function MatchUnavailable({
  connection,
  onRetry,
}: {
  connection: ConnectionStatus;
  onRetry: () => void;
}) {
  if (connection !== "disconnected") {
    return (
      <div className="flex flex-1 items-center justify-center px-5 py-5">
        <p className="flex items-center gap-2.5 text-sm text-[#5d6877]">
          <span className="size-2 animate-pulse rounded-full bg-[#4d86ff]" />
          Loading match…
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-5">
      <div className="w-full max-w-md rounded-xl border border-white/[.07] bg-[#0f131b] p-8 text-center">
        <h1 className="text-[21px] font-bold tracking-[-.01em]">This match could not be loaded</h1>
        <p className="mt-2 text-[13px] text-[#9aa6b6]">
          It may not exist, you may not be one of its players, or the connection to the
          match server may be down.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <button
            type="button"
            onClick={onRetry}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-[7px] bg-[#4d86ff] px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
          >
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </button>
          <Link
            href="/"
            className="flex flex-1 items-center justify-center gap-2 rounded-[7px] border border-white/[.1] bg-gray-800 px-4 py-2.5 text-[13.5px] font-semibold text-[#eef2f8] transition hover:bg-gray-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d86ff]"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to games
          </Link>
        </div>
      </div>
    </div>
  );
}
function ActiveMatch({
  connection,
  match,
}: {
  connection: MatchConnection;
  match: NonNullable<MatchConnection["match"]>;
}) {
  const {
    candles,
    lastCandle,
    price,
    priceDirection,
    player,
    pendingTrade,
    lastFill,
    lastRejection,
    trades,
    connection: status,
    ended,
    viewer,
    serverNow,
    submitTrade,
    reconnect,
    dismissFeedback,
  } = connection;
  const ordersDisabled = match.status !== "active" || status !== "connected";
  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-5 sm:px-7">
      <ConnectionBanner connection={status} onReconnect={reconnect} />
      <MatchHeader
        match={match}
        price={price}
        priceDirection={priceDirection}
        player={player}
        serverNow={serverNow}
      />
      <div className="flex flex-1 flex-col gap-4 xl:flex-row">
        <section
          aria-label={`${match.symbol} price chart`}
          className="min-h-[360px] flex-1 xl:min-h-0"
        >
          <MatchChart
            candles={candles}
            lastCandle={lastCandle}
            trades={trades}
            entryPrice={player?.entryPrice ?? null}
            netSide={player?.netSide ?? "flat"}
          />
        </section>

        <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[350px]">
          <PositionPanel player={player} price={price} />
          <OrderPanel
            player={player}
            pendingTrade={pendingTrade}
            lastFill={lastFill}
            lastRejection={lastRejection}
            disabled={ordersDisabled}
            onSubmit={submitTrade}
            onDismissFeedback={dismissFeedback}
          />
          <RecentTrades trades={trades} />
        </div>
      </div>
      {ended !== null && viewer !== null && (
        <MatchEndedPanel ended={ended} match={match} viewerUserId={viewer.userId} />
      )}
    </div>
  );
}
