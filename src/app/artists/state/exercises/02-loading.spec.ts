/**
 * Exercise 2 — loading with rxMethod.
 * Implement loadArtists() / retryLoad() in artists.store.ts.
 * Run with: pnpm test:workshop
 */
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, Subject, throwError } from 'rxjs';

import { routes } from '../../../app.routes';
import { ArtistsResponse } from '../../data-access/artist.model';
import { ArtistsApiService } from '../../data-access/artists-api.service';
import { ArtistsStore } from '../artists.store';
import { apiError, artistsResponse, setUpArtistsStore, TEST_ARTISTS } from '../testing/artists-test-data';

describe('Exercise 2: loading artists', () => {
  it('starts loading as soon as the store is created', () => {
    const response$ = new Subject<ArtistsResponse>();
    const { store, api } = setUpArtistsStore((api) => api.getArtists.mockReturnValue(response$));

    expect(api.getArtists, 'creating the store should call ArtistsApiService.getArtists() once').toHaveBeenCalledTimes(1);
    expect(store.loadStatus(), 'loadStatus should be "loading" while the request is pending').toBe('loading');
    expect(store.isLoading(), 'isLoading should be true while the request is pending').toBe(true);
  });

  it('stores artists and favourite IDs from the response and marks the load as complete', () => {
    const { store } = setUpArtistsStore((api) => api.getArtists.mockReturnValue(of(artistsResponse(['a2']))));

    expect(store.loadStatus(), 'loadStatus should be "loaded" after a successful response').toBe('loaded');
    expect(store.artists(), 'artists should come from the GET /api/artists response').toEqual([...TEST_ARTISTS]);
    expect(store.favouriteArtistIds(), 'favouriteArtistIds should come from the response').toEqual(['a2']);
    expect(store.loadError()).toBeNull();
    expect(store.isLoading()).toBe(false);
  });

  it('a fresh store (like a browser refresh) restores saved favourites from the API', () => {
    setUpArtistsStore((api) => api.getArtists.mockReturnValue(of(artistsResponse(['a1']))));
    TestBed.resetTestingModule();

    const { store } = setUpArtistsStore((api) => api.getArtists.mockReturnValue(of(artistsResponse(['a4', 'a5']))));

    expect(store.favouriteArtistIds(), 'favourites must come from the server, not from a previous store').toEqual([
      'a4',
      'a5',
    ]);
  });

  it('records a readable error and stops loading when the request fails', () => {
    const { store } = setUpArtistsStore((api) =>
      api.getArtists.mockReturnValue(throwError(() => apiError(503, 'Simulated failure: loading artists failed.'))),
    );

    expect(store.loadStatus(), 'loadStatus should be "error" after a failed request').toBe('error');
    expect(store.loadError(), 'loadError should hold the API message (use describeApiError)').toBe(
      'Simulated failure: loading artists failed.',
    );
    expect(store.isLoading(), 'the loading flag must be cleared after a failure').toBe(false);
    expect(store.artists()).toEqual([]);
  });

  it('retryLoad clears the old error, loads again and succeeds', () => {
    const retry$ = new Subject<ArtistsResponse>();
    const { store, api } = setUpArtistsStore((api) =>
      api.getArtists.mockReturnValueOnce(throwError(() => apiError(503, 'Down'))).mockReturnValueOnce(retry$),
    );
    expect(store.loadStatus()).toBe('error');

    store.retryLoad();

    expect(api.getArtists, 'retryLoad should call getArtists again').toHaveBeenCalledTimes(2);
    expect(store.loadStatus(), 'retrying should set loadStatus back to "loading"').toBe('loading');
    expect(store.loadError(), 'retrying should clear the previous loadError').toBeNull();

    retry$.next(artistsResponse());
    retry$.complete();

    expect(store.loadStatus(), 'a successful retry should end in "loaded"').toBe('loaded');
    expect(store.artists()).toHaveLength(TEST_ARTISTS.length);
  });

  it('a failure does not stop later loads from working', () => {
    const { store, api } = setUpArtistsStore((api) =>
      api.getArtists
        .mockReturnValueOnce(throwError(() => apiError(503, 'Down')))
        .mockReturnValueOnce(throwError(() => apiError(503, 'Still down')))
        .mockReturnValueOnce(of(artistsResponse())),
    );

    store.retryLoad();
    expect(store.loadError()).toBe('Still down');
    store.retryLoad();

    expect(api.getArtists).toHaveBeenCalledTimes(3);
    expect(store.loadStatus(), 'the load stream must survive errors (catch them inside switchMap)').toBe('loaded');
  });

  it('a newer load wins over an older, still-pending one (switchMap)', () => {
    const first$ = new Subject<ArtistsResponse>();
    const second$ = new Subject<ArtistsResponse>();
    const { store } = setUpArtistsStore((api) =>
      api.getArtists.mockReturnValueOnce(first$).mockReturnValueOnce(second$),
    );

    store.loadArtists();
    second$.next(artistsResponse(['a5']));
    first$.next(artistsResponse(['a1']));

    expect(store.favouriteArtistIds(), 'a stale response must not overwrite newer data').toEqual(['a5']);
  });

  describe('with routing', () => {
    it('navigating between routes reuses one store and does not reload', async () => {
      const api = {
        getArtists: vi.fn(() => of(artistsResponse())),
        addFavourite: vi.fn(),
        removeFavourite: vi.fn(),
      };
      TestBed.configureTestingModule({
        providers: [
          { provide: ArtistsApiService, useValue: api },
          provideRouter(routes),
        ],
      });
      const harness = await RouterTestingHarness.create();

      // Open /favourites directly, as if typed into the address bar.
      await harness.navigateByUrl('/favourites');
      const store = harness.routeDebugElement!.injector.get(ArtistsStore);
      await harness.navigateByUrl('/artists');
      await harness.navigateByUrl('/favourites');

      expect(harness.routeDebugElement!.injector.get(ArtistsStore)).toBe(store);
      expect(api.getArtists, 'navigation must not trigger another load').toHaveBeenCalledTimes(1);
      expect(store.loadStatus()).toBe('loaded');
    });
  });
});
