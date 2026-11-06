# Workshop guide

**Duration:** 90 minutes core, plus 30 optional minutes.
**You edit:** [`src/app/artists/state/artists.store.ts`](../src/app/artists/state/artists.store.ts) only.
**You check:** `pnpm test:workshop` (all exercises) and the browser at <http://localhost:4200>.

| Time      | Part | Checkpoint branch afterwards |
| --------- | ---- | ---------------------------- |
| 0–10 min  | [Tour](#tour-010-min) | – |
| 10–25 min | [Exercise 1: view settings](#exercise-1--view-settings-1025-min) | `checkpoint/01-state` |
| 25–45 min | [Exercise 2: loading](#exercise-2--loading-with-events-2545-min) | `checkpoint/02-loading` |
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
pnpm test:workshop    # 39 store tests; on starter almost all fail, by design
```

---

## Tour (0–10 min)

1. **The UI is finished.** Open `/artists` and `/favourites`. Every control,
   table, loading bar and error panel is already bound to the store. Look at
   [`all-artists-page.html`](../src/app/artists/pages/all-artists-page.html):
   the page only *reads* store signals and *calls* store methods.
2. **The API contract** (see the [README](../README.md#the-local-api)) has
   three endpoints. `GET` returns everything. The two favourite writes return
   the complete, authoritative favourite-ID list.
3. **The store skeleton.** In `artists.store.ts`, note:
   - `ArtistsState` and `initialArtistsState`: the **source state** (prepared).
   - `withComputed`: **derived state**, currently `WORKSHOP PLACEHOLDER`s.
   - `withProps`: `events`, the stream of every dispatched event (prepared).
     Your event handlers listen to it with `store.events.on(...)`.
   - `withMethods`: the store's **public API**, currently calling
     `workshopTodo(...)`, which only logs a console warning. Placeholders
     never pretend to succeed. Components keep calling these methods; for
     loading and saving, the methods will only *dispatch request events*.
   - `withHooks.onInit`: the store loads artists the first time anything
     injects it (prepared).
   - `providedIn: 'root'`: one store instance for the whole app, so both routes
     share the artists and favourites, and navigating between them neither
     recreates the store nor reloads data.
4. **Prepared helpers** you will use:
   - [`artists.events.ts`](../src/app/artists/state/artists.events.ts): one
     group of three events per API call. The request event spreads an
     endpoint config and names its outcome events:

     ```ts
     export const favouriteAddRequested = apiEvent('[Favourites] Add Favourite Requested', (artistId: string) => ({
       ...endpoints.addFavouriteConfig(artistId),
       successEvent: favouriteAddRequestedSuccess,
       failureEvent: favouriteAddRequestedFail,
     }));
     ```

     | Request | Success (payload: response) | Fail (payload: message) |
     | ------- | --------------------------- | ----------------------- |
     | `loadArtistsRequested()` | `loadArtistsRequestedSuccess` | `loadArtistsRequestedFail` |
     | `favouriteAddRequested(artistId)` | `favouriteAddRequestedSuccess` | `favouriteAddRequestedFail` |
     | `favouriteRemoveRequested(artistId)` | `favouriteRemoveRequestedSuccess` | `favouriteRemoveRequestedFail` |

   - [`endpoints.ts`](../src/app/artists/data-access/endpoints.ts): method,
     URL, body and fallback error message for each endpoint.
   - [`api-events.handler.ts`](../src/app/artists/data-access/api-events.handler.ts):
     listens to every request event, makes the HTTP call, and dispatches the
     success event with the response or the fail event with a readable
     message. **The store never calls HTTP and never catches errors.**
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

## Exercise 2 — loading with events (25–45 min)

**Concepts:** dispatching events, `withEventHandlers`, explicit status.

Loading is one group of three events. The store *requests* the load; the
prepared API event handler makes the call and reports back with the success
or fail event; the store updates its state for each of the three.

1. **Dispatch.** In `withMethods`, inject the `Dispatcher` and make
   `loadArtists()` and `retryLoad()` call
   `dispatcher.dispatch(loadArtistsRequested())`. `onInit` already calls
   `loadArtists()`, so the first load starts by itself.
2. **Handle.** After `withMethods`, add a `withEventHandlers(...)` with one
   handler per event. Each listens with `store.events.on(...)` and updates
   state in a `tap`:
   - `onLoadArtistsRequested` → `loadStatus: 'loading'`, `loadError: null`
   - `onLoadArtistsRequestedSuccess` → `artists` and `favouriteArtistIds` from
     the payload, `loadStatus: 'loaded'`
   - `onLoadArtistsRequestedFail` → `loadStatus: 'error'`, `loadError` from
     the payload (already a readable message)

```ts
withEventHandlers((store) => ({
  onLoadArtistsRequested: store.events
    .on(loadArtistsRequested)
    .pipe(tap(() => patchState(store, { /* … */ }))),

  onLoadArtistsRequestedSuccess: store.events
    .on(loadArtistsRequestedSuccess)
    .pipe(tap(({ payload }) => patchState(store, { /* … */ }))),

  onLoadArtistsRequestedFail: /* … */,
})),
```

Why it works this way:

- **The store never touches HTTP.** The request event carries its endpoint
  config, and the prepared handler turns every request into its success or
  fail event. No `catchError`, no `next`/`error` callbacks in the store.
- **One handler, one event.** Each handler reads like a sentence: *on load
  requested, show loading*. The **Try again** button works because every
  `retryLoad()` dispatches a fresh request.
- **Keep `withHooks` last.** Handlers start listening in their own `onInit`,
  and hooks run in feature order. If `withHooks` came first, the initial
  `loadArtistsRequested` would be dispatched before your handlers listen.

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

**Concepts:** write events, pending and error state.

Same pattern as Exercise 2, for two API calls:

1. **Dispatch.** `addFavourite(artistId)` dispatches
   `favouriteAddRequested(artistId)`; `removeFavourite(artistId)` dispatches
   `favouriteRemoveRequested(artistId)`.
2. **Handle** (a second `withEventHandlers`). Adding and removing change the
   same state, so one handler can listen to both events:
   `store.events.on(favouriteAddRequested, favouriteRemoveRequested)`.
   - `onFavouriteChangeRequested` (both requests) → `isSavingFavourite: true`,
     `mutationError: null`
   - `onFavouriteChangeRequestedSuccess` (both successes) →
     `favouriteArtistIds` **from the payload**, `isSavingFavourite: false`.
     The server's list is authoritative, so do not compute it locally.
   - `onFavouriteChangeRequestedFail` (both fails) → keep the current IDs, set
     `mutationError` from the payload, `isSavingFavourite: false`

Good to know:

- No optimistic updates: the UI changes only after the server confirms.
  (`canChangeFavourites` already disables every button while saving.)
- Writing three handlers for add and three for remove also works; listening
  to two events in one handler just removes the duplication.

**Tests:** [`exercises/04-favourites.spec.ts`](../src/app/artists/state/exercises/04-favourites.spec.ts).

**In the browser:** add a favourite on `/artists`. The badge and `/favourites`
update together. Refresh, and the favourite is still there because the API
saved it to `runtime/favourites.json`.

---

## Recap (85–90 min)

```sh
pnpm test:workshop   # all 39 store tests should pass
```

- **Source state** holds what the server and the user told us: artists, IDs,
  statuses, errors and view settings.
- **Derived state** is everything computable from source state: rows, counts
  and options. Computed signals track exactly the signals they read, so
  changing `favouritesView` does not recompute `allArtistsRows`.
- **Events:** each API call is a group of three events. Methods dispatch the
  *request*; the API event handler answers with *success* or *fail*; the
  store's event handlers turn each of the three into state.
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
  `HttpTestingController` decides *when* and *how* each request is answered,
  so the tests can check the state in between.
- **Computed dependencies:** add a `console.count('allArtistsRows')` inside
  the computed, change only the favourites route's search, and observe.
- **Trace the events:** add a handler
  `logAll: store.events.on().pipe(tap((event) => console.log(event.type)))`,
  then add a favourite and watch Requested → Success go by.

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
