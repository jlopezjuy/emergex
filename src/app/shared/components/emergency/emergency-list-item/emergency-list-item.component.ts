import { Component, input, output, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TicketAsistenciaDTO } from '../../../../data-access/dto/ticket.dto';
import { resolveOrigen } from '../../../../core/utils/ticket-origen.utils';
import { EmergencyPriorityBadgeComponent } from '../emergency-priority-badge/emergency-priority-badge.component';
import { EmergencySlaBarComponent } from '../emergency-sla-bar/emergency-sla-bar.component';

@Component({
  selector: 'emx-emergency-list-item',
  standalone: true,
  imports: [EmergencyPriorityBadgeComponent, EmergencySlaBarComponent],
  template: `
    <div
      class="emergency-card relative flex gap-3 p-3 rounded-panel cursor-pointer transition-all duration-150"
      [class.emergency-card--selected]="selected()"
      [style.--priority-color]="priorityColor()"
      [style.--priority-bg]="priorityTint()"
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
            <span
              class="urgency-dot"
              [style.background-color]="priorityColor()"
              [attr.aria-label]="'Nivel de urgencia ' + (emergency().nivelUrgencia ?? emergency().prioridad ?? 'sin definir')"
              [title]="emergency().nivelUrgencia ?? emergency().prioridad ?? 'Sin nivel de urgencia'"
            ></span>
            <emx-emergency-priority-badge [priority]="emergency().prioridad" />
            <span
              class="origin-chip"
              [class.origin-chip--institutional]="origin() === 'INSTITUCIONAL'"
            >{{ originLabel() }}</span>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <span class="status-chip">{{ emergency().estado ?? 'RECIBIDO' }}</span>
            <span class="font-mono text-xs" [style.color]="elapsedColor()">{{ elapsedStr() }}</span>
          </div>
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
          @if (coverageLabel()) {
            <div class="coverage-row">
              <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                <path d="M6 1.25 10 2.8v2.9c0 2.34-1.6 4.42-4 5.05-2.4-.63-4-2.71-4-5.05V2.8L6 1.25Z"/>
                <path d="m4.25 5.9 1.1 1.1 2.4-2.45"/>
              </svg>
              <span class="truncate">{{ coverageLabel() }}</span>
            </div>
          }
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
            @if (!emergency().ambulanciaId) {
              <button
                type="button"
                class="btn btn--sm"
                title="Asignar unidad"
                style="background: linear-gradient(135deg, var(--accent-purple, #a78bfa), #7c3aed); border-color: transparent; color: white;"
                (click)="$event.stopPropagation(); assign.emit(emergency())"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M6 1v10M1 6h10"/>
                </svg>
              </button>
            }
            <button
              type="button"
              class="btn btn--sm"
              title="Localizar"
              style="background: linear-gradient(135deg, var(--accent-blue), #1d4ed8); border-color: transparent; color: white;"
              (click)="$event.stopPropagation(); locate.emit(emergency())"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="6" cy="5" r="2.5"/>
                <path d="M6 1v1M6 9v1M1 5h1M10 5h1"/>
              </svg>
            </button>
            <button
              type="button"
              class="btn btn--sm"
              title="Llamar"
              style="background: linear-gradient(135deg, var(--accent-emerald), #047857); border-color: transparent; color: white;"
              (click)="$event.stopPropagation(); call.emit(emergency())"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M2 2.5c0 4.14 3.36 7.5 7.5 7.5.28 0 .5-.22.5-.5v-2a.5.5 0 00-.5-.5c-.8 0-1.57-.13-2.29-.36a.5.5 0 00-.51.12l-1.27 1.27a7.55 7.55 0 01-3.46-3.46l1.27-1.27a.5.5 0 00.12-.51C3.13 2.07 3 1.3 3 .5A.5.5 0 002.5 0h-2A.5.5 0 000 .5C0 2 .5 3.5 2 5"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Quick status actions -->
        @if (nextActionLabel() || canClose()) {
          <div class="flex items-center gap-1.5 pt-1.5" style="border-top: 1px solid var(--border-glass);">
            @if (nextActionLabel()) {
              <button
                type="button"
                class="btn btn--sm btn--primary"
                [style.background]="nextActionColor()"
                style="flex: 1; border-color: transparent;"
                (click)="onPrimaryAction($event)"
              >{{ nextActionLabel() }}</button>
            }
            @if (canClose()) {
              <button
                type="button"
                class="btn btn--sm"
                style="background: linear-gradient(135deg, var(--accent-amber), #b45309); border-color: transparent; color: white;"
                (click)="onCloseClick($event)"
              >Cerrar</button>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .emergency-card {
      background:
        linear-gradient(135deg, var(--priority-bg), transparent 46%),
        rgba(255, 255, 255, 0.56);
      border: 1px solid color-mix(in srgb, var(--priority-color) 44%, rgba(148, 163, 184, 0.28));
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
    }

    .emergency-card::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      pointer-events: none;
      border: 1px solid color-mix(in srgb, var(--priority-color) 22%, transparent);
      opacity: 0.75;
    }

    .emergency-card:hover,
    .emergency-card--selected {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, var(--priority-color) 42%, rgba(148, 163, 184, 0.28));
      box-shadow:
        0 14px 34px rgba(15, 23, 42, 0.11),
        0 0 0 3px color-mix(in srgb, var(--priority-color) 10%, transparent);
    }

    .origin-chip,
    .status-chip {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 9px;
      line-height: 1;
      letter-spacing: 0.06em;
      padding: 4px 5px;
      border-radius: 4px;
      color: var(--text-muted);
      background: color-mix(in srgb, var(--text-muted) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--text-muted) 18%, transparent);
      white-space: nowrap;
    }

    .urgency-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      flex: 0 0 auto;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--priority-color) 14%, transparent);
    }

    .origin-chip--institutional {
      color: #047857;
      background: rgba(16, 185, 129, 0.10);
      border-color: rgba(16, 185, 129, 0.30);
    }

    .status-chip {
      color: var(--text-secondary);
    }

    .coverage-row {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      color: #047857;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      letter-spacing: 0.02em;
    }

    .emergency-card--selected {
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--priority-color) 15%, transparent), transparent 52%),
        rgba(255, 255, 255, 0.72);
    }

    :host-context([data-theme="dark"]) .emergency-card {
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--priority-color) 13%, transparent), transparent 54%),
        rgba(15, 23, 42, 0.78);
      border-color: color-mix(in srgb, var(--priority-color) 24%, rgba(148, 163, 184, 0.16));
      box-shadow:
        0 16px 34px rgba(0, 0, 0, 0.34),
        inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    :host-context([data-theme="dark"]) .emergency-card--selected,
    :host-context([data-theme="dark"]) .emergency-card:hover {
      background:
        linear-gradient(135deg, color-mix(in srgb, var(--priority-color) 18%, transparent), transparent 58%),
        rgba(30, 41, 59, 0.86);
      box-shadow:
        0 20px 42px rgba(0, 0, 0, 0.42),
        0 0 0 3px color-mix(in srgb, var(--priority-color) 14%, transparent),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }
  `],
})
export class EmergencyListItemComponent {
  emergency = input.required<TicketAsistenciaDTO>();
  selected = input(false);

