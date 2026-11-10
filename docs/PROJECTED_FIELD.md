# Build plan: the three-state field pipeline

Written 2026-11-05, rewritten the same day after deciding to replace manual field and results entry, not only add a preseason bracket.
Companion to `PLAN.md` (odds and simulation); same phase-gate rules apply.
Prototype scripts and raw probe output live in the session scratchpad at
`/private/tmp/claude-501/-Users-jordanduffey-code-buster/2fe54a0f-e2b6-40b1-931b-62a79e02b7eb/scratchpad/` (`field_builder.py`, `probe/`, `ab_final.txt`).
That folder is ephemeral; Phase 1 commits the fixtures it needs.

## Start here

Three decisions are Jordan's; Phase 1 depends on none of them.

1. Ratings route: Torvik's static JSON direct (free, no key, but his `robots.txt` disallows `/*.json`) or the same data through cbbdata's keyed mirror (sanctioned, free key via the `cbbdata` R package registration, response shape unverified until a key exists).
   Recommendation: cbbdata, with the Torvik URL as a documented fallback behind `RATINGS_SOURCE`.
2. Sports Reference as the live feed for a paid product: the repo already scrapes it once for history, but a feed that runs every 15 minutes for three weeks on a site with a credit system is a different footprint under their terms.
   Recommendation: proceed with one request per TTL and the contact user agent, and revisit if they object; the admin page stays as the fallback either way.
3. Refresh mechanism: refresh-on-read with a Mongo cache (no new infrastructure, a stale read pays one fetch) or an EventBridge schedule invoking the Lambda (clean, needs `terraform apply`).
   Recommendation: refresh-on-read now, EventBridge as Phase 6 once the feeds have run through one tournament.

## The feature

The site is useful for about three weeks a year because the Builder has nothing to build on outside them, and inside them Jordan types 64 teams and 63 results by hand.
After this plan the field comes from feeds in every month, and the admin page is an override rather than the input.

| State | Window | Field | Results | Source |
|---|---|---|---|---|
| `projected` | day after the title game until Selection Sunday | 64 teams built from ratings plus committee rules | none | Torvik ratings (direct or cbbdata) |
| `official` | Selection Sunday until the first game | the real 64 slots, seed and region | none yet | Sports Reference postseason page |
| `inplay` | first game until the title game | same | partial, grows as games finish | same page, same parse |
| `complete` | after the title game until next season's ratings exist | same | full | same, frozen |

Brackets built in `projected` carry the label "way too early" for life; the rest carry none.

## What the data probe found (2026-11-05)

Every source was hit with plain `curl` and the project's own user agent; a browser agent was not used.

| Source | Result | Role |
|---|---|---|
| DraftKings, bet365 | No public odds API; partner-only. | none |
| ESPN hidden site API | 403 to a non-browser agent. | none |
| KenPom | Cloudflare challenge, paid. | none |
| NCAA.com NET page | HTML, "Through Games Apr. 06 2026": not published until December. | none |
| NCAA.com bracket page | Renders from a minified `__INITIAL_STATE__` function, not parseable without a browser. | none |
| Torvik PHP pages | JS browser-check page. | none |
| Torvik static JSON `2027_team_results.json` | 200, 336 KB, 365 teams, 45 columns with conference and barthag; 2026 file also served. `robots.txt` disallows `/*.json`. | ratings for `projected` |
| Torvik `2026_super_sked.csv` | 6300 games with results; `type` column 3 is all postseason (105 games, NIT included), so tournament games are "both teams in the field, date on or after Selection Sunday". | second results source, Phase 5 |
| cbbdata `/api/torvik/ratings?year=2027` | 400 "Please provide an API Key": exists, keyed. | sanctioned ratings route |
| Sports Reference `postseason/men/2026-ncaa.html` | 200, 177 KB. Parsed with the existing scraper's walk: 5 bracket divs, 63 games with winners, a full 64-slot round-of-64 field with seeds. 12 of 64 names differ from the repo's spelling, all "State" vs "St." style. | field for `official`, results for `inplay` |
| Bracket Matrix | 2027 preseason matrix, 76 consensus-seeded teams across 52 brackets, HTML only. | test oracle for the projection |
| The Odds API | Free 500 credits/month, outrights included, market `basketball_ncaab_championship_winner`. Title odds cannot produce lines 5 to 16 or any auto bid. | none |

