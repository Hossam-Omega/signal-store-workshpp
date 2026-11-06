import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';

import { createFakeArtistsStore, FakeArtistsStore, provideFakeArtistsStore, toRows } from '../state/testing/fake-artists-store';
import { TEST_ARTISTS } from '../state/testing/artists-test-data';
import { AllArtistsPage } from './all-artists-page';

describe('AllArtistsPage', () => {
  let store: FakeArtistsStore;

  beforeEach(() => {
    store = createFakeArtistsStore();
    store.artists.set([...TEST_ARTISTS]);
    store.genreOptions.set(['Folk', 'Jazz']);
    TestBed.configureTestingModule({ providers: [provideFakeArtistsStore(store)] });
  });

  async function render() {
    const fixture = TestBed.createComponent(AllArtistsPage);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement, loader: TestbedHarnessEnvironment.loader(fixture) };
  }

  const rowNames = (element: HTMLElement) =>
    [...element.querySelectorAll('tr[mat-row] td:first-child')].map((cell) => cell.textContent?.trim());

  it('renders the store-derived rows in the store order', async () => {
    store.allArtistsRows.set(toRows([TEST_ARTISTS[2], TEST_ARTISTS[0]], ['a1']));

    const { element } = await render();

    expect(rowNames(element)).toEqual(['Cara Lune', 'Ada Stone']);
  });

  it('shows visible and total counts from the store', async () => {
    store.allArtistsRows.set(toRows([TEST_ARTISTS[0]]));
    store.allArtistsVisibleCount.set(1);
    store.favouriteCount.set(2);

    const { element } = await render();

    expect(element.querySelector('[data-testid="summary"]')?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Showing 1 of 5 artists · 2 favourites in total',
    );
  });

  it('sends control changes to the store for the "artists" view', async () => {
    const { loader } = await render();

    await (await loader.getHarness(MatInputHarness)).setValue('ada');
    const [genre, status] = await loader.getAllHarnesses(MatSelectHarness);
    await genre.clickOptions({ text: 'Jazz' });
    await status.clickOptions({ text: 'Favourites only' });

    expect(store.setSearch).toHaveBeenLastCalledWith('artists', 'ada');
    expect(store.setGenre).toHaveBeenCalledWith('artists', 'Jazz');
    expect(store.setFavouriteStatus).toHaveBeenCalledWith('favourites');
  });

  it('adds non-favourites and removes favourites', async () => {
    store.allArtistsRows.set(toRows([TEST_ARTISTS[0], TEST_ARTISTS[1]], ['a1']));
    const { element } = await render();

    const [removeAda, addBen] = element.querySelectorAll<HTMLButtonElement>('td button');
    removeAda.click();
    addBen.click();

    expect(store.removeFavourite).toHaveBeenCalledWith('a1');
    expect(store.addFavourite).toHaveBeenCalledWith('a2');
  });

  it('disables favourite buttons when the store says changes are not possible', async () => {
    store.allArtistsRows.set(toRows([TEST_ARTISTS[0]]));
    store.canChangeFavourites.set(false);

    const { element } = await render();

    expect(element.querySelector<HTMLButtonElement>('td button')?.disabled).toBe(true);
  });

  it('explains the idle state before anything is loaded', async () => {
    store.loadStatus.set('idle');

    const { element } = await render();

    expect(element.querySelector('[data-testid="load-idle"]')?.textContent).toContain('loadArtists()');
    expect(element.querySelector('table')).toBeNull();
  });

  it('shows a loading indicator', async () => {
    store.loadStatus.set('loading');

    const { element } = await render();

    expect(element.querySelector('[data-testid="load-loading"] mat-progress-bar')).not.toBeNull();
  });

  it('shows the load error with a retry action', async () => {
    store.loadStatus.set('error');
    store.loadError.set('Cannot reach the workshop API.');
    const { element } = await render();

    const panel = element.querySelector('[data-testid="load-error"]')!;
    panel.querySelector('button')!.click();

    expect(panel.textContent).toContain('Cannot reach the workshop API.');
    expect(store.retryLoad).toHaveBeenCalledTimes(1);
  });

  it('shows a no-matches state when filters hide every artist', async () => {
    store.allArtistsRows.set([]);

    const { element } = await render();

    expect(element.textContent).toContain('No artists match the current search and filters.');
  });

  it('shows an empty state when the API has no artists', async () => {
    store.artists.set([]);

    const { element } = await render();

    expect(element.textContent).toContain('The API returned an empty artist list.');
  });

  it('shows saving progress and mutation errors', async () => {
    store.isSavingFavourite.set(true);
    store.mutationError.set('Simulated failure.');

    const { element } = await render();

    expect(element.querySelector('app-favourite-save-state mat-progress-bar')).not.toBeNull();
    expect(element.querySelector('[data-testid="mutation-error"]')?.textContent).toContain('Simulated failure.');
  });
});
