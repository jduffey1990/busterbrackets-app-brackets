import { ObjectId } from "mongodb";

export interface Bracket {
    _id: ObjectId;
    userId: ObjectId;
    name: string;
    bracket: number [];
    offshootBracket: number [];
    createdAt: Date;
    updatedAt: Date;
}

