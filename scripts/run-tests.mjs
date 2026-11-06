#!/usr/bin/env node
/**
 * Test runner used by the package scripts. It reads workshop-stage.json, which
 * records how many store exercises are complete on the current branch.
 *
 *   pnpm test           -> "stage":    API checks, UI tests, and the completed exercises' tests
 *   pnpm test:workshop  -> "workshop": the complete store acceptance suite (fails until all exercises are done)
 *   pnpm test:coverage  -> "coverage": everything, with the 80% coverage thresholds
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const EXERCISES = [
  { file: '01-state', title: 'Exercise 1: view settings' },
  { file: '02-loading', title: 'Exercise 2: loading artists' },
  { file: '03-computed', title: 'Exercise 3: derived views' },
  { file: '04-favourites', title: 'Exercise 4: saving favourites' },
];
const EXERCISE_DIR = 'src/app/artists/state/exercises';

const root = join(import.meta.dirname, '..');
const mode = process.argv[2] ?? 'stage';
const stage = JSON.parse(readFileSync(join(root, 'workshop-stage.json'), 'utf8'));
const completed = stage.completedExercises;

const bin = {
  ng: join(root, 'node_modules/@angular/cli/bin/ng.js'),
  vitest: join(root, 'node_modules/vitest/vitest.mjs'),
  tsc: join(root, 'node_modules/typescript/bin/tsc'),
};

function run(label, script, args) {
  console.log(`\n▶ ${label}`);
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, stdio: 'inherit' });
  return result.status === 0;
}

function apiChecks(coverage) {
  return (
    run('Type-check the local API', bin.tsc, ['-p', 'api/tsconfig.json']) &&
    run('API tests', bin.vitest, ['run', '--config', 'vitest.api.config.ts', ...(coverage ? ['--coverage'] : [])])
  );
}

function finish(ok, failureHint) {
  if (!ok && failureHint) {
    console.error(`\n${failureHint}`);
  }
  process.exit(ok ? 0 : 1);
}

console.log(`Workshop stage: ${stage.stage} (${completed} of ${EXERCISES.length} store exercises complete)`);

if (mode === 'stage') {
  const pending = EXERCISES.slice(completed);
  const excludes = pending.flatMap(({ file }) => ['--exclude', `${EXERCISE_DIR}/${file}.spec.ts`]);
  const included = EXERCISES.slice(0, completed).map(({ title }) => title);
  const ok =
    apiChecks(false) &&
    run(
      `UI tests${included.length ? ` + ${included.join(', ')}` : ''}`,
      bin.ng,
      ['test', '--watch=false', '--include', 'src/**/*.spec.ts', ...excludes],
    );
  if (ok && pending.length) {
    console.log(`\nNot included yet: ${pending.map(({ title }) => title).join(', ')}.`);
    console.log('Run "pnpm test:workshop" to check your store against every exercise.');
  }
  finish(ok);
} else if (mode === 'workshop') {
  const ok = run('Store acceptance tests (all exercises)', bin.ng, [
    'test',
    '--watch=false',
    '--include',
    `${EXERCISE_DIR}/**/*.spec.ts`,
  ]);
  finish(
    ok,
    completed < EXERCISES.length
      ? `Failing tests describe store behaviour that is not implemented yet — expected on "${stage.stage}".\n` +
          'Each failure names the exercise; see docs/workshop-guide.md for the steps.'
      : 'The store acceptance tests should pass on this branch. See the failures above.',
  );
} else if (mode === 'coverage') {
  if (completed < EXERCISES.length) {
    console.warn('Note: the 80% coverage target applies to the completed solution, not to an incomplete store.');
  }
  const ok = apiChecks(true) && run('Angular tests with coverage', bin.ng, ['test', '--watch=false', '--coverage']);
  finish(ok);
} else {
  console.error(`Unknown mode "${mode}". Use: stage | workshop | coverage`);
  process.exit(2);
}
