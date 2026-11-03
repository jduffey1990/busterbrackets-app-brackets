// src/scripts/seedTournamentData.ts
//
// Seeds the tournamentData collection with the 2025 bracket that was
// previously hardcoded in the frontend's bracketStruc.js.
//
// Also seeds the 2025 tournament results from bracketFinalYears["2025"],
// and the full 2026 field and official results.
//
// Usage:
//   npx ts-node src/scripts/seedTournamentData.ts

import { ObjectId } from 'mongodb';
import { DatabaseService } from '../controllers/mongodb.service';
import dotenv from 'dotenv';
import { teams2026, results2026 } from '../data/tournament2026';
import { gamesFromBracket } from '../controllers/gameDerivation';
import { TournamentGameService } from '../controllers/tournamentGameService';
dotenv.config();

const teams2025: Record<string, string> = {
  // EAST
  e1: "Duke", e2: "Alabama", e3: "Wisconsin", e4: "Arizona",
  e5: "Oregon", e6: "BYU", e7: "St. Mary's", e8: "Mississippi St.",
  e9: "Baylor", e10: "Vanderbilt", e11: "VCU", e12: "Liberty",
  e13: "Akron", e14: "Montana", e15: "Robert Morris", e16: "Mt. St. Mary's",

  // MIDWEST
  m1: "Houston", m2: "Tennessee", m3: "Kentucky", m4: "Purdue",
  m5: "Clemson", m6: "Illinois", m7: "UCLA", m8: "Gonzaga",
  m9: "Georgia", m10: "Utah St.", m11: "Xavier", m12: "McNeese",
  m13: "High Point", m14: "Troy", m15: "Wofford", m16: "SIUE",

  // SOUTH
  s1: "Auburn", s2: "Michigan St.", s3: "Iowa St.", s4: "Texas A&M",
  s5: "Michigan", s6: "Ole Miss", s7: "Marquette", s8: "Louisville",
  s9: "Creighton", s10: "New Mexico", s11: "UNC", s12: "UCSD",
  s13: "Yale", s14: "Lipscomb", s15: "Bryant", s16: "Alabama St.",

  // WEST
  w1: "Florida", w2: "St. John's", w3: "Texas Tech", w4: "Maryland",
  w5: "Memphis", w6: "Missouri", w7: "Kansas", w8: "UConn",
  w9: "Oklahoma", w10: "Arkansas", w11: "Drake", w12: "Colorado St.",
  w13: "Grand Canyon", w14: "UNCW", w15: "Omaha", w16: "Norfolk St.",
};

// 2025 official results, converted from the old bracketFinalYears["2025"].
// Verified game by game against the Kaggle-derived 2025 rows in
// src/data/historical-games.json: all 63 games and winners agree.
const results2025 = {
  east: {
    round32: ["e1", "e9", "e5", "e4", "e6", "e3", "e7", "e2"],
    sweet16: ["e1", "e4", "e6", "e2"],
    elite8: ["e1", "e2"],
    regionChamp: "e1",
  },
  midwest: {
    round32: ["m1", "m8", "m12", "m4", "m6", "m3", "m7", "m2"],
    sweet16: ["m1", "m4", "m3", "m2"],
    elite8: ["m1", "m2"],
    regionChamp: "m1",
  },
  south: {
    round32: ["s1", "s9", "s5", "s4", "s6", "s3", "s10", "s2"],
    sweet16: ["s1", "s5", "s6", "s2"],
    elite8: ["s1", "s2"],
    regionChamp: "s1",
  },
  west: {
    round32: ["w1", "w8", "w12", "w4", "w11", "w3", "w10", "w2"],
    sweet16: ["w1", "w4", "w3", "w10"],
    elite8: ["w1", "w3"],
    regionChamp: "w1",
  },
  finals: {
    // Ordered as the 2025 semifinals were played (Florida v Auburn,
    // Duke v Houston) so each pair of teams is one game.
    teams: ["w1", "s1", "e1", "m1"],
    semifinals: ["w1", "m1"],  // Florida 79-73 Auburn, Houston 70-67 Duke
    champion: "w1",            // Florida 65-63 Houston
  },
};

const seasons = [
  { year: 2025, teams: teams2025, results: results2025 },
  { year: 2026, teams: teams2026, results: results2026 },
];

async function seed() {
  const dbService = DatabaseService.getInstance();
  try {
    await dbService.connect();
    const db = dbService.getDb();
    const collection = db.collection('tournamentData');

    for (const { year, teams, results } of seasons) {
      // Additive: never overwrite a year that already exists
      const existing = await collection.findOne({ year });
      if (existing) {
        console.log(`Tournament data for ${year} already exists. Skipping.`);
        continue;
      }

      const now = new Date();
      await collection.insertOne({
        _id: new ObjectId(),
        year,
        teams,
        results,
        createdAt: now,
        updatedAt: now,
      });

      const games = await TournamentGameService.replaceYear(year, gamesFromBracket(year, results));
      console.log(`✅ Seeded ${year} tournament data successfully (${games} games).`);
    }
  } catch (error) {
    console.error('Failed to seed tournament data:', error);
  } finally {
    await dbService.disconnect();
  }
}

seed().catch(console.error);