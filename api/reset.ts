/**
 * Restores the saved favourites to the committed seed.
 * Run while the API is stopped: `pnpm data:reset`.
 */
import { readFile } from 'node:fs/promises';
import { connect } from 'node:net';

import { API_HOST, readServerSettings } from './config.ts';
import { defaultPaths, displayPath, parseFavouritesFile, readArtists, serializeFavourites } from './data-files.ts';
import { writeAtomically } from './favourites-repository.ts';

async function main(): Promise<void> {
  const { port } = readServerSettings([], process.env);
  if (await isPortInUse(port)) {
    throw new Error(`Something is listening on ${API_HOST}:${port}. Stop "pnpm start" first, then run "pnpm data:reset" again.`);
  }

  const artists = await readArtists(defaultPaths.artistsFile);
  const knownIds = new Set(artists.map((artist) => artist.id));
  const seedIds = parseFavouritesFile(
    await readFile(defaultPaths.seedFile, 'utf8'),
    knownIds,
    displayPath(defaultPaths.seedFile),
  );

  await writeAtomically(defaultPaths.dataFile, serializeFavourites(seedIds));
  console.log(`Restored ${seedIds.length} seed favourites in ${displayPath(defaultPaths.dataFile)}.`);
}

function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host: API_HOST, port });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
  });
}

main().catch((error: unknown) => {
  console.error(`data:reset failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
