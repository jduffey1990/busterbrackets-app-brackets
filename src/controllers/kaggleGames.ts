// src/controllers/kaggleGames.ts
//
// Pure conversion of Kaggle's March Machine Learning Mania tournament files
// into DerivedGame rows. Used once to backfill the years before the app
// tracked results itself (see scripts/convertKaggleGames.ts).
//
// Inputs are the parsed rows of MNCAATourneyCompactResults.csv (one row per
// game, winner and loser team ids), MNCAATourneySeeds.csv (seed string per
// team per season, e.g. "W01" or "Y16a") and MSeasons.csv (the real region
// name behind each of the W/X/Y/Z letters, per season).
//
// Rounds are derived structurally: in single elimination a team's n-th game
// is round n, so the round of a game is one more than the winner's prior
// wins. Day numbers are not used for that; they drift in unusual seasons.
// First Four games (both teams share a seed base like "W16") are not part of
// the 64-team bracket and are skipped.

import type { DerivedGame } from './gameDerivation';
import type { GameRound } from '../models/tournamentGame';

const ROUNDS: GameRound[] = ['round64', 'round32', 'sweet16', 'elite8', 'semifinal', 'championship'];

/** Minimal CSV reader for Kaggle's plain, unquoted files. */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  if (text.includes('"')) throw new Error('parseCsv: quoted fields are not supported');
  const header = lines[0].split(',');
  return lines.slice(1).map((line, i) => {
    const cells = line.split(',');
    if (cells.length !== header.length) throw new Error(`parseCsv: line ${i + 2} has ${cells.length} cells, expected ${header.length}`);
    return Object.fromEntries(header.map((h, j) => [h, cells[j]]));
  });
}

interface SeedInfo {
  region: string;
  seed: number;
  base: string; // "W16" for both "W16a" and "W16b"
}

export interface KaggleConversion {
  games: DerivedGame[];
  skippedPlayIns: number;
  notes: string[]; // anything irregular, for the operator to read
}

export function gamesFromKaggle(
  results: Record<string, string>[],
  seeds: Record<string, string>[],
  seasons: Record<string, string>[],
): KaggleConversion {
  const regionsBySeason = new Map<number, Record<string, string>>();
  for (const s of seasons) {
    regionsBySeason.set(Number(s.Season), {
      W: s.RegionW.toLowerCase(),
      X: s.RegionX.toLowerCase(),
      Y: s.RegionY.toLowerCase(),
      Z: s.RegionZ.toLowerCase(),
    });
  }

  const seedByTeam = new Map<string, SeedInfo>(); // key "season:teamId"
  for (const s of seeds) {
    const season = Number(s.Season);
    const match = /^([WXYZ])(\d{2})([ab]?)$/.exec(s.Seed);
    const regions = regionsBySeason.get(season);
    if (!match || !regions) throw new Error(`Unrecognised seed "${s.Seed}" in season ${season}`);
    seedByTeam.set(`${season}:${s.TeamID}`, {
      region: regions[match[1]],
      seed: Number(match[2]),
      base: match[1] + match[2],
    });
  }

  const games: DerivedGame[] = [];
  const notes: string[] = [];
  let skippedPlayIns = 0;

  // Process each season in day order so prior-win counts are right.
  const ordered = results
    .map((r, i) => ({ season: Number(r.Season), day: Number(r.DayNum), w: r.WTeamID, l: r.LTeamID, i }))
    .sort((a, b) => a.season - b.season || a.day - b.day || a.i - b.i);

  const wins = new Map<string, number>(); // "season:teamId" -> bracket wins so far

  for (const g of ordered) {
    const wKey = `${g.season}:${g.w}`;
    const lKey = `${g.season}:${g.l}`;
    const ws = seedByTeam.get(wKey);
    const ls = seedByTeam.get(lKey);
    if (!ws || !ls) throw new Error(`Season ${g.season}: no seed for team ${!ws ? g.w : g.l}`);

    if (ws.base === ls.base) {
      skippedPlayIns++; // First Four: same seed line, not a bracket game
      continue;
    }

    const wWins = wins.get(wKey) ?? 0;
    const lWins = wins.get(lKey) ?? 0;
    if (wWins !== lWins) {
      // A team advanced without playing (2021: VCU's no-contest). The game is
      // the round the further-along team is in.
      notes.push(`${g.season} day ${g.day}: ${ws.base} (${wWins} wins) vs ${ls.base} (${lWins} wins) reached the game unevenly`);
    }
    const roundIndex = Math.max(wWins, lWins);
    const round = ROUNDS[roundIndex];
    if (!round) throw new Error(`Season ${g.season}: more than six rounds for ${ws.base}`);
    if (roundIndex < 4 && ws.region !== ls.region) {
      notes.push(`${g.season} ${round}: ${ws.base} and ${ls.base} are from different regions`);
    }

    // Favored (lower seed number) is side A; on equal seeds the winner is A.
    const winnerIsA = ws.seed <= ls.seed;
    const [a, b] = winnerIsA ? [ws, ls] : [ls, ws];
    games.push({
      year: g.season,
      round,
      regionA: a.region,
      seedA: a.seed,
      regionB: b.region,
      seedB: b.seed,
      winner: winnerIsA ? 'A' : 'B',
    });
    wins.set(wKey, wWins + 1);
  }

  return { games, skippedPlayIns, notes };
}
