"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/index.ts
const bracketRoutes_1 = require("./bracketRoutes");
const tournamentDataRoutes_1 = require("./tournamentDataRoutes");
exports.default = [
    ...bracketRoutes_1.bracketRoutes,
    ...tournamentDataRoutes_1.tournamentDataRoutes,
];
