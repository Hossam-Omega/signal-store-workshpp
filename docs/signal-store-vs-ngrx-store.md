# Signal Store vs the classic NgRx Store

A short guide to what NgRx Signal Store is, how it differs from the classic
NgRx Store (`@ngrx/store`), and how to choose between them. Examples use this
workshop's artists feature.

## What each one is

**Classic NgRx Store** (`@ngrx/store`, `@ngrx/effects`) is a Redux-style,
application-wide store:

- **One global state tree.** Each feature registers a slice of it.
- **Actions** describe what happened (`[Artists] Load Artists`).
- **Reducers** are pure functions `(state, action) => newState`. They are the
  only place where state changes.
- **Selectors** read and derive state (memoised), as observables or with
  `selectSignal` as signals.
- **Effects** listen to actions, run side effects (HTTP) and dispatch new
  actions.

**NgRx Signal Store** (`@ngrx/signals`) is a store built from Angular signals
and composed from features:

- `signalStore(...)` creates an injectable service class.
- `withState` holds source state; every property becomes a signal.
- `withComputed` derives state with `computed`.
- `withMethods` is the public API; it updates state with `patchState`.
- `withHooks` runs code on `onInit` / `onDestroy`.
- `withProps`, `withEntities`, `rxMethod`, `signalMethod` and custom features
  (`signalStoreFeature`) cover the rest.
- **Optional:** the events plugin (`@ngrx/signals/events`) adds Redux-style
  events, `withReducer` and `withEventHandlers`. This workshop uses it.

A store can be global (`providedIn: 'root'`, like `ArtistsStore`) or provided
in a component's or route's `providers`, so it lives and dies with that part
of the UI.

## The same feature, both ways

Loading artists with loading and error state.

### Classic NgRx Store

```ts
// artists.actions.ts
export const ArtistsActions = createActionGroup({
  source: 'Artists',
  events: {
    'Load Artists': emptyProps(),
    'Load Artists Success': props<{ artists: Artist[] }>(),
    'Load Artists Failure': props<{ error: string }>(),
  },
});

// artists.reducer.ts
export const artistsFeature = createFeature({
  name: 'artists',
  reducer: createReducer(
    initialState,
    on(ArtistsActions.loadArtists, (state) => ({ ...state, loadStatus: 'loading', loadError: null })),
    on(ArtistsActions.loadArtistsSuccess, (state, { artists }) => ({ ...state, artists, loadStatus: 'loaded' })),
    on(ArtistsActions.loadArtistsFailure, (state, { error }) => ({ ...state, loadStatus: 'error', loadError: error })),
  ),
  extraSelectors: ({ selectLoadStatus }) => ({
    selectIsLoading: createSelector(selectLoadStatus, (status) => status === 'loading'),
  }),
});

// artists.effects.ts
export const loadArtists = createEffect(
  (actions$ = inject(Actions), api = inject(ArtistsApi)) =>
    actions$.pipe(
      ofType(ArtistsActions.loadArtists),
      switchMap(() =>
        api.getArtists().pipe(
          map((artists) => ArtistsActions.loadArtistsSuccess({ artists })),
          catchError((e) => of(ArtistsActions.loadArtistsFailure({ error: describe(e) }))),
        ),
      ),
    ),
  { functional: true },
);

// app.config.ts
provideStore({ [artistsFeature.name]: artistsFeature.reducer }),
provideEffects({ loadArtists }),

// component
store = inject(Store);
isLoading = this.store.selectSignal(artistsFeature.selectIsLoading);
ngOnInit() { this.store.dispatch(ArtistsActions.loadArtists()); }
```

That is four files and a registration step.

### Signal Store, plain methods

```ts
export const ArtistsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isLoading: computed(() => store.loadStatus() === 'loading'),
  })),
  withMethods((store, api = inject(ArtistsApi)) => ({
    loadArtists: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { loadStatus: 'loading', loadError: null })),
        switchMap(() =>
          api.getArtists().pipe(
            tapResponse({
              next: (artists) => patchState(store, { artists, loadStatus: 'loaded' }),
              error: (e) => patchState(store, { loadStatus: 'error', loadError: describe(e) }),
            }),
          ),
        ),
      ),
    ),
  })),
  withHooks({ onInit: (store) => store.loadArtists() }),
);

// component
store = inject(ArtistsStore);
// template: @if (store.isLoading()) { ... }
```

One file, no registration, and fully typed by inference.

### Signal Store with events (this workshop)

The workshop sits in between. Methods dispatch events, a shared API handler
does the HTTP, and the store only turns events into state. See
[`artists.store.ts`](../src/app/artists/state/artists.store.ts) and
[`artists.events.ts`](../src/app/artists/state/artists.events.ts):

```ts
loadArtists(): void {
  dispatcher.dispatch(loadArtistsRequested());
},
// ...
withEventHandlers((store) => ({
  onLoadArtistsRequestedSuccess: store.events
    .on(loadArtistsRequestedSuccess)
    .pipe(tap(({ payload: { artists, favouriteArtistIds } }) =>
      patchState(store, { artists, favouriteArtistIds, loadStatus: 'loaded' }))),
})),
```

You keep the Redux benefits (an event log, decoupling, one-way flow) without
the global state tree or the file sprawl.

