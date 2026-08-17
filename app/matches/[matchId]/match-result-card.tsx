'use client';

import type React from 'react';
import type { Match, PlayerRef } from '@/lib/match/types';
import { ArrowLeft, Trophy, CircleX, Equal } from 'lucide-react';
import Link from 'next/link';
import { fmtUSD } from '@/app/components/duel/format';

type Outcome = 'win' | 'loss' | 'draw';

export type MatchResultData = {
  finalPrice: number | null;
  winnerUserId: string | null;
  yourFinalCapital: number;
  opponentFinalCapital: number;
};

export function MatchResultCard({
  result,
  match,
  viewerUserId,
  headingId,
  detailId,
  headingLevel = 2,
}: {
  result: MatchResultData;
  match: Match;
  viewerUserId: string;
  headingId?: string;
  detailId?: string;
  headingLevel?: 1 | 2;
}): React.ReactElement {
  const outcome: Outcome =
    result.winnerUserId === null ? 'draw' : result.winnerUserId === viewerUserId ? 'win' : 'loss';

  const viewerIsPlayerOne = match.playerOne.userId === viewerUserId;
  const you: PlayerRef = viewerIsPlayerOne
    ? match.playerOne
    : (match.playerTwo ?? { userId: viewerUserId, username: 'You' });

  const opponent: PlayerRef | null = viewerIsPlayerOne ? match.playerTwo : match.playerOne;
  const opponentName = opponent?.username ?? 'Your opponent';

  const copy = OUTCOME_COPY[outcome];

  return (
    <>
      <OutcomeHeader
        outcome={outcome}
        opponentName={opponentName}
        headingId={headingId}
        detailId={detailId}
        headingLevel={headingLevel}
      />

      <div>
        <PlayerResult
          name={you.username}
          isViewer
          isWinner={outcome === 'win'}
          isDraw={outcome === 'draw'}
          finalCapital={result.yourFinalCapital}
          startingCapital={match.startingCapital}
        />
        <PlayerResult
          name={opponentName}
          isViewer={false}
          isWinner={outcome === 'loss'}
          isDraw={outcome === 'draw'}
          finalCapital={result.opponentFinalCapital}
          startingCapital={match.startingCapital}
        />
      </div>

      <Settlement
        finalPrice={result.finalPrice}
        symbol={match.symbol}
        startingCapital={match.startingCapital}
      />

      <div>
        <Link href={`/history/${match.id}`}>View match summary</Link>
        <Link href="/">
          <ArrowLeft aria-hidden />
          Back to games
        </Link>
      </div>

      <p>{copy.footnote}</p>
    </>
  );
}

const OUTCOME_COPY: Record<
  Outcome,
  { badge: string; heading: string; detail: (opponent: string) => string; footnote: string }
> = {
  win: {
    badge: 'You won',
    heading: 'Victory',
    detail: (opponent) => `You finished with more capital than ${opponent}.`,
    footnote: 'The match is over. No further trades can be placed.',
  },
  loss: {
    badge: 'You lost',
    heading: 'Defeat',
    detail: (opponent) => `${opponent} finished with more capital than you.`,
    footnote: 'The match is over. No further trades can be placed.',
  },
  draw: {
    badge: 'Nobody won',
    heading: 'Draw',
    detail: (opponent) => `You and ${opponent} finished with the exact same capital.`,
    footnote: 'The match is over. No further trades can be placed.',
  },
};

