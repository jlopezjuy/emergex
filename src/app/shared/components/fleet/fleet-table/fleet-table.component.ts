import { Component, input, output } from '@angular/core';
import { UnidadMovilDTO } from '../../../../data-access/dto/ambulancia.dto';
import { StatusBadgeComponent } from '../../status-badge/status-badge.component';
import { BadgeVariant } from '../../status-badge/status-badge.component';

@Component({
  selector: 'emx-fleet-table',
  standalone: true,
  imports: [StatusBadgeComponent],
  template: `
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-glass);">
            <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color: var(--text-muted);">ID</th>
            <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Tipo</th>
            <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Estado</th>
            <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Tripulación</th>
            <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Objetivo / ETA</th>
            <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Batería</th>
            <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Combust.</th>
            <th class="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          @for (unit of units(); track unit.id) {
            <tr
              class="transition-colors cursor-pointer"
              style="border-bottom: 1px solid var(--border-hairline);"
              [style.background]="hoveredId === unit.id ? 'rgba(255,255,255,0.03)' : 'transparent'"
              (mouseenter)="hoveredId = unit.id"
              (mouseleave)="hoveredId = null"
            >
              <td class="px-3 py-2.5">
                <span class="font-mono font-semibold" style="color: var(--accent-cyan);">{{ unit.identificador }}</span>
              </td>
              <td class="px-3 py-2.5">
                <span class="badge" [class]="unit.tipo === 'ALS' ? 'badge--info' : 'badge--stable'">
                  {{ unit.tipo }}
                </span>
              </td>
              <td class="px-3 py-2.5">
                <emx-status-badge [variant]="estadoVariant(unit.estado)">
                  {{ estadoLabel(unit.estado) }}
                </emx-status-badge>
              </td>
              <td class="px-3 py-2.5" style="color: var(--text-secondary);">{{ unit.tripulacion ?? '—' }}</td>
              <td class="px-3 py-2.5">
                <span class="font-mono" style="font-size: 11px; color: var(--text-muted);">
                  {{ unit.ticketActivo ? ('#' + unit.ticketActivo) : '—' }}
                  {{ unit.eta ? (' · ' + unit.eta + ' min') : '' }}
                </span>
              </td>
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-2">
                  <div class="w-16 h-1 rounded-pill overflow-hidden" style="background: rgba(255,255,255,0.08);">
                    <div
                      class="h-full rounded-pill"
                      [style.width.%]="unit.bateria ?? 0"
                      [style.background]="resourceColor(unit.bateria)"
                    ></div>
                  </div>
                  <span class="font-mono" style="color: var(--text-muted);">{{ unit.bateria ?? '?' }}%</span>
                </div>
              </td>
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-2">
                  <div class="w-16 h-1 rounded-pill overflow-hidden" style="background: rgba(255,255,255,0.08);">
                    <div
                      class="h-full rounded-pill"
                      [style.width.%]="unit.combustible ?? 0"
                      [style.background]="resourceColor(unit.combustible)"
                    ></div>
                  </div>
                  <span class="font-mono" style="color: var(--text-muted);">{{ unit.combustible ?? '?' }}%</span>
                </div>
              </td>
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-1">
                  <button type="button" class="btn btn--ghost btn--sm" title="Configurar" (click)="configUnit.emit(unit)"
                    style="width:28px;height:28px;padding:0;display:flex;align-items:center;justify-content:center;">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5">
                      <circle cx="6.5" cy="6.5" r="2"/>
                      <path d="M6.5 1v1.2M6.5 10.8V12M1 6.5h1.2M10.8 6.5H12M2.7 2.7l.85.85M9.45 9.45l.85.85M9.45 3.55l-.85.85M3.55 9.45l-.85.85"/>
                    </svg>
                  </button>
                  <button type="button" class="btn btn--primary btn--sm" title="Despachar" (click)="viewUnit.emit(unit)"
                    style="width:28px;height:28px;padding:0;display:flex;align-items:center;justify-content:center;">
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.5">
                      <path d="M2 6.5h9M7.5 3l4 3.5-4 3.5"/>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class FleetTableComponent {
  units = input<UnidadMovilDTO[]>([]);
  viewUnit = output<UnidadMovilDTO>();
  configUnit = output<UnidadMovilDTO>();

  hoveredId: number | null = null;

  estadoVariant(estado?: string): BadgeVariant {
    switch (estado) {
      case 'DISPONIBLE': return 'stable';
      case 'EN_RUTA': return 'info';
      case 'EN_SITIO': return 'urgent';
      case 'TRASLADO': return 'cyan';
      case 'MANTENIMIENTO': return 'critical';
      default: return 'info';
    }
  }

  estadoLabel(estado?: string): string {
    switch (estado) {
      case 'DISPONIBLE': return 'Disponible';
      case 'EN_RUTA': return 'En ruta';
      case 'EN_SITIO': return 'En sitio';
      case 'TRASLADO': return 'Traslado';
      case 'MANTENIMIENTO': return 'Mantenim.';
      default: return '—';
    }
  }

  resourceColor(pct?: number): string {
    if (!pct) return '#64748B';
    if (pct < 20) return '#EF4444';
    if (pct < 40) return '#F59E0B';
    return '#10B981';
  }
}
