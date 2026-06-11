// src/routes/index.ts
import { bracketRoutes } from './bracketRoutes';
import { tournamentDataRoutes } from './tournamentDataRoutes';
import { breakdownRoutes } from './breakdownRoutes';

export default [
  ...bracketRoutes,
  ...tournamentDataRoutes,
  ...breakdownRoutes,
];