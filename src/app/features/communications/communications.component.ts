import { Component } from '@angular/core';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';

@Component({
  selector: 'app-communications',
  standalone: true,
  imports: [GlassCardComponent],
  template: `
    <div class="p-6 flex flex-col gap-4">
      <div>
        <h1 class="font-semibold text-lg" style="color: var(--text-primary);">Comunicaciones</h1>
        <p class="text-sm mt-0.5" style="color: var(--text-muted);">Canal de radio y mensajería operativa</p>
      </div>
      <emx-glass-card>
        <div class="flex flex-col items-center justify-center py-16 gap-3" style="color: var(--text-muted);">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M6 36c0-9.94 8.06-18 18-18m0 0c9.94 0 18 8.06 18 18"/>
            <path d="M12 36a12 12 0 0112-12m0 0a12 12 0 0112 12"/>
            <circle cx="24" cy="36" r="3"/>
          </svg>
          <p class="text-sm font-medium">Módulo en desarrollo</p>
          <p class="text-xs text-center" style="max-width: 280px;">
            El sistema de comunicaciones por radio estará disponible próximamente.
          </p>
        </div>
      </emx-glass-card>
    </div>
  `,
})
export class CommunicationsComponent {}
