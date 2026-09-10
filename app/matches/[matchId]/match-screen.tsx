"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import {
  MatchTransportProvider,
  useMatchConnection,
  type ConnectionStatus,
  type MatchConnection,
} from "@/lib/match/match-connection";
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
<<<<<<< HEAD
=======
import { WaitingRoom } from "./waiting-room";
>>>>>>> amber/grafana

export function MatchScreen({ matchId }: { matchId: string }) {
  return (
    <MatchTransportProvider>
      <MatchScreenInner matchId={matchId} />
    </MatchTransportProvider>
  );
}

function MatchScreenInner({ matchId }: { matchId: string }) {
  const connection = useMatchConnection(matchId);

<<<<<<< HEAD
  return (
    <>
      <p role="status" aria-live="polite" className="sr-only">
        {statusSpeech(connection.match?.status ?? null, connection.ended !== null)}
      </p>

      <MatchPhase connection={connection} />
    </>
  );
}

function statusSpeech(status: MatchStatus | null, ended: boolean): string {
  if (ended) {
    return "The match has ended. The result is shown in a dialog.";
  }
  switch (status) {
    case null:
      return "Loading the match.";
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

function MatchPhase({ connection }: { connection: ReturnType<typeof useMatchConnection> }) {
  const { match } = connection;

  if (match === null) {
    return <MatchLoading />;
  }

  if (connection.ended !== null) {
    return <ActiveMatch connection={connection} match={match} />;
  }

  switch (match.status) {
    case "waiting":
      return (
        <PhaseStub
          title="Waiting for opponent"
          detail={`${match.playerOne.username} is in. Nobody has joined yet.`}
          owner="waiting room"
        />
      );

    case "countdown":
      return (
        <PhaseStub
          title="Match starting soon"
          detail={`${match.playerOne.username} vs ${match.playerTwo?.username ?? "opponent"}`}
          owner="countdown"
        />
      );

    case "completed":
      return (
        <PhaseStub
          title="Match complete"

          detail={`${match.playerOne.username} vs ${match.playerTwo?.username ?? "opponent"} has finished.`}
          owner="result screen"
        />
      );

    case "cancelled":
      return (
        <PhaseStub
          title="Match cancelled"
          detail="This match was cancelled before it started."
          owner="result screen"
        />
      );

    case "active":
      return <ActiveMatch connection={connection} match={match} />;
  }
}

function MatchLoading() {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-5">
      <p className="flex items-center gap-2.5 text-sm text-[#5d6877]">
        <span className="size-2 animate-pulse rounded-full bg-[#4d86ff]" />
        Loading match…
      </p>
    </div>
  );
}

function PhaseStub({
  title,
  detail,
  owner,
}: {
  title: string;
  detail: string;
  owner: string;
}) {
  return (
    <div className="flex flex-1 items-center justify-center px-5 py-5">
      <div className="w-full max-w-md rounded-xl border border-dashed border-white/[.12] bg-[#0f131b] p-8 text-center">
        <p className="text-[10.5px] font-bold uppercase tracking-[.08em] text-[#3a434f]">
          Not built yet · {owner}
        </p>
        <h1 className="mt-3 text-[21px] font-bold tracking-[-.01em]">{title}</h1>
        <p className="mt-2 text-[13px] text-[#9aa6b6]">{detail}</p>
      </div>
    </div>
=======
  return <MatchPhase connection={connection} />;
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
            <RefreshCw className="size-4" />
            Try again
          </ActionButton>
          <ActionLink href="/" tone="secondary">
            <ArrowLeft className="size-4" />
            Back to games
          </ActionLink>
        </>
      }
    >
      It may not exist, you may not be one of its players, or the connection to the match
      server may be down.
    </MessageScreen>
>>>>>>> amber/grafana
  );
}

function ActiveMatch({
  connection,
  match,
}: {
<<<<<<< HEAD
  connection: ReturnType<typeof useMatchConnection>;
  match: NonNullable<ReturnType<typeof useMatchConnection>["match"]>;
=======
  connection: MatchConnection;
  match: NonNullable<MatchConnection["match"]>;
>>>>>>> amber/grafana
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
<<<<<<< HEAD

  const ordersDisabled = match.status !== "active" || status !== "connected";

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-5 sm:px-7">
      <ConnectionBanner connection={status} onReconnect={reconnect} />

=======
  const ordersDisabled = match.status !== "active" || status !== "connected";

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-5 sm:px-7">
      <ConnectionBanner connection={status} onReconnect={reconnect} />

>>>>>>> amber/grafana
      <MatchHeader
        match={match}
        price={price}
        priceDirection={priceDirection}
        player={player}
        serverNow={serverNow}
<<<<<<< HEAD
      />

      <div className="flex flex-1 flex-col gap-4 xl:flex-row">
        <section
          aria-label={`${match.symbol} price chart`}
=======
        matchOver={ended !== null}
      />
      <div className="flex flex-1 flex-col gap-4 xl:flex-row">
        <section
>>>>>>> amber/grafana
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
<<<<<<< HEAD

=======
>>>>>>> amber/grafana
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
<<<<<<< HEAD

=======
>>>>>>> amber/grafana
      {ended !== null && viewer !== null && (
        <MatchEndedPanel ended={ended} match={match} viewerUserId={viewer.userId} />
      )}
    </div>
  );
}
