/**
 * Exercise 4 — saving favourites with pending and error state.
 * Implement addFavourite() / removeFavourite() in artists.store.ts.
 * Run with: pnpm test:workshop
 */
import { patchState } from '@ngrx/signals';
import { unprotected } from '@ngrx/signals/testing';
import { NEVER, Subject, throwError } from 'rxjs';

import { FavouritesResponse } from '../../data-access/artist.model';
import { ArtistsStore, initialArtistsState } from '../artists.store';
import { apiError, ArtistsApiMock, ids, setUpArtistsStore, TEST_ARTISTS } from '../testing/artists-test-data';

function setUpLoadedStore(): { store: ArtistsStore; api: ArtistsApiMock } {
  const setup = setUpArtistsStore((api) => api.getArtists.mockReturnValue(NEVER));
  patchState(unprotected(setup.store), {
    artists: TEST_ARTISTS as typeof initialArtistsState.artists,
    favouriteArtistIds: ['a1', 'a3'],
    loadStatus: 'loaded',
  });
  return setup;
}

describe('Exercise 4: saving favourites', () => {
  it('addFavourite calls the API and waits for confirmation before changing favourites', () => {
    const { store, api } = setUpLoadedStore();
    api.addFavourite.mockReturnValue(new Subject<FavouritesResponse>());

    store.addFavourite('a2');

    expect(api.addFavourite, 'addFavourite should call ArtistsApiService.addFavourite(id)').toHaveBeenCalledWith('a2');
    expect(store.isSavingFavourite(), 'isSavingFavourite should be true while the request is pending').toBe(true);
    expect(store.canChangeFavourites(), 'favourite buttons are disabled while saving').toBe(false);
    expect(store.favouriteArtistIds(), 'no optimistic update: wait for the server').toEqual(['a1', 'a3']);
  });

  it('a successful add stores the server list and updates both routes', () => {
    const { store, api } = setUpLoadedStore();
    const response$ = new Subject<FavouritesResponse>();
    api.addFavourite.mockReturnValue(response$);

    store.addFavourite('a2');
    // The server's list is authoritative, even if it differs from a local guess.
    response$.next({ favouriteArtistIds: ['a1', 'a3', 'a2', 'a5'] });
    response$.complete();

    expect(store.favouriteArtistIds(), 'patch favouriteArtistIds from the response').toEqual(['a1', 'a3', 'a2', 'a5']);
    expect(store.isSavingFavourite(), 'isSavingFavourite should be false after success').toBe(false);
    expect(store.mutationError()).toBeNull();
    expect(ids(store.favouriteArtistRows()), 'the favourites route updates').toEqual(['a1', 'a2', 'a3', 'a5']);
    expect(store.allArtistsRows().find((row) => row.id === 'a2')?.isFavourite, 'the All artists route updates').toBe(true);
    expect(store.favouriteCount()).toBe(4);
  });

  it('a successful remove stores the server list and updates both routes', () => {
    const { store, api } = setUpLoadedStore();
    const response$ = new Subject<FavouritesResponse>();
    api.removeFavourite.mockReturnValue(response$);

    store.removeFavourite('a1');
    expect(api.removeFavourite, 'removeFavourite should call ArtistsApiService.removeFavourite(id)').toHaveBeenCalledWith(
      'a1',
    );
    response$.next({ favouriteArtistIds: ['a3'] });
    response$.complete();

    expect(store.favouriteArtistIds()).toEqual(['a3']);
    expect(store.isSavingFavourite()).toBe(false);
    expect(ids(store.favouriteArtistRows())).toEqual(['a3']);
    expect(store.allArtistsRows().find((row) => row.id === 'a1')?.isFavourite).toBe(false);
  });

  it('a failed change keeps confirmed favourites, clears pending state and exposes the error', () => {
    const { store, api } = setUpLoadedStore();
    api.addFavourite.mockReturnValue(throwError(() => apiError(503, 'Simulated failure: favourite changes are disabled.')));

    store.addFavourite('a2');

    expect(store.favouriteArtistIds(), 'confirmed favourites must not change after a failure').toEqual(['a1', 'a3']);
    expect(store.isSavingFavourite(), 'isSavingFavourite must be cleared after a failure').toBe(false);
    expect(store.mutationError(), 'mutationError should hold the API message (use describeApiError)').toBe(
      'Simulated failure: favourite changes are disabled.',
    );
    expect(store.canChangeFavourites()).toBe(true);
  });

  it('after a failure, the next attempt is still sent and clears the old error', () => {
    const { store, api } = setUpLoadedStore();
    const retry$ = new Subject<FavouritesResponse>();
    api.removeFavourite
      .mockReturnValueOnce(throwError(() => apiError(500, 'Could not save favourites.')))
      .mockReturnValueOnce(retry$);

    store.removeFavourite('a3');
    store.removeFavourite('a3');

    expect(api.removeFavourite, 'an error must not end the stream (catch errors per request)').toHaveBeenCalledTimes(2);
    expect(store.mutationError(), 'starting a new attempt clears the previous error').toBeNull();
    expect(store.isSavingFavourite()).toBe(true);

    retry$.next({ favouriteArtistIds: ['a1'] });
    retry$.complete();

    expect(store.favouriteArtistIds()).toEqual(['a1']);
  });

  it('serializes writes: the next request starts only after the previous one finishes (concatMap)', () => {
    const { store, api } = setUpLoadedStore();
    const add$ = new Subject<FavouritesResponse>();
    const remove$ = new Subject<FavouritesResponse>();
    api.addFavourite.mockReturnValue(add$);
    api.removeFavourite.mockReturnValue(remove$);

    store.addFavourite('a2');
    store.removeFavourite('a1');

    expect(api.addFavourite).toHaveBeenCalledTimes(1);
    expect(api.removeFavourite, 'the second write must wait for the first (not mergeMap)').not.toHaveBeenCalled();

    add$.next({ favouriteArtistIds: ['a1', 'a3', 'a2'] });
    add$.complete();

    expect(api.removeFavourite, 'the queued write must still run (not exhaustMap/switchMap)').toHaveBeenCalledWith('a1');
    expect(store.isSavingFavourite(), 'still saving while the queued write is pending').toBe(true);

    remove$.next({ favouriteArtistIds: ['a3', 'a2'] });
    remove$.complete();

    expect(store.favouriteArtistIds(), 'the newest confirmed list wins').toEqual(['a3', 'a2']);
    expect(store.isSavingFavourite()).toBe(false);
  });
});
