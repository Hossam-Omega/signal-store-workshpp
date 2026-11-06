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

## Async choices

| Action | Operator | Reason |
| ------ | -------- | ------ |
| Load | `switchMap` | A newer load supersedes an older one; abandoning a read is harmless. |
| Add/remove | `concatMap` (one shared `rxMethod` for both) | Writes are applied in order, one at a time. The newest confirmed list wins. Unsubscribing (`switchMap`) would not undo a server-side write. |

- `tapResponse` handles errors *inside* the inner observable, so the outer
  `rxMethod` stream survives failures and retries keep working.
- `isSavingFavourite` is set inside the `concatMap` projection, so it is true
  while each queued request runs. It is cleared in both `next` and `error`.
- After a write, favourites are patched from the response, never from a local
  guess. There are no optimistic updates.

## Lifetime

`providedIn: 'root'` creates one instance the first time it is injected (by
the app shell, or by whichever route opens first). `withHooks.onInit` starts
the single initial load. Route navigation never recreates the store, so data
and each route's view settings survive navigation. A browser refresh creates a
new store, which restores favourites from `GET /api/artists`.

## Out of scope

`withEntities`, custom store features, optimistic updates, caching, and
persisting view settings across refreshes.
