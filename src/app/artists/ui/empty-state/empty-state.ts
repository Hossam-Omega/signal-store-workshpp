import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Message shown instead of the table when there are no rows to display. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
}
