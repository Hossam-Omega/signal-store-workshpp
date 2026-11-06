/**
 * Exercise 4 — saving favourites with events, pending and error state.
 * Dispatch favouriteAddRequested / favouriteRemoveRequested from addFavourite() /
 * removeFavourite(), and handle their Requested / Success / Fail events in artists.store.ts.
 * Run with: pnpm test:workshop
 */
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';

import { ArtistsStore, initialArtistsState } from '../artists.store';
import { failRequest, ids, setUpArtistsStore, TEST_ARTISTS } from '../testing/artists-test-data';

function setUpLoadedStore(): { store: ArtistsStore; http: HttpTestingController } {
  // The initial GET stays unanswered; the loaded state is written directly.
  const setup = setUpArtistsStore();
  patchState(unprotected(setup.store), {
    artists: TEST_ARTISTS as typeof initialArtistsState.artists,
    favouriteArtistIds: ['a1', 'a3'],
    loadStatus: 'loaded',
  });
  return setup;
}

const expectAdd = (http: HttpTestingController): TestRequest =>
  http.expectOne({ method: 'POST', url: '/api/favourites' }, 'addFavourite should dispatch favouriteAddRequested');

const expectRemove = (http: HttpTestingController, artistId: string): TestRequest =>
  http.expectOne(
    { method: 'DELETE', url: `/api/favourites/${artistId}` },
    'removeFavourite should dispatch favouriteRemoveRequested',
  );

describe('Exercise 4: saving favourites', () => {
  it('addFavourite requests the change and waits for confirmation before changing favourites', () => {
    const { store, http } = setUpLoadedStore();

    store.addFavourite('a2');

    expect(expectAdd(http).request.body, 'the request event carries the artist ID').toEqual({ artistId: 'a2' });
    expect(store.isSavingFavourite(), 'onFavourite…Requested should set isSavingFavourite').toBe(true);
    expect(store.canChangeFavourites(), 'favourite buttons are disabled while saving').toBe(false);
    expect(store.favouriteArtistIds(), 'no optimistic update: wait for the server').toEqual(['a1', 'a3']);
  });

  it('a successful add stores the server list and updates both routes', () => {
    const { store, http } = setUpLoadedStore();

    store.addFavourite('a2');
    // The server's list is authoritative, even if it differs from a local guess.
    expectAdd(http).flush({ favouriteArtistIds: ['a1', 'a3', 'a2', 'a5'] });

    expect(store.favouriteArtistIds(), 'take favouriteArtistIds from the success payload').toEqual([
      'a1',
      'a3',
      'a2',
      'a5',
    ]);
    expect(store.isSavingFavourite(), 'isSavingFavourite should be false after success').toBe(false);
    expect(store.mutationError()).toBeNull();
    expect(ids(store.favouriteArtistRows()), 'the favourites route updates').toEqual(['a1', 'a2', 'a3', 'a5']);
    expect(store.allArtistsRows().find((row) => row.id === 'a2')?.isFavourite, 'the All artists route updates').toBe(true);
    expect(store.favouriteCount()).toBe(4);
  });

  it('a successful remove stores the server list and updates both routes', () => {
    const { store, http } = setUpLoadedStore();

    store.removeFavourite('a1');
    expectRemove(http, 'a1').flush({ favouriteArtistIds: ['a3'] });

    expect(store.favouriteArtistIds()).toEqual(['a3']);
    expect(store.isSavingFavourite()).toBe(false);
    expect(ids(store.favouriteArtistRows())).toEqual(['a3']);
    expect(store.allArtistsRows().find((row) => row.id === 'a1')?.isFavourite).toBe(false);
  });

  it('a failed change keeps confirmed favourites, clears pending state and exposes the error', () => {
    const { store, http } = setUpLoadedStore();

    store.addFavourite('a2');
    failRequest(expectAdd(http), 503, 'Simulated failure: favourite changes are disabled.');

    expect(store.favouriteArtistIds(), 'confirmed favourites must not change after a failure').toEqual(['a1', 'a3']);
    expect(store.isSavingFavourite(), 'isSavingFavourite must be cleared after a failure').toBe(false);
    expect(store.mutationError(), 'mutationError should hold the fail payload').toBe(
      'Simulated failure: favourite changes are disabled.',
    );
    expect(store.canChangeFavourites()).toBe(true);
  });

  it('after a failure, the next attempt is still sent and clears the old error', () => {
    const { store, http } = setUpLoadedStore();
    store.removeFavourite('a3');
    failRequest(expectRemove(http, 'a3'), 500, 'Could not save favourites.');
    expect(store.mutationError()).toBe('Could not save favourites.');

    store.removeFavourite('a3');

    expect(store.mutationError(), 'a new request clears the previous error').toBeNull();
    expect(store.isSavingFavourite()).toBe(true);

    expectRemove(http, 'a3').flush({ favouriteArtistIds: ['a1'] });

    expect(store.favouriteArtistIds()).toEqual(['a1']);
    expect(store.isSavingFavourite()).toBe(false);
  });
});
