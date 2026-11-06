import { readServerSettings } from './config.ts';

describe('readServerSettings', () => {
  it('uses workshop defaults', () => {
    expect(readServerSettings([], {})).toEqual({ port: 3000, delayMs: 400, failMutations: false, failFirstLoads: 0 });
  });

  it('reads command-line flags', () => {
    expect(readServerSettings(['--port=4000', '--delay=0', '--fail-mutations', '--fail-first-loads=1'], {})).toEqual({
      port: 4000,
      delayMs: 0,
      failMutations: true,
      failFirstLoads: 1,
    });
  });

  it('falls back to environment variables', () => {
    const env = { API_PORT: '3100', API_DELAY_MS: '50', API_FAIL_MUTATIONS: '1', API_FAIL_FIRST_LOADS: '3' };
    expect(readServerSettings([], env)).toEqual({ port: 3100, delayMs: 50, failMutations: true, failFirstLoads: 3 });
  });

  it('prefers flags over environment variables', () => {
    expect(readServerSettings(['--delay=10'], { API_DELAY_MS: '50' }).delayMs).toBe(10);
  });

  it.each([
    [['--delay=-1'], /--delay must be a whole number/],
    [['--port=abc'], /--port must be a whole number/],
    [['--fail-mutations=maybe'], /--fail-mutations must be true or false/],
    [['--colour=blue'], /Unknown option --colour/],
    [['delay'], /Unexpected argument/],
  ])('rejects invalid input %j', (argv, message) => {
    expect(() => readServerSettings(argv, {})).toThrow(message);
  });
});
