import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { NEVER, Observable, of } from 'rxjs';

import { Artist, ArtistsResponse, FavouritesResponse } from '../../data-access/artist.model';
import { ArtistsApiService } from '../../data-access/artists-api.service';
import { ArtistsStore } from '../artists.store';

/**
 * A small dataset with deliberate ties:
 * - a1 and a4 share the name "Ada Stone" (broken by ID),
 * - a1 and a3 share age 30 and debut year 2015 (broken by name),
 * - "ben marsh" is lower case (sorting/search must ignore case).
 */
export const TEST_ARTISTS: readonly Artist[] = Object.freeze([
  { id: 'a1', name: 'Ada Stone', age: 30, gender: 'Female', genre: 'Jazz', debutYear: 2015 },
  { id: 'a2', name: 'ben marsh', age: 45, gender: 'Male', genre: 'Rock', debutYear: 2000 },
  { id: 'a3', name: 'Cara Lune', age: 30, gender: 'Non-binary', genre: 'Pop', debutYear: 2015 },
  { id: 'a4', name: 'Ada Stone', age: 52, gender: 'Female', genre: 'Folk', debutYear: 1994 },
  { id: 'a5', name: 'Dex Rowe', age: 22, gender: 'Male', genre: 'Jazz', debutYear: 2021 },
]);

export const TEST_FAVOURITE_IDS: readonly string[] = Object.freeze(['a1', 'a3']);

export function artistsResponse(favouriteArtistIds: readonly string[] = TEST_FAVOURITE_IDS): ArtistsResponse {
  return { artists: TEST_ARTISTS.map((artist) => ({ ...artist })), favouriteArtistIds: [...favouriteArtistIds] };
}

/** An HttpErrorResponse shaped like the workshop API's error body. */
export function apiError(status: number, message: string, code = 'TEST_ERROR'): HttpErrorResponse {
  return new HttpErrorResponse({ status, statusText: 'Error', error: { error: { code, message } } });
}

export interface ArtistsApiMock {
  getArtists: ReturnType<typeof vi.fn<() => Observable<ArtistsResponse>>>;
  addFavourite: ReturnType<typeof vi.fn<(artistId: string) => Observable<FavouritesResponse>>>;
  removeFavourite: ReturnType<typeof vi.fn<(artistId: string) => Observable<FavouritesResponse>>>;
}

/** A mocked ArtistsApiService: no real HTTP requests in unit tests. */
export function createArtistsApiMock(): ArtistsApiMock {
  return {
    getArtists: vi.fn(() => of(artistsResponse())),
    addFavourite: vi.fn(() => NEVER),
    removeFavourite: vi.fn(() => NEVER),
  };
}

/**
 * Configures TestBed with a mocked API and creates the real ArtistsStore.
 * `configureApi` runs before the store exists, so it can control the initial load.
 */
export function setUpArtistsStore(configureApi: (api: ArtistsApiMock) => void = () => undefined) {
  const api = createArtistsApiMock();
  configureApi(api);
  TestBed.configureTestingModule({
    providers: [{ provide: ArtistsApiService, useValue: api }],
  });
  const store = TestBed.inject(ArtistsStore);
  return { store, api };
}

export const namesAndIds = (rows: readonly Artist[]): string[] => rows.map((row) => `${row.name} (${row.id})`);
export const ids = (rows: readonly Artist[]): string[] => rows.map((row) => row.id);
