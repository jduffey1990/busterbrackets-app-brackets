// src/controllers/simulationService.ts
import { randomBytes } from 'crypto';
import type { StructuredBracket } from '../models/tournamentData';
import { OddsService } from './oddsService';
import { rngFromSeed, simulateBracket } from './simulation';

export interface SimulationRequest {
  year: number;
  favorite?: string;
  boost?: number;
  /** Omit for a fresh random run; pass a previous result's seed to replay it. */
  seed?: string;
}

export interface SimulationResult {
  year: number;
  seed: string;
  priorStrength: number;
  bracket: StructuredBracket;
}

export class SimulationService {
  public static async simulate(request: SimulationRequest): Promise<SimulationResult> {
    const odds = await OddsService.forYear(request.year);
    const seed = request.seed ?? randomBytes(8).toString('hex');
    const bracket = simulateBracket(odds, {
      favorite: request.favorite,
      boost: request.boost,
      random: rngFromSeed(seed),
    });
    return { year: request.year, seed, priorStrength: odds.priorStrength, bracket };
  }
}
