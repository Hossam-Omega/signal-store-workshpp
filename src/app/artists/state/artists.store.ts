import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withProps, withState } from '@ngrx/signals';
import { Dispatcher, Events, withEventHandlers } from '@ngrx/signals/events';
import { tap } from 'rxjs';

import { Artist } from '../data-access/artist.model';
import {
  compareArtists,
  matchesFavouriteStatus,
  matchesGenre,
  matchesNameSearch,
  toArtistRow,
} from './artist-view.helpers';
import {
  favouriteAddRequested,
  favouriteAddRequestedFail,
  favouriteAddRequestedSuccess,
  favouriteRemoveRequested,
  favouriteRemoveRequestedFail,
  favouriteRemoveRequestedSuccess,
  loadArtistsRequested,
  loadArtistsRequestedFail,
  loadArtistsRequestedSuccess,
} from './artists.events';
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
 *  Events (prepared): ./artists.events.ts
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

/**
 * One application-wide store shared by `/artists` and `/favourites`.
 * Components only read its signals and call its methods; the methods dispatch events.
 */
export const ArtistsStore = signalStore(
  { providedIn: 'root' },
  withState(initialArtistsState),
  // Prepared: every dispatched event, for the event handlers below.
  withProps(() => ({ events: inject(Events) })),

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

  withMethods((store) => {
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
    // EXERCISES 2 and 4 — the methods only dispatch request events
    //
    // Inject the Dispatcher here. loadArtists()/retryLoad() (Exercise 2) and
    // addFavourite()/removeFavourite() (Exercise 4) each dispatch one request
    // event from ./artists.events.ts: no HTTP calls in the store.
    // -----------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // EXERCISE 2 — loading with events
  //
  // Add a withEventHandlers here with one handler per event of the
  // loadArtistsRequested group. Each listens with store.events.on(...) and
  // updates state with tap(() => patchState(store, ...)):
  //  - onLoadArtistsRequested: loading, clear loadError
  //  - onLoadArtistsRequestedSuccess: artists and favourite IDs from the
  //    payload, loaded
  //  - onLoadArtistsRequestedFail: error, loadError from the payload
  // The prepared API event handler makes the HTTP call and dispatches the
  // success or fail event.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // EXERCISE 4 — favourites with events, pending and error state
  //
  // Add a withEventHandlers here. One handler can listen to several events:
  // store.events.on(favouriteAddRequested, favouriteRemoveRequested).
  //  - onFavouriteChangeRequested: isSavingFavourite, clear mutationError
  //  - onFavouriteChangeRequestedSuccess: favouriteArtistIds from the payload
  //    (the server's list is authoritative), stop saving
  //  - onFavouriteChangeRequestedFail: mutationError from the payload, stop
  //    saving
  // -------------------------------------------------------------------------

  // Prepared: the first component that injects the store triggers the initial load.
  withHooks({
    onInit(store) {
      store.loadArtists();
    },
  }),
);

export type ArtistsStore = InstanceType<typeof ArtistsStore>;
