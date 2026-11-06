# Angular Signal Store workshop

A hands-on workshop for developers who already know Angular signals and basic
RxJS but are new to [NgRx Signal Store](https://ngrx.io/guide/signals).

You get a finished Angular Material UI and a small local API. During the
workshop you implement **one file**, the store at
[`src/app/artists/state/artists.store.ts`](src/app/artists/state/artists.store.ts):

- state with `withState` and updates with `patchState`
- derived rows and counts with `withComputed`
- actions with `withMethods`
- HTTP integration with `rxMethod`
- explicit loading, pending-mutation and error state

Start with the **[workshop guide](docs/workshop-guide.md)**. Facilitators can
find the run-through and failure demos in
**[facilitator notes](docs/facilitator-notes.md)**.

## Prerequisites

| Tool    | Supported versions                         |
| ------- | ------------------------------------------ |
| Node.js | 24.15+ or 26.x (`.nvmrc` pins 26)          |
| pnpm    | 12.16+ (pinned in `package.json` `packageManager`) |
| Git     | any recent version                         |
| Browser | a current Chrome, Edge, Firefox or Safari  |

The workshop app is built with Angular 22.2, Angular Material 22.2,
@ngrx/signals 22.0, TypeScript 6.0 and Vitest 5.

Installing packages needs network access (or a pre-filled pnpm store). After
that, the workshop runs fully offline: no Docker, database, login, API key, web
fonts or external API.

## Getting started

```sh
git clone <this repository>
cd signal-store-workshop
git switch starter          # the branch you start the workshop from
pnpm install --frozen-lockfile
pnpm start
```

Open <http://localhost:4200>. It redirects to **All artists**.

**On the `starter` branch, the first screen is expected to look unfinished.**
You will see the toolbar, the search/filter/sort controls and a panel saying
*"No artists loaded yet"*. Loading data is one of the exercises. The browser
console shows `[Workshop] … is not implemented yet` warnings for store methods
you have not written yet.

On the `solution` branch, the page shows a table of 25 fictional musicians,
4 of them favourites.

## Commands

| Command                         | What it does |
| ------------------------------- | ------------ |
| `pnpm install --frozen-lockfile` | Install the exact dependency versions from `pnpm-lock.yaml`. |
| `pnpm start`                    | Start the API (port 3000) and the Angular dev server (port 4200) together. Ctrl+C stops both. If either fails to start, both stop. |
| `pnpm test`                     | Tests that should pass on the current branch: API tests, UI tests and the tests for exercises already completed on this branch. |
| `pnpm test:workshop`            | The full store acceptance suite. Tests for unfinished exercises **fail on purpose**; each failure names the exercise and the missing behaviour. |
| `pnpm test:coverage`            | Every test with coverage (target: 80%). Meaningful on `solution` only. |
| `pnpm build`                    | Production build into `dist/`. |
| `pnpm data:reset`               | Restore the seed favourites. **Stop `pnpm start` first**; the command refuses to run while the API is listening. |
| `pnpm start:fail-mutations`     | Failure demo: every add/remove favourite fails until you restart with `pnpm start`. |
| `pnpm start:fail-first-load`    | Failure demo: the first artist load fails, and **Try again** then succeeds. |

### Ports and URLs

| What | Where |
| ---- | ----- |
| App  | <http://localhost:4200> (`/artists`, `/favourites`) |
| API  | `http://127.0.0.1:3000/api`, proxied from the dev server, so the app uses relative `/api/...` URLs |

To use another API port, set `API_PORT` for `pnpm start`. The proxy in
`proxy.conf.mjs` reads the same variable.

## Branches

The branches form one linear history, so each one builds on the previous one:

| Branch                     | Contents |
| -------------------------- | -------- |
| `starter`                  | Runnable UI and API; store skeleton with placeholders |
| `checkpoint/01-state`      | Exercise 1 done: view settings |
| `checkpoint/02-loading`    | Exercise 2 done: loading with `rxMethod` |
| `checkpoint/03-computed`   | Exercise 3 done: derived views |
| `checkpoint/04-favourites` | Exercise 4 done: saving favourites |
| `solution`                 | Reference solution, verified with all tests and coverage |

`workshop-stage.json` records which exercises are complete on a branch;
`pnpm test` uses it to decide which exercise tests to run. For catching up
without losing your work, see
[Switching checkpoints safely](docs/workshop-guide.md#switching-checkpoints-safely).

## Project layout

```text
api/                      Local teaching API (Node, no framework)
data/                     Artist fixtures and seed favourites (read-only)
runtime/                  Saved favourites, created on first run (git-ignored)
src/app/artists/
  data-access/            Typed API service and error helper (prepared)
  state/
    artists.store.ts      ← the workshop file
    artist-view.helpers.ts  pure filter/sort building blocks (prepared)
    artists-view.model.ts   view-setting and row types (prepared)
    exercises/            store acceptance tests, one file per exercise
  ui/, pages/             Material UI (prepared)
docs/                     Workshop guide and facilitator notes
scripts/run-tests.mjs     Branch-aware test runner
```

## The local API

This is a **local teaching API, not a production backend**. It has one
implicit user and no authentication. It keeps favourites in
`runtime/favourites.json` and listens only on `127.0.0.1`.

| Endpoint | Response |
| -------- | -------- |
| `GET /api/artists` | `{ artists: Artist[], favouriteArtistIds: string[] }`, the whole dataset (no server-side search, filtering or sorting) |
| `POST /api/favourites` with body `{ "artistId": "artist-001" }` | `{ favouriteArtistIds: string[] }`, the complete list after the change (idempotent) |
| `DELETE /api/favourites/:artistId` | `{ favouriteArtistIds: string[] }`, the complete list after the change (idempotent) |

Errors always look like `{ "error": { "code": "…", "message": "…" } }`:

| Status | Code | When |
| ------ | ---- | ---- |
| 400 | `INVALID_REQUEST` | Malformed JSON, missing or non-string `artistId`, oversized body |
| 404 | `ARTIST_NOT_FOUND` / `NOT_FOUND` | Unknown artist ID / unknown endpoint |
| 405 | `METHOD_NOT_ALLOWED` | Wrong HTTP method for an endpoint |
| 500 | `PERSISTENCE_FAILED` | The favourites file could not be written; nothing changed |
| 503 | `SIMULATED_FAILURE` | A failure demo is active |

Every request waits about 400 ms so that loading and saving states are visible.
You can change this with `node api/server.ts --delay=0`, or `API_DELAY_MS=0`
when using `pnpm start`. Changes are queued one at a time and written to a
temporary file, which is then renamed into place. The API replies only after
the write succeeds.

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| *"No artists loaded yet"* on `starter` | Expected: implementing the load is Exercise 2. |
| *"Cannot reach the workshop API"* | The API is not running. Restart `pnpm start` and check the `[api]` lines in the terminal. |
| `Port 3000 is already in use` | Another `pnpm start` is still running. Stop it, or start with `API_PORT=3100 pnpm start` (macOS/Linux) or `$env:API_PORT=3100; pnpm start` (PowerShell). |
| Port 4200 in use | Stop the other dev server, or run `pnpm web --port 4300` alongside `pnpm api`. |
| `runtime/favourites.json is not valid JSON` at startup | The saved file was edited or damaged. Stop the API, then run `pnpm data:reset`. The API never resets it silently. |
| `data:reset` says something is listening | Stop `pnpm start` first. |
| `pnpm test:workshop` fails on `starter` | Expected. Each failure describes behaviour you have not implemented yet. |
| Favourite buttons stay disabled | The store reports `canChangeFavourites = false` while a change is being saved, and until artists are loaded. |
| `pnpm install` fails offline | The first install needs network access or a prepared pnpm store (`pnpm fetch` beforehand). |

## Licence and attribution

MIT, see [LICENSE](LICENSE). All artist names and data are invented for this
workshop, and all code and fixtures are original. There are no copied assets,
images, fonts or third-party datasets. Dependencies are public npm packages
under their own licences.
