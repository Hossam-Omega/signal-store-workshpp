/**
 * Endpoint configs for the three workshop API endpoints. (Prepared — you do not
 * need to change this file.) Request events spread one of these configs; the
 * API event handler performs the HTTP call it describes.
 */
export interface EndpointConfig {
  method: 'GET' | 'POST' | 'DELETE';
  url: string;
  body?: unknown;
  /** Shown to the user when the API gives no readable error message. */
  errorMessage: string;
}

export const endpoints = {
  /** All artists plus the saved favourite IDs. Responds with `ArtistsResponse`. */
  getArtistsConfig: (): EndpointConfig => ({
    method: 'GET',
    url: '/api/artists',
    errorMessage: 'Could not load artists.',
  }),

  /** Responds with the complete, authoritative favourite list (`FavouritesResponse`). */
  addFavouriteConfig: (artistId: string): EndpointConfig => ({
    method: 'POST',
    url: '/api/favourites',
    body: { artistId },
    errorMessage: 'Could not update favourites.',
  }),

  /** Responds with the complete, authoritative favourite list (`FavouritesResponse`). */
  removeFavouriteConfig: (artistId: string): EndpointConfig => ({
    method: 'DELETE',
    url: `/api/favourites/${encodeURIComponent(artistId)}`,
    errorMessage: 'Could not update favourites.',
  }),
};
