import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { concatMap, pipe, switchMap, tap } from 'rxjs';

import { describeApiError } from '../data-access/api-error';
import { Artist } from '../data-access/artist.model';
import { ArtistsApiService } from '../data-access/artists-api.service';
import {
  compareArtists,
  matchesFavouriteStatus,
  matchesGenre,
  matchesNameSearch,
  toArtistRow,
} from './artist-view.helpers';
import {
  AllArtistsViewSettings,
  ArtistsViewId,
  FavouritesViewSettings,
  FavouriteStatusFilter,
  LoadStatus,
  SortDirection,
  SortField,
  ViewSettings,
} from './artists-view.model';

/*
 * ===========================================================================
 *  WORKSHOP STORE — this is the only file you edit during the core exercises.
 *  Steps and hints: docs/workshop-guide.md · Check your work: pnpm test:workshop
 * ===========================================================================
 */

// ---------------------------------------------------------------------------
// Source state (prepared)
// ---------------------------------------------------------------------------

export interface ArtistsState {
  artists: Artist[];
  favouriteArtistIds: string[];
  loadStatus: LoadStatus;
  loadError: string | null;
  isSavingFavourite: boolean;
  mutationError: string | null;
  artistsView: AllArtistsViewSettings;
  favouritesView: FavouritesViewSettings;
}

export const initialArtistsState: ArtistsState = {
  artists: [],
  favouriteArtistIds: [],
  loadStatus: 'idle',
  loadError: null,
  isSavingFavourite: false,
  mutationError: null,
  artistsView: { search: '', genre: null, favouriteStatus: 'all', sortField: 'name', sortDirection: 'asc' },
  favouritesView: { search: '', genre: null, sortField: 'name', sortDirection: 'asc' },
};

type FavouriteChange = { kind: 'add' | 'remove'; artistId: string };

/**
 * One application-wide store shared by `/artists` and `/favourites`.
 * Components only read its signals and call its methods.
 */
export const ArtistsStore = signalStore(
  { providedIn: 'root' },
  withState(initialArtistsState),

  // -------------------------------------------------------------------------
  // EXERCISE 3 — derived state with withComputed
  // -------------------------------------------------------------------------
  withComputed((store) => {
    // Looking up IDs in a Set is cheaper than `includes` for every row.
    const favouriteIdSet = computed(() => new Set(store.favouriteArtistIds()));

    const allArtistsRows = computed(() => {
      const view = store.artistsView();
      const favouriteIds = favouriteIdSet();
      // `map` returns a new array, so sorting it never mutates source state.
      return store
        .artists()
        .map((artist) => toArtistRow(artist, favouriteIds))
        .filter(
          (row) =>
            matchesNameSearch(row, view.search) &&
            matchesGenre(row, view.genre) &&
            matchesFavouriteStatus(row.isFavourite, view.favouriteStatus),
        )
        .sort(compareArtists(view.sortField, view.sortDirection));
    });

    const favouriteArtistRows = computed(() => {
      const view = store.favouritesView();
      const favouriteIds = favouriteIdSet();
      return store
        .artists()
        .filter(
          (artist) =>
            favouriteIds.has(artist.id) && matchesNameSearch(artist, view.search) && matchesGenre(artist, view.genre),
        )
        .map((artist) => toArtistRow(artist, favouriteIds))
        .sort(compareArtists(view.sortField, view.sortDirection));
    });

    return {
      allArtistsRows,
      favouriteArtistRows,
      favouriteCount: computed(() => store.favouriteArtistIds().length),
      allArtistsVisibleCount: computed(() => allArtistsRows().length),
      favouritesVisibleCount: computed(() => favouriteArtistRows().length),
      genreOptions: computed(() =>
        [...new Set(store.artists().map((artist) => artist.genre))].sort((a, b) => a.localeCompare(b)),
      ),

      // Prepared examples (used by the UI from the start).
      isLoading: computed(() => store.loadStatus() === 'loading'),
      canChangeFavourites: computed(() => store.loadStatus() === 'loaded' && !store.isSavingFavourite()),
    };
  }),

  withMethods((store, api = inject(ArtistsApiService)) => {
    // -----------------------------------------------------------------------
    // EXERCISE 1 — view settings with patchState
    // -----------------------------------------------------------------------
    function updateView(view: ArtistsViewId, changes: Partial<ViewSettings>): void {
      if (view === 'artists') {
        patchState(store, (state) => ({ artistsView: { ...state.artistsView, ...changes } }));
      } else {
        patchState(store, (state) => ({ favouritesView: { ...state.favouritesView, ...changes } }));
      }
    }

    // -----------------------------------------------------------------------
    // EXERCISE 2 — loading with rxMethod
    // -----------------------------------------------------------------------
    const loadArtists = rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loadStatus: 'loading', loadError: null })),
        // switchMap: a newer load makes an older, still-pending response irrelevant.
        switchMap(() =>
          api.getArtists().pipe(
            tapResponse({
              next: ({ artists, favouriteArtistIds }) =>
                patchState(store, { artists, favouriteArtistIds, loadStatus: 'loaded' }),
              error: (error) =>
                patchState(store, {
                  loadStatus: 'error',
                  loadError: describeApiError(error, 'Could not load artists.'),
                }),
            }),
          ),
        ),
      ),
    );

    // -----------------------------------------------------------------------
    // EXERCISE 4 — favourites with pending and error state
    // -----------------------------------------------------------------------
    const saveFavourite = rxMethod<FavouriteChange>(
      // concatMap: run writes one after another, in the order they were requested.
      // Never switchMap for writes: unsubscribing does not undo a server-side write.
      concatMap(({ kind, artistId }) => {
        patchState(store, { isSavingFavourite: true, mutationError: null });
        const request$ = kind === 'add' ? api.addFavourite(artistId) : api.removeFavourite(artistId);
        return request$.pipe(
          // tapResponse catches errors, so one failure does not end the stream.
          tapResponse({
            // Trust the server's complete list instead of guessing locally.
            next: ({ favouriteArtistIds }) => patchState(store, { favouriteArtistIds, isSavingFavourite: false }),
            error: (error) =>
              patchState(store, {
                isSavingFavourite: false,
                mutationError: describeApiError(error, 'Could not update favourites.'),
              }),
          }),
        );
      }),
    );

    return {
      // Exercise 1
      setSearch(view: ArtistsViewId, search: string): void {
        updateView(view, { search });
      },
      setGenre(view: ArtistsViewId, genre: string | null): void {
        updateView(view, { genre });
      },
      setSortField(view: ArtistsViewId, sortField: SortField): void {
        updateView(view, { sortField });
      },
      setSortDirection(view: ArtistsViewId, sortDirection: SortDirection): void {
        updateView(view, { sortDirection });
      },
      setFavouriteStatus(favouriteStatus: FavouriteStatusFilter): void {
        patchState(store, (state) => ({ artistsView: { ...state.artistsView, favouriteStatus } }));
      },

      // Exercise 2
      loadArtists(): void {
        loadArtists();
      },
      retryLoad(): void {
        loadArtists();
      },

      // Exercise 4
      addFavourite(artistId: string): void {
        saveFavourite({ kind: 'add', artistId });
      },
      removeFavourite(artistId: string): void {
        saveFavourite({ kind: 'remove', artistId });
      },
    };
  }),

  // Prepared: the first component that injects the store triggers the initial load.
  withHooks({
    onInit(store) {
      store.loadArtists();
    },
  }),
);

export type ArtistsStore = InstanceType<typeof ArtistsStore>;
