// src/models/bracket.ts
import { ObjectId } from "mongodb";
import { StructuredBracket } from "./tournamentData";

export interface Bracket {
    _id: ObjectId;
    userId: ObjectId;
    name: string;
    bracket: StructuredBracket;
    offshootBracket: StructuredBracket;
    createdAt: Date;
    updatedAt: Date;
}

