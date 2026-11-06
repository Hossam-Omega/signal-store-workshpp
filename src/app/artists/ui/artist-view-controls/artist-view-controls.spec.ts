import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatButtonToggleGroupHarness } from '@angular/material/button-toggle/testing';
import { MatInputHarness } from '@angular/material/input/testing';
import { MatSelectHarness } from '@angular/material/select/testing';

import { FavouriteStatusFilter, ViewSettings } from '../../state/artists-view.model';
import { ArtistViewControls } from './artist-view-controls';

describe('ArtistViewControls', () => {
  let fixture: ComponentFixture<ArtistViewControls>;
  let loader: HarnessLoader;
  const settings: ViewSettings = { search: 'ada', genre: 'Jazz', sortField: 'age', sortDirection: 'desc' };

  async function render(favouriteStatus?: FavouriteStatusFilter): Promise<void> {
    fixture = TestBed.createComponent(ArtistViewControls);
    fixture.componentRef.setInput('settings', settings);
    fixture.componentRef.setInput('genres', ['Folk', 'Jazz', 'Pop']);
    if (favouriteStatus) {
      fixture.componentRef.setInput('favouriteStatus', favouriteStatus);
    }
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  }

  it('shows the current settings', async () => {
    await render('favourites');

    expect(await (await loader.getHarness(MatInputHarness)).getValue()).toBe('ada');
    const selects = await loader.getAllHarnesses(MatSelectHarness);
    expect(await Promise.all(selects.map((select) => select.getValueText()))).toEqual([
      'Jazz',
      'Favourites only',
      'Age',
    ]);
    const direction = await loader.getHarness(MatButtonToggleGroupHarness);
    const checked = await direction.getToggles({ checked: true });
    expect(await checked[0].getText()).toBe('Descending');
  });

  it('only shows the favourite-status filter when a status is provided', async () => {
    await render();

    expect(await loader.getAllHarnesses(MatSelectHarness)).toHaveLength(2);
  });

  it('emits every change', async () => {
    await render('all');
    const emitted: unknown[] = [];
    const component = fixture.componentInstance;
    component.searchChange.subscribe((value) => emitted.push(['search', value]));
    component.genreChange.subscribe((value) => emitted.push(['genre', value]));
    component.favouriteStatusChange.subscribe((value) => emitted.push(['favouriteStatus', value]));
    component.sortFieldChange.subscribe((value) => emitted.push(['sortField', value]));
    component.sortDirectionChange.subscribe((value) => emitted.push(['sortDirection', value]));

    await (await loader.getHarness(MatInputHarness)).setValue('cara');
    const [genre, status, sortField] = await loader.getAllHarnesses(MatSelectHarness);
    await genre.clickOptions({ text: 'All genres' });
    await status.clickOptions({ text: 'Not favourites' });
    await sortField.clickOptions({ text: 'Debut year' });
    const direction = await loader.getHarness(MatButtonToggleGroupHarness);
    await (await direction.getToggles({ text: 'Ascending' }))[0].check();

    expect(emitted).toContainEqual(['search', 'cara']);
    expect(emitted).toContainEqual(['genre', null]);
    expect(emitted).toContainEqual(['favouriteStatus', 'notFavourites']);
    expect(emitted).toContainEqual(['sortField', 'debutYear']);
    expect(emitted).toContainEqual(['sortDirection', 'asc']);
  });
});
