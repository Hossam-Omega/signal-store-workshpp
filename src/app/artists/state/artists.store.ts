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
  ArtistRow,
  ArtistsViewId,
  FavouritesViewSettings,
  FavouriteStatusFilter,
  LoadStatus,
  SortDirection,
  SortField,
  ViewSettings,
} from './artists-view.model';
import { workshopTodo } from './workshop-todo';

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
  //
  // Replace every WORKSHOP PLACEHOLDER with a real computed signal. Compose the
  // prepared helpers (matchesNameSearch, matchesGenre, matchesFavouriteStatus,
  // toArtistRow, compareArtists) here. Keep the functions pure, and sort a
  // copy — never the state array itself.
  // -------------------------------------------------------------------------
  withComputed((store) => ({
    // WORKSHOP PLACEHOLDER (Exercise 3): every artist, unfiltered and unsorted.
    allArtistsRows: computed((): ArtistRow[] => {
      const favouriteIds = new Set(store.favouriteArtistIds());
      return store.artists().map((artist) => toArtistRow(artist, favouriteIds));
    }),
    // WORKSHOP PLACEHOLDER (Exercise 3): saved favourites, filtered by favouritesView and sorted.
    favouriteArtistRows: computed((): ArtistRow[] => []),
    // WORKSHOP PLACEHOLDER (Exercise 3): total number of favourites, ignoring filters.
    favouriteCount: computed(() => 0),
    // WORKSHOP PLACEHOLDER (Exercise 3): number of rows on each route.
    allArtistsVisibleCount: computed(() => 0),
    favouritesVisibleCount: computed(() => 0),
    // WORKSHOP PLACEHOLDER (Exercise 3): each genre in the full dataset once, A→Z.
    genreOptions: computed((): string[] => []),

    // Prepared examples (used by the UI from the start).
    isLoading: computed(() => store.loadStatus() === 'loading'),
    canChangeFavourites: computed(() => store.loadStatus() === 'loaded' && !store.isSavingFavourite()),
  })),

  withMethods((store, api = inject(ArtistsApiService)) => {
    // -----------------------------------------------------------------------
    // EXERCISE 1 — view settings with patchState
    //
    // Implement the five setters returned below. Each one changes a single
    // field of `artistsView` or `favouritesView` (chosen by `view`) and must
    // leave the other view untouched. Tip: a small helper function declared
    // here keeps the setters short.
    // -----------------------------------------------------------------------

    // -----------------------------------------------------------------------
    // EXERCISE 2 — loading with rxMethod
    //
    // Create an rxMethod<void> here that sets loadStatus/loadError, calls
    // api.getArtists() with switchMap, and handles success and failure with
    // tapResponse (use describeApiError for the message). Then call it from
    // loadArtists() and retryLoad() below.
    // -----------------------------------------------------------------------

    // -----------------------------------------------------------------------
    // EXERCISE 4 — favourites with pending and error state
    //
    // Create one rxMethod<FavouriteChange> here that serializes writes with
    // concatMap, sets isSavingFavourite/mutationError, calls
    // api.addFavourite or api.removeFavourite, and patches favouriteArtistIds
    // from the response. Then call it from addFavourite() and removeFavourite().
    // -----------------------------------------------------------------------

    return {
      // Exercise 1
      setSearch(view: ArtistsViewId, search: string): void {
        workshopTodo('Exercise 1', 'setSearch', { view, search });
      },
      setGenre(view: ArtistsViewId, genre: string | null): void {
        workshopTodo('Exercise 1', 'setGenre', { view, genre });
      },
      setSortField(view: ArtistsViewId, sortField: SortField): void {
        workshopTodo('Exercise 1', 'setSortField', { view, sortField });
      },
      setSortDirection(view: ArtistsViewId, sortDirection: SortDirection): void {
        workshopTodo('Exercise 1', 'setSortDirection', { view, sortDirection });
      },
      setFavouriteStatus(favouriteStatus: FavouriteStatusFilter): void {
        workshopTodo('Exercise 1', 'setFavouriteStatus', { favouriteStatus });
      },

      // Exercise 2
      loadArtists(): void {
        workshopTodo('Exercise 2', 'loadArtists');
      },
      retryLoad(): void {
        workshopTodo('Exercise 2', 'retryLoad');
      },

      // Exercise 4
      addFavourite(artistId: string): void {
        workshopTodo('Exercise 4', 'addFavourite', { artistId });
      },
      removeFavourite(artistId: string): void {
        workshopTodo('Exercise 4', 'removeFavourite', { artistId });
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
