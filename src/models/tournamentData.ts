// src/models/tournamentData.ts
import { ObjectId } from "mongodb";

export interface TournamentData {
    _id: ObjectId;
    year: number;                          // e.g. 2025, 2026
    teams: Record<string, string>;         // { "e1": "Duke", "e2": "Alabama", ... } — 64 entries
    results: StructuredBracket | null;     // Filled in as tournament progresses, null if not started
    createdAt: Date;
    updatedAt: Date;
}

// ─── Structured bracket types (shared by TournamentData.results and Bracket.bracket) ───

export interface RegionBracket {
    round32: string[];     // 8 winners from Round of 64 → 32
    sweet16: string[];     // 4 winners from Round of 32 → 16
    elite8: string[];      // 2 winners from Sweet 16 → Elite 8
    regionChamp: string;   // 1 region champion
}

export interface FinalsBracket {
    teams: string[];        // 4 region champs entering Final Four
    semifinals: string[];   // 2 semifinal winners
    champion: string;       // tournament champion
}

export interface StructuredBracket {
    east: RegionBracket;
    midwest: RegionBracket;
    south: RegionBracket;
    west: RegionBracket;
    finals: FinalsBracket;
}