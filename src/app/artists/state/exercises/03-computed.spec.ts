/**
 * Exercise 3 — derived state with withComputed.
 * Replace the WORKSHOP PLACEHOLDER computed values in artists.store.ts.
 * Run with: pnpm test:workshop
 *
 * These tests write source state directly (patchState + unprotected), so they
 * only exercise your computed signals.
 */
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';

import { ArtistsStore, initialArtistsState } from '../artists.store';
import { AllArtistsViewSettings, FavouritesViewSettings } from '../artists-view.model';
import { ids, namesAndIds, setUpArtistsStore, TEST_ARTISTS, TEST_FAVOURITE_IDS } from '../testing/artists-test-data';

function setUpLoadedStore(): ArtistsStore {
  // The initial GET stays unanswered; the source state is written directly.
  const { store } = setUpArtistsStore();
  patchState(unprotected(store), {
    // Frozen arrays: sorting them in place would throw a TypeError.
    artists: TEST_ARTISTS as typeof initialArtistsState.artists,
    favouriteArtistIds: TEST_FAVOURITE_IDS as string[],
    loadStatus: 'loaded',
  });
  return store;
}

function setArtistsView(store: ArtistsStore, changes: Partial<AllArtistsViewSettings>): void {
  patchState(unprotected(store), (state) => ({ artistsView: { ...state.artistsView, ...changes } }));
}

function setFavouritesView(store: ArtistsStore, changes: Partial<FavouritesViewSettings>): void {
  patchState(unprotected(store), (state) => ({ favouritesView: { ...state.favouritesView, ...changes } }));
}

