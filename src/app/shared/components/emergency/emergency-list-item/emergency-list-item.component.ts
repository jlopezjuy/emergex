import { Component, input, output, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TicketAsistenciaDTO } from '../../../../data-access/dto/ticket.dto';
import { EmergencyPriorityBadgeComponent } from '../emergency-priority-badge/emergency-priority-badge.component';
import { EmergencySlaBarComponent } from '../emergency-sla-bar/emergency-sla-bar.component';

@Component({
  selector: 'emx-emergency-list-item',
  standalone: true,
  imports: [EmergencyPriorityBadgeComponent, EmergencySlaBarComponent],
  template: `
    <div
      class="relative flex gap-3 p-3 rounded-panel cursor-pointer transition-all duration-150"
      [style.background]="selected() ? 'rgba(59,130,246,0.08)' : 'transparent'"
      [style.border]="selected() ? '1px solid rgba(59,130,246,0.25)' : '1px solid transparent'"
      (click)="openDetail()"
    >
      <!-- Priority band -->
      <div
        class="flex-shrink-0 w-0.5 rounded-full self-stretch"
        [style.background-color]="priorityColor()"
        [style.box-shadow]="emergency().prioridad === 'CRITICA' ? '0 0 8px ' + priorityColor() : 'none'"
      ></div>

      <div class="flex-1 min-w-0 flex flex-col gap-1.5">
        <!-- Header row -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <span class="font-mono text-xs font-semibold" style="color: var(--accent-cyan);">
              {{ emergency().codigo ?? 'E-????' }}
            </span>
            <emx-emergency-priority-badge [priority]="emergency().prioridad" />
          </div>
          <span
            class="font-mono text-xs flex-shrink-0"
            [style.color]="elapsedColor()"
          >{{ elapsedStr() }}</span>
        </div>

        <!-- Type + address -->
        <div class="flex flex-col gap-0.5">
          <span class="text-xs font-semibold truncate" style="color: var(--text-primary);">
            {{ emergency().tipoEmergencia ?? 'Sin tipo' }}
          </span>
          <div class="flex items-center gap-1">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" style="color: var(--text-muted); flex-shrink: 0;">
              <path d="M5 0C3.07 0 1.5 1.57 1.5 3.5 1.5 6.12 5 10 5 10s3.5-3.88 3.5-6.5C8.5 1.57 6.93 0 5 0zm0 4.75a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5z"/>
            </svg>
            <span class="text-xs truncate" style="color: var(--text-muted);">
              {{ emergency().direccion ?? '—' }}
            </span>
          </div>
        </div>

        <!-- SLA bar -->
        <emx-emergency-sla-bar
          [elapsed]="emergency().elapsedSeconds ?? 0"
          [sla]="emergency().slaSeg ?? 600"
        />

        <!-- Footer -->
        <div class="flex items-center justify-between gap-2 pt-0.5">
          <div class="flex flex-col gap-0.5">
            @if (emergency().pacienteDescripcion) {
              <span class="text-xs truncate" style="color: var(--text-secondary);">
                {{ emergency().pacienteDescripcion }}
              </span>
            }
            @if (emergency().unidadAsignada) {
              <span class="font-mono text-xs" style="color: var(--accent-emerald);">
                {{ emergency().unidadAsignada }}
              </span>
            } @else {
              <span class="font-mono text-xs" style="color: var(--text-muted);">Sin unidad</span>
            }
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              class="btn btn--sm btn--ghost"
              title="Asignar unidad"
              (click)="$event.stopPropagation(); assign.emit(emergency())"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M6 1v10M1 6h10"/>
              </svg>
            </button>
            <button
              type="button"
              class="btn btn--sm btn--ghost"
              title="Localizar"
              (click)="$event.stopPropagation(); locate.emit(emergency())"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="6" cy="5" r="2.5"/>
                <path d="M6 1v1M6 9v1M1 5h1M10 5h1"/>
              </svg>
            </button>
            <button
              type="button"
              class="btn btn--sm btn--ghost"
              title="Llamar"
              (click)="$event.stopPropagation(); call.emit(emergency())"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M2 2.5c0 4.14 3.36 7.5 7.5 7.5.28 0 .5-.22.5-.5v-2a.5.5 0 00-.5-.5c-.8 0-1.57-.13-2.29-.36a.5.5 0 00-.51.12l-1.27 1.27a7.55 7.55 0 01-3.46-3.46l1.27-1.27a.5.5 0 00.12-.51C3.13 2.07 3 1.3 3 .5A.5.5 0 002.5 0h-2A.5.5 0 000 .5C0 2 .5 3.5 2 5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class EmergencyListItemComponent {
  emergency = input.required<TicketAsistenciaDTO>();
  selected = input(false);

  assign = output<TicketAsistenciaDTO>();
  locate = output<TicketAsistenciaDTO>();
  call = output<TicketAsistenciaDTO>();

  private router = inject(Router);

  openDetail(): void {
    this.router.navigate(['/dashboard/emergency', this.emergency().id]);
  }

  priorityColor = computed(() => {
    switch (this.emergency().prioridad) {
      case 'CRITICA': return 'var(--accent-red)';
      case 'URGENTE': return 'var(--accent-amber)';
      case 'NORMAL': return 'var(--accent-emerald)';
      default: return 'var(--text-muted)';
    }
  });

  elapsedStr = computed(() => {
    const s = this.emergency().elapsedSeconds ?? 0;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  });

  elapsedColor = computed(() => {
    const e = this.emergency().elapsedSeconds ?? 0;
    const sla = this.emergency().slaSeg ?? 600;
    const ratio = sla > 0 ? e / sla : 0;
    if (ratio >= 0.8) return 'var(--accent-red)';
    if (ratio >= 0.6) return 'var(--accent-amber)';
    return 'var(--text-muted)';
  });
}
