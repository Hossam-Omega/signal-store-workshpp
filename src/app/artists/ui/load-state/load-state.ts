import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { LoadStatus } from '../../state/artists-view.model';

/** Idle, loading and failure feedback for `GET /api/artists`. Renders nothing once loaded. */
@Component({
  selector: 'app-load-state',
  imports: [MatButtonModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    @switch (status()) {
      @case ('idle') {
        <div class="panel info" data-testid="load-idle">
          <h2>No artists loaded yet</h2>
          <p>
            The store has not loaded any data. Loading is a workshop exercise: implement
            <code>loadArtists()</code> in <code>src/app/artists/state/artists.store.ts</code>
            (Exercise 2 in <code>docs/workshop-guide.md</code>).
          </p>
        </div>
      }
      @case ('loading') {
        <div class="panel" role="status" data-testid="load-loading">
          <mat-progress-bar mode="indeterminate" aria-label="Loading artists" />
          <p>Loading artists…</p>
        </div>
      }
      @case ('error') {
        <div class="panel error" data-testid="load-error">
          <h2>Artists could not be loaded</h2>
          <p role="alert">{{ error() ?? 'Something went wrong.' }}</p>
          <button matButton="filled" type="button" (click)="retry.emit()">Try again</button>
        </div>
      }
    }
  `,
  styleUrl: './status-panel.scss',
})
export class LoadState {
  readonly status = input.required<LoadStatus>();
  readonly error = input<string | null>(null);

  readonly retry = output<void>();
}
