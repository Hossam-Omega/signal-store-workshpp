import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ArtistRow } from '../../state/artists-view.model';
import { toRows } from '../../state/testing/fake-artists-store';
import { TEST_ARTISTS } from '../../state/testing/artists-test-data';
import { ArtistsTable } from './artists-table';

describe('ArtistsTable', () => {
  let fixture: ComponentFixture<ArtistsTable>;

  async function render(rows: ArtistRow[], disabled = false): Promise<HTMLElement> {
    fixture = TestBed.createComponent(ArtistsTable);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('caption', 'Test artists');
    fixture.componentRef.setInput('favouriteActionsDisabled', disabled);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const cellTexts = (element: HTMLElement) =>
    [...element.querySelectorAll('tr[mat-row]')].map((row) =>
      [...row.querySelectorAll('td')].slice(0, 5).map((cell) => cell.textContent?.trim()),
    );

  it('renders exactly the given rows, in the given order', async () => {
    const rows = toRows([TEST_ARTISTS[4], TEST_ARTISTS[0], TEST_ARTISTS[2]], ['a1']);

    const element = await render(rows);

    expect(cellTexts(element)).toEqual([
      ['Dex Rowe', '22', 'Male', 'Jazz', '2021'],
      ['Ada Stone', '30', 'Female', 'Jazz', '2015'],
      ['Cara Lune', '30', 'Non-binary', 'Pop', '2015'],
    ]);
  });

  it('labels each favourite button with the action and artist name', async () => {
    const element = await render(toRows([TEST_ARTISTS[0], TEST_ARTISTS[1]], ['a1']));

    const labels = [...element.querySelectorAll('td button')].map((button) => button.getAttribute('aria-label'));

    expect(labels).toEqual(['Remove Ada Stone from favourites', 'Add ben marsh to favourites']);
  });

  it('emits the clicked row', async () => {
    const rows = toRows([TEST_ARTISTS[0], TEST_ARTISTS[1]], ['a1']);
    const element = await render(rows);
    const emitted: ArtistRow[] = [];
    fixture.componentInstance.favouriteToggle.subscribe((row) => emitted.push(row));

    element.querySelectorAll<HTMLButtonElement>('td button')[1].click();

    expect(emitted).toEqual([rows[1]]);
  });

  it('disables every favourite button when actions are disabled', async () => {
    const element = await render(toRows(TEST_ARTISTS.slice(0, 3)), true);

    const buttons = [...element.querySelectorAll<HTMLButtonElement>('td button')];

    expect(buttons).toHaveLength(3);
    expect(buttons.every((button) => button.disabled)).toBe(true);
  });
});
