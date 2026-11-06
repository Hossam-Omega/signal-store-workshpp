/**
 * Exercise 1 — withState, withMethods and patchState.
 * Implement the view-setting methods in artists.store.ts.
 * Run with: pnpm test:workshop
 */
import { initialArtistsState } from '../artists.store';
import { setUpArtistsStore } from '../testing/artists-test-data';

describe('Exercise 1: view settings', () => {
  it('setSearch updates the search text of the given view only', () => {
    const { store } = setUpArtistsStore();

    store.setSearch('artists', 'ada');

    expect(store.artistsView().search, 'setSearch("artists", …) should update artistsView.search').toBe('ada');
    expect(store.favouritesView(), 'setSearch("artists", …) must not change favouritesView').toEqual(
      initialArtistsState.favouritesView,
    );

    store.setSearch('favourites', 'cara');

    expect(store.favouritesView().search, 'setSearch("favourites", …) should update favouritesView.search').toBe(
      'cara',
    );
    expect(store.artistsView().search, 'setSearch("favourites", …) must not change artistsView').toBe('ada');
  });

  it('setSearch keeps the text exactly as typed (trimming happens when filtering)', () => {
    const { store } = setUpArtistsStore();

    store.setSearch('artists', '  Ada ');

    expect(store.artistsView().search, 'the search box should show exactly what was typed').toBe('  Ada ');
  });

  it('setGenre selects a genre for one view and null clears it', () => {
    const { store } = setUpArtistsStore();

    store.setGenre('favourites', 'Jazz');

    expect(store.favouritesView().genre, 'setGenre("favourites", "Jazz") should update favouritesView.genre').toBe(
      'Jazz',
    );
    expect(store.artistsView().genre, 'setGenre("favourites", …) must not change artistsView').toBeNull();

    store.setGenre('favourites', null);

    expect(store.favouritesView().genre, 'setGenre(view, null) should mean "all genres"').toBeNull();
  });

  it('setSortField and setSortDirection update the given view only', () => {
    const { store } = setUpArtistsStore();

    store.setSortField('artists', 'age');
    store.setSortDirection('artists', 'desc');
    store.setSortField('favourites', 'debutYear');

    expect(store.artistsView().sortField, 'setSortField("artists", "age")').toBe('age');
    expect(store.artistsView().sortDirection, 'setSortDirection("artists", "desc")').toBe('desc');
    expect(store.favouritesView().sortField, 'setSortField("favourites", "debutYear")').toBe('debutYear');
    expect(store.favouritesView().sortDirection, 'favouritesView.sortDirection must be unchanged').toBe('asc');
  });

  it('setFavouriteStatus updates the All artists view', () => {
    const { store } = setUpArtistsStore();

    store.setFavouriteStatus('notFavourites');

    expect(store.artistsView().favouriteStatus, 'setFavouriteStatus should update artistsView.favouriteStatus').toBe(
      'notFavourites',
    );
  });

  it('each route keeps its own settings while the other route changes', () => {
    const { store } = setUpArtistsStore();

    store.setSearch('artists', 'ada');
    store.setGenre('artists', 'Jazz');
    store.setFavouriteStatus('favourites');
    store.setSortField('artists', 'age');
    store.setSortDirection('artists', 'desc');

    store.setSearch('favourites', 'dex');
    store.setGenre('favourites', 'Rock');
    store.setSortField('favourites', 'debutYear');

    expect(store.artistsView(), 'artistsView should keep every setting it was given').toEqual({
      search: 'ada',
      genre: 'Jazz',
      favouriteStatus: 'favourites',
      sortField: 'age',
      sortDirection: 'desc',
    });
    expect(store.favouritesView(), 'favouritesView should keep every setting it was given').toEqual({
      search: 'dex',
      genre: 'Rock',
      sortField: 'debutYear',
      sortDirection: 'asc',
    });
  });

  it('changing view settings does not touch artist data or request status', () => {
    const { store } = setUpArtistsStore();
    const artistsBefore = store.artists();
    const favouritesBefore = store.favouriteArtistIds();
    const statusBefore = store.loadStatus();

    store.setSearch('artists', 'x');
    store.setSortField('favourites', 'age');

    expect(store.artists()).toBe(artistsBefore);
    expect(store.favouriteArtistIds()).toBe(favouritesBefore);
    expect(store.loadStatus()).toBe(statusBefore);
  });
});
