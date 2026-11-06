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

    // Exercises 2 and 4: the methods only dispatch request events.
    const dispatcher = inject(Dispatcher);

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
        dispatcher.dispatch(loadArtistsRequested());
      },
      retryLoad(): void {
        dispatcher.dispatch(loadArtistsRequested());
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
  // -------------------------------------------------------------------------
  withEventHandlers((store) => ({
    onLoadArtistsRequested: store.events
      .on(loadArtistsRequested)
      .pipe(tap(() => patchState(store, { loadStatus: 'loading', loadError: null }))),

    onLoadArtistsRequestedSuccess: store.events
      .on(loadArtistsRequestedSuccess)
      .pipe(
        tap(({ payload: { artists, favouriteArtistIds } }) =>
          patchState(store, { artists, favouriteArtistIds, loadStatus: 'loaded' }),
        ),
      ),

    onLoadArtistsRequestedFail: store.events
      .on(loadArtistsRequestedFail)
      .pipe(tap(({ payload: message }) => patchState(store, { loadStatus: 'error', loadError: message }))),
  })),

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
