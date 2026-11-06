import { EventCreator, EventInstance } from '@ngrx/signals/events';

import { EndpointConfig } from './endpoints';

/**
 * (Prepared.) What a request event carries besides its payload: the endpoint to
 * call and the events to dispatch with the outcome.
 */
export interface ApiRequest<Response = unknown> extends EndpointConfig {
  successEvent: EventCreator<string, Response>;
  /** Dispatched with a readable error message. */
  failureEvent: EventCreator<string, string>;
}

export type ApiRequestEvent<Type extends string = string, Payload = unknown, Response = unknown> = EventInstance<
  Type,
  Payload
> & { request: ApiRequest<Response> };

/**
 * Creates a request event that the API event handler turns into an HTTP call.
 *
 * ```ts
 * export const getXRequested = apiEvent('[X] Get X Requested', (id: string) => ({
 *   ...endpoints.getXConfig(id),
 *   successEvent: getXRequestedSuccess,
 *   failureEvent: getXRequestedFail,
 * }));
 * ```
 */
export function apiEvent<Type extends string, Payload = void, Response = unknown>(
  type: Type,
  createRequest: (payload: Payload) => ApiRequest<Response>,
): ((payload: Payload) => ApiRequestEvent<Type, Payload, Response>) & { type: Type } {
  const creator = (payload: Payload) => ({ type, payload, request: createRequest(payload) });
  return Object.assign(creator, { type });
}

export function isApiRequestEvent(event: EventInstance<string, unknown>): event is ApiRequestEvent {
  return 'request' in event && typeof event.request === 'object' && event.request !== null;
}
