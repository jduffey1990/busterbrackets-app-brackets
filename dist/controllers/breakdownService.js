"use strict";
// src/controllers/breakdownService.ts
//
// Owns the full bracket-breakdown flow server-side: load the bracket + tournament
// data, run the comparison, build the prompt, call OpenAI (with a persistent
// cache so we don't re-bill), and return everything the UI needs to render.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreakdownService = void 0;
const bracketService_1 = require("./bracketService");
const tournamentDataService_1 = require("./tournamentDataService");
const bracketAnalysis_1 = require("./bracketAnalysis");
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';
// Bump this whenever the prompt or comparison logic changes so previously
// cached narratives are regenerated instead of served stale.
const PROMPT_VERSION = 'v2';
const DEV_MOCK = `This bracket features some bold picks that challenge conventional seeding wisdom. The user isn't afraid to back underdogs in key matchups, showing confidence in teams that many would overlook.

Notable upset selections include some intriguing lower-seeded teams advancing deeper than expected, which could create exciting narratives if the tournament unfolds this way.

Overall, this bracket balances favorite picks in the early rounds with some calculated risks in the later stages, making for a compelling set of predictions.`;
class BreakdownService {
    /**
     * Build (or return a cached) breakdown for a bracket by id.
     * Returns null if the bracket doesn't exist. Throws if OpenAI fails.
     */
    static buildBreakdown(bracketId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const bracket = yield bracketService_1.BracketService.findBracketById(bracketId);
            if (!bracket) {
                return null;
            }
            const year = new Date(bracket.createdAt).getFullYear();
            const tournamentData = yield tournamentDataService_1.TournamentDataService.findByYear(year);
            const teamNames = (_a = tournamentData === null || tournamentData === void 0 ? void 0 : tournamentData.teams) !== null && _a !== void 0 ? _a : {};
            const results = (_b = tournamentData === null || tournamentData === void 0 ? void 0 : tournamentData.results) !== null && _b !== void 0 ? _b : null;
            const isPostTournament = !!results;
            const officialBracket = results !== null && results !== void 0 ? results : (0, bracketAnalysis_1.buildBaseBracket)();
            const comparison = (0, bracketAnalysis_1.compareBrackets)(officialBracket, bracket.bracket, isPostTournament);
            const stats = {
                correctPicks: comparison.correctPicks,
                totalGames: comparison.totalGames,
                upsets: comparison.upsets.map((seed) => (0, bracketAnalysis_1.formatTeamDisplay)(seed, teamNames)),
            };
            // Reuse the cached narrative only if it's the current prompt version AND the
            // same mode (preview vs post-tournament). Otherwise regenerate.
            const cache = bracket.aiBreakdown;
            let content = null;
            if (cache && cache.promptVersion === PROMPT_VERSION && cache.isPostTournament === isPostTournament) {
                content = cache.content;
            }
            else {
                const facts = this.buildFacts({
                    year,
                    isPostTournament,
                    userBracket: bracket.bracket,
                    officialBracket,
                    comparison,
                    teamNames,
                });
                try {
                    content = yield this.generate((0, bracketAnalysis_1.buildPrompt)(facts));
                    yield bracketService_1.BracketService.saveBreakdown(bracketId, {
                        content,
                        isPostTournament,
                        promptVersion: PROMPT_VERSION,
                        generatedAt: new Date(),
                    });
                }
                catch (err) {
                    // Narrative generation failed (e.g. OpenAI quota/outage). Degrade
                    // gracefully: still return the correct stats; the UI renders the recap
                    // as temporarily unavailable rather than failing the whole request.
                    console.error('Breakdown narrative generation failed:', (_c = err === null || err === void 0 ? void 0 : err.message) !== null && _c !== void 0 ? _c : err);
                    content = null;
                }
            }
            return { content, isPostTournament, bracketName: bracket.name, stats };
        });
    }
    /** Resolve seed strings to names and assemble the verified facts for the prompt. */
    static buildFacts(args) {
        const { year, isPostTournament, userBracket, officialBracket, comparison, teamNames } = args;
        const name = (seed) => (0, bracketAnalysis_1.formatTeamTitle)(seed, teamNames);
        const facts = {
            year: String(year),
            isPostTournament,
            correctPicks: comparison.correctPicks,
            totalGames: comparison.totalGames,
            userChampion: name(userBracket.finals.champion),
            userFinalFour: userBracket.finals.teams.map(name),
            upsetPicks: comparison.upsets.map((seed) => (0, bracketAnalysis_1.formatTeamDisplay)(seed, teamNames)),
        };
        if (isPostTournament) {
            facts.actualChampion = name(officialBracket.finals.champion);
            facts.actualFinalFour = officialBracket.finals.teams.map(name);
            facts.championMatched = userBracket.finals.champion === officialBracket.finals.champion;
        }
        return facts;
    }
    /**
     * Call OpenAI with a pre-built prompt and return the text content.
     * In development (MOCK_BREAKDOWN=true) returns canned text without billing.
     */
    static generate(prompt) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            if (process.env.MOCK_BREAKDOWN === 'true') {
                return DEV_MOCK;
            }
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                throw new Error('OPENAI_API_KEY environment variable is not configured.');
            }
            const response = yield fetch(OPENAI_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: MODEL,
                    store: true,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });
            if (!response.ok) {
                const detail = yield response.text().catch(() => '');
                throw new Error(`OpenAI request failed (${response.status}): ${detail}`);
            }
            const data = (yield response.json());
            const content = (_c = (_b = (_a = data.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content;
            if (!content) {
                throw new Error('OpenAI response did not contain any content.');
            }
            return content;
        });
    }
}
exports.BreakdownService = BreakdownService;
