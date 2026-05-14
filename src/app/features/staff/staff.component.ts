import { Component } from '@angular/core';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [GlassCardComponent],
  template: `
    <div class="p-6 flex flex-col gap-4">
      <div>
        <h1 class="font-semibold text-lg" style="color: var(--text-primary);">Personal Operativo</h1>
        <p class="text-sm mt-0.5" style="color: var(--text-muted);">Gestión de profesionales y turnos</p>
      </div>
      <emx-glass-card>
        <div class="flex flex-col items-center justify-center py-16 gap-3" style="color: var(--text-muted);">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="24" cy="16" r="8"/>
            <path d="M8 40c0-8.84 7.16-16 16-16s16 7.16 16 16"/>
          </svg>
          <p class="text-sm font-medium">Módulo en desarrollo</p>
          <p class="text-xs text-center" style="max-width: 280px;">
            La gestión de personal operativo estará disponible próximamente.
          </p>
        </div>
      </emx-glass-card>
    </div>
  `,
})
export class StaffComponent {}