  assign = output<TicketAsistenciaDTO>();
  locate = output<TicketAsistenciaDTO>();
  call = output<TicketAsistenciaDTO>();
  enCamino = output<TicketAsistenciaDTO>();
  enSitio = output<TicketAsistenciaDTO>();

  private router = inject(Router);

  readonly origin = computed(() => resolveOrigen(this.emergency()));

  readonly originLabel = computed(() => {
    switch (this.origin()) {
      case 'INSTITUCIONAL': return 'INSTITUCIONAL';
      case 'INDIVIDUAL': return 'PERSONA';
      case 'EVENTO': return 'EVENTO';
      default: return 'PARTICULAR';
    }
  });

  readonly coverageLabel = computed(() => {
    const ticket = this.emergency();
    const context = ticket.contextoCobertura;
    return context?.institucionNombre ?? context?.areaProtegidaNombre ?? ticket.coberturaNombreSnapshot ?? null;
  });

  // ── Quick status actions (mirrors emergency-detail.component.ts action guards) ──
  readonly nextAction = computed<'DESPACHAR' | 'ASIGNAR_TRASLADO' | 'EN_CAMINO' | 'EN_SITIO' | null>(() => {
    const t = this.emergency();
    if (t.estado === 'HOSPITALIZACION_PENDIENTE') return 'ASIGNAR_TRASLADO';
    if (!t.ambulanciaId && (t.estado === 'RECIBIDO' || t.estado === 'EN_ESPERA')) return 'DESPACHAR';
    if (t.ambulanciaId && (t.estado === 'RECIBIDO' || t.estado === 'DESPACHADO')) return 'EN_CAMINO';
    if (t.ambulanciaId && t.estado === 'EN_CAMINO') return 'EN_SITIO';
    return null;
  });

