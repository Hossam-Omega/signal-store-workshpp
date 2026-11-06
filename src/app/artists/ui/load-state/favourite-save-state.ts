import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

/** Feedback for add/remove favourite requests. */
@Component({
  selector: 'app-favourite-save-state',
  imports: [MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './favourite-save-state.html',
  styleUrl: './status-panel.scss',
})
export class FavouriteSaveState {
  readonly isSaving = input.required<boolean>();
  readonly error = input<string | null>(null);
}
