import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { DataFileError } from './errors.ts';
import type { Artist } from './types.ts';

const repositoryRoot = resolve(import.meta.dirname, '..');

/** Default file locations, relative to the repository root. */
export const defaultPaths = {
  /** Read-only artist fixtures (committed). */
  artistsFile: resolve(repositoryRoot, 'data/artists.json'),
  /** Read-only initial favourites (committed). */
  seedFile: resolve(repositoryRoot, 'data/favourites.seed.json'),
  /** Writable favourites created from the seed on first run (git-ignored). */
  dataFile: resolve(repositoryRoot, 'runtime/favourites.json'),
} as const;

/** Display-friendly path used in console messages (never in HTTP responses). */
export function displayPath(path: string): string {
  return path.startsWith(repositoryRoot) ? path.slice(repositoryRoot.length + 1).replaceAll('\\', '/') : path;
}

export async function readArtists(artistsFile: string): Promise<Artist[]> {
  const value = await readJson(artistsFile);
  if (!Array.isArray(value) || !value.every(isArtist)) {
    throw new DataFileError(`${displayPath(artistsFile)} must contain an array of artists.`);
  }
  const ids = new Set(value.map((artist) => artist.id));
  if (ids.size !== value.length) {
    throw new DataFileError(`${displayPath(artistsFile)} contains duplicate artist IDs.`);
  }
  return value;
}

/**
 * Parses and validates the contents of a favourites file
 * (`{ "favouriteArtistIds": string[] }`).
 */
export function parseFavouritesFile(text: string, knownArtistIds: ReadonlySet<string>, label: string): string[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new DataFileError(`${label} is not valid JSON.`);
  }

  if (!isRecord(value) || !Array.isArray(value['favouriteArtistIds'])) {
    throw new DataFileError(`${label} must look like { "favouriteArtistIds": ["artist-001"] }.`);
  }

  const ids: unknown[] = value['favouriteArtistIds'];
  if (!ids.every((id): id is string => typeof id === 'string')) {
    throw new DataFileError(`${label} must only contain artist ID strings.`);
  }
  if (new Set(ids).size !== ids.length) {
    throw new DataFileError(`${label} contains duplicate artist IDs.`);
  }
  const unknownId = ids.find((id) => !knownArtistIds.has(id));
  if (unknownId !== undefined) {
    throw new DataFileError(`${label} refers to unknown artist "${unknownId}".`);
  }
  return ids;
}

export function serializeFavourites(ids: readonly string[]): string {
  return `${JSON.stringify({ favouriteArtistIds: ids }, null, 2)}\n`;
}

async function readJson(path: string): Promise<unknown> {
  const text = await readFile(path, 'utf8');
  try {
    return JSON.parse(text);
  } catch {
    throw new DataFileError(`${displayPath(path)} is not valid JSON.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArtist(value: unknown): value is Artist {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    typeof value['age'] === 'number' &&
    typeof value['gender'] === 'string' &&
    typeof value['genre'] === 'string' &&
    typeof value['debutYear'] === 'number'
  );
}
