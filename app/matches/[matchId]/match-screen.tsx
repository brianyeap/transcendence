"use client";

import { MatchTransportProvider, useMatchConnection } from "@/lib/match/match-connection";
import type { MatchStatus } from "@/lib/match/types";
import { ConnectionBanner } from "./connection-banner";
import { MatchChart } from "./match-chart";
import { MatchEndedPanel } from "./match-ended-panel";
import { MatchHeader } from "./match-header";
import { OrderPanel } from "./order-panel";
import { PositionPanel } from "./position-panel";
import { RecentTrades } from "./recent-trades";
import { WaitingRoom } from "./waiting-room";
import { CountdownScreen } from "./countdown-screen";

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
				{statusSpeech(connection.match?.status ?? null, connection.ended !== null)}
			</p>

			<MatchPhase connection={connection} />
		</>
	);
}

function statusSpeech(status: MatchStatus | null, ended: boolean): string {
	if (ended) {
		return "The match has ended.";
	}
	switch (status) {
		case null:
			return "Match loading...";
		case "waiting":
			return "Waiting for an opponent to join";
		case "countdown":
			return "Both players in. The match will start shortly.";
		case "active":
			return "Match is live!";
		case "completed":
			return "Match is now over.";
		case "cancelled":
			return "Match has been cancelled. Returning to lobby.";
	}
}

function MatchPhase({ connection }: { connection: ReturnType<typeof useMatchConnection> }) {
	const { match } = connection;

	if (match === null) {
		return <MatchLoading />;
	}

	const viewerUserId = connection.viewer?.userId ?? null;

	if (connection.ended !== null) {
		return <ActiveMatch connection={connection} match={match} />
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
				<MatchResult 
					match={match}
					ended={connection.ended}
					player={connection.player}
					price={connection.price}
					viewerUserId={viewerUserId}
				/>
			);

		case "cancelled":
			return <MatchCancelled match={match} />;

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

function ActiveMatch({
	connection,
	match,
}: {
	connection: ReturnType<typeof useMatchConnection>;
	match: NonNullable<ReturnType<typeof useMatchConnection>["match"]>;
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
				<section className="min-h-[360px] flex-1 xl:min-h-0">
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
