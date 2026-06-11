"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/index.ts
const bracketRoutes_1 = require("./bracketRoutes");
const tournamentDataRoutes_1 = require("./tournamentDataRoutes");
const breakdownRoutes_1 = require("./breakdownRoutes");
const newsRoutes_1 = require("./newsRoutes");
exports.default = [
    ...bracketRoutes_1.bracketRoutes,
    ...tournamentDataRoutes_1.tournamentDataRoutes,
    ...breakdownRoutes_1.breakdownRoutes,
    ...newsRoutes_1.newsRoutes,
];
