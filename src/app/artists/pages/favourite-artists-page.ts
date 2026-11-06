import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ArtistsStore } from '../state/artists.store';
import { ArtistRow } from '../state/artists-view.model';
import { ArtistViewControls } from '../ui/artist-view-controls/artist-view-controls';
import { ArtistsTable } from '../ui/artists-table/artists-table';
import { EmptyState } from '../ui/empty-state/empty-state';
import { FavouriteSaveState } from '../ui/load-state/favourite-save-state';
import { LoadState } from '../ui/load-state/load-state';

/** `/favourites` — only saved favourites, with search, genre and sort controls. */
@Component({
  selector: 'app-favourite-artists-page',
  imports: [ArtistViewControls, ArtistsTable, EmptyState, FavouriteSaveState, LoadState, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  template: `
    <header class="page-header">
      <h1>My favourite artists</h1>
      <p class="summary" aria-live="polite" data-testid="summary">
        @if (store.loadStatus() === 'loaded') {
          Showing {{ store.favouritesVisibleCount() }} of {{ store.favouriteCount() }} favourites
        }
      </p>
    </header>

    <app-artist-view-controls
      [settings]="store.favouritesView()"
      [genres]="store.genreOptions()"
      (searchChange)="store.setSearch('favourites', $event)"
      (genreChange)="store.setGenre('favourites', $event)"
      (sortFieldChange)="store.setSortField('favourites', $event)"
      (sortDirectionChange)="store.setSortDirection('favourites', $event)"
    />

    <app-favourite-save-state [isSaving]="store.isSavingFavourite()" [error]="store.mutationError()" />
    <app-load-state [status]="store.loadStatus()" [error]="store.loadError()" (retry)="store.retryLoad()" />

    @if (store.loadStatus() === 'loaded') {
      @if (store.favouriteCount() === 0) {
        <app-empty-state heading="No favourites yet" message="Add artists to your favourites from the All artists page." />
        <p class="empty-link"><a routerLink="/artists">Browse all artists</a></p>
      } @else if (store.favouriteArtistRows().length === 0) {
        <app-empty-state heading="No matches" message="None of your favourites match the current search and genre." />
      } @else {
        <app-artists-table
          caption="My favourite artists"
          [rows]="store.favouriteArtistRows()"
          [favouriteActionsDisabled]="!store.canChangeFavourites()"
          (favouriteToggle)="toggleFavourite($event)"
        />
      }
    }
  `,
})
export class FavouriteArtistsPage {
  protected readonly store = inject(ArtistsStore);

  protected toggleFavourite(row: ArtistRow): void {
    if (row.isFavourite) {
      this.store.removeFavourite(row.id);
    } else {
      this.store.addFavourite(row.id);
    }
  }
}
