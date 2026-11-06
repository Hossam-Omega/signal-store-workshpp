/**
 * Exercise 2 — loading with events (withEventHandlers).
 * Dispatch loadArtistsRequested from loadArtists() / retryLoad(), and handle
 * its Requested / Success / Fail events in artists.store.ts.
 * Run with: pnpm test:workshop
 */
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { routes } from '../../../app.routes';
import { provideApiEvents } from '../../data-access/api-events.handler';
import { ArtistsStore } from '../artists.store';
import { failLoad, respondToLoad, setUpArtistsStore, TEST_ARTISTS } from '../testing/artists-test-data';

describe('Exercise 2: loading artists', () => {
  it('starts loading as soon as the store is created', () => {
    const { store, http } = setUpArtistsStore();

    http.expectOne({ method: 'GET', url: '/api/artists' }, 'creating the store should dispatch loadArtistsRequested once');
    expect(store.loadStatus(), 'onLoadArtistsRequested should set loadStatus to "loading"').toBe('loading');
    expect(store.isLoading(), 'isLoading should be true while the request is pending').toBe(true);
  });

  it('stores artists and favourite IDs from the success event and marks the load as complete', () => {
    const { store, http } = setUpArtistsStore();

    respondToLoad(http, ['a2']);

    expect(store.loadStatus(), 'onLoadArtistsRequestedSuccess should set loadStatus to "loaded"').toBe('loaded');
    expect(store.artists(), 'artists should come from the success payload').toEqual([...TEST_ARTISTS]);
    expect(store.favouriteArtistIds(), 'favouriteArtistIds should come from the success payload').toEqual(['a2']);
    expect(store.loadError()).toBeNull();
    expect(store.isLoading()).toBe(false);
  });

  it('a fresh store (like a browser refresh) restores saved favourites from the API', () => {
    const first = setUpArtistsStore();
    respondToLoad(first.http, ['a1']);
    TestBed.resetTestingModule();

    const { store, http } = setUpArtistsStore();
    respondToLoad(http, ['a4', 'a5']);

    expect(store.favouriteArtistIds(), 'favourites must come from the server, not from a previous store').toEqual([
      'a4',
      'a5',
    ]);
  });

  it('records the error message and stops loading when the request fails', () => {
    const { store, http } = setUpArtistsStore();

    failLoad(http, 503, 'Simulated failure: loading artists failed.');

    expect(store.loadStatus(), 'onLoadArtistsRequestedFail should set loadStatus to "error"').toBe('error');
    expect(store.loadError(), 'loadError should hold the fail payload').toBe('Simulated failure: loading artists failed.');
    expect(store.isLoading(), 'the loading flag must be cleared after a failure').toBe(false);
    expect(store.artists()).toEqual([]);
  });

  it('retryLoad clears the old error, loads again and succeeds', () => {
    const { store, http } = setUpArtistsStore();
    failLoad(http, 503, 'Down');
    expect(store.loadStatus()).toBe('error');

    store.retryLoad();

    expect(store.loadStatus(), 'retrying should set loadStatus back to "loading"').toBe('loading');
    expect(store.loadError(), 'retrying should clear the previous loadError').toBeNull();

    respondToLoad(http);

    expect(store.loadStatus(), 'a successful retry should end in "loaded"').toBe('loaded');
    expect(store.artists()).toHaveLength(TEST_ARTISTS.length);
  });

  it('a failure does not stop later loads from working', () => {
    const { store, http } = setUpArtistsStore();
    failLoad(http, 503, 'Down');

    store.retryLoad();
    failLoad(http, 503, 'Still down');
    expect(store.loadError()).toBe('Still down');

    store.retryLoad();
    respondToLoad(http);

    expect(store.loadStatus(), 'every retry should dispatch loadArtistsRequested again').toBe('loaded');
    expect(store.loadError()).toBeNull();
  });

  describe('with routing', () => {
    it('navigating between routes reuses one store and does not reload', async () => {
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting(), provideApiEvents(), provideRouter(routes)],
      });
      const http = TestBed.inject(HttpTestingController);
      const harness = await RouterTestingHarness.create();

      // Open /favourites directly, as if typed into the address bar.
      await harness.navigateByUrl('/favourites');
      const store = harness.routeDebugElement!.injector.get(ArtistsStore);
      respondToLoad(http);
      await harness.navigateByUrl('/artists');
      await harness.navigateByUrl('/favourites');

      expect(harness.routeDebugElement!.injector.get(ArtistsStore)).toBe(store);
      http.expectNone('/api/artists', 'navigation must not trigger another load');
      expect(store.loadStatus()).toBe('loaded');
    });
  });
});
