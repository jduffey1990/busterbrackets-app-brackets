// src/routes/index.ts
import { bracketRoutes } from './bracketRoutes';
import { tournamentDataRoutes } from './tournamentDataRoutes';

export default [
  ...bracketRoutes,
  ...tournamentDataRoutes,
];