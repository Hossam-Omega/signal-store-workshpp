import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ArtistsResponse, FavouritesResponse } from './artist.model';

/**
 * Typed client for the three workshop API endpoints. (Prepared — you do not
 * need to change this file.) The store decides *when* to call these methods
 * and what to do with the responses.
 */
@Injectable({ providedIn: 'root' })
export class ArtistsApiService {
  readonly #http = inject(HttpClient);

  /** All artists plus the saved favourite IDs. */
  getArtists(): Observable<ArtistsResponse> {
    return this.#http.get<ArtistsResponse>('/api/artists');
  }

  /** Resolves with the complete, authoritative favourite-ID list. */
  addFavourite(artistId: string): Observable<FavouritesResponse> {
    return this.#http.post<FavouritesResponse>('/api/favourites', { artistId });
  }

  /** Resolves with the complete, authoritative favourite-ID list. */
  removeFavourite(artistId: string): Observable<FavouritesResponse> {
    return this.#http.delete<FavouritesResponse>(`/api/favourites/${encodeURIComponent(artistId)}`);
  }
}
