import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { displayPath, parseFavouritesFile, serializeFavourites } from './data-files.ts';

export interface FavouritesRepositoryOptions {
  /** Writable runtime file. */
  dataFile: string;
  /** Read-only seed used to create the runtime file on first run. */
  seedFile: string;
  knownArtistIds: ReadonlySet<string>;
}

let temporaryFileCounter = 0;

/**
 * Stores the favourite artist IDs of the single implicit workshop user.
 *
 * - Mutations run one at a time (a promise queue), so concurrent requests
 *   cannot interleave their read-modify-write steps.
 * - Every change is written to a temporary file and then renamed over the
 *   runtime file, so a crash cannot leave half-written JSON behind.
 * - In-memory state only changes after the write succeeded.
 */
export class FavouritesRepository {
  readonly #options: FavouritesRepositoryOptions;
  #favouriteArtistIds: readonly string[] = [];
  #queue: Promise<unknown> = Promise.resolve();

  constructor(options: FavouritesRepositoryOptions) {
    this.#options = options;
  }

  /**
   * Loads the runtime file, creating it from the seed when it does not exist.
   * An existing file with invalid content is reported, never silently reset.
   */
  async initialize(): Promise<void> {
    const { dataFile, seedFile, knownArtistIds } = this.#options;
    const existing = await readOptionalFile(dataFile);

    if (existing === undefined) {
      const seedIds = parseFavouritesFile(await readFile(seedFile, 'utf8'), knownArtistIds, displayPath(seedFile));
      await writeAtomically(dataFile, serializeFavourites(seedIds));
      this.#favouriteArtistIds = seedIds;
      return;
    }

    this.#favouriteArtistIds = parseFavouritesFile(existing, knownArtistIds, displayPath(dataFile));
  }

  get favouriteArtistIds(): string[] {
    return [...this.#favouriteArtistIds];
  }

  /** Adds a favourite. Adding an existing favourite changes nothing. */
  add(artistId: string): Promise<string[]> {
    return this.#enqueue(async () => {
      if (!this.#favouriteArtistIds.includes(artistId)) {
        await this.#save([...this.#favouriteArtistIds, artistId]);
      }
      return this.favouriteArtistIds;
    });
  }

  /** Removes a favourite. Removing a non-favourite changes nothing. */
  remove(artistId: string): Promise<string[]> {
    return this.#enqueue(async () => {
      if (this.#favouriteArtistIds.includes(artistId)) {
        await this.#save(this.#favouriteArtistIds.filter((id) => id !== artistId));
      }
      return this.favouriteArtistIds;
    });
  }

  async #save(next: readonly string[]): Promise<void> {
    await writeAtomically(this.#options.dataFile, serializeFavourites(next));
    this.#favouriteArtistIds = next;
  }

  #enqueue<T>(task: () => Promise<T>): Promise<T> {
    const result = this.#queue.then(task, task);
    this.#queue = result.catch(() => undefined);
    return result;
  }
}

/** Writes `contents` to a temporary sibling file, then renames it into place. */
export async function writeAtomically(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  temporaryFileCounter += 1;
  const temporaryPath = `${path}.${process.pid}.${temporaryFileCounter}.tmp`;
  try {
    await writeFile(temporaryPath, contents, 'utf8');
    await rename(temporaryPath, path);
  } catch (error) {
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw error;
  }
}

async function readOptionalFile(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return undefined;
    }
    throw error;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
