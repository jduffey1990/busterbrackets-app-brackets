import { ObjectId } from "mongodb";

export interface Bracket {
    _id: ObjectId;
    userId: ObjectId;
    bracket: number []
    offshootBracket: number []
}

