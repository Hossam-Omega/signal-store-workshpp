/**
 * Shapes used by the local workshop API.
 *
 * The Angular app has its own copy of these interfaces in
 * `src/app/artists/data-access/artist.model.ts`; keep the two in sync.
 */
export interface Artist {
  id: string;
  name: string;
  age: number;
  gender: string;
  genre: string;
  debutYear: number;
}

export interface ArtistsResponse {
  artists: Artist[];
  favouriteArtistIds: string[];
}

export interface FavouritesResponse {
  favouriteArtistIds: string[];
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