Torvik column map (0-based): 0 rank, 1 team, 2 conference, 3 record, 4 adjOE, 6 adjDE, 8 barthag, 41 WAB, 44 tempo.
2027 ratings list 32 conferences; 2026 listed 31.

## Evidence the projection is good enough

Rules: sort by barthag, best team per conference is the auto bid (32), fill to 68 with the best remaining, drop the two lowest auto bids and two lowest at-larges as First Four losers, seed 64 in lines of four, snake across East, Midwest, South, West, ties broken on name.

| Measure | Value |
|---|---|
| 2027 projection vs Bracket Matrix consensus, team overlap | 60 of 64 |
| Seed-line MAE on overlap | 0.88; 55 of 60 within two lines |
| The 4 disagreements | UIC, UC Santa Barbara, Tarleton State, Troy: one-bid-league picks where the experts chose another conference favorite |
| 2026 backtest vs the real field (end-of-season ratings) | 48 of 64; 11 of 16 misses are conference-tournament upsets, 5 are bubble calls |
| 2026 seed-line MAE | 0.94; 36 of 48 within one line |
| Determinism | two runs on identical input, identical bracket |

The disagreements sit on the bubble and in one-bid leagues, where the experts disagree with each other too.

## Mechanism

Pure modules (no `mongodb`, no `@hapi`, like `odds.ts` and `simulation.ts`):

- `fieldProjection.ts`: `TeamRating[]` to `Record<SeedKey, string>` with the rules above.
- `sportsReferenceBracket.ts`: page HTML to `{ field: Record<SeedKey, string>, games: FeedGame[] }` where a `FeedGame` is region, round index, two seeds, winner seed, and the Final Four pairings in played order.
  This is the Python scraper's walk ported to TypeScript, with team names captured alongside seeds.
- `resultsFromGames.ts`: `FeedGame[]` to a partial `StructuredBracket`, slot order from `ROUND_OF_64_ORDER` in `gameDerivation.ts`, so a half-played tournament produces the same shape the admin page sends today.
- `teamNames.ts`: one alias table from feed spellings (Torvik, Sports Reference) to the display names the repo already uses.
  An unmapped name passes through unchanged and is reported, never dropped.

Feed layer (`src/feeds/`):

- `http.ts`: one fetch helper with the `BusterBrackets/1.0 (+https://busterbrackets.com)` agent, a 10 s timeout, and a byte cap.
- `ratingsFeed.ts` and `bracketFeed.ts`: fetch plus parse, returning typed data and an `asOf`.
- `FeedCacheService`: Mongo collection `feedCache` keyed by `{ feed, year }` holding the parsed payload, `fetchedAt`, and `error`.
  A read refreshes when older than the state's TTL (24 h in `projected` and `official`, 15 min in `inplay`, never in `complete`) and serves the stale row when the refresh fails, the rule `NewsService` already follows.
  Mongo rather than process memory so Lambda cold starts do not multiply fetches.

State and publication:

- `tournamentData` stays the only home of official fields and results, so odds, backfill, and `tournamentGames` derivation are untouched.
  It gains `source: { field: 'feed' | 'admin', results: 'feed' | 'admin', updatedAt }` and `locks: { field: boolean, results: boolean }`.
  A feed refresh writes through `TournamentDataService.updateTeams` and `updateResults` (so games derive as they do today) unless the matching lock is set; the existing admin PUT routes set the lock.
- Projected fields live in their own collection `projectedField` `{ year, teams, ratingsAsOf, fetchedAt }` and never enter `tournamentData`.
- `GET /tournament-data/upcoming` returns `{ year, state, teams, results, source, asOf, unmappedNames }` and is the one call the Builder, Dashboard, and Bracket views make for the current season.
  `year` is the upcoming tournament year (calendar year, or next year after the title game), computed server-side in one place.
