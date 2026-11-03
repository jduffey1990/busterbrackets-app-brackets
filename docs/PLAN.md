# Build plan: historical odds without the scrape

Rules and the phase gate are in `CLAUDE.md`.
This file holds the plan, the status, and one "as built" record per phase.

## Start here

Phases 1 and 2 are on `main` (PR 1, merged 2026-11-03); see the "as built" records at the end for what was verified.
The review findings from that PR are addressed on `fix/review-findings` (see "Review follow-up" below).
Phases 3 and 4 are specified below and not started.

```bash
cd ~/code/buster && docker compose up -d
cd ~/code/buster/brackets
npm test                 # expect 27 passing
npx tsc --noEmit         # expect no output
npm run rebuild-games    # re-derive tournamentGames from tournamentData
npm run backfill-games   # load 1985 to 2024 from src/data/historical-games.json
```

## The problem

The simulation in `ui/src/views/Builder.vue` picks winners from a seed-vs-seed win/loss table.
That table was hand-maintained in `ui/src/utils/bracketStruc.js`; a Python scrape of sports-reference was meant to regenerate it each year.
The scrape never fed the app: it missed about 500 games (region ids changed over the years, several years returned almost nothing) and mis-counted same-seed games.
The hand table was correct through 2025, so the real annual cost was a human re-deriving every matchup record by hand.

## The mechanism that replaces the scrape

The app already stores every year's official results as a seed-keyed `StructuredBracket` in `tournamentData`, entered from the Admin page.
Seed matchups are fixed by bracket position, so every game (seed A vs seed B, who won) is recoverable from that document with no outside data.
Derive games on every results save, keep them in a `tournamentGames` collection, and compute the odds from that collection.
After a one-time backfill of 1985 to 2024, the only yearly task is the one already done: enter the field and the results in Admin.

## Data model

`tournamentGames` (see `src/models/tournamentGame.ts`): one row per game with `year`, `round`, `regionA/seedA`, `regionB/seedB`, `winner` ("A" or "B"), `source` ("structured" or "kaggle").
Derived state: a year is always rewritten whole.
A year is tracked once its results derive at least one game; with no derivable games only that source's rows are removed, so a backfilled year keeps its history until real results replace it.
Unique index on `(year, round, regionA, seedA)`.

## Phases

### Phase 1: games collection and derivation (built)

- `src/controllers/gameDerivation.ts`: pure `gamesFromBracket(year, bracket)`; partial results yield fewer games; an impossible winner throws `BracketConsistencyError`.
- `src/controllers/tournamentGameService.ts`: `replaceYear`, `findBefore`, `countByYear`.
- `TournamentDataService.updateResults` derives before writing and stores the games after; the route returns 400 on a consistency error.
- `src/scripts/rebuildTournamentGames.ts` (`npm run rebuild-games`) re-derives every year; the seed script writes games for the years it inserts.
- 2026 field and results moved to `src/data/tournament2026.ts`, shared by the seed script and the tests.
- `src/server.ts`: `createServer(jwtSecret)` lifted out of `app.ts` so routes are testable with `server.inject`.
- Fixed along the way: `assertAdmin` threw a response object, which Hapi rejects ("Cannot throw non-error object"), so every non-admin call to an admin route was a 500; it now throws `Boom.forbidden` (403).
- Seed data: the 2025 finals are now ordered as played (Florida v Auburn, Duke v Houston), which the derivation had flagged as inconsistent.
- no-mistakes gate installed (`.no-mistakes.yaml`, `.github/workflows/ci.yml`).

### Phase 2: backfill 1985 to 2024 (built)

- `src/controllers/kaggleGames.ts`: pure conversion of Kaggle's March Machine Learning Mania files (compact results, seeds, seasons) into `DerivedGame` rows.
  Rounds come from each team's prior wins, not day numbers; First Four games (same seed line, e.g. `W16a` v `W16b`) are skipped; regions come from `MSeasons.csv`.
- `src/scripts/convertKaggleGames.ts <dir>` writes `src/data/historical-games.json`: 2519 games, 1985 to 2025, as compact rows of our own derived facts.
  Kaggle's CSVs are not committed; the download needs a Kaggle account, an API token at `~/.kaggle/access_token`, and accepting the competition rules once.
- `src/controllers/seedRecords.ts`: the seed-vs-seed win/loss aggregation, shared with phase 3.
- `src/scripts/backfillHistoricalGames.ts` (`npm run backfill-games`) loads the JSON for every year without `tournamentData` results and never touches tracked years.
- Acceptance (`src/data/historicalGames.test.ts`): the JSON reproduces the hand table in `ui/src/utils/bracketStruc.js` except two entries where the hand table is wrong.
  6 vs 11 is structurally 160 games over 40 seasons; the hand table has 156.
  7 vs 10 is 160 less the 2021 Oregon v VCU no-contest; the hand table counts it and has one other result the wrong way.
  Cross-checked against the original sports-reference scrape: over its 22 completely captured seasons, every per-season matchup record agrees with the JSON.

### Phase 3: odds module

Pure function from games with `year < target` to a seed-vs-seed probability table, so a tournament never informs its own odds and any past year can be backtested.
Replace the hard "more than 20 games" cutoff and the stepwise seed-gap fallback with shrinkage toward a logistic fit on seed gap.
Same-seed matchups are 50/50 by symmetry and excluded from the fit.
Concrete fix: 1 vs 12 is 20-0 today, so a 12 can never beat a 1 in the sim; shrinkage puts it near 90 percent.

### Phase 4: simulate endpoint and UI switch

