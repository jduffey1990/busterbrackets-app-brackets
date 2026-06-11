// src/controllers/breakdownService.ts
//
// Owns the full bracket-breakdown flow server-side: load the bracket + tournament
// data, run the comparison, build the prompt, call OpenAI (with a persistent
// cache so we don't re-bill), and return everything the UI needs to render.

import { BracketService } from './bracketService';
import { TournamentDataService } from './tournamentDataService';
import {
  buildBaseBracket,
  buildPrompt,
  compareBrackets,
  formatTeamDisplay,
} from './bracketAnalysis';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = 'gpt-4o-mini';

const DEV_MOCK = `This bracket features some bold picks that challenge conventional seeding wisdom. The user isn't afraid to back underdogs in key matchups, showing confidence in teams that many would overlook.

Notable upset selections include some intriguing lower-seeded teams advancing deeper than expected, which could create exciting narratives if the tournament unfolds this way.

Overall, this bracket balances favorite picks in the early rounds with some calculated risks in the later stages, making for a compelling set of predictions.`;

export interface BreakdownResult {
  content: string;
  isPostTournament: boolean;
  bracketName: string;
  stats: {
    correctPicks: number;
    totalGames: number;
    upsets: string[]; // pre-formatted, e.g. "3. Wisconsin"
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
    const comparison = compareBrackets(officialBracket, bracket.bracket);

    const stats = {
      correctPicks: comparison.correctPicks,
      totalGames: comparison.totalGames,
      upsets: comparison.upsets.map((seed) => formatTeamDisplay(seed, teamNames)),
    };

    // Reuse the cached narrative unless the tournament has since flipped
    // from preview to post-tournament (which changes the whole framing).
    let content: string;
    if (bracket.aiBreakdown && bracket.aiBreakdown.isPostTournament === isPostTournament) {
      content = bracket.aiBreakdown.content;
    } else {
      const prompt = buildPrompt({
        isPostTournament,
        year: String(year),
        userBracket: bracket.bracket,
        officialBracket,
        comparison,
        teamNames,
      });
      content = await this.generate(prompt);
      await BracketService.saveBreakdown(bracketId, {
        content,
        isPostTournament,
        generatedAt: new Date(),
      });
    }

    return { content, isPostTournament, bracketName: bracket.name, stats };
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
