// src/controllers/odds.ts
//
// The odds model: for every pair of seeds, the probability that the better
// (lower-number) seed wins, computed from the games played before the
// tournament being simulated.
//
// Two ingredients. A Bradley-Terry fit gives each seed a strength from every
// game in the history, so even a pairing that has rarely or never happened
// (a 6 against a 15, say) gets a sensible number. The observed record for a
// pairing is then shrunk toward that fitted probability as if the fit were
// worth `priorStrength` extra games: a 1 v 16 record of 162-2 barely moves,
// while a 1 v 12 record of 20-0 lands near 90 percent instead of a certainty.
//
// scripts/backtestOdds.ts scores the choices on held-out seasons. Raw records
// alone and the legacy step rule both score worse than any shrinkage; every
// strength from 10 up scores within a thousandth of the fit alone, inside the
// noise of the sample, so 80 (the best finite value tried) is the default.
//
// Pure: no mongodb or hapi imports.

import type { MatchupGame } from './seedRecords';
import { matchupKey, seedRecords } from './seedRecords';

export const SEED_COUNT = 16;

/** Pseudo-games of Bradley-Terry prior mixed into each pairing's record. */
export const DEFAULT_PRIOR_STRENGTH = 80;

export interface OddsOptions {
  priorStrength?: number;
}

export interface MatchupOdds {
  wins: number;        // games the better seed won
  losses: number;      // games the worse seed won
  prior: number;       // Bradley-Terry probability for the better seed
  probability: number; // shrunk probability for the better seed
}

export interface OddsTable {
  priorStrength: number;
  /** Bradley-Terry strength per seed, index 1..16 (index 0 unused), geometric mean 1. */
  strengths: number[];
  /** Every pairing "AvsB" with A < B. */
  matchups: Map<string, MatchupOdds>;
  /** P(seedA beats seedB); 0.5 for equal seeds. */
  probability(seedA: number, seedB: number): number;
}

function assertSeed(seed: number): void {
  if (!Number.isInteger(seed) || seed < 1 || seed > SEED_COUNT) {
    throw new RangeError(`seed ${seed} is not an integer from 1 to ${SEED_COUNT}`);
  }
}

/**
 * Bradley-Terry strengths by the minorization-maximization iteration
 * (Hunter 2004). Each seed also records one win and one loss against a
 * fixed-strength dummy, the usual regularization, so a seed with no wins in
 * the data still gets a finite strength. Deterministic for a given input.
 */
export function fitSeedStrengths(games: MatchupGame[], iterations = 1000, tolerance = 1e-12): number[] {
  const wins = new Array<number>(SEED_COUNT + 1).fill(1); // one virtual win each
  const played: number[][] = Array.from({ length: SEED_COUNT + 1 }, () => new Array<number>(SEED_COUNT + 1).fill(0));

  for (const g of games) {
    assertSeed(g.seedA);
    assertSeed(g.seedB);
    if (g.seedA === g.seedB) continue;
    wins[g.winner === 'A' ? g.seedA : g.seedB]++;
    played[g.seedA][g.seedB]++;
    played[g.seedB][g.seedA]++;
  }

  let strengths = new Array<number>(SEED_COUNT + 1).fill(1);
  for (let iter = 0; iter < iterations; iter++) {
    const next = new Array<number>(SEED_COUNT + 1).fill(0);
    for (let i = 1; i <= SEED_COUNT; i++) {
      let denominator = 2 / (strengths[i] + 1); // the two virtual games against the dummy
      for (let j = 1; j <= SEED_COUNT; j++) {
        if (played[i][j] > 0) denominator += played[i][j] / (strengths[i] + strengths[j]);
      }
      next[i] = wins[i] / denominator;
    }
    // Fix the scale: geometric mean 1.
    const logMean = next.slice(1).reduce((acc, s) => acc + Math.log(s), 0) / SEED_COUNT;
    const scale = Math.exp(logMean);
    let delta = 0;
    for (let i = 1; i <= SEED_COUNT; i++) {
      next[i] /= scale;
      delta = Math.max(delta, Math.abs(next[i] - strengths[i]));
    }
    strengths = next;
    if (delta < tolerance) break;
  }
  return strengths;
}

export function buildOdds(games: MatchupGame[], options: OddsOptions = {}): OddsTable {
  const priorStrength = options.priorStrength ?? DEFAULT_PRIOR_STRENGTH;
  if (!(priorStrength >= 0)) throw new RangeError(`priorStrength must be a non-negative number, got ${priorStrength}`);

  const strengths = fitSeedStrengths(games);
  const records = seedRecords(games);
  const matchups = new Map<string, MatchupOdds>();

  for (let a = 1; a <= SEED_COUNT; a++) {
    for (let b = a + 1; b <= SEED_COUNT; b++) {
      const key = matchupKey(a, b);
      const record = records.get(key) ?? { wins: 0, losses: 0 };
      const played = record.wins + record.losses;
      const prior = strengths[a] / (strengths[a] + strengths[b]);
      const probability = played + priorStrength === 0
        ? prior
        : (record.wins + priorStrength * prior) / (played + priorStrength);
      matchups.set(key, { ...record, prior, probability });
    }
  }

  return {
    priorStrength,
    strengths,
    matchups,
    probability(seedA: number, seedB: number): number {
      assertSeed(seedA);
      assertSeed(seedB);
      if (seedA === seedB) return 0.5;
      const favored = matchups.get(matchupKey(seedA, seedB))!.probability;
      return seedA < seedB ? favored : 1 - favored;
    },
  };
}