`POST /brackets/simulate` with year, favorite team and boost returns a `StructuredBracket`; seedable RNG so two runs on one seed diff clean.
`Builder.vue` keeps the region-by-region reveal and drops the simulation code and the odds table.
Decision taken: server-side rather than a `GET /odds` endpoint, because the algorithm is the one piece worth testing and jest lives here.
Install the no-mistakes gate in `ui/` when this phase starts.

## Open items

- The 2025 results, both the Admin-entered copy and the seed script's data, were checked game by game against the Kaggle 2025 rows: all 63 agree.
- The Admin page labels the four finalists only as region champs 1 to 4, with no hint that slots 1 and 2 form one semifinal; entering them in region order stores two wrong semifinal games that the server cannot detect.
  Relabel in `Admin.vue` during phase 4; the convention is documented on `FinalsBracket` until then.
- `node_modules` and `dist` are tracked in git; a `chore/` branch should untrack `node_modules` and decide on `dist`.
- The Dockerfile builds on Node 18 while CI and the gate use Node 20; move the Dockerfile to 20 in the same `chore/` branch.
- The README documents only the Mongo URI; it also needs `JWT_SECRET`, `ADMIN_USER_ID`, and the two scripts, with CLAUDE.md reduced to a pointer.

## Review follow-up (2026-11-03)

The gate's review of PR 1 raised eight findings; four are fixed on `fix/review-findings`, the rest are recorded as open items above.

- `FinalsBracket.teams` documents the played-order convention.
- `TournamentGameService.findBefore` removed; it returns with its caller in phase 3.
- Tracked-year rule: `replaceYear` with no games removes only that source's rows, and the backfill treats a year as tracked only when its results derive at least one game, so a blank past year saved from Admin can no longer wipe its backfilled history.
- Stale 2025 placeholder comments in the seed script and the converter's header corrected.

## Phase 1 as built (2026-11-03)

Verified against the local compose stack (brackets image rebuilt from this branch, Mongo volume with the 2025 and 2026 documents):

- `npm run rebuild-games` run twice; the full `tournamentGames` dump diffed identical both times (126 rows, 63 per year, 32/16/8/4/2/1 per round).
- Through the admin API with a minted JWT: 401 with no token, 403 as a non-admin, 400 with the derivation message on an inconsistent 2025 finals block and `updatedAt` unchanged, 200 on the corrected finals; 2026 results loaded the same way and produced the expected 16 upsets (Iowa over Florida, Texas over Gonzaga, Tennessee over Iowa St., and so on).
- Unique index `(year, round, regionA, seedA)` present; a second run never duplicates.

### Phase gate - as built

1. **Test coverage.** 15 jest tests: 9 on `gamesFromBracket` (full, partial, upsets, finals regions, three error classes), 6 on `PUT /tournament-data/results` (401, 403, 400 mapping, 404, missing payload, 200).
   Gaps: `TournamentGameService` and the rebuild script have no jest and are covered only by the rebuild-twice diff above; the derive-before-write ordering in `updateResults` is covered only by the API run; `POST /tournament-data` and `PUT /tournament-data/teams` share `assertAdmin` but have no 403 test of their own.
2. **DRY.** The 2026 fixture is one module used by the seed and the tests; `ROUND_OF_64_ORDER` is declared once server-side.
   `buildBaseBracket` in `bracketAnalysis.ts` still derives its rounds from the same order in a comment; left alone, it is not this phase's code.
3. **Modularity.** `gameDerivation.ts` has type-only imports and nothing from `mongodb` or `@hapi`; Mongo stays in the two services; the route only maps errors.
4. **Orthogonality.** New coupling: saving tournament results now writes `tournamentGames` (noted in the `updateResults` docstring).
   The `.no-mistakes.yaml` commands and `ci.yml` run the same two checks and the nvm path appears in the yaml only; both are in the CLAUDE.md list.
5. **Branch and production guard.** All work on `feat/historical-odds`; `main` untouched; only the local compose Mongo was written.

## Phase 2 as built (2026-11-03)

Verified against the local compose Mongo:

- `backfill-games` run twice; the full `tournamentGames` dump diffed identical both times: 2582 rows, 2456 `kaggle` for 1985 to 2024 (39 seasons, 2021 has 62) plus 126 `structured` for 2025 and 2026, which the backfill reported as tracked and left alone.
- All-time first-round records after the load: 1 v 16 is 162-2, which is the hand table's 158-2 plus the four 2026 games.
- The converter's only notes were the two 2021 games Oregon reached unevenly after VCU withdrew.

### Phase gate - as built

1. **Test coverage.** 27 jest tests (12 new): the converter on a synthetic season (First Four skip, round derivation, uneven advancement and cross-region notes, equal seeds, missing seed, bad seed string), the CSV reader (ragged rows, quoted fields), the aggregator, and the acceptance test on the committed JSON (years, 63 per season, no First Four rows, hand-table reproduction).
   Gaps: the backfill script is covered only by the run-twice diff above; `convertKaggleGames.ts` is a thin wrapper verified by its one real run.
2. **DRY.** `seedRecords` is the one aggregation and phase 3 builds on it; the hand table appears in the test as the acceptance fixture only.
   `parseCsv` is a 15-line reader rather than a dependency because the files are plain and unquoted.
3. **Modularity.** `kaggleGames.ts` and `seedRecords.ts` have type-only imports and no `mongodb` or `@hapi`; only the backfill script touches the database.
4. **Orthogonality.** The JSON's basename must differ from the loader module's (`historical-games.json` beside `historicalGames.ts`) or ts-node resolves the import to the JSON; noted in the loader.
   `resolveJsonModule` was turned on in `tsconfig.json` for that import.
5. **Branch and production guard.** All work on `feat/historical-odds`; `main` untouched; only the local compose Mongo was written.