## Side by side

| | Classic NgRx Store | Signal Store |
| --- | --- | --- |
| Reactivity | RxJS first; signals via `selectSignal` | Signals first; RxJS optional (`rxMethod`, events) |
| Shape | One global state tree | Many small stores, each a service |
| Lifetime | Whole app | Root, route or component (`providers`) |
| Changing state | Only reducers, only through actions | `patchState` in methods (or reducers with the events plugin) |
| Derived state | Selectors (`createSelector`) | `computed` in `withComputed` |
| Side effects | Effects | Methods with `rxMethod`/`async`, or event handlers |
| Boilerplate | High: actions, reducer, selectors, effects, registration | Low: one `signalStore(...)` call |
| Types | Explicit action props and state interfaces | Inferred from `withState` and features |
| Reuse | Meta-reducers, shared selectors | Custom features with `signalStoreFeature` |
| DevTools | Redux DevTools built in, time travel, action log | Not built in; community `withDevtools` (`@angular-architects/ngrx-toolkit`) |
| Testing | Reducers and selectors are pure functions; effects with marbles or mocks | Inject the store and call methods; read signals synchronously |

## Signal Store: advantages

- **Much less code.** State, derived state, methods and lifecycle live in one
  place. New team members read one file instead of four.
- **Signals all the way.** Templates read `store.isLoading()` directly. No
  `async` pipe, no subscriptions, and it fits zoneless Angular.
- **Fine-grained updates.** Each state property is its own signal, and
  computeds only recompute when what they read changes. In this workshop,
  changing the favourites search does not recompute `allArtistsRows`.
- **Scoped lifetime.** Provide a store in a component and it is created and
  destroyed with it. No stale global state to reset by hand (this replaces the
  old `ComponentStore`).
- **Great type inference.** No action type strings to keep in sync with
  reducers.
- **Composable.** Extract repeated patterns (loading status, entities,
  pagination) into custom features and add them with one line.
- **Incremental.** Start with plain methods. Add `rxMethod` or the events
  plugin only where you need them.

## Signal Store: disadvantages

- **Less enforced structure.** Any method can call `patchState`. Without
  conventions (or the events plugin) the one-way flow that Redux guarantees
  can erode in a big team.
- **Weaker tooling.** No official DevTools integration, time travel or action
  log. The community toolkit covers some of it.
- **No single state tree.** Cross-store coordination is explicit: one store
  injects another, or both listen to the same events. Snapshotting or
  hydrating "the whole app state" is not built in.
- **RxJS still appears for async races.** Cancelling or queueing requests
  means `rxMethod` with `switchMap`/`concatMap`, so the RxJS knowledge does not
  go away entirely.
- **Younger ecosystem.** Fewer established patterns, articles and libraries
  than for the classic store (for example, nothing like `@ngrx/router-store`).

## Classic NgRx Store: advantages

- **Strict, predictable data flow.** State only changes in pure reducers in
  response to actions. Every change is traceable.
- **Excellent debugging.** Redux DevTools show every action, the state diff
  and time travel.
- **Decoupling through actions.** One action can update several features and
  trigger several effects without the dispatcher knowing about any of them.
- **Proven at scale.** Clear conventions for large teams and large apps, and
  a mature ecosystem (`@ngrx/entity`, `@ngrx/router-store`, `@ngrx/effects`).

## Classic NgRx Store: disadvantages

- **Boilerplate and indirection.** A simple feature needs actions, a reducer,
  selectors and effects; following one click means opening several files.
- **Everything is global.** Local or short-lived state either pollutes the
  global tree or needs manual clean-up.
- **RxJS-heavy.** Effects and observable selectors raise the learning curve.
- **Overkill for most features.** Many screens only load, filter and show
  data.

## When to use which

**Choose Signal Store when:**

- you start a new Angular app or feature (Angular 17+, signals, zoneless);
- the state belongs to one feature, route or component;
- the team wants little ceremony and good type inference;
- you are replacing `ComponentStore` or hand-written "service with a
  BehaviorSubject" stores.

**Choose (or stay with) the classic Store when:**

- the app already uses it heavily and works well. Rewriting is rarely worth
  it; new features can use Signal Store next to it;
- many unrelated features must react to the same actions and you want one
  central log of everything that happens;
- Redux DevTools, time travel and action replay are important to your team;
- you need strict, enforced conventions across many teams.

**Middle ground: Signal Store + events plugin** (this workshop). Use it when
you want event-driven decoupling and a single place for side effects, but
also want signals, scoped stores and less boilerplate.

## Rules of thumb

1. Simple local state in one component → plain `signal()`s, no store.
2. State shared by a few components or a feature → Signal Store with methods.
3. Several stores or features reacting to the same thing, or a team that
   wants Redux discipline → Signal Store with events.
4. A large existing classic Store app → keep it, add Signal Store for new or
   local features.

## Further reading

- [NgRx Signal Store guide](https://ngrx.io/guide/signals)
- [Signal Store events plugin](https://ngrx.io/guide/signals/signal-store/events)
- [Classic NgRx Store guide](https://ngrx.io/guide/store)
- In this repo: [solution notes](solution-notes.md) explain why the workshop
  store is built the way it is.