- `state` is derived from data, not the calendar: `projected` while `tournamentData` has no row for the year, `official` once it has teams and no results, `inplay` with partial results, `complete` with a champion.
- `Bracket` gains `year` and `fieldSource: 'projected' | 'official'`, written at creation; rows without `year` fall back to the `createdAt` rule server-side.

Refusal guards, per the sandbox rule in the global instructions: `FEEDS_ENABLED=false` makes every feed return its cached row or a clear error, never a network call, and the docker stack ships with it on, since every feed is a read.

UI:

- `tournamentDates.js` gains `upcomingTournamentYear`, replacing the inline rule in `Dashboard.vue`.
- Builder: one load of `/tournament-data/upcoming`; heading "Your way too early bracket" plus a source note in `projected`, the current page otherwise; boosts available in every state.
- Dashboard: the next-field card reads `state` instead of guessing from years; bracket cards show "2027 way too early" from `fieldSource`.
- `Bracket.vue`: year chip from the bracket's `year`.
- Admin: shows the feed status per year (source, `asOf`, last error, unmapped names), the two lock toggles, and keeps the manual forms as the override.

## Phases

### Phase 1: pure modules (brackets)

- `fieldProjection.ts`, `sportsReferenceBracket.ts`, `resultsFromGames.ts`, `teamNames.ts`, each with tests.
- Fixtures in `src/data/fixtures/`: the saved 2026 Sports Reference page, the 2026 Torvik ratings snapshot, a trimmed 2027 ratings snapshot.
- Golden tests: the parsed 2026 field equals `teams2026` after aliasing; the walked 2026 games equal `results2026`; the 2026 projection scores overlap >= 48 and MAE <= 1.0; a partial game list yields a partial bracket that `gamesFromBracket` accepts; two runs of each module deep-equal.

### Phase 2: feed layer and upcoming route (brackets)

- `src/feeds/`, `FeedCacheService`, `projectedField` collection, `GET /tournament-data/upcoming`, `source` and `locks` on `tournamentData`, feed writes through the existing service methods.
- Tests with the fetch helper stubbed: TTL per state, stale-on-error, lock respected, `FEEDS_ENABLED=false` makes no call.
- Hand check on the docker stack: `upcoming` returns a 2027 projected field; a second call within the TTL logs no fetch; setting the field lock and refreshing leaves the admin teams in place.

### Phase 3: bracket provenance (brackets + ui)

- `year` and `fieldSource` on `Bracket`, accepted by `/create-bracket`, read by Dashboard and `Bracket.vue`.

### Phase 4: builder, dashboard, admin (ui)

- `upcomingTournamentYear`, Builder states, Dashboard card and chips, Admin feed status and locks.
- `e2e/mock-api.mjs` handler for `upcoming` with one fixture per state; smoke suite at desktop and 390px covers all four, including the negative case that no "way too early" copy appears outside `projected`.
- Real-app screenshots for each state, paths in the phase record.

### Phase 5: second results source

- Torvik `super_sked` as an independent results feed; the admin page flags any game where the two sources disagree.

### Phase 6: scheduled refresh

- EventBridge rule invoking the Lambda on the `inplay` TTL so no user request pays for a fetch; `terraform apply` is Jordan's.

## Open items

- Whether Sports Reference posts the bracket on Selection Sunday or after the First Four.
  Until known, `official` fills a First Four slot with the higher-rated team of the pair, the same rule the projection uses, and the walker replaces it when the page resolves.
- Torvik's `robots.txt` disallow is a crawler policy, not a license; decision 1 above.
- Sports Reference terms against a paid product; decision 2 above.
- One-bid-league picks in `projected` will often be wrong before conference tournaments; the label covers it and nothing else can.
- The `StructuredBracket` wire shape stays at 64 slots, so no view changes shape for the First Four.
