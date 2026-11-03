// src/data/tournament2026.ts
//
// The 2026 field and official results. Shared by the seed script and the
// game-derivation tests so both read one copy.
import { StructuredBracket } from '../models/tournamentData';

// 2026 field. First Four winners are listed in their seed slot:
// Midwest 16 Howard (over UMBC), Midwest 11 Miami (OH) (over SMU),
// West 11 Texas (over NC State), South 16 Prairie View A&M (over Lehigh).
export const teams2026: Record<string, string> = {
  // EAST
  e1: "Duke", e2: "UConn", e3: "Michigan St.", e4: "Kansas",
  e5: "St. John's", e6: "Louisville", e7: "UCLA", e8: "Ohio St.",
  e9: "TCU", e10: "UCF", e11: "South Florida", e12: "Northern Iowa",
  e13: "Cal Baptist", e14: "North Dakota St.", e15: "Furman", e16: "Siena",

  // MIDWEST
  m1: "Michigan", m2: "Iowa St.", m3: "Virginia", m4: "Alabama",
  m5: "Texas Tech", m6: "Tennessee", m7: "Kentucky", m8: "Georgia",
  m9: "Saint Louis", m10: "Santa Clara", m11: "Miami (OH)", m12: "Akron",
  m13: "Hofstra", m14: "Wright St.", m15: "Tennessee St.", m16: "Howard",

  // SOUTH
  s1: "Florida", s2: "Houston", s3: "Illinois", s4: "Nebraska",
  s5: "Vanderbilt", s6: "UNC", s7: "St. Mary's", s8: "Clemson",
  s9: "Iowa", s10: "Texas A&M", s11: "VCU", s12: "McNeese",
  s13: "Troy", s14: "Penn", s15: "Idaho", s16: "Prairie View A&M",

  // WEST
  w1: "Arizona", w2: "Purdue", w3: "Gonzaga", w4: "Arkansas",
  w5: "Wisconsin", w6: "BYU", w7: "Miami (FL)", w8: "Villanova",
  w9: "Utah St.", w10: "Missouri", w11: "Texas", w12: "High Point",
  w13: "Hawaii", w14: "Kennesaw St.", w15: "Queens", w16: "LIU",
};

// 2026 official results. Michigan beat UConn 69-63 on April 6, 2026.
export const results2026: StructuredBracket = {
  east: {
    round32: ["e1", "e9", "e5", "e4", "e6", "e3", "e7", "e2"],
    sweet16: ["e1", "e5", "e3", "e2"],
    elite8: ["e1", "e2"],
    regionChamp: "e2",        // UConn 73-72 over Duke
  },
  midwest: {
    round32: ["m1", "m9", "m5", "m4", "m6", "m3", "m7", "m2"],
    sweet16: ["m1", "m4", "m6", "m2"],
    elite8: ["m1", "m6"],
    regionChamp: "m1",        // Michigan 95-62 over Tennessee
  },
  south: {
    round32: ["s1", "s9", "s5", "s4", "s11", "s3", "s10", "s2"],
    sweet16: ["s9", "s4", "s3", "s2"],
    elite8: ["s9", "s3"],
    regionChamp: "s3",        // Illinois 71-59 over Iowa
  },
  west: {
    round32: ["w1", "w9", "w12", "w4", "w11", "w3", "w7", "w2"],
    sweet16: ["w1", "w4", "w11", "w2"],
    elite8: ["w1", "w2"],
    regionChamp: "w1",        // Arizona 79-64 over Purdue
  },
  finals: {
    // Ordered as the 2026 semifinals were actually played (East v South,
    // West v Midwest) so Bracket.vue's chunk-by-2 renders the real games.
    teams: ["e2", "s3", "w1", "m1"],
    semifinals: ["e2", "m1"], // UConn 71-62 Illinois, Michigan 91-73 Arizona
    champion: "m1",
  },
};
