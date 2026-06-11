// src/controllers/breakdownService.ts
//
// Owns the full bracket-breakdown flow server-side: load the bracket + tournament
// data, run the comparison, build the prompt, call OpenAI (with a persistent
// cache so we don't re-bill), and return everything the UI needs to render.

import { BracketService } from './bracketService';
import { TournamentDataService } from './tournamentDataService';
import { StructuredBracket } from '../models/tournamentData';
import {
  buildBaseBracket,
  buildPrompt,
  compareBrackets,
  formatTeamDisplay,
  formatTeamTitle,
  BreakdownFacts,
  ComparisonStats,
} from './bracketAnalysis';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

// Bump this whenever the prompt or comparison logic changes so previously
// cached narratives are regenerated instead of served stale.
const PROMPT_VERSION = 'v2';

const DEV_MOCK = `This bracket features some bold picks that challenge conventional seeding wisdom. The user isn't afraid to back underdogs in key matchups, showing confidence in teams that many would overlook.

Notable upset selections include some intriguing lower-seeded teams advancing deeper than expected, which could create exciting narratives if the tournament unfolds this way.

Overall, this bracket balances favorite picks in the early rounds with some calculated risks in the later stages, making for a compelling set of predictions.`;

export interface BreakdownResult {
  content: string | null; // null when the AI narrative couldn't be generated (e.g. OpenAI down)
  isPostTournament: boolean;
  bracketName: string;
  stats: {
    correctPicks: number;
    totalGames: number;
    upsets: string[]; // pre-formatted, deduped, e.g. "11. South Florida"
  };
}

export class BreakdownService {
  /**
   * Build (or return a cached) breakdown for a bracket by id.
   * Returns null if the bracket doesn't exist. Throws if OpenAI fails.
   */
  public static async buildBreakdown(bracketId: string): Promise<BreakdownResult | null> {
    const bracket = await BracketService.findBracketById(bracketId);
    if (!bracket) {
      return null;
    }

    const year = new Date(bracket.createdAt).getFullYear();
    const tournamentData = await TournamentDataService.findByYear(year);
    const teamNames = tournamentData?.teams ?? {};
    const results = tournamentData?.results ?? null;
    const isPostTournament = !!results;

    const officialBracket = results ?? buildBaseBracket();
    const comparison = compareBrackets(officialBracket, bracket.bracket, isPostTournament);

    const stats = {
      correctPicks: comparison.correctPicks,
      totalGames: comparison.totalGames,
      upsets: comparison.upsets.map((seed) => formatTeamDisplay(seed, teamNames)),
    };

    // Reuse the cached narrative only if it's the current prompt version AND the
    // same mode (preview vs post-tournament). Otherwise regenerate.
    const cache = bracket.aiBreakdown;
    let content: string | null = null;
    if (cache && cache.promptVersion === PROMPT_VERSION && cache.isPostTournament === isPostTournament) {
      content = cache.content;
    } else {
      const facts = this.buildFacts({
        year,
        isPostTournament,
        userBracket: bracket.bracket,
        officialBracket,
        comparison,
        teamNames,
      });
      try {
        content = await this.generate(buildPrompt(facts));
        await BracketService.saveBreakdown(bracketId, {
          content,
          isPostTournament,
          promptVersion: PROMPT_VERSION,
          generatedAt: new Date(),
        });
      } catch (err) {
        // Narrative generation failed (e.g. OpenAI quota/outage). Degrade
        // gracefully: still return the correct stats; the UI renders the recap
        // as temporarily unavailable rather than failing the whole request.
        console.error('Breakdown narrative generation failed:', (err as Error)?.message ?? err);
        content = null;
      }
    }

    return { content, isPostTournament, bracketName: bracket.name, stats };
  }

  /** Resolve seed strings to names and assemble the verified facts for the prompt. */
  private static buildFacts(args: {
    year: number;
    isPostTournament: boolean;
    userBracket: StructuredBracket;
    officialBracket: StructuredBracket;
    comparison: ComparisonStats;
    teamNames: Record<string, string>;
  }): BreakdownFacts {
    const { year, isPostTournament, userBracket, officialBracket, comparison, teamNames } = args;
    const name = (seed: string) => formatTeamTitle(seed, teamNames);

    const facts: BreakdownFacts = {
      year: String(year),
      isPostTournament,
      correctPicks: comparison.correctPicks,
      totalGames: comparison.totalGames,
      userChampion: name(userBracket.finals.champion),
      userFinalFour: userBracket.finals.teams.map(name),
      upsetPicks: comparison.upsets.map((seed) => formatTeamDisplay(seed, teamNames)),
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
  private static async generate(prompt: string): Promise<string> {
    if (process.env.MOCK_BREAKDOWN === 'true') {
      return DEV_MOCK;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not configured.');
    }

    const response = await fetch(OPENAI_URL, {
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
      const detail = await response.text().catch(() => '');
      throw new Error(`OpenAI request failed (${response.status}): ${detail}`);
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI response did not contain any content.');
    }

    return content;
  }
}
