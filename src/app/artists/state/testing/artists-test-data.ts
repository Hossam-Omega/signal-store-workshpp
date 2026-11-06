import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { provideApiEvents } from '../../data-access/api-events.handler';
import { Artist, ArtistsResponse } from '../../data-access/artist.model';
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

/**
 * Configures TestBed with the real API event handler on a fake HTTP backend and
 * creates the real ArtistsStore. The store's initial GET /api/artists stays
 * pending until a test answers it (see respondToLoad / failLoad).
 */
export function setUpArtistsStore() {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideApiEvents()],
  });
  const http = TestBed.inject(HttpTestingController);
  const store = TestBed.inject(ArtistsStore);
  return { store, http };
}

/** Answers the pending GET /api/artists with the test artists. */
export function respondToLoad(http: HttpTestingController, favouriteArtistIds?: readonly string[]): void {
  http.expectOne({ method: 'GET', url: '/api/artists' }).flush(artistsResponse(favouriteArtistIds));
}

/** Fails the pending GET /api/artists the way the workshop API does. */
export function failLoad(http: HttpTestingController, status: number, message: string): void {
  failRequest(http.expectOne({ method: 'GET', url: '/api/artists' }), status, message);
}

/** Fails a request with the workshop API's error body. */
export function failRequest(request: TestRequest, status: number, message: string, code = 'TEST_ERROR'): void {
  request.flush({ error: { code, message } }, { status, statusText: 'Error' });
}

export const namesAndIds = (rows: readonly Artist[]): string[] => rows.map((row) => `${row.name} (${row.id})`);
export const ids = (rows: readonly Artist[]): string[] => rows.map((row) => row.id);
