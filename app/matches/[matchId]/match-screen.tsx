"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
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
import {
  ActionButton,
  ActionLink,
  LoadingLine,
  MessageScreen,
} from "./message-screen";
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
    return <LoadingLine>Loading match…</LoadingLine>;
  }
  return (
    <MessageScreen
      heading="This match could not be loaded"
      actions={
        <>
          <ActionButton onClick={onRetry} tone="primary">
            <RefreshCw className="size-4" aria-hidden />
            Try again
          </ActionButton>
          <ActionLink href="/" tone="secondary">
            <ArrowLeft className="size-4" aria-hidden />
            Back to games
          </ActionLink>
        </>
      }
    >
      It may not exist, you may not be one of its players, or the connection to the match
      server may be down.
    </MessageScreen>
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
        matchOver={ended !== null}
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
