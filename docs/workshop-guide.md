# Workshop guide

**Duration:** 90 minutes core, plus 30 optional minutes.
**You edit:** [`src/app/artists/state/artists.store.ts`](../src/app/artists/state/artists.store.ts) only.
**You check:** `pnpm test:workshop` (all exercises) and the browser at <http://localhost:4200>.

| Time      | Part | Checkpoint branch afterwards |
| --------- | ---- | ---------------------------- |
| 0–10 min  | [Tour](#tour-010-min) | – |
| 10–25 min | [Exercise 1: view settings](#exercise-1--view-settings-1025-min) | `checkpoint/01-state` |
| 25–45 min | [Exercise 2: loading](#exercise-2--loading-with-rxmethod-2545-min) | `checkpoint/02-loading` |
| 45–65 min | [Exercise 3: derived views](#exercise-3--derived-views-with-withcomputed-4565-min) | `checkpoint/03-computed` |
| 65–85 min | [Exercise 4: favourites](#exercise-4--saving-favourites-6585-min) | `checkpoint/04-favourites` |
| 85–90 min | [Recap](#recap-8590-min) | `solution` |
| +30 min   | [Optional](#optional-30-min) | – |

Timings are guidance. If you fall behind, switch to the next checkpoint (see
[below](#switching-checkpoints-safely)) and carry on.

---

## Setup

```sh
git switch starter
pnpm install --frozen-lockfile
pnpm start            # leave it running
```

In a second terminal:

```sh
pnpm test:workshop    # 41 store tests; on starter almost all fail, by design
```

---

## Tour (0–10 min)

1. **The UI is finished.** Open `/artists` and `/favourites`. Every control,
   table, loading bar and error panel is already bound to the store. Look at
   [`all-artists-page.ts`](../src/app/artists/pages/all-artists-page.ts):
   the page only *reads* store signals and *calls* store methods.
2. **The API contract** (see the [README](../README.md#the-local-api)) has
   three endpoints. `GET` returns everything. The two favourite writes return
   the complete, authoritative favourite-ID list.
3. **The store skeleton.** In `artists.store.ts`, note:
   - `ArtistsState` and `initialArtistsState`: the **source state** (prepared).
   - `withComputed`: **derived state**, currently `WORKSHOP PLACEHOLDER`s.
   - `withMethods`: **actions**, currently calling `workshopTodo(...)`, which
     only logs a console warning. Placeholders never pretend to succeed.
   - `withHooks.onInit`: the store loads artists the first time anything
     injects it (prepared).
   - `providedIn: 'root'`: one store instance for the whole app, so both routes
     share the artists and favourites, and navigating between them neither
     recreates the store nor reloads data.
4. **Prepared helpers** you will use:
   - `ArtistsApiService` (`getArtists`, `addFavourite`, `removeFavourite`):
     you never write URLs.
   - `describeApiError(error, fallback)` turns an HTTP error into a UI message.
   - `artist-view.helpers.ts`: `matchesNameSearch`, `matchesGenre`,
     `matchesFavouriteStatus`, `toArtistRow`, `compareArtists`.

---

## Exercise 1 — view settings (10–25 min)

**Concepts:** `withState`, `withMethods`, `patchState`.

Each route has its own settings: `artistsView` (search, genre, favourite
status, sort field, direction) and `favouritesView` (the same, without
favourite status). Implement:

```ts
setSearch(view: ArtistsViewId, search: string): void
setGenre(view: ArtistsViewId, genre: string | null): void   // null = all genres
setSortField(view: ArtistsViewId, sortField: SortField): void
setSortDirection(view: ArtistsViewId, sortDirection: SortDirection): void
setFavouriteStatus(favouriteStatus: FavouriteStatusFilter): void  // artistsView only
```

Hints:

- `patchState(store, partial)` or `patchState(store, (state) => partial)`.
  State is immutable, so to change one nested field, copy the view:
  `{ artistsView: { ...state.artistsView, search } }`.
- One small helper such as `updateView(view, changes)` avoids writing the
  `if (view === 'artists')` branch five times.
- Store the search text exactly as typed. Trimming happens when filtering
  (Exercise 3).

**Tests:** [`exercises/01-state.spec.ts`](../src/app/artists/state/exercises/01-state.spec.ts).

**In the browser:** the `[Workshop] setSearch() is not implemented` warnings
disappear from the console. Nothing else visibly changes yet, because there is
no data until Exercise 2 and the rows are derived in Exercise 3. The tests are
your feedback here.

---

## Exercise 2 — loading with rxMethod (25–45 min)

**Concepts:** `rxMethod`, `switchMap`, `tapResponse`, explicit status.

Implement `loadArtists()` and `retryLoad()`:

1. Set `loadStatus: 'loading'` and clear `loadError`.
2. Call `api.getArtists()` inside `switchMap`.
3. On success, patch `artists`, `favouriteArtistIds` and `loadStatus: 'loaded'`.
4. On failure, patch `loadStatus: 'error'` and
   `loadError: describeApiError(error, 'Could not load artists.')`.

```ts
const load = rxMethod<void>(
  pipe(
    tap(() => /* 1 */),
    switchMap(() => api.getArtists().pipe(tapResponse({ next: /* 3 */, error: /* 4 */ }))),
  ),
);
```

Why these operators:

- **`switchMap`**: if a new load starts, the old response is no longer
  interesting, so it is dropped. (Reads are safe to cancel.)
- **`tapResponse` inside `switchMap`**: it catches the error *per request*. If
  the error reached the outer stream, the `rxMethod` would stop, and the
  **Try again** button would do nothing.

**Tests:** [`exercises/02-loading.spec.ts`](../src/app/artists/state/exercises/02-loading.spec.ts).

**In the browser:** a loading bar appears for about 400 ms, then the table
shows all 25 artists, unsorted for now. Switch between both routes: data
stays, and the Network tab shows no second request. Refresh on `/favourites`:
the data loads there too. Try the failure demo:
stop the app, run `pnpm start:fail-first-load`, see the error panel, and click
**Try again**.

---

## Exercise 3 — derived views with withComputed (45–65 min)

**Concepts:** `withComputed`, pure computed functions, source vs derived state.

Replace every `WORKSHOP PLACEHOLDER`:

| Computed | Meaning |
| -------- | ------- |
| `allArtistsRows` | all artists as `ArtistRow`s, filtered by `artistsView` (name, genre, favourite status) and sorted |
| `favouriteArtistRows` | only favourites, filtered by `favouritesView` (name, genre) and sorted |
| `favouriteCount` | total favourites, **independent of any filter** |
| `allArtistsVisibleCount`, `favouritesVisibleCount` | number of rows each route shows |
| `genreOptions` | each genre in the *complete* dataset once, A→Z |

Rules:

- Compose the prepared helpers *inside* `withComputed`. The filtering and
  sorting pipeline should be visible here.
- `Array.prototype.sort` mutates the array it is called on. Sort a copy:
  `filter`/`map` already return new arrays, or use `[...array]`.
- `compareArtists(field, direction)` breaks ties by name, then by ID, so the
  order is fully deterministic. There are deliberate ties in the data, for
  example two artists named *Mara Quill*.
- You can create an internal `computed` (for example a `Set` of favourite IDs)
  and reuse it in several public ones. Only what you return becomes public.
- Never store filtered or sorted arrays in state. They are *derived*.

**Tests:** [`exercises/03-computed.spec.ts`](../src/app/artists/state/exercises/03-computed.spec.ts).

**In the browser:** every control now works. Set different filters on each
route, then navigate back and forth: each route keeps its own settings.

---

## Exercise 4 — saving favourites (65–85 min)

**Concepts:** writes with `rxMethod` and `concatMap`, pending and error state.

Implement `addFavourite(artistId)` and `removeFavourite(artistId)` with **one
shared** `rxMethod<FavouriteChange>`:

1. When a request starts, set `isSavingFavourite: true` and clear
   `mutationError`.
2. Call `api.addFavourite` or `api.removeFavourite`.
3. On success, patch `favouriteArtistIds` **from the response**. The server's
   list is authoritative, so do not compute it locally. Also clear
   `isSavingFavourite`.
4. On failure, keep the current IDs, clear `isSavingFavourite`, and set
   `mutationError: describeApiError(error, 'Could not update favourites.')`.

Why `concatMap`:

- Writes run **one after another, in order**, and the latest confirmed list wins.
- `switchMap` would *unsubscribe* from an in-flight write, but unsubscribing
  does not undo a write the server already accepted. `mergeMap` lets
  responses arrive out of order. `exhaustMap` silently drops clicks.
- Set the pending flag *inside* the `concatMap` projection, so that it is true
  for each request while that request runs.
- No optimistic updates: the UI changes only after the server confirms.
  (`canChangeFavourites` already disables every button while saving.)

**Tests:** [`exercises/04-favourites.spec.ts`](../src/app/artists/state/exercises/04-favourites.spec.ts).

**In the browser:** add a favourite on `/artists`. The badge and `/favourites`
update together. Refresh, and the favourite is still there because the API
saved it to `runtime/favourites.json`.

---

## Recap (85–90 min)

```sh
pnpm test:workshop   # all 41 store tests should pass
```

- **Source state** holds what the server and the user told us: artists, IDs,
  statuses, errors and view settings.
- **Derived state** is everything computable from source state: rows, counts
  and options. Computed signals track exactly the signals they read, so
  changing `favouritesView` does not recompute `allArtistsRows`.
- **Operators:** `switchMap` for reads you may abandon, `concatMap` for writes
  that must all happen in order. Catch errors per request so the action keeps
  working.
- **Lifetime:** one root store. View settings live in the shared store but are
  separate for each route, so they survive navigation (not a browser refresh).

Compare your file with the reference solution:

```sh
git diff solution -- src/app/artists/state/artists.store.ts
```

---

## Optional (30 min)

- **Failure demo:** `pnpm start:fail-mutations`. Every add or remove shows an
  error, favourites stay as they were, and buttons become usable again.
  Restart with `pnpm start` and try again.
- **Test walkthrough:** read `exercises/04-favourites.spec.ts`. Notice how
  `Subject`s control *when* a response arrives, which is how the tests prove
  serialization.
- **Computed dependencies:** add a `console.count('allArtistsRows')` inside
  the computed, change only the favourites route's search, and observe.
- **Experiment:** what breaks if you swap `concatMap` for `mergeMap`? Run the
  tests.

---

## Switching checkpoints safely

Never use `git reset --hard` or `git checkout -- .` on your work. Keep your
changes first, then switch:

```sh
# Option A: keep your attempt on a local branch
git switch -c my-attempt
git commit -am "My workshop attempt"
git switch checkpoint/02-loading

# Option B: stash it
git stash push -m "my store attempt"
git switch checkpoint/02-loading
# later: git stash list / git stash apply
```

Every branch has the same commands and dependencies, so you do not need to
reinstall. If `pnpm start` is running, it rebuilds by itself.

Useful comparisons:

```sh
git diff starter checkpoint/01-state -- src/app/artists/state/artists.store.ts
git diff checkpoint/03-computed checkpoint/04-favourites -- src/app/artists/state/artists.store.ts
```
