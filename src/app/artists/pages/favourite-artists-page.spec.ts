import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatButtonToggleGroupHarness } from '@angular/material/button-toggle/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';
import { provideRouter } from '@angular/router';

import { createFakeArtistsStore, FakeArtistsStore, provideFakeArtistsStore, toRows } from '../state/testing/fake-artists-store';
import { TEST_ARTISTS } from '../state/testing/artists-test-data';
import { FavouriteArtistsPage } from './favourite-artists-page';

describe('FavouriteArtistsPage', () => {
  let store: FakeArtistsStore;

  beforeEach(() => {
    store = createFakeArtistsStore();
    store.artists.set([...TEST_ARTISTS]);
    store.favouriteCount.set(2);
    store.genreOptions.set(['Jazz', 'Pop']);
    TestBed.configureTestingModule({ providers: [provideFakeArtistsStore(store), provideRouter([])] });
  });

  async function render() {
    const fixture = TestBed.createComponent(FavouriteArtistsPage);
    await fixture.whenStable();
    return { element: fixture.nativeElement as HTMLElement, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  it('renders the store-derived favourite rows in the store order', async () => {
    store.favouriteArtistRows.set(toRows([TEST_ARTISTS[2], TEST_ARTISTS[0]], ['a1', 'a3']));
    store.favouritesVisibleCount.set(2);

    const { element } = await render();

    const names = [...element.querySelectorAll('tr[mat-row] td:first-child')].map((cell) => cell.textContent?.trim());
    expect(names).toEqual(['Cara Lune', 'Ada Stone']);
    expect(element.querySelector('[data-testid="summary"]')?.textContent?.trim()).toBe('Showing 2 of 2 favourites');
  });

  it('sends control changes to the store for the "favourites" view, without a status filter', async () => {
    const { loader } = await render();

    const selects = await loader.getAllHarnesses(MatSelectHarness);
    expect(selects).toHaveLength(2);

    await (await loader.getHarness(MatInputHarness)).setValue('cara');
    await selects[0].clickOptions({ text: 'Pop' });
    await selects[1].clickOptions({ text: 'Debut year' });
    const direction = await loader.getHarness(MatButtonToggleGroupHarness);
    await (await direction.getToggles({ text: 'Descending' }))[0].check();

    expect(store.setSearch).toHaveBeenLastCalledWith('favourites', 'cara');
    expect(store.setGenre).toHaveBeenCalledWith('favourites', 'Pop');
    expect(store.setSortField).toHaveBeenCalledWith('favourites', 'debutYear');
    expect(store.setSortDirection).toHaveBeenCalledWith('favourites', 'desc');
  });

  it('removes a favourite', async () => {
    store.favouriteArtistRows.set(toRows([TEST_ARTISTS[0]], ['a1']));
    const { element } = await render();

    element.querySelector<HTMLButtonElement>('td button')!.click();

    expect(store.removeFavourite).toHaveBeenCalledWith('a1');
  });

  it('shows an empty state with a link when there are no favourites', async () => {
    store.favouriteCount.set(0);

    const { element } = await render();

    expect(element.textContent).toContain('No favourites yet');
    expect(element.querySelector('a[href="/artists"]')).not.toBeNull();
  });

  it('shows a no-matches state when filters hide every favourite', async () => {
    store.favouriteArtistRows.set([]);

    const { element } = await render();

    expect(element.textContent).toContain('None of your favourites match');
  });
});
