import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';

import { App } from './app';
import { routes } from './app.routes';
import { ArtistsStore } from './artists/state/artists.store';
import { createFakeArtistsStore, provideFakeArtistsStore } from './artists/state/testing/fake-artists-store';

describe('App shell', () => {
  it('shows navigation with the favourite count from the store', async () => {
    const store = createFakeArtistsStore();
    store.favouriteCount.set(3);
    TestBed.configureTestingModule({ providers: [provideFakeArtistsStore(store), provideRouter(routes)] });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    const links = [...element.querySelectorAll('nav a')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/artists', '/favourites']);
    expect(element.querySelector('[data-testid="favourite-count"]')?.textContent?.trim()).toBe('3');
  });
});

describe('Routing', () => {
  beforeEach(() => {
    // The real store without the API event handler: request events are never answered,
    // so these tests do not depend on the exercises.
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('redirects / to /artists', async () => {
    const harness = await RouterTestingHarness.create('/');

    expect(TestBed.inject(Router).url).toBe('/artists');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('All artists');
  });

  it('opens /favourites directly', async () => {
    const harness = await RouterTestingHarness.create('/favourites');

    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toBe('My favourite artists');
  });

  it('uses one application-wide store instance for both routes', async () => {
    const harness = await RouterTestingHarness.create('/artists');
    const onArtists = harness.routeDebugElement!.injector.get(ArtistsStore);

    await harness.navigateByUrl('/favourites');
    const onFavourites = harness.routeDebugElement!.injector.get(ArtistsStore);

    expect(onFavourites).toBe(onArtists);
    expect(onArtists).toBe(TestBed.inject(ArtistsStore));
  });
});
