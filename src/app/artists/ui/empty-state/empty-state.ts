import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Message shown instead of the table when there are no rows to display. */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty" role="status">
      <h2>{{ heading() }}</h2>
      <p>{{ message() }}</p>
    </div>
  `,
  styles: `
    .empty {
      padding: 32px 20px;
      text-align: center;
      border: 1px dashed var(--mat-sys-outline-variant);
      border-radius: 12px;
      color: var(--mat-sys-on-surface-variant);
    }
    h2 {
      margin: 0 0 8px;
      font: var(--mat-sys-title-medium);
      color: var(--mat-sys-on-surface);
    }
    p {
      margin: 0;
    }
  `,
})
export class EmptyState {
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
}
