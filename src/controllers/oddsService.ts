// src/controllers/oddsService.ts
import { OddsTable, buildOdds } from './odds';
import { TournamentGameService } from './tournamentGameService';

export class OddsService {
  /**
   * The odds table for simulating `year`: built only from games played in
   * earlier years, so a tournament never informs its own odds and any past
   * year can be re-simulated as it looked at the time.
   */
  public static async forYear(year: number): Promise<OddsTable> {
    const games = await TournamentGameService.findBefore(year);
    return buildOdds(games);
  }
}
