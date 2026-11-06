/** Loopback only: the workshop API must never listen on a public interface. */
export const API_HOST = '127.0.0.1';
export const DEFAULT_API_PORT = 3000;

export interface ServerSettings {
  port: number;
  delayMs: number;
  failMutations: boolean;
  failFirstLoads: number;
}

/**
 * Reads settings from command-line flags, falling back to environment variables.
 *
 *   --port=3000           API_PORT
 *   --delay=400           API_DELAY_MS
 *   --fail-mutations      API_FAIL_MUTATIONS=true
 *   --fail-first-loads=1  API_FAIL_FIRST_LOADS=1
 */
export function readServerSettings(argv: readonly string[], env: NodeJS.ProcessEnv): ServerSettings {
  const flags = new Map<string, string>();
  for (const arg of argv) {
    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument "${arg}".`);
    }
    const [name, value = 'true'] = arg.slice(2).split('=', 2);
    flags.set(name, value);
  }

  const known = new Set(['port', 'delay', 'fail-mutations', 'fail-first-loads']);
  for (const name of flags.keys()) {
    if (!known.has(name)) {
      throw new Error(`Unknown option --${name}. Supported: --port, --delay, --fail-mutations, --fail-first-loads.`);
    }
  }

  return {
    port: readInteger('port', flags.get('port') ?? env['API_PORT'], DEFAULT_API_PORT, 1, 65535),
    delayMs: readInteger('delay', flags.get('delay') ?? env['API_DELAY_MS'], 400, 0, 60_000),
    failMutations: readBoolean('fail-mutations', flags.get('fail-mutations') ?? env['API_FAIL_MUTATIONS']),
    failFirstLoads: readInteger('fail-first-loads', flags.get('fail-first-loads') ?? env['API_FAIL_FIRST_LOADS'], 0, 0, 1000),
  };
}

function readInteger(name: string, raw: string | undefined, fallback: number, min: number, max: number): number {
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`--${name} must be a whole number between ${min} and ${max}; received "${raw}".`);
  }
  return value;
}

function readBoolean(name: string, raw: string | undefined): boolean {
  if (raw === undefined || raw === '' || raw === 'false' || raw === '0') {
    return false;
  }
  if (raw === 'true' || raw === '1') {
    return true;
  }
  throw new Error(`--${name} must be true or false; received "${raw}".`);
}
