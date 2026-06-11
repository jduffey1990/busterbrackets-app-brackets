"use strict";
// src/controllers/bracketAnalysis.ts
//
// Server-side port of the bracket-comparison and prompt-building logic that
// previously lived in the frontend (ui/src/utils/bracketStruc.js + Breakdown.vue).
// Keeping it here means the client just asks for a breakdown by id and the
// server owns the data, the comparison, and the LLM prompt.
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseTeamNames = void 0;
exports.buildBaseBracket = buildBaseBracket;
exports.formatTeamDisplay = formatTeamDisplay;
exports.formatTeamTitle = formatTeamTitle;
exports.compareBrackets = compareBrackets;
exports.buildPrompt = buildPrompt;
// ─── Generic base names (fallback when no tournament data is loaded) ───
exports.baseTeamNames = (() => {
    const names = {};
    const regions = { e: 'East', w: 'West', m: 'Midwest', s: 'South' };
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
function buildBaseBracket() {
    function buildRegion(prefix) {
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
function formatTeamDisplay(seedString, teamNames) {
    const seed = seedString.slice(1);
    const name = (teamNames === null || teamNames === void 0 ? void 0 : teamNames[seedString]) || exports.baseTeamNames[seedString] || seedString;
    return `${seed}. ${name}`;
}
/**
 * Resolve just the team name (no seed prefix), e.g. "e1" -> "Michigan".
 */
function formatTeamTitle(seedString, teamNames) {
    return (teamNames === null || teamNames === void 0 ? void 0 : teamNames[seedString]) || exports.baseTeamNames[seedString] || seedString;
}
// A pick only counts as an "upset" if it's a double-digit seed (10+).
const UPSET_SEED_THRESHOLD = 10;
function seedOf(seedString) {
    return parseInt(seedString.replace(/\D/g, ''), 10);
}
/**
 * Compare the user's bracket against the official/benchmark bracket.
 *
 * `upsets` are DISTINCT double-digit-seed (10+) teams the user advanced, counted
 * once per team no matter how many rounds they rode them:
 *   - post-tournament (hasResults=true): only teams they picked CORRECTLY, i.e.
 *     the longshots they actually nailed.
 *   - preview (hasResults=false): every such bold pick, since there's nothing to
 *     be "correct" against yet.
 * Returned biggest-underdog-first.
 */
function compareBrackets(official, user, hasResults) {
    let correctPicks = 0;
    let totalGames = 0;
    const upsetSeeds = new Set();
    // Score one slot of the bracket and record qualifying upset picks.
    const consider = (officialPick, userPick) => {
        totalGames++;
        const matched = officialPick === userPick;
        if (matched)
            correctPicks++;
        if (seedOf(userPick) >= UPSET_SEED_THRESHOLD && (hasResults ? matched : true)) {
            upsetSeeds.add(userPick);
        }
    };
    const regions = ['east', 'midwest', 'south', 'west'];
    const rounds = ['round32', 'sweet16', 'elite8'];
    for (const region of regions) {
        const officialRegion = official[region];
        const userRegion = user[region];
        for (const round of rounds) {
            const officialRound = officialRegion[round];
            const userRound = userRegion[round];
            const len = Math.min(officialRound.length, userRound.length);
            for (let i = 0; i < len; i++) {
                consider(officialRound[i], userRound[i]);
            }
        }
        consider(officialRegion.regionChamp, userRegion.regionChamp);
    }
    // Final Four → championship game → champion
    const semiLen = Math.min(official.finals.semifinals.length, user.finals.semifinals.length);
    for (let i = 0; i < semiLen; i++) {
        consider(official.finals.semifinals[i], user.finals.semifinals[i]);
    }
    consider(official.finals.champion, user.finals.champion);
    const upsets = Array.from(upsetSeeds).sort((a, b) => seedOf(b) - seedOf(a));
    return { correctPicks, totalGames, upsets };
}
/**
 * Build the LLM prompt from pre-resolved, verified facts (names already mapped,
 * upsets already deduped). The model is told to write ONLY from these facts so
 * it can't hallucinate teams, results, or storylines from raw bracket JSON.
 */
function buildPrompt(facts) {
    var _a;
    const upsetList = facts.upsetPicks.length ? facts.upsetPicks.join(', ') : 'none';
    if (facts.isPostTournament) {
        return `
You are a sports analyst writing a short, upbeat recap of ONE person's completed tournament bracket for the ${facts.year} college basketball tournament.
Use ONLY the verified facts below. Do not invent any team names, scores, matchups, seeds, or storylines that are not listed. If something isn't in the facts, don't mention it.

VERIFIED FACTS
- Bracket score: ${facts.correctPicks} of ${facts.totalGames} picks correct.
- Their predicted champion: ${facts.userChampion}.
- Actual champion: ${facts.actualChampion}.
- Champion pick correct: ${facts.championMatched ? 'yes' : 'no'}.
- Their predicted last-four teams: ${facts.userFinalFour.join(', ')}.
- Actual last-four teams: ${((_a = facts.actualFinalFour) !== null && _a !== void 0 ? _a : []).join(', ')}.
- Double-digit-seed underdogs they correctly called: ${upsetList}.

Write at most three paragraphs, sportscaster style:
1. Their best correct underdog calls. If "none", say they mostly played the favorites rather than inventing upsets.
2. How their champion prediction turned out (use the facts above — do not contradict them).
3. A one-line overall performance summary based on the score.
Do NOT use the trademarked phrases "March Madness", "NCAA", "Sweet Sixteen", "Elite Eight", or "Final Four".
`;
    }
    return `
You are a sports analyst writing a short, upbeat PREVIEW of ONE person's bracket picks for the upcoming ${facts.year} college basketball tournament. The tournament has NOT happened yet — these are prospective picks.
Use ONLY the verified facts below. Do not invent any team names, results, seeds, or storylines that are not listed.

VERIFIED FACTS
- Their predicted champion: ${facts.userChampion}.
- Their predicted last-four teams: ${facts.userFinalFour.join(', ')}.
- Bold double-digit-seed underdogs they're riding: ${upsetList}.

Write at most three short paragraphs, sportscaster style:
1. The boldest underdog picks they're making. If "none", note they're playing it safe rather than inventing upsets.
2. Their championship pick and why it's intriguing.
3. Keep it forward-looking — the games haven't been played yet.
Do NOT use the trademarked phrases "March Madness", "NCAA", "Sweet Sixteen", "Elite Eight", or "Final Four".
`;
}
