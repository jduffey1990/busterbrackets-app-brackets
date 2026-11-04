// src/controllers/simulation.ts
//
// Simulates one tournament from an odds table: every game is a weighted coin
// flip on the better seed's probability, optionally nudged toward a favorite
// team by `boost` percentage points per game. Region order, round-of-64
// pairing and the Final Four pairing (east v midwest, south v west) match what
// Builder.vue produced before the simulation moved server-side, so saved
// brackets keep the same shape.
//
// Randomness comes in through `random` so a run can be reproduced from its
// seed. Pure: no mongodb or hapi imports.

import type { StructuredBracket, RegionBracket } from '../models/tournamentData';
import type { OddsTable } from './odds';
import { ROUND_OF_64_ORDER } from './gameDerivation';

export interface SimulationOptions {
  /** Seed key of the team to favor, e.g. "m1". */
  favorite?: string;
  /** Percentage points added to the favorite's chance in each of its games, 0 to 100. */
  boost?: number;
  /** Uniform [0, 1) source; see rngFromSeed. */
  random: () => number;
}

const REGIONS: { name: keyof Omit<StructuredBracket, 'finals'>; prefix: string }[] = [
  { name: 'east', prefix: 'e' },
  { name: 'midwest', prefix: 'm' },
  { name: 'south', prefix: 's' },
  { name: 'west', prefix: 'w' },
];

/**
 * A canonical seed key: region letter plus seed 1 to 16 with no leading zero.
 * Only this spelling matches the keys the bracket is built from, so "e01"
 * must be rejected rather than parsed, or a favorite spelled that way would
 * pass validation and never receive its boost.
 */
export const SEED_KEY = /^[emsw]([1-9]|1[0-6])$/;

export function seedOf(key: string): number {
  const match = SEED_KEY.exec(key);
  if (!match) throw new RangeError(`"${key}" is not a seed key like "e1"`);
  return parseInt(match[1], 10);
}

/**
 * A small deterministic generator (mulberry32) seeded from any string, so
 * the same seed string always yields the same bracket for the same odds.
 */
export function rngFromSeed(seed: string): () => number {
  // FNV-1a over the string to a 32-bit state.
  let state = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    state ^= seed.charCodeAt(i);
    state = Math.imul(state, 0x01000193);
  }
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function simulateBracket(odds: OddsTable, options: SimulationOptions): StructuredBracket {
  const boost = options.boost ?? 0;
  if (!Number.isFinite(boost) || boost < 0 || boost > 100) throw new RangeError(`boost must be 0 to 100, got ${boost}`);
  const favorite = options.favorite;
  if (favorite !== undefined) seedOf(favorite);

  const play = (a: string, b: string): string => {
    let pA = odds.probability(seedOf(a), seedOf(b));
    if (favorite === a) pA = Math.min(1, pA + boost / 100);
    else if (favorite === b) pA = Math.max(0, pA - boost / 100);
    return options.random() < pA ? a : b;
  };

  const playRound = (pool: string[]): string[] => {
    const winners: string[] = [];
    for (let i = 0; i < pool.length; i += 2) winners.push(play(pool[i], pool[i + 1]));
    return winners;
  };

  const region = (prefix: string): RegionBracket => {
    const round32 = playRound(ROUND_OF_64_ORDER.map((s) => `${prefix}${s}`));
    const sweet16 = playRound(round32);
    const elite8 = playRound(sweet16);
    const [regionChamp] = playRound(elite8);
    return { round32, sweet16, elite8, regionChamp };
  };

  const bracket = {} as StructuredBracket;
  for (const { name, prefix } of REGIONS) bracket[name] = region(prefix);

  const teams = REGIONS.map(({ name }) => bracket[name].regionChamp);
  const semifinals = playRound(teams);
  const [champion] = playRound(semifinals);
  bracket.finals = { teams, semifinals, champion };
  return bracket;
}
