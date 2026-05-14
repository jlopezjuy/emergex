// BACKEND GAP: requires GET /api/hospitales/disponibles endpoint
import { Component } from '@angular/core';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';
import { StatusBadgeComponent, BadgeVariant } from '../../shared/components/status-badge/status-badge.component';

interface HospitalMock {
  id: number;
  nombre: string;
  distancia: string;
  camasDisponibles: number;
  especialidad: string;
  estado: 'available' | 'full' | 'alert';
}

const MOCK_HOSPITALS: HospitalMock[] = [
  {
    id: 1,
    nombre: 'Hospital General de Agudos',
    distancia: '2.4 km',
    camasDisponibles: 12,
    especialidad: 'Urgencias · Trauma · Cardiología',
    estado: 'available',
  },
  {
    id: 2,
    nombre: 'Clínica San Martín',
    distancia: '4.1 km',
    camasDisponibles: 3,
    especialidad: 'Urgencias · Neurología',
    estado: 'alert',
  },
  {
    id: 3,
    nombre: 'Hospital Pediátrico Central',
    distancia: '5.8 km',
    camasDisponibles: 0,
    especialidad: 'Pediatría · Neonatología',
    estado: 'full',
  },
  {
    id: 4,
    nombre: 'Instituto Cardiovascular del Sur',
    distancia: '7.2 km',
    camasDisponibles: 8,
    especialidad: 'Cardiología · Hemodinamia · UCI',
    estado: 'available',
  },
  {
    id: 5,
    nombre: 'Sanatorio Norte',
    distancia: '9.0 km',
    camasDisponibles: 0,
    especialidad: 'Cirugía · Traumatología',
    estado: 'full',
  },
];

@Component({
  selector: 'app-hospitals',
  standalone: true,
  imports: [GlassCardComponent, StatusBadgeComponent],
  template: `
    <div class="p-6 flex flex-col gap-6 h-full overflow-y-auto">
      <!-- Header -->
      <div>
        <h1 class="font-semibold text-lg" style="color: var(--text-primary);">Red Hospitalaria</h1>
        <p class="text-sm mt-0.5" style="color: var(--text-muted);">Centros de derivación y disponibilidad</p>
      </div>

      <!-- Integration gap notice -->
      <div
        class="flex items-center gap-3 px-4 py-3 rounded-lg text-sm"
        style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); color: var(--accent-amber);"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" class="flex-shrink-0">
          <path d="M8 2L1 14h14L8 2z"/>
          <path d="M8 7v3M8 11.5v.5"/>
        </svg>
        <span>
          <strong>Red hospitalaria — integración pendiente.</strong>
          Los datos mostrados son ilustrativos. Se requiere el endpoint
          <code class="font-mono text-xs px-1 py-0.5 rounded" style="background: rgba(245,158,11,0.15);">GET /api/hospitales/disponibles</code>
          para datos en tiempo real.
        </span>
      </div>

      <!-- Hospital cards -->
      <div class="flex flex-col gap-4">
        @for (h of hospitals; track h.id) {
          <emx-glass-card>
            <div class="flex items-start justify-between gap-4">
              <!-- Left: info -->
              <div class="flex-1">
                <div class="flex items-center gap-3 flex-wrap">
                  <h2 class="font-semibold text-sm" style="color: var(--text-primary);">{{ h.nombre }}</h2>
                  <emx-status-badge [variant]="statusVariant(h.estado)" />
                </div>
                <p class="text-xs mt-1" style="color: var(--text-muted);">{{ h.especialidad }}</p>
                <div class="flex items-center gap-4 mt-2">
                  <span class="text-xs font-mono" style="color: var(--text-secondary);">
                    <span style="color: var(--text-muted);">Distancia</span> {{ h.distancia }}
                  </span>
                  <span class="text-xs font-mono"
                    [style.color]="h.camasDisponibles === 0 ? 'var(--accent-red)' : h.camasDisponibles < 5 ? 'var(--accent-amber)' : 'var(--accent-emerald)'"
                  >
                    <span style="color: var(--text-muted);">Camas</span> {{ h.camasDisponibles }}
                  </span>
                </div>
              </div>

              <!-- Right: action -->
              <button
                type="button"
                class="btn btn--ghost btn--sm flex-shrink-0"
                disabled
                title="Funcionalidad próximamente"
                style="opacity: 0.45; cursor: not-allowed;"
              >
                Referir
              </button>
            </div>
          </emx-glass-card>
        }
      </div>
    </div>
  `,
})
export class HospitalsComponent {
  readonly hospitals = MOCK_HOSPITALS;

  statusVariant(estado: HospitalMock['estado']): BadgeVariant {
    if (estado === 'available') return 'stable';
    if (estado === 'alert') return 'urgent';
    return 'critical';
  }
}
