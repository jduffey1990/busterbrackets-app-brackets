import { ObjectId } from "mongodb";

export interface Bracket {
    _id: ObjectId;
    userId: ObjectId;
    name: string;
    bracket: string [];
    offshootBracket: string [];
    createdAt: Date;
    updatedAt: Date;
}

