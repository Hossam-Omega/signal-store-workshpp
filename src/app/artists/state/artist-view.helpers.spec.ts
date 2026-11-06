import {
  compareArtists,
  matchesFavouriteStatus,
  matchesGenre,
  matchesNameSearch,
  toArtistRow,
} from './artist-view.helpers';
import { ids, TEST_ARTISTS } from './testing/artists-test-data';

const [ada] = TEST_ARTISTS;

describe('prepared view helpers', () => {
  it('matchesNameSearch ignores case and surrounding whitespace', () => {
    expect(matchesNameSearch(ada, '  sTo ')).toBe(true);
    expect(matchesNameSearch(ada, '')).toBe(true);
    expect(matchesNameSearch(ada, 'cara')).toBe(false);
  });

  it('matchesGenre treats null as all genres', () => {
    expect(matchesGenre(ada, null)).toBe(true);
    expect(matchesGenre(ada, 'Jazz')).toBe(true);
    expect(matchesGenre(ada, 'Rock')).toBe(false);
  });

  it('matchesFavouriteStatus', () => {
    expect(matchesFavouriteStatus(true, 'all')).toBe(true);
    expect(matchesFavouriteStatus(false, 'all')).toBe(true);
    expect(matchesFavouriteStatus(true, 'favourites')).toBe(true);
    expect(matchesFavouriteStatus(false, 'favourites')).toBe(false);
    expect(matchesFavouriteStatus(true, 'notFavourites')).toBe(false);
    expect(matchesFavouriteStatus(false, 'notFavourites')).toBe(true);
  });

  it('toArtistRow adds the favourite flag without changing the artist', () => {
    expect(toArtistRow(ada, new Set(['a1']))).toEqual({ ...ada, isFavourite: true });
    expect(toArtistRow(ada, new Set())).toEqual({ ...ada, isFavourite: false });
  });

  it('compareArtists breaks ties by name, then ID, in both directions', () => {
    expect(ids([...TEST_ARTISTS].sort(compareArtists('age', 'asc')))).toEqual(['a5', 'a1', 'a3', 'a2', 'a4']);
    expect(ids([...TEST_ARTISTS].sort(compareArtists('age', 'desc')))).toEqual(['a4', 'a2', 'a1', 'a3', 'a5']);
    expect(ids([...TEST_ARTISTS].sort(compareArtists('name', 'desc')))).toEqual(['a5', 'a3', 'a2', 'a1', 'a4']);
  });
});
