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
  templateUrl: './favourite-artists-page.html',
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
