import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';

import { ArtistRow } from '../../state/artists-view.model';

/**
 * Renders exactly the rows it is given, in the given order.
 * No MatTableDataSource, no table-level filtering or sorting: the store
 * derives the rows.
 */
@Component({
  selector: 'app-artists-table',
  imports: [MatTableModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './artists-table.html',
  styleUrl: './artists-table.scss',
})
export class ArtistsTable {
  readonly rows = input.required<readonly ArtistRow[]>();
  readonly caption = input.required<string>();
  /** Disables every favourite button (e.g. while a change is being saved). */
  readonly favouriteActionsDisabled = input(false);

  readonly favouriteToggle = output<ArtistRow>();

  protected readonly columns = ['name', 'age', 'gender', 'genre', 'debutYear', 'favourite'];
  protected readonly trackById = (_index: number, row: ArtistRow): string => row.id;
}
