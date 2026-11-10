import { Component, input } from '@angular/core';

@Component({
  selector: 'emx-empty-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center gap-3 py-12" style="color: var(--text-muted);">
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="20" cy="20" r="16"/>
        <path d="M20 12v8M20 26h.01"/>
      </svg>
      <span class="text-sm font-medium">{{ message() }}</span>
    </div>
  `,
})
export class EmptyStateComponent {
  message = input('Sin datos disponibles');
}