  readonly nextActionLabel = computed((): string | null => {
    switch (this.nextAction()) {
      case 'DESPACHAR': return 'Despachar';
      case 'ASIGNAR_TRASLADO': return 'Asignar traslado';
      case 'EN_CAMINO': return 'En camino';
      case 'EN_SITIO': return 'En sitio';
      default: return null;
    }
  });

  readonly canClose = computed(() => {
    const estado = this.emergency().estado;
    return !!estado && estado !== 'CERRADO' && estado !== 'COMPLETADO' && estado !== 'CANCELADO';
  });

  readonly nextActionColor = computed((): string => {
    switch (this.nextAction()) {
      case 'DESPACHAR':
      case 'ASIGNAR_TRASLADO':
        return 'linear-gradient(135deg, var(--accent-blue), #1d4ed8)';
      case 'EN_CAMINO':
        return 'linear-gradient(135deg, var(--accent-cyan), #0e7490)';
      case 'EN_SITIO':
        return 'linear-gradient(135deg, var(--accent-emerald), #047857)';
      default:
        return 'linear-gradient(135deg, var(--accent-blue), #1d4ed8)';
    }
  });

  onPrimaryAction(event: Event): void {
    event.stopPropagation();
    const ticket = this.emergency();
    switch (this.nextAction()) {
      case 'DESPACHAR':
      case 'ASIGNAR_TRASLADO':
        this.assign.emit(ticket);
        break;
      case 'EN_CAMINO':
        this.enCamino.emit(ticket);
        break;
      case 'EN_SITIO':
        this.enSitio.emit(ticket);
        break;
    }
  }

  onCloseClick(event: Event): void {
    event.stopPropagation();
    this.openDetail('cerrar');
  }

  openDetail(accion?: 'cerrar'): void {
    const ticket = this.emergency();
    const origen = resolveOrigen(ticket);
    const ctx = ticket.contextoCobertura;
    const accionParams = accion ? { accion } : {};

    if (origen === 'EVENTO' && ctx?.eventoCoberturaId != null) {
      this.router.navigate(
        ['/dashboard/coverage/evento', ctx.eventoCoberturaId],
        { queryParams: { ticketId: ticket.id, ...accionParams } },
      );
    } else if (origen === 'INSTITUCIONAL' && ctx?.institucionId != null) {
      this.router.navigate(
        ['/dashboard/coverage/institucion', ctx.institucionId],
        { queryParams: { ticketId: ticket.id, ...accionParams } },
      );
    } else if (origen === 'INSTITUCIONAL' && ctx?.id != null) {
      // AREA_PROTEGIDA without resolved institucionId — group by contextoCoberturaId
      this.router.navigate(
        ['/dashboard/coverage/contexto', ctx.id],
        { queryParams: { ticketId: ticket.id, ...accionParams } },
      );
    } else {
      this.router.navigate(['/dashboard/emergency', ticket.id], { queryParams: accionParams });
    }
  }

  priorityColor = computed(() => {
    switch (this.emergency().nivelUrgencia) {
      case 'ROJO': return 'var(--accent-red)';
      case 'AMARILLO': return 'var(--accent-amber)';
      case 'VERDE': return 'var(--accent-emerald)';
      case 'AZUL': return 'var(--accent-blue)';
    }
    switch (this.emergency().prioridad) {
      case 'CRITICA': return 'var(--accent-red)';
      case 'URGENTE': return 'var(--accent-amber)';
      case 'NORMAL': return 'var(--accent-emerald)';
      default: return 'var(--text-muted)';
    }
  });

  priorityTint = computed(() => {
    switch (this.emergency().nivelUrgencia) {
      case 'ROJO': return 'rgba(239, 68, 68, 0.09)';
      case 'AMARILLO': return 'rgba(245, 158, 11, 0.11)';
      case 'VERDE': return 'rgba(16, 185, 129, 0.10)';
      case 'AZUL': return 'rgba(59, 130, 246, 0.10)';
    }
    switch (this.emergency().prioridad) {
      case 'CRITICA': return 'rgba(239, 68, 68, 0.09)';
      case 'URGENTE': return 'rgba(245, 158, 11, 0.11)';
      case 'NORMAL': return 'rgba(16, 185, 129, 0.10)';
      default: return 'rgba(100, 116, 139, 0.08)';
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
