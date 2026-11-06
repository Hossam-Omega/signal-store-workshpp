import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

/** Feedback for add/remove favourite requests. */
@Component({
  selector: 'app-favourite-save-state',
  imports: [MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div role="status" class="saving-slot">
      @if (isSaving()) {
        <mat-progress-bar mode="indeterminate" aria-label="Saving favourite" />
        <span class="visually-hidden">Saving favourite…</span>
      }
    </div>
    @if (error(); as message) {
      <div class="panel error compact" role="alert" data-testid="mutation-error">
        <strong>Favourite not saved.</strong> {{ message }}
      </div>
    }
  `,
  styleUrl: './status-panel.scss',
})
export class FavouriteSaveState {
  readonly isSaving = input.required<boolean>();
  readonly error = input<string | null>(null);
}
