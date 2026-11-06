/**
 * An error that is safe to send to the browser. The message must be
 * actionable and must never contain stack traces or local filesystem paths.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly headers: Readonly<Record<string, string>>;

  constructor(status: number, code: string, message: string, headers: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

/** Thrown when the saved favourites file exists but cannot be trusted. */
export class DataFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataFileError';
  }
}
