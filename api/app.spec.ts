import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createApiServer, type ApiOptions } from './app.ts';
import { defaultPaths } from './data-files.ts';
import { DataFileError } from './errors.ts';

const SEED_IDS = ['artist-001', 'artist-004', 'artist-013', 'artist-021'];

interface RunningApi {
  baseUrl: string;
  dataFile: string;
  logError: ReturnType<typeof vi.fn>;
  stop: () => Promise<void>;
}

let workDir: string;
const running: RunningApi[] = [];

beforeEach(async () => {
  // Every test gets its own directory: participants' runtime data is never touched.
  workDir = await mkdtemp(join(tmpdir(), 'artists-api-'));
});

afterEach(async () => {
  await Promise.all(running.splice(0).map((api) => api.stop()));
  await rm(workDir, { recursive: true, force: true });
});

async function startApi(overrides: Partial<ApiOptions> = {}): Promise<RunningApi> {
  const dataFile = overrides.dataFile ?? join(workDir, 'runtime', 'favourites.json');
  const logError = vi.fn();
  const server: Server = await createApiServer({
    artistsFile: defaultPaths.artistsFile,
    seedFile: defaultPaths.seedFile,
    dataFile,
    delayMs: 0,
    logError,
    ...overrides,
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const api: RunningApi = {
    baseUrl: `http://127.0.0.1:${port}`,
    dataFile,
    logError,
    stop: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
  running.push(api);
  return api;
}

async function call(api: RunningApi, method: string, path: string, body?: string) {
  const response = await fetch(`${api.baseUrl}${path}`, {
    method,
    body,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
  });
  return { status: response.status, headers: response.headers, body: (await response.json()) as any };
}

const addFavourite = (api: RunningApi, artistId: string) =>
  call(api, 'POST', '/api/favourites', JSON.stringify({ artistId }));
const removeFavourite = (api: RunningApi, artistId: string) =>
  call(api, 'DELETE', `/api/favourites/${encodeURIComponent(artistId)}`);

describe('GET /api/artists', () => {
  it('returns all 25 artists with the seed favourites on first run', async () => {
    const api = await startApi();

    const { status, body } = await call(api, 'GET', '/api/artists');

    expect(status).toBe(200);
    expect(body.artists).toHaveLength(25);
    expect(body.artists[0]).toEqual({
      id: 'artist-001',
      name: 'Aria Velloso',
      age: 34,
      gender: 'Female',
      genre: 'Jazz',
      debutYear: 2012,
    });
    expect(body.favouriteArtistIds).toEqual(SEED_IDS);
  });

  it('creates the runtime file from the seed on first run', async () => {
    const api = await startApi();

    const saved = JSON.parse(await readFile(api.dataFile, 'utf8'));

    expect(saved).toEqual({ favouriteArtistIds: SEED_IDS });
  });

  it('rejects other methods with 405', async () => {
    const api = await startApi();

    const { status, headers, body } = await call(api, 'PUT', '/api/artists');

    expect(status).toBe(405);
    expect(headers.get('allow')).toBe('GET');
    expect(body.error.code).toBe('METHOD_NOT_ALLOWED');
  });
});

describe('POST /api/favourites', () => {
  it('adds a favourite and returns the complete list', async () => {
    const api = await startApi();

    const { status, body } = await addFavourite(api, 'artist-002');

    expect(status).toBe(200);
    expect(body).toEqual({ favouriteArtistIds: [...SEED_IDS, 'artist-002'] });
  });

  it('is idempotent: adding an existing favourite creates no duplicate', async () => {
    const api = await startApi();

    await addFavourite(api, 'artist-002');
    const { status, body } = await addFavourite(api, 'artist-002');

    expect(status).toBe(200);
    expect(body.favouriteArtistIds).toEqual([...SEED_IDS, 'artist-002']);
  });

  it.each([
    ['not JSON', '{nope'],
    ['an array', '["artist-001"]'],
    ['missing artistId', '{}'],
    ['a numeric artistId', '{"artistId": 1}'],
    ['an empty artistId', '{"artistId": "  "}'],
  ])('rejects a body that is %s with 400', async (_label, body) => {
    const api = await startApi();

    const response = await call(api, 'POST', '/api/favourites', body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_REQUEST');
  });

  it('rejects an oversized body with 400', async () => {
    const api = await startApi();

    const response = await call(api, 'POST', '/api/favourites', JSON.stringify({ artistId: 'x'.repeat(2000) }));

    expect(response.status).toBe(400);
  });

  it('rejects an unknown artist with 404', async () => {
    const api = await startApi();

    const { status, body } = await addFavourite(api, 'artist-999');

    expect(status).toBe(404);
    expect(body).toEqual({
      error: { code: 'ARTIST_NOT_FOUND', message: 'No artist exists with ID "artist-999".' },
    });
  });

  it('serializes concurrent additions so none are lost', async () => {
    const api = await startApi();
    const ids = ['artist-002', 'artist-003', 'artist-005', 'artist-006', 'artist-007'];

    await Promise.all(ids.map((id) => addFavourite(api, id)));
    const { body } = await call(api, 'GET', '/api/artists');

    expect([...body.favouriteArtistIds].sort()).toEqual([...SEED_IDS, ...ids].sort());
  });
});

describe('DELETE /api/favourites/:artistId', () => {
  it('removes a favourite and returns the complete list', async () => {
    const api = await startApi();

    const { status, body } = await removeFavourite(api, 'artist-004');

    expect(status).toBe(200);
    expect(body).toEqual({ favouriteArtistIds: ['artist-001', 'artist-013', 'artist-021'] });
  });

  it('is idempotent: removing a non-favourite succeeds without changes', async () => {
    const api = await startApi();

    const { status, body } = await removeFavourite(api, 'artist-002');

    expect(status).toBe(200);
    expect(body.favouriteArtistIds).toEqual(SEED_IDS);
  });

  it('rejects an unknown artist with 404', async () => {
    const api = await startApi();

    const { status, body } = await removeFavourite(api, 'nobody');

    expect(status).toBe(404);
    expect(body.error.code).toBe('ARTIST_NOT_FOUND');
  });

  it('rejects a badly encoded artist ID with 400', async () => {
    const api = await startApi();

    const { status } = await call(api, 'DELETE', '/api/favourites/%E0%A4%A');

    expect(status).toBe(400);
  });
});

describe('other routes', () => {
  it('returns 404 with the standard error shape', async () => {
    const api = await startApi();

    const { status, body } = await call(api, 'GET', '/api/unknown');

    expect(status).toBe(404);
    expect(body.error).toEqual({ code: 'NOT_FOUND', message: 'No API endpoint matches GET /api/unknown.' });
  });
});

describe('persistence', () => {
  it('keeps favourites after the API restarts', async () => {
    const first = await startApi();
    await addFavourite(first, 'artist-010');
    await removeFavourite(first, 'artist-001');
    await first.stop();

    const second = await startApi({ dataFile: first.dataFile });
    const { body } = await call(second, 'GET', '/api/artists');

    expect(body.favouriteArtistIds).toEqual(['artist-004', 'artist-013', 'artist-021', 'artist-010']);
  });

  it('refuses to start when the saved file is not valid JSON, and leaves it untouched', async () => {
    const dataFile = join(workDir, 'favourites.json');
    await writeFile(dataFile, '{ broken', 'utf8');

    await expect(startApi({ dataFile })).rejects.toThrow(DataFileError);
    expect(await readFile(dataFile, 'utf8')).toBe('{ broken');
  });

  it.each([
    ['the wrong shape', '[]'],
    ['non-string IDs', '{"favouriteArtistIds": [1]}'],
    ['duplicate IDs', '{"favouriteArtistIds": ["artist-001", "artist-001"]}'],
    ['unknown IDs', '{"favouriteArtistIds": ["artist-999"]}'],
  ])('refuses to start when the saved file has %s', async (_label, contents) => {
    const dataFile = join(workDir, 'favourites.json');
    await writeFile(dataFile, contents, 'utf8');

    await expect(startApi({ dataFile })).rejects.toThrow(DataFileError);
  });

  it('reports a write failure as 500 without changing favourites or leaking paths', async () => {
    const api = await startApi();
    // Removing the runtime directory makes the next write fail.
    await rm(join(workDir, 'runtime'), { recursive: true, force: true });
    await writeFile(join(workDir, 'runtime'), 'not a directory', 'utf8');

    const failed = await addFavourite(api, 'artist-002');
    const after = await call(api, 'GET', '/api/artists');

    expect(failed.status).toBe(500);
    expect(failed.body.error.code).toBe('PERSISTENCE_FAILED');
    expect(JSON.stringify(failed.body)).not.toContain(workDir);
    expect(api.logError).toHaveBeenCalled();
    expect(after.body.favouriteArtistIds).toEqual(SEED_IDS);
  });
});

describe('failure demonstrations', () => {
  it('--fail-mutations fails every favourite change before changing data', async () => {
    const api = await startApi({ failMutations: true });

    const added = await addFavourite(api, 'artist-002');
    const removed = await removeFavourite(api, 'artist-001');
    const { body } = await call(api, 'GET', '/api/artists');

    expect(added.status).toBe(503);
    expect(added.body.error.code).toBe('SIMULATED_FAILURE');
    expect(removed.status).toBe(503);
    expect(body.favouriteArtistIds).toEqual(SEED_IDS);
    expect(JSON.parse(await readFile(api.dataFile, 'utf8')).favouriteArtistIds).toEqual(SEED_IDS);
  });

  it('--fail-mutations still validates input first', async () => {
    const api = await startApi({ failMutations: true });

    const { status } = await addFavourite(api, 'artist-999');

    expect(status).toBe(404);
  });

  it('--fail-first-loads fails the first N loads, then recovers', async () => {
    const api = await startApi({ failFirstLoads: 2 });

    const statuses = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      statuses.push((await call(api, 'GET', '/api/artists')).status);
    }

    expect(statuses).toEqual([503, 503, 200]);
  });

  it('applies the configured delay', async () => {
    const api = await startApi({ delayMs: 120 });

    const started = performance.now();
    await call(api, 'GET', '/api/artists');

    expect(performance.now() - started).toBeGreaterThanOrEqual(100);
  });
});