function OutcomeHeader({
  outcome,
  opponentName,
  headingId,
  detailId,
  headingLevel,
}: {
  outcome: Outcome;
  opponentName: string;
  headingId?: string;
  detailId?: string;
  headingLevel: 1 | 2;
}) {
  const copy = OUTCOME_COPY[outcome];
  const Icon = outcome === 'win' ? Trophy : outcome === 'loss' ? CircleX : Equal;
  const Heading = headingLevel === 1 ? 'h1' : 'h2';

  const tone =
    outcome === 'win'
      ? { text: 'text-[#1fcb83]', chip: 'border-[#1fcb83]/30 bg-[#1fcb83]/10' }
      : outcome === 'loss'
        ? { text: 'text-[#f6485d]', chip: 'border-[#f6485d]/30 bg-[#f6485d]/10' }
        : { text: 'text-[#f5a524]', chip: 'border-[#f5a524]/30 bg-[#f5a524]/10' };

  return (
    <div>
      <span className={`${tone.chip} ${tone.text}`}>
        <Icon aria-hidden />
        {copy.badge}
      </span>
      <Heading id={headingId} className={`${tone.text}`}>
        {copy.heading}
      </Heading>
      <p id={detailId}>{copy.detail(opponentName)}</p>
    </div>
  );
}

function PlayerResult({
  name,
  isViewer,
  isWinner,
  isDraw,
  finalCapital,
  startingCapital,
}: {
  name: string;
  isViewer: boolean;
  isWinner: boolean;
  isDraw: boolean;
  finalCapital: number;
  startingCapital: number;
}) {
  const net = Math.round(finalCapital) - Math.round(startingCapital);
  const percent = startingCapital > 0 ? (net / startingCapital) * 100 : null;

  return (
    <div>
      <div>
        <p>
          <span>{name}</span>
          {isViewer ? <span>You</span> : null}
          {isWinner ? (
            <span>
              <Trophy aria-hidden />
              Winner
            </span>
          ) : null}
          {isDraw ? <span>Drew</span> : null}
        </p>
        <p>{fmtUSD(Math.round(finalCapital))}</p>
      </div>

      <div>
        <p>Final Capital</p>
        <p>
          <span aria-hidden>
            Net <span className={`${pnlTone(net)}`}>{signedUSD(net)}</span>
            {percent === null ? null : (
              <span className={`${pnlTone(net)}`}> ({signedPercent(percent)})</span>
            )}
          </span>
          <span className="sr-only">{netSpeech(net, percent)}</span>
        </p>
      </div>
    </div>
  );
}

function Settlement({
  finalPrice,
  symbol,
  startingCapital,
}: {
  finalPrice: number | null;
  symbol: string;
  startingCapital: number;
}) {
  return (
    <div>
      <div>
        <div>
          <p>Settlement price</p>
          <p>
            <span aria-hidden>{finalPrice === null ? '-' : finalPrice.toFixed(2)}</span>
            <span className="sr-only">
              {finalPrice === null ? 'Not available' : spokenPrice(finalPrice)}
            </span>
          </p>
          <p>{symbol}</p>
        </div>

        <div>
          <p>Starting capital</p>
          <p>{fmtUSD(Math.round(startingCapital))}</p>
          <p>Each player</p>
        </div>
      </div>
      <p>
        {finalPrice === null ? (
          'Any exposure still held when time ran out was offset automatically, so every figure above is banked. Nothing is still riding on the market.'
        ) : (
          <>
            Any exposure still held when time ran out was offset automatically at{' '}
            <span>
              <span aria-hidden>{finalPrice.toFixed(2)}</span>
              <span className="sr-only">{spokenPrice(finalPrice)}</span>
            </span>
            , so every figure is banked. Nothing is still riding on the market.
          </>
        )}
      </p>
    </div>
  );
}

function spokenPrice(value: number) {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pnlTone(value: number) {
  if (value > 0) return 'text-[#1fcb83]';
  if (value < 0) return 'text-[#f6485d]';
  return 'text-[#9aa6b6]';
}

function signedUSD(value: number) {
  const rounded = Math.round(value);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '';
  return `${sign}${fmtUSD(Math.abs(rounded))}`;
}

function signedPercent(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function netSpeech(net: number, percent: number | null) {
  const share =
    percent === null ? '' : `, ${Math.abs(percent).toFixed(2)} percent of the starting capital`;
  if (net === 0) return 'Net: level with the starting capital.';
  return net > 0
    ? `Net: up ${fmtUSD(net)}${share}.`
    : `Net: down ${fmtUSD(Math.abs(net))}${share}.`;
}
