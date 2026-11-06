import { Artist } from '../data-access/artist.model';

/** Progress of the initial `GET /api/artists` request. */
export type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

/** Each route keeps its own search/filter/sort settings. */
export type ArtistsViewId = 'artists' | 'favourites';

export type SortField = 'name' | 'age' | 'debutYear';
export type SortDirection = 'asc' | 'desc';

/** Only the All artists route can filter by favourite status. */
export type FavouriteStatusFilter = 'all' | 'favourites' | 'notFavourites';

/** Settings shared by both routes. `genre: null` means "all genres". */
export interface ViewSettings {
  search: string;
  genre: string | null;
  sortField: SortField;
  sortDirection: SortDirection;
}

/** Settings for `/artists`. */
export interface AllArtistsViewSettings extends ViewSettings {
  favouriteStatus: FavouriteStatusFilter;
}

/** Settings for `/favourites` (rows are always restricted to favourites). */
export type FavouritesViewSettings = ViewSettings;

/** What the table renders: an artist plus whether it is currently a favourite. */
export interface ArtistRow extends Artist {
  isFavourite: boolean;
}

export const SORT_FIELD_OPTIONS: readonly { value: SortField; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'age', label: 'Age' },
  { value: 'debutYear', label: 'Debut year' },
];

export const FAVOURITE_STATUS_OPTIONS: readonly { value: FavouriteStatusFilter; label: string }[] = [
  { value: 'all', label: 'All artists' },
  { value: 'favourites', label: 'Favourites only' },
  { value: 'notFavourites', label: 'Not favourites' },
];
