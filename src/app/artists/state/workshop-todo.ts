/**
 * WORKSHOP ONLY — explicit development feedback for store methods that have not
 * been implemented yet. It never pretends an action succeeded. This file is
 * deleted in the solution once no placeholder uses it.
 */
const reported = new Set<string>();

export function workshopTodo(exercise: string, method: string, args?: Record<string, unknown>): void {
  if (reported.has(method)) {
    return;
  }
  reported.add(method);
  console.warn(
    `[Workshop] ArtistsStore.${method}() is not implemented yet (${exercise}). ` +
      'Implement it in src/app/artists/state/artists.store.ts — see docs/workshop-guide.md.',
    ...(args ? [args] : []),
  );
}
