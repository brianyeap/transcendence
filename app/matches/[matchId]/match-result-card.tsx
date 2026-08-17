'use client';

import type React from 'react';
import type { Match, PlayerRef } from '@/lib/match/types';

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
}: {
  result: MatchResultData;
  match: Match;
  viewerUserId: string;
}): React.ReactElement {
  const outcome: Outcome =
    result.winnerUserId === null ? 'draw' : result.winnerUserId === viewerUserId ? 'win' : 'loss';

  const viewerIsPlayerOne = match.playerOne.userId === viewerUserId;
  const you: PlayerRef = viewerIsPlayerOne
    ? match.playerOne
    : (match.playerTwo ?? { userId: viewerUserId, username: 'You' });

  const opponent: PlayerRef | null = viewerIsPlayerOne ? match.playerTwo : match.playerOne;
  const opponentName = opponent?.username ?? 'Your opponent';

  return <></>;
}
