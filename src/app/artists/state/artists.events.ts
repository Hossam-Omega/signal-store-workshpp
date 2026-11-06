import { type } from '@ngrx/signals';
import { event } from '@ngrx/signals/events';

import { apiEvent } from '../data-access/api-event';
import { ArtistsResponse, FavouritesResponse } from '../data-access/artist.model';
import { endpoints } from '../data-access/endpoints';

/*
 * Prepared. Each API call is one group of three events:
 *  - `…Requested`: dispatched by the store; carries the endpoint config and
 *    which events report the outcome. The API event handler makes the call.
 *  - `…Success`: dispatched by the API event handler with the response.
 *  - `…Fail`: dispatched by the API event handler with a readable message.
 * The store listens to all three with withEventHandlers.
 */

// GET /api/artists ------------------------------------------------------------

export const loadArtistsRequestedSuccess = event('[Artists API] Load Artists Success', type<ArtistsResponse>());
export const loadArtistsRequestedFail = event('[Artists API] Load Artists Fail', type<string>());
export const loadArtistsRequested = apiEvent('[Artists] Load Artists Requested', () => ({
  ...endpoints.getArtistsConfig(),
  successEvent: loadArtistsRequestedSuccess,
  failureEvent: loadArtistsRequestedFail,
}));

// POST /api/favourites --------------------------------------------------------

export const favouriteAddRequestedSuccess = event('[Favourites API] Add Favourite Success', type<FavouritesResponse>());
export const favouriteAddRequestedFail = event('[Favourites API] Add Favourite Fail', type<string>());
/** Payload: the artist ID to add. */
export const favouriteAddRequested = apiEvent('[Favourites] Add Favourite Requested', (artistId: string) => ({
  ...endpoints.addFavouriteConfig(artistId),
  successEvent: favouriteAddRequestedSuccess,
  failureEvent: favouriteAddRequestedFail,
}));

// DELETE /api/favourites/:artistId -----------------------------------------------

export const favouriteRemoveRequestedSuccess = event(
  '[Favourites API] Remove Favourite Success',
  type<FavouritesResponse>(),
);
export const favouriteRemoveRequestedFail = event('[Favourites API] Remove Favourite Fail', type<string>());
/** Payload: the artist ID to remove. */
export const favouriteRemoveRequested = apiEvent('[Favourites] Remove Favourite Requested', (artistId: string) => ({
  ...endpoints.removeFavouriteConfig(artistId),
  successEvent: favouriteRemoveRequestedSuccess,
  failureEvent: favouriteRemoveRequestedFail,
}));
