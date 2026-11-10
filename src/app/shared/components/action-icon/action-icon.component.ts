import { Component, input, output } from '@angular/core';

export type ActionIconVariant = 'danger' | 'info' | 'success' | 'default';

@Component({
  selector: 'emx-action-icon',
  standalone: true,
  template: `
    <button
      type="button"
      class="action-icon"
      [class]="variantClass()"
      [title]="title()"
      (click)="clicked.emit()"
    >
      <ng-content />
    </button>
  `,
})
export class ActionIconComponent {
  title = input('');
  variant = input<ActionIconVariant>('default');
  clicked = output<void>();

  variantClass() {
    const v = this.variant();
    return v !== 'default' ? `action-icon--${v}` : '';
  }
}
