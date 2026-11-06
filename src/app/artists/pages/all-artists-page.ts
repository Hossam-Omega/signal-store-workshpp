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
  templateUrl: './all-artists-page.html',
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
