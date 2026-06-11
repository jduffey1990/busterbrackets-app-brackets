// src/controllers/bracketAnalysis.ts
//
// Server-side port of the bracket-comparison and prompt-building logic that
// previously lived in the frontend (ui/src/utils/bracketStruc.js + Breakdown.vue).
// Keeping it here means the client just asks for a breakdown by id and the
// server owns the data, the comparison, and the LLM prompt.

import { StructuredBracket } from '../models/tournamentData';

export interface ComparisonStats {
  correctPicks: number;
  totalGames: number;
  upsets: string[]; // seed strings, e.g. "e3"
}

// ─── Generic base names (fallback when no tournament data is loaded) ───

export const baseTeamNames: Record<string, string> = (() => {
  const names: Record<string, string> = {};
  const regions: Record<string, string> = { e: 'East', w: 'West', m: 'Midwest', s: 'South' };
  for (const [prefix, regionName] of Object.entries(regions)) {
    for (let seed = 1; seed <= 16; seed++) {
      names[`${prefix}${seed}`] = `${regionName} ${seed} Seed`;
    }
  }
  return names;
})();

/**
 * Build a "base" (all-favorites) StructuredBracket for comparison.
 * Each round the lower seed (favorite) wins.
 */
export function buildBaseBracket(): StructuredBracket {
  function buildRegion(prefix: string) {
    // R64 matchups in bracket order: 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15
    const round32 = [1, 8, 5, 4, 6, 3, 7, 2].map((s) => `${prefix}${s}`);
    // S16: 1v8→1, 5v4→4, 6v3→3, 7v2→2
    const sweet16 = [1, 4, 3, 2].map((s) => `${prefix}${s}`);
    // E8: 1v4→1, 3v2→2
    const elite8 = [1, 2].map((s) => `${prefix}${s}`);
    const regionChamp = `${prefix}1`;
    return { round32, sweet16, elite8, regionChamp };
  }

  return {
    east: buildRegion('e'),
    midwest: buildRegion('m'),
    south: buildRegion('s'),
    west: buildRegion('w'),
    finals: {
      teams: ['e1', 'm1', 's1', 'w1'],
      semifinals: ['e1', 's1'],
      champion: 'e1',
    },
  };
}

/**
 * Format a seed string like "e3" into "3. Wisconsin" (or "3. East 3 Seed" fallback).
 */
export function formatTeamDisplay(seedString: string, teamNames: Record<string, string>): string {
  const seed = seedString.slice(1);
  const name = teamNames?.[seedString] || baseTeamNames[seedString] || seedString;
  return `${seed}. ${name}`;
}

/**
 * Compare two structured brackets and return stats.
 * An "upset" is a user pick whose seed is higher (worse) than the official pick.
 */
export function compareBrackets(official: StructuredBracket, user: StructuredBracket): ComparisonStats {
  let correctPicks = 0;
  let totalGames = 0;
  const upsets: string[] = [];

  const regions: (keyof StructuredBracket)[] = ['east', 'midwest', 'south', 'west'];
  const rounds: (keyof Omit<StructuredBracket['east'], 'regionChamp'>)[] = ['round32', 'sweet16', 'elite8'];

  for (const region of regions) {
    const officialRegion = official[region] as StructuredBracket['east'];
    const userRegion = user[region] as StructuredBracket['east'];

    for (const round of rounds) {
      const officialRound = officialRegion[round];
      const userRound = userRegion[round];
      const len = Math.min(officialRound.length, userRound.length);
      for (let i = 0; i < len; i++) {
        totalGames++;
        if (officialRound[i] === userRound[i]) {
          correctPicks++;
        } else {
          const officialSeed = parseInt(officialRound[i].replace(/\D/g, ''), 10);
          const userSeed = parseInt(userRound[i].replace(/\D/g, ''), 10);
          if (userSeed > officialSeed) {
            upsets.push(userRound[i]);
          }
        }
      }
    }

    // Region champ
    totalGames++;
    if (officialRegion.regionChamp === userRegion.regionChamp) {
      correctPicks++;
    }
  }

  // Finals
  for (let i = 0; i < official.finals.semifinals.length; i++) {
    totalGames++;
    if (official.finals.semifinals[i] === user.finals.semifinals[i]) {
      correctPicks++;
    } else {
      const officialSeed = parseInt(official.finals.semifinals[i].replace(/\D/g, ''), 10);
      const userSeed = parseInt(user.finals.semifinals[i].replace(/\D/g, ''), 10);
      if (userSeed > officialSeed) {
        upsets.push(user.finals.semifinals[i]);
      }
    }
  }

  // Champion
  totalGames++;
  if (official.finals.champion === user.finals.champion) {
    correctPicks++;
  }

  return { correctPicks, totalGames, upsets };
}

/**
 * Build the LLM prompt. Post-tournament reviews actual results; otherwise it's
 * a prospective preview compared against the all-favorites base bracket.
 */
export function buildPrompt(params: {
  isPostTournament: boolean;
  year: string;
  userBracket: StructuredBracket;
  officialBracket: StructuredBracket;
  comparison: ComparisonStats;
  teamNames: Record<string, string>;
}): string {
  const { isPostTournament, year, userBracket, officialBracket, comparison, teamNames } = params;
  const teamNamesJson = JSON.stringify(teamNames);

  if (isPostTournament) {
    return `
      You are a sports analyst reviewing a college basketball tournament bracket.
      Year: ${year}
      User's bracket: ${JSON.stringify(userBracket)}
      Official results: ${JSON.stringify(officialBracket)}
      Comparison stats: ${JSON.stringify(comparison)}
      Team names mapping: ${teamNamesJson}

      Please write a short (three paragraph max), sportscaster-style post-tournament analysis without copyright infringement describing:
      1. Notable correct upset picks (two sentences max)
      2. How the bracket winner prediction fared (two sentences max)
      3. Overall bracket performance summary
      4. Do not hallucinate storylines not present in the data.
      5. Exclude words "March Madness, NCAA, Sweet Sixteen, Elite Eight, Final Four" due to copyright
    `;
  }

  return `
    You are a sports analyst previewing a college basketball tournament bracket.
    Year: ${year}
    User's bracket: ${JSON.stringify(userBracket)}
    Benchmark bracket: ${JSON.stringify(officialBracket)}
    Comparison stats: ${JSON.stringify(comparison)}
    Team names mapping: ${teamNamesJson}

    Please write a short (three paragraph max), sportscaster-style preview without copyright infringement describing:
    1. Two notable upsets they picked compared to benchmark (two sentences max) either:
        a. big underdog (seed over 12)
        b. deep run underdogs
    2. Bracket winner (two sentences max)
    3. Remember that the tournament hasn't actually happened, yet, so these are prospective picks.
    4. Do not hallucinate past years results or storylines.
    5. Exclude words "March Madness, NCAA, Sweet Sixteen, Elite Eight, Final Four" due to copyright
  `;
}
