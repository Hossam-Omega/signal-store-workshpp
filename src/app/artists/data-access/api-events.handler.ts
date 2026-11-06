import { HttpClient } from '@angular/common/http';
import { EnvironmentProviders, inject, Injectable, provideEnvironmentInitializer } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Dispatcher, EventInstance, Events } from '@ngrx/signals/events';
import { catchError, filter, map, mergeMap, Observable, of } from 'rxjs';

import { describeApiError } from './api-error';
import { isApiRequestEvent } from './api-event';

/**
 * (Prepared — you do not need to change this file.)
 *
 * Listens to every dispatched event. For each request event created with
 * `apiEvent(...)`, it performs the configured HTTP call and dispatches the
 * request's `successEvent` with the response, or its `failureEvent` with a
 * readable error message. Stores never call HTTP or catch errors themselves.
 */
@Injectable({ providedIn: 'root' })
export class ApiEventsHandler {
  constructor() {
    const http = inject(HttpClient);
    const dispatcher = inject(Dispatcher);
    // `on()` without arguments emits every event.
    const allEvents$ = inject(Events).on() as Observable<EventInstance<string, unknown>>;

    allEvents$
      .pipe(
        filter(isApiRequestEvent),
        // mergeMap: every request runs to completion, independently.
        mergeMap(({ request }) =>
          http.request(request.method, request.url, { body: request.body }).pipe(
            map((response) => request.successEvent(response)),
            catchError((error: unknown) => of(request.failureEvent(describeApiError(error, request.errorMessage)))),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((outcome) => dispatcher.dispatch(outcome));
  }
}

/** Starts the API event handler with the application. */
export function provideApiEvents(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => inject(ApiEventsHandler));
}
