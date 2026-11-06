import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'artists' },
  {
    path: 'artists',
    title: 'All artists',
    loadComponent: () => import('./artists/pages/all-artists-page').then((m) => m.AllArtistsPage),
  },
  {
    path: 'favourites',
    title: 'My favourite artists',
    loadComponent: () => import('./artists/pages/favourite-artists-page').then((m) => m.FavouriteArtistsPage),
  },
  { path: '**', redirectTo: 'artists' },
];
