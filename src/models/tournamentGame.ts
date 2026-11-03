// src/models/tournamentGame.ts
//
// One tournament game, reduced to what the odds model needs: the year, the
// round, the two seeds (with the region each came from) and which side won.
// Rows are derived from TournamentData.results every time results are saved
// (source "structured") or loaded once from an external history for years the
// app never tracked (source "kaggle"). Nothing references this collection by
// foreign key, so a year is always replaced whole.
import { ObjectId } from "mongodb";

export type GameRound =
    | "round64"
    | "round32"
    | "sweet16"
    | "elite8"
    | "semifinal"
    | "championship";

export type GameSource = "structured" | "kaggle";

export interface TournamentGame {
    _id: ObjectId;
    year: number;
    round: GameRound;
    regionA: string;        // "east" | "midwest" | "south" | "west", or a historical region name
    seedA: number;          // 1..16, bracket-slot order; not sorted
    regionB: string;
    seedB: number;
    winner: "A" | "B";
    source: GameSource;
    createdAt: Date;
}
