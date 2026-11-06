import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorBody } from './artist.model';

/**
 * Turns any HTTP error into a message suitable for the UI.
 * (Prepared helper — the API event handler uses it for every fail event.)
 */
export function describeApiError(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }
  if (error.status === 0) {
    return 'Cannot reach the workshop API. Is "pnpm start" still running?';
  }
  if (isApiErrorBody(error.error)) {
    return error.error.error.message;
  }
  return `${fallback} (HTTP ${error.status})`;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== 'object' || value === null || !('error' in value)) {
    return false;
  }
  const inner: unknown = value.error;
  return typeof inner === 'object' && inner !== null && 'message' in inner && typeof inner.message === 'string';
}
