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
    aiBreakdown?: AiBreakdown;   // cached LLM breakdown so we don't re-bill OpenAI on every view
}

export interface AiBreakdown {
    content: string;
    isPostTournament: boolean;   // cached against this state; regenerated when it flips
    generatedAt: Date;
}

