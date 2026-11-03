// src/routes/index.ts
import { bracketRoutes } from './bracketRoutes';
import { tournamentDataRoutes } from './tournamentDataRoutes';
import { breakdownRoutes } from './breakdownRoutes';
import { newsRoutes } from './newsRoutes';
import { oddsRoutes } from './oddsRoutes';

export default [
  ...bracketRoutes,
  ...tournamentDataRoutes,
  ...breakdownRoutes,
  ...newsRoutes,
  ...oddsRoutes,
];