import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { describeApiError } from './api-error';
import { ArtistsApiService } from './artists-api.service';

describe('ArtistsApiService', () => {
  let service: ArtistsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ArtistsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('GET /api/artists', () => {
    const responses: unknown[] = [];
    service.getArtists().subscribe((response) => responses.push(response));

    http.expectOne({ method: 'GET', url: '/api/artists' }).flush({ artists: [], favouriteArtistIds: ['a1'] });

    expect(responses).toEqual([{ artists: [], favouriteArtistIds: ['a1'] }]);
  });

  it('POST /api/favourites with the artist ID', () => {
    service.addFavourite('artist-001').subscribe();

    const request = http.expectOne({ method: 'POST', url: '/api/favourites' });
    expect(request.request.body).toEqual({ artistId: 'artist-001' });
    request.flush({ favouriteArtistIds: ['artist-001'] });
  });

  it('DELETE /api/favourites/:artistId with an encoded ID', () => {
    service.removeFavourite('a/b').subscribe();

    http.expectOne({ method: 'DELETE', url: '/api/favourites/a%2Fb' }).flush({ favouriteArtistIds: [] });
  });
});

describe('describeApiError', () => {
  it('uses the message from the API error body', () => {
    const error = new HttpErrorResponse({ status: 404, error: { error: { code: 'X', message: 'No such artist.' } } });

    expect(describeApiError(error, 'Fallback')).toBe('No such artist.');
  });

  it('explains when the API cannot be reached', () => {
    expect(describeApiError(new HttpErrorResponse({ status: 0 }), 'Fallback')).toContain('Cannot reach the workshop API');
  });

  it('falls back to the given message and status code', () => {
    expect(describeApiError(new HttpErrorResponse({ status: 502, error: 'Bad gateway' }), 'Could not load.')).toBe(
      'Could not load. (HTTP 502)',
    );
    expect(describeApiError(new HttpErrorResponse({ status: 500, error: { error: 'x' } }), 'Oops.')).toBe(
      'Oops. (HTTP 500)',
    );
  });

  it('falls back for non-HTTP errors', () => {
    expect(describeApiError(new Error('boom'), 'Fallback')).toBe('Fallback');
  });
});
