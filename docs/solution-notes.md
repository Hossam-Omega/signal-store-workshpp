# Solution notes

The reference store is
[`src/app/artists/state/artists.store.ts`](../src/app/artists/state/artists.store.ts)
on the `solution` branch. These notes explain the decisions behind it.

## Source vs derived state

| Source state (`withState`) | Derived state (`withComputed`) |
| -------------------------- | ------------------------------ |
| `artists`, `favouriteArtistIds` from the server | `allArtistsRows`, `favouriteArtistRows` |
| `loadStatus`, `loadError`, `isSavingFavourite`, `mutationError` | `isLoading`, `canChangeFavourites` |
| `artistsView`, `favouritesView` (user settings for each route) | `favouriteCount`, visible counts, `genreOptions` |

Nothing that can be computed is stored. The filtered and sorted rows exist only
as computed signals, so they cannot drift out of sync with the data or the
settings.

## Computed details

- An internal `favouriteIdSet` computed is shared by both row computeds. It is
  not returned, so it is not part of the public API.
- `map`/`filter` produce a new array before `sort`, so state arrays are never
  mutated. The tests freeze the arrays to prove this.
- `compareArtists` gives a total order: primary field and direction, then name
  A→Z, then ID.
- Each computed reads only its own route's view signal. Changing
  `favouritesView` therefore does not recompute `allArtistsRows`.

## Events

Every API call is one group of three events, defined in
[`artists.events.ts`](../src/app/artists/state/artists.events.ts):

| Request | Success (payload: response) | Fail (payload: message) |
| ------- | --------------------------- | ----------------------- |
| `loadArtistsRequested()` | `loadArtistsRequestedSuccess` | `loadArtistsRequestedFail` |
| `favouriteAddRequested(artistId)` | `favouriteAddRequestedSuccess` | `favouriteAddRequestedFail` |
| `favouriteRemoveRequested(artistId)` | `favouriteRemoveRequestedSuccess` | `favouriteRemoveRequestedFail` |

- **A request event describes its own HTTP call.** `apiEvent(...)` adds a
  `request` to the event: the endpoint config from
  [`endpoints.ts`](../src/app/artists/data-access/endpoints.ts) plus the
  success and fail events to answer with.
- **One prepared handler does all HTTP.**
  [`api-events.handler.ts`](../src/app/artists/data-access/api-events.handler.ts)
  listens to every event, calls the endpoint of each request event, and
  dispatches the success event with the response or the fail event with a
  readable message (`describeApiError`). It catches errors per request, so a
  failure never stops later requests. It is started by `provideApiEvents()`
  in `app.config.ts`.
- **Methods dispatch, nothing more.** `loadArtists()`, `retryLoad()`,
  `addFavourite()` and `removeFavourite()` keep their signatures, so the
  components did not change. `onInit` still calls `loadArtists()`.
- **The store's event handlers only update state.** One handler per event
  (`onLoadArtistsRequested`, `…Success`, `…Fail`), each a `tap` with
  `patchState`. There is no HTTP, no `catchError` and no flattening operator
  in the store. Add and remove change the same state, so their handlers
  listen to both events at once.

## Async choices

- The API event handler uses `mergeMap`: every request runs to completion,
  independently. The store no longer chooses `switchMap` or `concatMap` per
  call; that keeps the exercises about state. The UI disables favourite
  buttons while saving, so writes do not overlap in practice.
- `isSavingFavourite` is set by either request event and cleared by either
  outcome event. It is deliberately a simple boolean.
- After a write, favourites come from the response, never from a local guess.
  There are no optimistic updates.

## Lifetime

`providedIn: 'root'` creates one instance the first time it is injected (by
the app shell, or by whichever route opens first). `withHooks.onInit` starts
the single initial load by dispatching `loadArtistsRequested`. It is the last feature
on purpose: `withEventHandlers` starts listening in its own `onInit`, and hooks
run in feature order, so the handlers are listening before the first event is
dispatched. Route navigation never recreates the store, so data
and each route's view settings survive navigation. A browser refresh creates a
new store, which restores favourites from `GET /api/artists`.

## Out of scope

`withEntities`, custom store features, optimistic updates, caching, and
persisting view settings across refreshes.
