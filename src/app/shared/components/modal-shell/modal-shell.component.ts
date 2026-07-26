import { Component, input, output } from '@angular/core';

@Component({
  selector: 'emx-modal-shell',
  standalone: true,
  template: `
    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center"
      style="background: rgba(2,6,23,0.75); backdrop-filter: blur(4px);"
      (click)="onBackdropClick($event)"
    >
      <!-- Panel -->
      <div
        class="glass-strong rounded-card w-full max-h-[90vh] flex flex-col overflow-hidden"
        [class]="maxWidthClass()"
        style="min-width: 320px;"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b" style="border-color: var(--border-glass);">
          <h2 class="font-semibold text-sm uppercase tracking-wider" style="color: var(--text-primary);">
            {{ title() }}
          </h2>
          <button
            type="button"
            class="action-icon"
            title="Cerrar"
            (click)="closed.emit()"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 2l12 12M14 2L2 14"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <ng-content />
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t flex justify-end gap-2" style="border-color: var(--border-glass);">
          <ng-content select="[footer]" />
        </div>
      </div>
    </div>
  `,
})
export class ModalShellComponent {
  title = input('');
  closed = output<void>();
  closeOnBackdropClick = input(true);
  // Ancho del panel: por defecto se mantiene el angosto histórico (560px) para no afectar
  // a los modales existentes; los modales que necesiten más espacio (ej. formularios con
  // layout en columnas) pueden pasar clases responsivas propias, ej. 'max-w-[560px] lg:max-w-5xl'.
  maxWidthClass = input('max-w-[560px]');

  onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdropClick() && event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
