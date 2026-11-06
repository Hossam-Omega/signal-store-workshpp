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
  templateUrl: './load-state.html',
  styleUrl: './status-panel.scss',
})
export class LoadState {
  readonly status = input.required<LoadStatus>();
  readonly error = input<string | null>(null);

  readonly retry = output<void>();
}
