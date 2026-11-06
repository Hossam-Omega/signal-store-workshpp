import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import {
  FAVOURITE_STATUS_OPTIONS,
  FavouriteStatusFilter,
  SORT_FIELD_OPTIONS,
  SortDirection,
  SortField,
  ViewSettings,
} from '../../state/artists-view.model';

/**
 * Search, filter and sort controls. Purely presentational: it displays the
 * settings it receives and emits every change; the store owns the values.
 */
@Component({
  selector: 'app-artist-view-controls',
  imports: [MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonToggleModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './artist-view-controls.html',
  styleUrl: './artist-view-controls.scss',
})
export class ArtistViewControls {
  readonly settings = input.required<ViewSettings>();
  readonly genres = input.required<readonly string[]>();
  /** Shown only when provided (All artists route). */
  readonly favouriteStatus = input<FavouriteStatusFilter>();

  readonly searchChange = output<string>();
  readonly genreChange = output<string | null>();
  readonly favouriteStatusChange = output<FavouriteStatusFilter>();
  readonly sortFieldChange = output<SortField>();
  readonly sortDirectionChange = output<SortDirection>();

  protected readonly sortFieldOptions = SORT_FIELD_OPTIONS;
  protected readonly favouriteStatusOptions = FAVOURITE_STATUS_OPTIONS;

  protected onSearchInput(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }
}
