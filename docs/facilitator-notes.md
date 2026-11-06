# Facilitator notes

## Before the session

1. Pin the release: participants should clone the published tag, or the branches
   at that tag, so nothing changes during the session.
2. Fresh-clone rehearsal on a clean machine, following only the README:
   ```sh
   git clone <repo> && cd <repo>
   git switch starter
   pnpm install --frozen-lockfile
   pnpm start         # first screen: "No artists loaded yet"
   pnpm test          # passes
   pnpm test:workshop # fails: 36 failed, 3 passed (expected on starter)
   git switch solution && pnpm test && pnpm build && pnpm test:coverage
   ```
3. Ask participants to install beforehand. The first `pnpm install` needs
   network access. For an offline room, run `pnpm fetch` on each machine in
   advance, or bring a pre-filled pnpm store.
4. Check that ports 3000 and 4200 are free on the presenting machine.

## Expected test counts per branch

| Branch | `pnpm test` | `pnpm test:workshop` |
| ------ | ----------- | -------------------- |
| `starter` | passes (API 38, UI 43) | 36 failed, 3 passed |
| `checkpoint/01-state` | passes (+ Exercise 1) | 30 failed |
| `checkpoint/02-loading` | passes (+ Exercises 1–2) | 23 failed |
| `checkpoint/03-computed` | passes (+ Exercises 1–3) | 5 failed |
| `checkpoint/04-favourites` | passes (everything) | all 39 pass |
| `solution` | passes, coverage ≥ 80% | all 39 pass |

The few starter tests that pass already hold true for the placeholders, for
example "a whitespace-only search shows everyone". This is expected and not a
sign that part of the work is done.

## Run-through sequence

| Time | Do | Show |
| ---- | -- | ---- |
| 0–10 | Tour: UI → `all-artists-page.html` → API table in README → `artists.store.ts` | The page only reads signals and calls methods; `providedIn: 'root'`; `onInit` load; placeholders warn instead of faking success |
| 10–25 | Exercise 1 | Run `pnpm test:workshop`; failures name the exercise. Live-code `updateView` + one setter. |
| 25–45 | Exercise 2 | Draw the loop: `loadArtists()` → `loadArtistsRequested` → API event handler (prepared) → `…Success`/`…Fail` → store handlers. Open `artists.events.ts` and `endpoints.ts` to show where the HTTP call is described. Live-code the dispatch and one handler. Then demo **load failure + retry** (below). |
| 45–65 | Exercise 3 | Draw source → derived on the board. Point out `filter`/`map` copies before `sort`, and the deliberate ties (two *Mara Quill*s; ages 27/29/34/38/41/45 repeat). |
| 65–85 | Exercise 4 | One handler listening to two events (add and remove); no optimistic updates; take the list from the response. Refresh to show persistence. |
| 85–90 | Recap | `pnpm test:workshop` green; `git diff solution -- src/app/artists/state/artists.store.ts` |

## Failure demos

All simulated failures are deterministic. They happen after request validation
and **before** any data changes.

| Scenario | Command | What happens | Recovery |
| -------- | ------- | ------------ | -------- |
| Load fails once | `pnpm start:fail-first-load` | First `GET /api/artists` → 503 *"Simulated failure: loading artists failed on purpose…"*; the error panel shows **Try again** | Click **Try again**: the second load succeeds |
| Load fails N times | `node api/server.ts --fail-first-loads=3` (plus `pnpm web` in a second terminal) | First 3 loads fail | Keep retrying |
| All writes fail | `pnpm start:fail-mutations` | Every add/remove → 503 *"Simulated failure: favourite changes are disabled…"*; favourites stay unchanged; buttons re-enable | Ctrl+C, then `pnpm start` |
| API down | Stop only the API (run `pnpm api` and `pnpm web` in two terminals, then Ctrl+C the API) | Next request shows *"Cannot reach the workshop API…"* | Start `pnpm api` again, click **Try again** |
| Slower/faster responses | `node api/server.ts --delay=1500` or `--delay=0` | Longer or no loading/saving indicators | – |
| Damaged saved data | Stop the API, edit `runtime/favourites.json` into invalid JSON, run `pnpm start` | API refuses to start with an explicit message; `concurrently` stops the web server too | `pnpm data:reset` |

Environment-variable equivalents: `API_PORT`, `API_DELAY_MS`,
`API_FAIL_MUTATIONS=true`, `API_FAIL_FIRST_LOADS=1`.

## Recovery during the session

- **A participant is stuck:** have them commit or stash their work, then
  `git switch checkpoint/NN-…` (see the workshop guide). Never suggest
  `git reset --hard`.
- **Favourites are in a strange state:** stop `pnpm start`, run
  `pnpm data:reset`, then start again.
- **"Port in use":** a previous `pnpm start` is still alive. Close that
  terminal, or use `API_PORT`.
- **Blank page / compile error:** the dev-server output in the `[web]` lines
  names the file and line. Usually it is a typo in `artists.store.ts`.
  `git diff checkpoint/<previous> -- src/app/artists/state/artists.store.ts`
  narrows it down.

## Manual verification checklist (before publishing a release)

- [ ] `/` redirects to `/artists`; `/favourites` opens directly after a refresh.
- [ ] Navigating between routes keeps data and each route's filters, with no second `GET /api/artists` in the Network tab.
- [ ] Table order matches the sort controls, including ties.
- [ ] Add/remove updates the badge and both routes; it survives a refresh and an API restart.
- [ ] Buttons are disabled while saving; the saving bar is visible.
- [ ] Both failure demos behave as described above.
- [ ] `pnpm data:reset` restores the 4 seed favourites, and refuses while the API runs.
- [ ] Keyboard only: Tab reaches the search box, every select, both direction toggles and every favourite button. Enter/Space activates them.