describe('Exercise 3: derived views', () => {
  describe('allArtistsRows', () => {
    it('shows every artist sorted by name (A→Z), ties broken by ID, with favourite flags', () => {
      const store = setUpLoadedStore();

      expect(namesAndIds(store.allArtistsRows()), 'default view: all artists sorted by name').toEqual([
        'Ada Stone (a1)',
        'Ada Stone (a4)',
        'ben marsh (a2)',
        'Cara Lune (a3)',
        'Dex Rowe (a5)',
      ]);
      expect(
        store.allArtistsRows().map((row) => row.isFavourite),
        'each row needs isFavourite (use toArtistRow)',
      ).toEqual([true, false, false, true, false]);
    });

    it('matches names case-insensitively and ignores surrounding whitespace', () => {
      const store = setUpLoadedStore();

      setArtistsView(store, { search: '  aDA ' });

      expect(ids(store.allArtistsRows()), 'search "  aDA " should match both "Ada Stone" artists').toEqual(['a1', 'a4']);
    });

    it('a whitespace-only search shows everyone', () => {
      const store = setUpLoadedStore();

      setArtistsView(store, { search: '   ' });

      expect(store.allArtistsRows()).toHaveLength(TEST_ARTISTS.length);
    });

    it('filters by genre', () => {
      const store = setUpLoadedStore();

      setArtistsView(store, { genre: 'Jazz' });

      expect(ids(store.allArtistsRows()), 'genre "Jazz" should keep only Jazz artists').toEqual(['a1', 'a5']);
    });

    it('filters by favourite status', () => {
      const store = setUpLoadedStore();

      setArtistsView(store, { favouriteStatus: 'favourites' });
      expect(ids(store.allArtistsRows()), 'favouriteStatus "favourites"').toEqual(['a1', 'a3']);

      setArtistsView(store, { favouriteStatus: 'notFavourites' });
      expect(ids(store.allArtistsRows()), 'favouriteStatus "notFavourites"').toEqual(['a4', 'a2', 'a5']);
    });

    it('combines search, genre and favourite status', () => {
      const store = setUpLoadedStore();

      setArtistsView(store, { search: 'a', genre: 'Jazz', favouriteStatus: 'notFavourites' });

      expect(ids(store.allArtistsRows()), 'all filters must apply together').toEqual([]);

      setArtistsView(store, { favouriteStatus: 'all' });

      expect(ids(store.allArtistsRows())).toEqual(['a1']);
    });
  });

  describe('sorting', () => {
    it.each([
      ['name', 'asc', ['a1', 'a4', 'a2', 'a3', 'a5']],
      ['name', 'desc', ['a5', 'a3', 'a2', 'a1', 'a4']],
      ['age', 'asc', ['a5', 'a1', 'a3', 'a2', 'a4']],
      ['age', 'desc', ['a4', 'a2', 'a1', 'a3', 'a5']],
      ['debutYear', 'asc', ['a4', 'a2', 'a1', 'a3', 'a5']],
      ['debutYear', 'desc', ['a5', 'a1', 'a3', 'a2', 'a4']],
    ] as const)('sorts by %s %s (ties: name A→Z, then ID)', (sortField, sortDirection, expected) => {
      const store = setUpLoadedStore();

      setArtistsView(store, { sortField, sortDirection });

      expect(ids(store.allArtistsRows()), `sort by ${sortField} ${sortDirection} (use compareArtists)`).toEqual(expected);
    });

    it('never mutates the source arrays', () => {
      const store = setUpLoadedStore();
      const artistsBefore = store.artists();

      setArtistsView(store, { sortField: 'age', sortDirection: 'desc' });
      setFavouritesView(store, { sortField: 'debutYear', sortDirection: 'desc' });

      expect(() => [store.allArtistsRows(), store.favouriteArtistRows()], 'sort a copy, not state').not.toThrow();
      expect(store.artists(), 'artists state must keep its original array and order').toBe(artistsBefore);
      expect(ids(store.artists())).toEqual(['a1', 'a2', 'a3', 'a4', 'a5']);
    });
  });

  describe('favouriteArtistRows', () => {
    it('only ever contains favourites, sorted with the favourites view settings', () => {
      const store = setUpLoadedStore();

      expect(ids(store.favouriteArtistRows()), 'favourites route shows saved favourites only').toEqual(['a1', 'a3']);
      expect(store.favouriteArtistRows().every((row) => row.isFavourite)).toBe(true);

      setFavouritesView(store, { sortField: 'name', sortDirection: 'desc' });

      expect(ids(store.favouriteArtistRows()), 'favouritesView sort settings apply').toEqual(['a3', 'a1']);
    });

    it('applies search and genre from favouritesView', () => {
      const store = setUpLoadedStore();

      setFavouritesView(store, { search: ' cara ' });
      expect(ids(store.favouriteArtistRows())).toEqual(['a3']);

      setFavouritesView(store, { search: '', genre: 'Jazz' });
      expect(ids(store.favouriteArtistRows())).toEqual(['a1']);
    });

    it('ignores the All artists view settings', () => {
      const store = setUpLoadedStore();

      setArtistsView(store, { search: 'dex', favouriteStatus: 'notFavourites', sortField: 'age', sortDirection: 'desc' });

      expect(ids(store.favouriteArtistRows()), 'each route must use its own view settings').toEqual(['a1', 'a3']);
    });

    it('updates when favourite IDs change', () => {
      const store = setUpLoadedStore();

      patchState(unprotected(store), { favouriteArtistIds: ['a5'] });

      expect(ids(store.favouriteArtistRows())).toEqual(['a5']);
      expect(store.allArtistsRows().find((row) => row.id === 'a5')?.isFavourite).toBe(true);
    });
  });

  describe('counts and options', () => {
    it('favouriteCount is the total number of favourites, independent of filters', () => {
      const store = setUpLoadedStore();

      setFavouritesView(store, { genre: 'Pop' });
      setArtistsView(store, { search: 'nobody' });

      expect(store.favouriteCount(), 'favouriteCount counts all saved favourites').toBe(2);
    });

    it('visible counts follow the filtered rows of each route', () => {
      const store = setUpLoadedStore();

      setArtistsView(store, { genre: 'Jazz' });
      setFavouritesView(store, { genre: 'Pop' });

      expect(store.allArtistsVisibleCount(), 'allArtistsVisibleCount = number of allArtistsRows').toBe(2);
      expect(store.favouritesVisibleCount(), 'favouritesVisibleCount = number of favouriteArtistRows').toBe(1);
    });

    it('genreOptions lists each genre of the complete dataset once, A→Z', () => {
      const store = setUpLoadedStore();

      setArtistsView(store, { genre: 'Jazz' });

      expect(store.genreOptions(), 'genres come from all artists, not the filtered rows').toEqual([
        'Folk',
        'Jazz',
        'Pop',
        'Rock',
      ]);
    });
  });
});
