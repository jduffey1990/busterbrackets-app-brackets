// src/controllers/gameDerivation.ts
//
// Pure derivation of individual games from a StructuredBracket. Seed matchups
// are fixed by bracket position (1v16, 8v9, 5v12, ...), so a results document
// keyed by seed is enough to recover every game: who played whom and who won.
// Partial results (a null or empty slot) simply yield fewer games; a winner
// that was not in its game is a data-entry error and throws.
//
// No mongodb or hapi imports here: this module is the testable core.

import type { StructuredBracket, RegionBracket } from '../models/tournamentData';
import type { GameRound } from '../models/tournamentGame';

export interface DerivedGame {
  year: number;
  round: GameRound;
  regionA: string;
  seedA: number;
  regionB: string;
  seedB: number;
  winner: 'A' | 'B';
}

/** Round-of-64 seed order within a region, top slot to bottom slot. */
export const ROUND_OF_64_ORDER = [1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15];

const REGION_BY_PREFIX: Record<string, string> = { e: 'east', m: 'midwest', s: 'south', w: 'west' };

export class BracketConsistencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BracketConsistencyError';
  }
}

interface ParsedKey {
  region: string;
  seed: number;
}

function parseKey(key: string, context: string): ParsedKey {
  const match = /^([emsw])(\d{1,2})$/.exec(key);
  const seed = match ? parseInt(match[2], 10) : NaN;
  if (!match || seed < 1 || seed > 16) {
    throw new BracketConsistencyError(`${context}: "${key}" is not a seed key like "e1"`);
  }
  return { region: REGION_BY_PREFIX[match[1]], seed };
}

type Slot = string | null | undefined;

/**
 * Pair up `participants` two at a time and read each game's winner from
 * `winners[i]`. A missing participant or winner means the game has not been
 * played (or entered) yet and is skipped. When `expectedRegion` is given,
 * every key must belong to that region.
 */
function pairRound(
  year: number,
  round: GameRound,
  participants: Slot[],
  winners: Slot[],
  expectedRegion?: string,
): DerivedGame[] {
  const games: DerivedGame[] = [];
  for (let i = 0; i * 2 + 1 < participants.length; i++) {
    const a = participants[i * 2];
    const b = participants[i * 2 + 1];
    const w = winners[i];
    if (!a || !b || !w) continue;

    const context = `${year} ${round} game ${i + 1}`;
    const pa = parseKey(a, context);
    const pb = parseKey(b, context);
    if (expectedRegion && (pa.region !== expectedRegion || pb.region !== expectedRegion)) {
      throw new BracketConsistencyError(`${context}: ${a} vs ${b} is not in the ${expectedRegion} region`);
    }
    if (w !== a && w !== b) {
      throw new BracketConsistencyError(`${context}: winner ${w} did not play (${a} vs ${b})`);
    }

    games.push({
      year,
      round,
      regionA: pa.region,
      seedA: pa.seed,
      regionB: pb.region,
      seedB: pb.seed,
      winner: w === a ? 'A' : 'B',
    });
  }
  return games;
}

function regionGames(year: number, region: string, prefix: string, bracket: RegionBracket): DerivedGame[] {
  const round64 = ROUND_OF_64_ORDER.map((s) => `${prefix}${s}`);
  return [
    ...pairRound(year, 'round64', round64, bracket.round32 ?? [], region),
    ...pairRound(year, 'round32', bracket.round32 ?? [], bracket.sweet16 ?? [], region),
    ...pairRound(year, 'sweet16', bracket.sweet16 ?? [], bracket.elite8 ?? [], region),
    ...pairRound(year, 'elite8', bracket.elite8 ?? [], [bracket.regionChamp], region),
  ];
}

/**
 * Every game recoverable from `bracket`: up to 63 for a finished tournament,
 * fewer while results are still being entered, none for `null`.
 */
export function gamesFromBracket(year: number, bracket: StructuredBracket | null | undefined): DerivedGame[] {
  if (!bracket) return [];

  const games = [
    ...regionGames(year, 'east', 'e', bracket.east),
    ...regionGames(year, 'midwest', 'm', bracket.midwest),
    ...regionGames(year, 'south', 's', bracket.south),
    ...regionGames(year, 'west', 'w', bracket.west),
  ];

  const finals = bracket.finals;
  if (finals) {
    games.push(...pairRound(year, 'semifinal', finals.teams ?? [], finals.semifinals ?? []));
    games.push(...pairRound(year, 'championship', finals.semifinals ?? [], [finals.champion]));
  }
  return games;
}
