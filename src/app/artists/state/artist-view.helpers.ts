/**
 * Small, pure building blocks for Exercise 3. (Prepared — you do not need to
 * change this file.) Compose them inside `withComputed` in `artists.store.ts`.
 */
import { Artist } from '../data-access/artist.model';
import { ArtistRow, FavouriteStatusFilter, SortDirection, SortField } from './artists-view.model';

/** Case-insensitive name match; leading/trailing whitespace is ignored. An empty search matches everyone. */
export function matchesNameSearch(artist: Artist, search: string): boolean {
  const term = search.trim().toLocaleLowerCase();
  return term === '' || artist.name.toLocaleLowerCase().includes(term);
}

/** `genre: null` means "all genres". */
export function matchesGenre(artist: Artist, genre: string | null): boolean {
  return genre === null || artist.genre === genre;
}

export function matchesFavouriteStatus(isFavourite: boolean, filter: FavouriteStatusFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'favourites':
      return isFavourite;
    case 'notFavourites':
      return !isFavourite;
  }
}

export function toArtistRow(artist: Artist, favouriteIds: ReadonlySet<string>): ArtistRow {
  return { ...artist, isFavourite: favouriteIds.has(artist.id) };
}

/**
 * Comparator for `Array.prototype.sort`.
 *
 * Sorts by `field` in `direction`; ties are always broken by name (A→Z) and
 * then by ID, so the order is fully deterministic. Note that `sort` mutates
 * the array it is called on — only sort a copy, never store state.
 */
export function compareArtists(field: SortField, direction: SortDirection): (a: Artist, b: Artist) => number {
  const sign = direction === 'asc' ? 1 : -1;
  return (a, b) => {
    const primary = field === 'name' ? compareNames(a, b) : a[field] - b[field];
    if (primary !== 0) {
      return primary * sign;
    }
    return compareNames(a, b) || compareIds(a, b);
  };
}

function compareNames(a: Artist, b: Artist): number {
  return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
}

function compareIds(a: Artist, b: Artist): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
