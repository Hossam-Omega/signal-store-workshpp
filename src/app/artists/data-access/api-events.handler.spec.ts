import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { type } from '@ngrx/signals';
import { Dispatcher, event, EventInstance, Events } from '@ngrx/signals/events';
import { Observable } from 'rxjs';

import {
  favouriteAddRequested,
  favouriteAddRequestedSuccess,
  favouriteRemoveRequested,
  favouriteRemoveRequestedSuccess,
  loadArtistsRequested,
  loadArtistsRequestedFail,
  loadArtistsRequestedSuccess,
} from '../state/artists.events';
import { apiEvent, isApiRequestEvent } from './api-event';
import { provideApiEvents } from './api-events.handler';

describe('API event handler', () => {
  let http: HttpTestingController;
  let dispatcher: Dispatcher;
  let dispatched: EventInstance<string, unknown>[];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideApiEvents()] });
    http = TestBed.inject(HttpTestingController);
    dispatcher = TestBed.inject(Dispatcher);
    dispatched = [];
    const allEvents$ = TestBed.inject(Events).on() as Observable<EventInstance<string, unknown>>;
    allEvents$.subscribe(({ type, payload }) => dispatched.push({ type, payload }));
  });

  afterEach(() => http.verify());

  it('GET /api/artists, then dispatches the success event with the response', () => {
    dispatcher.dispatch(loadArtistsRequested());

    http.expectOne({ method: 'GET', url: '/api/artists' }).flush({ artists: [], favouriteArtistIds: ['a1'] });

    expect(dispatched.at(-1)).toEqual(loadArtistsRequestedSuccess({ artists: [], favouriteArtistIds: ['a1'] }));
  });

  it('POST /api/favourites with the artist ID', () => {
    dispatcher.dispatch(favouriteAddRequested('artist-001'));

    const request = http.expectOne({ method: 'POST', url: '/api/favourites' });
    expect(request.request.body).toEqual({ artistId: 'artist-001' });
    request.flush({ favouriteArtistIds: ['artist-001'] });

    expect(dispatched.at(-1)).toEqual(favouriteAddRequestedSuccess({ favouriteArtistIds: ['artist-001'] }));
  });

  it('DELETE /api/favourites/:artistId with an encoded ID', () => {
    dispatcher.dispatch(favouriteRemoveRequested('a/b'));

    http.expectOne({ method: 'DELETE', url: '/api/favourites/a%2Fb' }).flush({ favouriteArtistIds: [] });

    expect(dispatched.at(-1)).toEqual(favouriteRemoveRequestedSuccess({ favouriteArtistIds: [] }));
  });

  it('dispatches the fail event with a readable message, and keeps handling later requests', () => {
    dispatcher.dispatch(loadArtistsRequested());
    http
      .expectOne('/api/artists')
      .flush({ error: { code: 'X', message: 'Simulated failure.' } }, { status: 503, statusText: 'Unavailable' });
    expect(dispatched.at(-1)).toEqual(loadArtistsRequestedFail('Simulated failure.'));

    dispatcher.dispatch(loadArtistsRequested());
    http.expectOne('/api/artists').flush({ artists: [], favouriteArtistIds: [] });
    expect(dispatched.at(-1)?.type).toBe(loadArtistsRequestedSuccess.type);
  });

  it('falls back to the endpoint error message', () => {
    dispatcher.dispatch(loadArtistsRequested());
    http.expectOne('/api/artists').flush('Bad gateway', { status: 502, statusText: 'Bad Gateway' });

    expect(dispatched.at(-1)).toEqual(loadArtistsRequestedFail('Could not load artists. (HTTP 502)'));
  });

  it('ignores events that are not API requests', () => {
    dispatcher.dispatch(event('[Test] Plain', type<string>())('hello'));

    http.expectNone(() => true);
  });

  it('apiEvent keeps the payload and the request config apart', () => {
    const done = event('[Test] Done', type<number>());
    const failed = event('[Test] Failed', type<string>());
    const requested = apiEvent('[Test] Requested', (id: string) => ({
      method: 'GET' as const,
      url: `/x/${id}`,
      errorMessage: 'Oops.',
      successEvent: done,
      failureEvent: failed,
    }));

    const instance = requested('42');

    expect(requested.type).toBe('[Test] Requested');
    expect(instance.payload).toBe('42');
    expect(instance.request.url).toBe('/x/42');
    expect(isApiRequestEvent(instance)).toBe(true);
    expect(isApiRequestEvent(done(1))).toBe(false);
    http.expectNone(() => true);
  });
});
