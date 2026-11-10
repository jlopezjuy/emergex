import { Component } from '@angular/core';

@Component({
  selector: 'emx-loading-state',
  standalone: true,
  template: `
    <div class="flex flex-col gap-3 p-4 animate-pulse">
      @for (item of rows; track item) {
        <div class="rounded-panel h-16" style="background: var(--surface-glass);"></div>
      }
    </div>
  `,
})
export class LoadingStateComponent {
  readonly rows = [1, 2, 3];
}
