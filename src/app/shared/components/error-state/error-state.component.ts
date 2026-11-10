import { Component, input, output } from '@angular/core';

@Component({
  selector: 'emx-error-state',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center gap-3 py-10" style="color: var(--accent-red);">
      <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="18" cy="18" r="14"/>
        <path d="M18 10v8M18 22h.01"/>
      </svg>
      <span class="text-sm font-medium" style="color: var(--text-secondary);">{{ message() }}</span>
      <button type="button" class="btn btn--ghost btn--sm" (click)="retry.emit()">
        Reintentar
      </button>
    </div>
  `,
})
export class ErrorStateComponent {
  message = input('Error al cargar los datos');
  retry = output<void>();
}
