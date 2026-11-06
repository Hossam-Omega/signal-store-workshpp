import { HttpErrorResponse } from '@angular/common/http';

import { describeApiError } from './api-error';

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
