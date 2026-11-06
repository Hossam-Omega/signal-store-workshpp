import { Provider, signal } from '@angular/core';

import { Artist } from '../../data-access/artist.model';
import { ArtistsStore, initialArtistsState } from '../artists.store';
import { ArtistRow, LoadStatus } from '../artists-view.model';

/**
 * A stand-in for ArtistsStore used by UI tests. Every signal is writable so a
 * test can put the UI into any state, and every method is a spy. UI tests
 * therefore pass whether or not the store exercises are complete.
 */
export function createFakeArtistsStore() {
  return {
    artists: signal<Artist[]>([]),
    favouriteArtistIds: signal<string[]>([]),
    loadStatus: signal<LoadStatus>('loaded'),
    loadError: signal<string | null>(null),
    isSavingFavourite: signal(false),
    mutationError: signal<string | null>(null),
    artistsView: signal(initialArtistsState.artistsView),
    favouritesView: signal(initialArtistsState.favouritesView),

    allArtistsRows: signal<ArtistRow[]>([]),
    favouriteArtistRows: signal<ArtistRow[]>([]),
    favouriteCount: signal(0),
    allArtistsVisibleCount: signal(0),
    favouritesVisibleCount: signal(0),
    genreOptions: signal<string[]>([]),
    isLoading: signal(false),
    canChangeFavourites: signal(true),

    setSearch: vi.fn(),
    setGenre: vi.fn(),
    setSortField: vi.fn(),
    setSortDirection: vi.fn(),
    setFavouriteStatus: vi.fn(),
    loadArtists: vi.fn(),
    retryLoad: vi.fn(),
    addFavourite: vi.fn(),
    removeFavourite: vi.fn(),
  };
}

export type FakeArtistsStore = ReturnType<typeof createFakeArtistsStore>;

export function provideFakeArtistsStore(fake: FakeArtistsStore): Provider {
  return { provide: ArtistsStore, useValue: fake };
}

export function toRows(artists: readonly Artist[], favouriteIds: readonly string[] = []): ArtistRow[] {
  return artists.map((artist) => ({ ...artist, isFavourite: favouriteIds.includes(artist.id) }));
}
