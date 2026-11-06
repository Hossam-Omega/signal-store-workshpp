/**
 * Local teaching API for the Signal Store workshop.
 *
 * This is NOT a production backend: one implicit user, no authentication,
 * favourites stored in a local JSON file, loopback interface only.
 *
 *   node api/server.ts [--port=3000] [--delay=400] [--fail-mutations] [--fail-first-loads=1]
 */
import { createApiServer } from './app.ts';
import { API_HOST, readServerSettings } from './config.ts';
import { defaultPaths, displayPath } from './data-files.ts';
import { DataFileError } from './errors.ts';

async function main(): Promise<void> {
  const settings = readServerSettings(process.argv.slice(2), process.env);
  const server = await createApiServer({
    delayMs: settings.delayMs,
    failMutations: settings.failMutations,
    failFirstLoads: settings.failFirstLoads,
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      fail(`Port ${settings.port} is already in use. Stop the other process (maybe another "pnpm start"), or set API_PORT.`);
    }
    fail(`Could not start the API: ${error.message}`);
  });

  server.listen(settings.port, API_HOST, () => {
    console.log(`Workshop API listening on http://${API_HOST}:${settings.port}/api`);
    console.log(`Saved favourites: ${displayPath(defaultPaths.dataFile)} (reset with "pnpm data:reset" while stopped)`);
    console.log(`Response delay: ${settings.delayMs} ms`);
    if (settings.failMutations) {
      console.log('FAILURE DEMO: every favourite change will fail until you restart with "pnpm start".');
    }
    if (settings.failFirstLoads > 0) {
      console.log(`FAILURE DEMO: the first ${settings.failFirstLoads} artist load(s) will fail, then loading recovers.`);
    }
  });

  const shutdown = (): void => {
    server.close(() => process.exit(0));
    server.closeAllConnections();
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

function fail(message: string): never {
  console.error(`API error: ${message}`);
  process.exit(1);
}

main().catch((error: unknown) => {
  if (error instanceof DataFileError) {
    fail(`${error.message} Stop the API and run "pnpm data:reset" to restore the seed favourites.`);
  }
  fail(error instanceof Error ? error.message : String(error));
});
