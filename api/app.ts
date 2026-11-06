import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';

import { defaultPaths, readArtists } from './data-files.ts';
import { ApiError } from './errors.ts';
import { FavouritesRepository } from './favourites-repository.ts';
import type { Artist, ArtistsResponse, ErrorResponse, FavouritesResponse } from './types.ts';

export interface ApiOptions {
  artistsFile: string;
  seedFile: string;
  dataFile: string;
  /** Artificial delay applied to every API request, in milliseconds. */
  delayMs: number;
  /** Fail every favourite mutation until the API restarts without this flag. */
  failMutations: boolean;
  /** Fail this many `GET /api/artists` requests, then succeed. */
  failFirstLoads: number;
  /** Where unexpected server-side errors are reported. */
  logError: (message: string) => void;
}

export const defaultApiOptions: ApiOptions = {
  ...defaultPaths,
  delayMs: 400,
  failMutations: false,
  failFirstLoads: 0,
  logError: (message) => console.error(message),
};

const MAX_BODY_BYTES = 1024;
const FAVOURITE_ROUTE = /^\/api\/favourites\/([^/]+)$/;

/**
 * Creates the workshop API server without starting it.
 * Fails if the fixtures or the saved favourites are invalid.
 */
export async function createApiServer(overrides: Partial<ApiOptions> = {}): Promise<Server> {
  const options: ApiOptions = { ...defaultApiOptions, ...overrides };
  const artists = await readArtists(options.artistsFile);
  const knownArtistIds = new Set(artists.map((artist) => artist.id));
  const repository = new FavouritesRepository({
    dataFile: options.dataFile,
    seedFile: options.seedFile,
    knownArtistIds,
  });
  await repository.initialize();

  const handler = createRequestHandler({ artists, knownArtistIds, repository, options });
  return createServer((request, response) => {
    void handler(request, response);
  });
}

interface HandlerContext {
  artists: readonly Artist[];
  knownArtistIds: ReadonlySet<string>;
  repository: FavouritesRepository;
  options: ApiOptions;
}

function createRequestHandler(context: HandlerContext) {
  const { artists, knownArtistIds, repository, options } = context;
  let remainingLoadFailures = options.failFirstLoads;

  async function handleGetArtists(): Promise<ArtistsResponse> {
    if (remainingLoadFailures > 0) {
      remainingLoadFailures -= 1;
      throw new ApiError(
        503,
        'SIMULATED_FAILURE',
        'Simulated failure: loading artists failed on purpose. Try again to recover.',
      );
    }
    return { artists: [...artists], favouriteArtistIds: repository.favouriteArtistIds };
  }

  async function handleAddFavourite(request: IncomingMessage): Promise<FavouritesResponse> {
    const artistId = parseAddFavouriteBody(await readBody(request));
    assertKnownArtist(artistId);
    assertMutationsEnabled();
    return { favouriteArtistIds: await persist(() => repository.add(artistId)) };
  }

  async function handleRemoveFavourite(encodedArtistId: string): Promise<FavouritesResponse> {
    const artistId = decodeArtistId(encodedArtistId);
    assertKnownArtist(artistId);
    assertMutationsEnabled();
    return { favouriteArtistIds: await persist(() => repository.remove(artistId)) };
  }

  function assertKnownArtist(artistId: string): void {
    if (!knownArtistIds.has(artistId)) {
      throw new ApiError(404, 'ARTIST_NOT_FOUND', `No artist exists with ID "${artistId}".`);
    }
  }

  function assertMutationsEnabled(): void {
    // Simulated failures happen before any data changes.
    if (options.failMutations) {
      throw new ApiError(
        503,
        'SIMULATED_FAILURE',
        'Simulated failure: favourite changes are disabled. Restart the API with "pnpm start" to recover.',
      );
    }
  }

  async function persist(save: () => Promise<string[]>): Promise<string[]> {
    try {
      return await save();
    } catch (error) {
      options.logError(`[api] Could not save favourites: ${describe(error)}`);
      throw new ApiError(
        500,
        'PERSISTENCE_FAILED',
        'Could not save favourites. Check that the runtime folder is writable, then try again.',
      );
    }
  }

  return async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    try {
      const { pathname } = new URL(request.url ?? '/', 'http://localhost');
      const method = request.method ?? 'GET';
      let body: unknown;

      if (pathname === '/api/artists') {
        assertMethod(method, 'GET');
        await sleep(options.delayMs);
        body = await handleGetArtists();
      } else if (pathname === '/api/favourites') {
        assertMethod(method, 'POST');
        await sleep(options.delayMs);
        body = await handleAddFavourite(request);
      } else {
        const match = FAVOURITE_ROUTE.exec(pathname);
        if (!match) {
          throw new ApiError(404, 'NOT_FOUND', `No API endpoint matches ${method} ${pathname}.`);
        }
        assertMethod(method, 'DELETE');
        await sleep(options.delayMs);
        body = await handleRemoveFavourite(match[1]);
      }

      sendJson(response, 200, body);
    } catch (error) {
      if (error instanceof ApiError) {
        sendError(response, error);
        return;
      }
      options.logError(`[api] Unexpected error: ${describe(error)}`);
      sendError(response, new ApiError(500, 'INTERNAL_ERROR', 'Unexpected API error. Check the API console.'));
    }
  };
}

function assertMethod(actual: string, allowed: string): void {
  if (actual !== allowed) {
    throw new ApiError(405, 'METHOD_NOT_ALLOWED', `${allowed} is the only supported method for this endpoint.`, {
      Allow: allowed,
    });
  }
}

function parseAddFavouriteBody(text: string): string {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw invalidRequest('Request body must be JSON like { "artistId": "artist-001" }.');
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw invalidRequest('Request body must be an object like { "artistId": "artist-001" }.');
  }
  const artistId: unknown = (value as Record<string, unknown>)['artistId'];
  if (typeof artistId !== 'string' || artistId.trim() === '') {
    throw invalidRequest('"artistId" must be a non-empty string.');
  }
  return artistId;
}

function decodeArtistId(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    throw invalidRequest('The artist ID in the URL is not correctly encoded.');
  }
}

function invalidRequest(message: string): ApiError {
  return new ApiError(400, 'INVALID_REQUEST', message);
}

async function readBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) {
      throw invalidRequest(`Request body must be smaller than ${MAX_BODY_BYTES} bytes.`);
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

function sendError(response: ServerResponse, error: ApiError): void {
  for (const [name, value] of Object.entries(error.headers)) {
    response.setHeader(name, value);
  }
  const body: ErrorResponse = { error: { code: error.code, message: error.message } };
  sendJson(response, error.status, body);
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    const code = 'code' in error ? ` (${String(error.code)})` : '';
    return `${error.name}${code}`;
  }
  return 'unknown error';
}
