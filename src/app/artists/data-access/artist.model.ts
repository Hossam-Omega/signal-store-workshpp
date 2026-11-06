/** A fictional musician from the workshop dataset. */
export interface Artist {
  id: string;
  name: string;
  age: number;
  gender: string;
  genre: string;
  debutYear: number;
}

/** `GET /api/artists` */
export interface ArtistsResponse {
  artists: Artist[];
  favouriteArtistIds: string[];
}

/** `POST /api/favourites` and `DELETE /api/favourites/:artistId` */
export interface FavouritesResponse {
  favouriteArtistIds: string[];
}

/** Error body returned by the workshop API for every non-2xx response. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}
