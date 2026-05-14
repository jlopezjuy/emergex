import { Component } from '@angular/core';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';

@Component({
  selector: 'app-hospitals',
  standalone: true,
  imports: [GlassCardComponent],
  template: `
    <div class="p-6 flex flex-col gap-4">
      <div>
        <h1 class="font-semibold text-lg" style="color: var(--text-primary);">Red Hospitalaria</h1>
        <p class="text-sm mt-0.5" style="color: var(--text-muted);">Centros de derivación y disponibilidad</p>
      </div>
      <emx-glass-card>
        <div class="flex flex-col items-center justify-center py-16 gap-3" style="color: var(--text-muted);">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="6" y="12" width="36" height="30" rx="2"/>
            <path d="M16 42V28h16v14M24 18v8M20 22h8"/>
            <path d="M16 12V8h16v4"/>
          </svg>
          <p class="text-sm font-medium">Módulo en desarrollo</p>
          <p class="text-xs text-center" style="max-width: 280px;">
            La red hospitalaria y disponibilidad de camas estará disponible próximamente.
          </p>
        </div>
      </emx-glass-card>
    </div>
  `,
})
export class HospitalsComponent {}
