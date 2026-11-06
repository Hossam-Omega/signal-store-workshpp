import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ArtistsStore } from '../state/artists.store';
import { ArtistRow } from '../state/artists-view.model';
import { ArtistViewControls } from '../ui/artist-view-controls/artist-view-controls';
import { ArtistsTable } from '../ui/artists-table/artists-table';
import { EmptyState } from '../ui/empty-state/empty-state';
import { FavouriteSaveState } from '../ui/load-state/favourite-save-state';
import { LoadState } from '../ui/load-state/load-state';

/** `/artists` — every artist, with search, genre, favourite-status and sort controls. */
@Component({
  selector: 'app-all-artists-page',
  imports: [ArtistViewControls, ArtistsTable, EmptyState, FavouriteSaveState, LoadState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  template: `
    <header class="page-header">
      <h1>All artists</h1>
      <p class="summary" aria-live="polite" data-testid="summary">
        @if (store.loadStatus() === 'loaded') {
          Showing {{ store.allArtistsVisibleCount() }} of {{ store.artists().length }} artists ·
          {{ store.favouriteCount() }} favourites in total
        }
      </p>
    </header>

    <app-artist-view-controls
      [settings]="store.artistsView()"
      [favouriteStatus]="store.artistsView().favouriteStatus"
      [genres]="store.genreOptions()"
      (searchChange)="store.setSearch('artists', $event)"
      (genreChange)="store.setGenre('artists', $event)"
      (favouriteStatusChange)="store.setFavouriteStatus($event)"
      (sortFieldChange)="store.setSortField('artists', $event)"
      (sortDirectionChange)="store.setSortDirection('artists', $event)"
    />

    <app-favourite-save-state [isSaving]="store.isSavingFavourite()" [error]="store.mutationError()" />
    <app-load-state [status]="store.loadStatus()" [error]="store.loadError()" (retry)="store.retryLoad()" />

    @if (store.loadStatus() === 'loaded') {
      @if (store.artists().length === 0) {
        <app-empty-state heading="No artists" message="The API returned an empty artist list." />
      } @else if (store.allArtistsRows().length === 0) {
        <app-empty-state heading="No matches" message="No artists match the current search and filters." />
      } @else {
        <app-artists-table
          caption="All artists"
          [rows]="store.allArtistsRows()"
          [favouriteActionsDisabled]="!store.canChangeFavourites()"
          (favouriteToggle)="toggleFavourite($event)"
        />
      }
    }
  `,
})
export class AllArtistsPage {
  protected readonly store = inject(ArtistsStore);

  protected toggleFavourite(row: ArtistRow): void {
    if (row.isFavourite) {
      this.store.removeFavourite(row.id);
    } else {
      this.store.addFavourite(row.id);
    }
  }
}
