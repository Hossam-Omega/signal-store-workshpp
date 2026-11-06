# Workshop FAQ

Questions that are likely to come up during the session, with short answers. API details match
`@ngrx/signals` 22. See also the [workshop guide](workshop-guide.md),
[solution notes](solution-notes.md) and
[Signal Store vs the classic NgRx Store](signal-store-vs-ngrx-store.md).

- [Events plugin](#events-plugin)
- [Signal Store basics](#signal-store-basics)
- [Design choices in this workshop](#design-choices-in-this-workshop)
- [Testing](#testing)
- [Git and tooling](#git-and-tooling)

---

## Events plugin

### What is the difference between `on(event)` and `ofType(event)`?

`ofType` belongs to the classic NgRx Store (`@ngrx/effects`). It is an RxJS operator piped onto
the `Actions` stream: `actions$.pipe(ofType(loadArtists))`. The Signal Store events plugin has no
`ofType`. It has two different things called `on`:

- **`store.events.on(a, b)`** is a _method_ on the `Events` service. It returns an observable of
  only those events, filtered and typed, so it does the job of `actions$.pipe(ofType(a, b))` in
  one call. This is the one used in `withEventHandlers`.
- **`on(event, reducer)`** is a standalone _function_ imported from `@ngrx/signals/events`. It is
  a case reducer inside `withReducer`, like `on` in the classic `createReducer`.

`events.on()` without arguments emits every event. The
[API event handler](../src/app/artists/data-access/api-events.handler.ts) uses that.

### What is the difference between `withReducer` and `withEventHandlers`?

- **`withReducer(on(event, ({ payload }, state) => partialState))`** is only for state
  transitions. It is pure and synchronous, and returns the new state. It listens through
  `ReducerEvents`, which receives every event _before_ `Events`, so reducers have already run
  when any event handler sees the event.
- **`withEventHandlers((store) => ({ name: observable$ }))`** is for side effects: anything RxJS
  can do, such as HTTP, logging, navigation or dispatching other events. It only changes state if
  you call `patchState` yourself.

### Why does the workshop use `withEventHandlers` with `patchState` and not `withReducer`?

Fewer new concepts: `tap(() => patchState(...))` reads the same as Exercise 1. In a real app,
`withReducer` for state transitions plus `withEventHandlers` for side effects is the cleaner
split. Exercise 2 could be written as:

```ts
withReducer(
  on(loadArtistsRequested, () => ({ loadStatus: 'loading' as const, loadError: null })),
  on(loadArtistsRequestedSuccess, ({ payload: { artists, favouriteArtistIds } }) => ({
    artists,
    favouriteArtistIds,
    loadStatus: 'loaded' as const,
  })),
  on(loadArtistsRequestedFail, ({ payload }) => ({ loadStatus: 'error' as const, loadError: payload })),
),
```

### What happens if an event handler emits an event?

It is dispatched automatically. `withEventHandlers` checks every value its observables emit, and
dispatches anything that is an event. That is how you chain events:
`events.on(a).pipe(map(() => b()))`. Our handlers use `tap`, which passes the _incoming_ event
through, but that one is not dispatched again: events that come out of `events.on()` are marked
as already dispatched.

### Do the handler names (`onLoadArtistsRequested`, …) matter?

Only for readability. `withEventHandlers` adds nothing to the store's public API, so the names are
not reachable from outside. You can also return an array of observables instead of an object.

### Do I need to unsubscribe from the event handlers?

No. `withEventHandlers` subscribes in its own `onInit` hook with `takeUntilDestroyed()`, so the
subscriptions end when the store is destroyed. For a root store, that is when the app is.

### Why must `withHooks` come last?

Hooks run in feature order, and `withEventHandlers` starts listening in an `onInit` hook. If our
`withHooks.onInit` (which calls `loadArtists()`) ran first, `loadArtistsRequested` would be
dispatched before any handler listens. Events are not replayed, so it would be lost.

### Why do the store methods dispatch events instead of the components?

The methods stay the component-facing API, so the UI does not know events exist. That is why the
UI could be finished before the exercises. Components _can_ dispatch directly with
`inject(Dispatcher)` or `injectDispatch(eventGroup)` if a team prefers that.

### What is `type<T>()` in `event('…', type<string>())`?

A typing helper with no runtime value. It only tells TypeScript the payload type.

### Is `apiEvent` part of NgRx?

No, it is ours: [`api-event.ts`](../src/app/artists/data-access/api-event.ts). It creates a normal
event that also carries a `request` (an endpoint config plus its success and fail events). The API
event handler picks out every event with a `request`, makes the HTTP call and dispatches the
outcome.

### Why the `[Artists]` / `[Artists API]` prefixes in event types?

A convention from the classic NgRx Store: `[Source] What happened`. It keeps event logs readable.
`eventGroup({ source, events })` generates the prefixes for you.

### What are event scopes and `provideDispatcher`?

By default every event is global. `provideDispatcher()` in a component's `providers` creates a
local event bus. `dispatch(event, { scope: 'self' | 'parent' | 'global' })`, or `toScope` /
`mapToScope` in a handler, choose which bus an event goes to. The workshop has one root store, so it does not need scopes.

---

## Signal Store basics

### What do `withState`, `withComputed`, `withMethods` and `withProps` each do?

- `withState`: source state. Every property becomes a signal (nested objects become deep
  signals).
- `withComputed`: derived, read-only signals.
- `withMethods`: the public API. Methods update state with `patchState`.
- `withProps`: anything else the store needs, such as services, observables or the `events`
  stream. Members whose names start with `_` stay private to the store.

### Can a component call `patchState(store, …)` directly?

No. State is protected by default, so outside the store `patchState` does not compile.
`signalStore({ protectedState: false }, …)` turns that off, but keeping state changes inside the
store is the point.

### Why `{ ...state.artistsView, search }` and not `{ artistsView: { search } }`?

`patchState` merges only the top level. `{ artistsView: { search } }` would replace the whole view
object and lose genre and sort. State is also immutable: in development mode Signal Store freezes
it, so changing it in place throws.

### `patchState(store, { … })` or `patchState(store, (state) => ({ … }))`?

Same result. Use the function form when the new value depends on the current state, as with the
nested copy above.

### Why not keep the filtered and sorted rows in state?

They are derived. Storing them means keeping two copies in sync by hand. A `computed` always
gives the right answer and only recomputes when something it reads changes.

### Why does changing the favourites search not recompute `allArtistsRows`?

A `computed` tracks exactly the signals it reads, and every state property is its own signal.
`allArtistsRows` never reads `favouritesView`. The optional `console.count` exercise shows this.

### Why a `Set` of favourite IDs?

`set.has(id)` is constant time; `array.includes(id)` scans the array for every row. The `Set` is
an internal `computed`: only what `withComputed` returns becomes public.

### Why map or filter before sorting?

`Array.prototype.sort` sorts in place. Sorting `store.artists()` directly would mutate state (and
throw in development mode, because state is frozen). `filter`/`map` return new arrays;
`toSorted()` or `[...array].sort()` also work.

### Why `providedIn: 'root'`? When would you provide a store in a component?

Both routes share the artists, the favourites and each route's filters, and navigating must not
reload the data. Provide a store in a component's or route's `providers` when its state should
live and die with that part of the UI, for example a dialog or a wizard.

### When does `onInit` run?

When the store is created, which happens the first time something injects it. That is why a
refresh directly on `/favourites` still loads the data.

### `rxMethod`, `signalMethod` or events: when do I use which?

- `rxMethod` when you need RxJS flattening: debouncing, cancelling with `switchMap`, queueing with
  `concatMap`.
- `signalMethod` for simple side effects driven by a value or a signal, without RxJS.
- Events when several stores or handlers react to the same thing, or when you want a one-way flow
  and an event log.

[Signal Store vs the classic NgRx Store](signal-store-vs-ngrx-store.md) shows the same feature
written with methods and with events.

### Does Signal Store replace the classic NgRx Store?

For most new feature state, yes. Large existing apps that rely on Redux DevTools, time travel and
a global action log can keep the classic Store and use Signal Store next to it for new or local
features.

### Is there DevTools support?

Not built in. The community `withDevtools` feature from `@angular-architects/ngrx-toolkit` adds
Redux DevTools support.

---

## Design choices in this workshop

### Why does the store never call HTTP or use `catchError`?

So the store only turns events into state. The prepared API event handler turns every request
event into its success or fail event, and the fail payload is already a readable message. HTTP and
error handling live in one place for every endpoint.

### Why does the API event handler use `mergeMap` and not `switchMap`?

`switchMap` would cancel the running request whenever _any_ other request starts, even an
unrelated one: a favourite save would cancel the load. `mergeMap` lets every request finish.
Overlapping requests of the same kind do not happen here: **Try again** only appears in the error
state, and the favourite buttons are disabled while saving.

### Why take the favourite list from the response instead of adding or removing the ID locally?

The server's list is authoritative. With two tabs open, or when the server rejects a change, a
local guess would be wrong.

### Why no optimistic updates?

It keeps the flow simple: pending, then success or fail. Optimistic updates need a rollback on
failure. A good discussion point, not an exercise.

### Why one handler for both add and remove?

Both change exactly the same state. `events.on(a, b)` accepts several events, and the payload type
is the union of theirs.

### Why `loadStatus: 'idle' | 'loading' | 'loaded' | 'error'` instead of `isLoading: boolean`?

One status field makes impossible states impossible: you cannot be loading _and_ failed at the
same time. Booleans such as `isLoading` are derived from it.

### Why is the search text stored untrimmed?

State holds exactly what the user typed, so the input never jumps. Trimming is a view concern and
happens while filtering.

---

## Testing

### How do the tests control when HTTP responds?

With `HttpTestingController`. The test decides when and how each request is answered, so it can
check the state in between, for example `loadStatus: 'loading'` or `isSavingFavourite: true`.

### Why are the store tests so simple?

Signals can be read synchronously: inject the store, call a method, check `store.something()`. No
subscriptions and no marble tests.

### Why do 3 tests already pass on `starter`?

They also hold for the placeholders, for example "a whitespace-only search shows everyone". It
does not mean part of the work is done.

---

## Git and tooling

### Why `git switch` instead of `git checkout`?

`git checkout` does two unrelated jobs: switching branches _and_ overwriting files.
`git checkout -- .` silently throws away uncommitted work. Since Git 2.23 the jobs are split:
`git switch` only changes branches and `git restore` only restores files. `git switch` is safer to
teach, and it refuses to leave you on a detached HEAD (a tag or a commit) unless you add
`--detach`. `git switch starter` also creates the local branch from `origin/starter` by itself.

### I am stuck. How do I jump ahead without losing my work?

Keep your work first, then switch:

```sh
git stash push -m "my attempt"   # or commit it on your own branch
git switch checkpoint/02-loading
```

Never use `git reset --hard`.

### How do I compare my store with the solution?

```sh
git diff solution -- src/app/artists/state/artists.store.ts
git diff checkpoint/02-loading checkpoint/03-computed -- src/app/artists/state/artists.store.ts
```

### Why pnpm and `--frozen-lockfile`?

pnpm installs fast from a shared store and keeps dependencies strict. `--frozen-lockfile` fails
instead of silently changing versions, so everyone gets identical packages.

### Do I need to reinstall after switching checkpoints?

No. All branches have the same dependencies, and a running `pnpm start` rebuilds by itself.

### Favourites look wrong, or a port is already in use?

- **Favourites:** stop the app, run `pnpm data:reset`, then `pnpm start` again.
- **Port in use:** an earlier `pnpm start` is still running. Close it, or set `API_PORT`.
