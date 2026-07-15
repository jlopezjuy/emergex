import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { EmergencyApiService } from '../../../data-access/api/emergency.api';
import { EventsApiService } from '../../../data-access/api/events.api';
import { InstitutionsApiService } from '../../../data-access/api/institutions.api';
import { TicketAsistenciaDTO } from '../../../data-access/dto/ticket.dto';
import { EmergencyDetailComponent } from '../emergency-detail/emergency-detail.component';
import { AddAssistedPersonModalComponent } from './add-assisted-person-modal.component';

@Component({
  selector: 'app-coverage-operations',
  standalone: true,
  imports: [CommonModule, EmergencyDetailComponent, AddAssistedPersonModalComponent],
  template: `
    <div class="coverage-ops-layout">
      <!-- Header -->
      <div class="coverage-header">
        <button class="btn-back" (click)="goBack()">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M10 3L5 8l5 5"/>
          </svg>
          Volver
        </button>

        <div class="header-info">
          <span class="tipo-badge" [class.tipo-badge--evento]="tipo() === 'evento'">
            {{ tipo() === 'evento' ? 'EVENTO' : tipo() === 'contexto' ? 'ÁREA PROTEGIDA' : 'INSTITUCIÓN' }}
          </span>
          <h1 class="header-title">{{ headerNombre() || 'Cargando...' }}</h1>
          @if (headerDireccion()) {
            <p class="header-dir">{{ headerDireccion() }}</p>
          }
        </div>

        <div class="header-actions">
          <div class="roster-count">
            <span class="count-number">{{ roster().length }}</span>
            <span class="count-label">asistencias</span>
          </div>
          @if (allClosed()) {
            <button class="btn-finalizar" (click)="finalizarOperativo()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Finalizar operativo
            </button>
          }
        </div>
      </div>

      <!-- Body master-detail -->
      @if (loading()) {
        <div class="loading-overlay">
          <div class="spinner"></div>
          <p style="color: var(--text-muted); font-size: 13px;">Cargando operativo...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <p style="color: var(--accent-red);">{{ error() }}</p>
          <button class="btn-action" (click)="loadRoster()">Reintentar</button>
        </div>
      } @else {
        <div class="coverage-body">
          <!-- LEFT: Roster -->
          <div class="roster-panel">
            <div class="roster-toolbar">
              <button
                class="btn-action btn-action--primary"
                [disabled]="selectedTicketId() == null"
                [title]="selectedTicketId() == null ? 'Seleccioná primero la asistencia operativa' : 'Agregar otra persona al mismo operativo'"
                (click)="showAddPersonModal.set(true)"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M6 1v10M1 6h10"/>
                </svg>
                Agregar otra persona
              </button>
              <button class="btn-action" (click)="loadRoster()" title="Actualizar lista">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
                Actualizar
              </button>
            </div>

            @if (loadingRoster()) {
              <div class="roster-loading">
                <div class="spinner spinner--sm"></div>
                <span style="font-size: 12px; color: var(--text-muted);">Actualizando...</span>
              </div>
            } @else if (roster().length === 0) {
              <div class="roster-empty">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="var(--text-muted)" stroke-width="1.2">
                  <circle cx="16" cy="10" r="5"/>
                  <path d="M6 28c0-5.52 4.48-10 10-10s10 4.48 10 10"/>
                </svg>
                <p>Sin asistencias registradas.</p>
                <p style="font-size: 11px; color: var(--text-muted);">Agregá la primera persona al operativo.</p>
              </div>
            } @else {
              <div class="roster-list">
                @for (ticket of roster(); track ticket.id) {
                  <div
                    class="roster-item"
                    [class.roster-item--selected]="selectedTicketId() === ticket.id"
                    [class.roster-item--rojo]="ticket.nivelUrgencia === 'ROJO'"
                    [class.roster-item--amarillo]="ticket.nivelUrgencia === 'AMARILLO'"
                    (click)="selectTicket(ticket.id)"
                  >
                    <div class="item-urgencia-bar"></div>
                    <div class="item-content">
                      <div class="item-name">
                        {{ ticket.pacienteDescripcion ?? ticket.coberturaNombreSnapshot ?? 'Sin nombre' }}
                      </div>
                      <div class="item-meta">
                        <span class="urgencia-pill urgencia-pill--{{ (ticket.nivelUrgencia ?? 'VERDE').toLowerCase() }}">
                          {{ ticket.nivelUrgencia ?? 'VERDE' }}
                        </span>
                        <span class="estado-text">{{ ticket.estado }}</span>
                        @if (ticket.unidadAsignada) {
                          <span class="unidad-text">🚑 {{ ticket.unidadAsignada }}</span>
                        }
                      </div>
                      @if (ticket.codigo) {
                        <span class="item-code">{{ ticket.codigo }}</span>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- RIGHT: Panel clínico -->
          <div class="clinical-panel">
            @for (ticketId of selectedTicketIds(); track ticketId) {
              <app-emergency-detail [ticketId]="ticketId" (ticketClosed)="onTicketClosed()" />
            } @empty {
              <div class="empty-panel">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--text-muted)" stroke-width="1">
                  <rect x="8" y="12" width="32" height="28" rx="3"/>
                  <path d="M16 8h16v4H16z"/>
                  <path d="M18 24h12M18 30h8"/>
                </svg>
                <p>Seleccioná una persona del roster para ver su asistencia clínica.</p>
              </div>
            }
          </div>
        </div>
      }
    </div>

    <!-- Modal agregar persona -->
    @if (showAddPersonModal()) {
      <app-add-assisted-person-modal
        [tipo]="tipo()"
        [contextoId]="contextoId()"
        [institucionId]="headerInstitucionId()"
        [eventoLatitud]="headerLatitud()"
        [eventoLongitud]="headerLongitud()"
        [ticketId]="selectedTicketId() ?? undefined"
        [contextoDireccion]="tipo() === 'contexto' ? roster()[0]?.direccion : headerDireccion()"
        (added)="onPersonAdded()"
        (closed)="showAddPersonModal.set(false)"
      />
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      overflow: hidden;
    }

    .coverage-ops-layout {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--bg-deep);
    }

    /* ── Header ── */
    .coverage-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 20px;
      border-bottom: 1px solid var(--border-glass);
      background: var(--bg-elevated);
      flex-shrink: 0;
    }

    .btn-back {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 6px;
      border: 1px solid var(--border-glass);
      background: var(--surface-glass);
      color: var(--text-secondary);
      font-size: 13px;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.15s;
    }

    .btn-back:hover {
      background: var(--bg-card);
      color: var(--text-primary);
    }

    .header-info {
      flex: 1;
      min-width: 0;
    }

    .tipo-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.6px;
      background: rgba(59, 130, 246, 0.15);
      color: var(--accent-blue);
      border: 1px solid rgba(59, 130, 246, 0.25);
      margin-bottom: 4px;
    }

    .tipo-badge--evento {
      background: rgba(139, 92, 246, 0.15);
      color: #a78bfa;
      border-color: rgba(139, 92, 246, 0.25);
    }

    .header-title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .header-dir {
      margin: 2px 0 0;
      font-size: 12px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .roster-count {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex-shrink: 0;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .count-number {
      font-size: 24px;
      font-weight: 700;
      font-family: monospace;
      color: var(--text-primary);
      line-height: 1;
    }

    .count-label {
      font-size: 11px;
      color: var(--text-muted);
      letter-spacing: 0.3px;
    }

    .btn-finalizar {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 6px;
      border: 1px solid rgba(16, 185, 129, 0.4);
      background: rgba(16, 185, 129, 0.12);
      color: var(--accent-emerald);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-finalizar:hover {
      background: rgba(16, 185, 129, 0.22);
      border-color: rgba(16, 185, 129, 0.6);
    }

    /* ── Loading / error ── */
    .loading-overlay, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 12px;
    }

    .spinner {
      width: 28px;
      height: 28px;
      border: 2px solid var(--border-glass);
      border-top-color: var(--accent-cyan);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    .spinner--sm {
      width: 16px;
      height: 16px;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Body ── */
    .coverage-body {
      display: grid;
      grid-template-columns: 340px 1fr;
      flex: 1;
      overflow: hidden;
    }

    /* ── Roster panel ── */
    .roster-panel {
      display: flex;
      flex-direction: column;
      border-right: 1px solid var(--border-glass);
      overflow: hidden;
      background: var(--bg-elevated);
    }

    .roster-toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border-glass);
      flex-shrink: 0;
    }

    .btn-action {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid var(--border-glass);
      background: var(--surface-glass);
      color: var(--text-secondary);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-action:hover {
      background: var(--bg-card);
      color: var(--text-primary);
    }

    .btn-action--primary {
      flex: 1;
      justify-content: center;
      background: rgba(16, 185, 129, 0.12);
      color: var(--accent-emerald);
      border-color: rgba(16, 185, 129, 0.25);
    }

    .btn-action--primary:hover {
      background: rgba(16, 185, 129, 0.2);
    }

    .roster-loading {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 12px;
      flex-shrink: 0;
    }

    .roster-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 8px;
      padding: 32px 16px;
      color: var(--text-muted);
      font-size: 13px;
      text-align: center;
    }

    .roster-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .roster-item {
      display: flex;
      gap: 0;
      border-radius: 8px;
      border: 1px solid var(--border-glass);
      background: var(--surface-glass);
      cursor: pointer;
      transition: all 0.15s;
      overflow: hidden;
    }

    .roster-item:hover {
      background: var(--bg-card);
      border-color: rgba(148, 163, 184, 0.4);
    }

    .roster-item--selected {
      background: rgba(6, 182, 212, 0.08);
      border-color: rgba(6, 182, 212, 0.4);
    }

    .item-urgencia-bar {
      width: 3px;
      flex-shrink: 0;
      background: var(--accent-emerald);
    }

    .roster-item--rojo .item-urgencia-bar { background: var(--accent-red); }
    .roster-item--amarillo .item-urgencia-bar { background: var(--accent-amber); }

    .item-content {
      padding: 8px 10px;
      flex: 1;
      min-width: 0;
    }

    .item-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .item-meta {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 4px;
      flex-wrap: wrap;
    }

    .urgencia-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 4px;
      letter-spacing: 0.4px;
    }

    .urgencia-pill--rojo {
      background: rgba(239, 68, 68, 0.15);
      color: var(--accent-red);
    }

    .urgencia-pill--amarillo {
      background: rgba(245, 158, 11, 0.15);
      color: var(--accent-amber);
    }

    .urgencia-pill--verde {
      background: rgba(16, 185, 129, 0.15);
      color: var(--accent-emerald);
    }

    .urgencia-pill--azul {
      background: rgba(59, 130, 246, 0.15);
      color: var(--accent-blue);
    }

    .estado-text {
      font-size: 11px;
      color: var(--text-muted);
    }

    .unidad-text {
      font-size: 11px;
      color: var(--accent-emerald);
      font-family: monospace;
    }

    .item-code {
      display: block;
      font-size: 10px;
      font-family: monospace;
      color: var(--accent-cyan);
      margin-top: 2px;
    }

    /* ── Clinical panel ── */
    .clinical-panel {
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .clinical-panel app-emergency-detail {
      flex: 1;
      overflow: hidden;
    }

    .empty-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      gap: 16px;
      padding: 40px;
      color: var(--text-muted);
      font-size: 14px;
      text-align: center;
    }
  `],
})
export class CoverageOperationsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private emergencyApi = inject(EmergencyApiService);
  private eventsApi = inject(EventsApiService);
  private institutionsApi = inject(InstitutionsApiService);
  private destroyRef = inject(DestroyRef);

  readonly tipo = signal<'evento' | 'institucion' | 'contexto'>('evento');
  readonly contextoId = signal<number>(0);
  readonly roster = signal<TicketAsistenciaDTO[]>([]);
  readonly selectedTicketId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly loadingRoster = signal(false);
  readonly error = signal<string | null>(null);

  readonly headerNombre = signal<string>('');
  readonly headerDireccion = signal<string | undefined>(undefined);
  readonly headerLatitud = signal<number | undefined>(undefined);
  readonly headerLongitud = signal<number | undefined>(undefined);
  readonly headerInstitucionId = signal<number | undefined>(undefined);

  readonly showAddPersonModal = signal(false);

  // Used to force emergency-detail recreation when the selected ticket changes
  readonly selectedTicketIds = computed(() =>
    this.selectedTicketId() != null ? [this.selectedTicketId()!] : []
  );

  readonly TERMINAL_STATES = ['COMPLETADO', 'CANCELADO', 'CERRADO'];
  readonly allClosed = computed(() => {
    const r = this.roster();
    return r.length > 0 && r.every(t => this.TERMINAL_STATES.includes(t.estado ?? ''));
  });

  ngOnInit(): void {
    const tipo = this.route.snapshot.paramMap.get('tipo') as 'evento' | 'institucion' | 'contexto';
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.tipo.set(tipo);
    this.contextoId.set(id);

    const preselect = this.route.snapshot.queryParamMap.get('ticketId');
    this.loadContexto(tipo, id, preselect ? Number(preselect) : null);
  }

  private loadContexto(tipo: 'evento' | 'institucion' | 'contexto', id: number, preselectTicketId: number | null): void {
    this.loading.set(true);
    this.error.set(null);

    if (tipo === 'contexto') {
      // AREA_PROTEGIDA without resolved institucionId — load roster directly
      this.emergencyApi.getAsistenciasPorContexto(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: tickets => {
            const first = tickets[0];
            const nombre = first?.coberturaNombreSnapshot ?? `Operativo #${id}`;
            this.headerNombre.set(nombre);
            this.roster.set(tickets);
            this.loading.set(false);
            if (preselectTicketId != null) {
              const exists = tickets.some(t => t.id === preselectTicketId);
              this.selectedTicketId.set(exists ? preselectTicketId : (tickets[0]?.id ?? null));
            }
          },
          error: () => {
            this.error.set('Error al cargar el operativo. Verificá tu conexión e intentá de nuevo.');
            this.loading.set(false);
          },
        });
      return;
    }

    const headerObs =
      tipo === 'evento'
        ? this.eventsApi.getById(id)
        : this.institutionsApi.getById(id);

    const rosterObs =
      tipo === 'evento'
        ? this.emergencyApi.getAsistenciasPorEvento(id)
        : this.emergencyApi.getAsistenciasPorInstitucion(id);

    forkJoin({ header: headerObs, tickets: rosterObs })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ header, tickets }) => {
          if (tipo === 'evento') {
            const ev = header as import('../../../data-access/api/events.api').FrontendEvento;
            this.headerNombre.set(ev.name);
            this.headerDireccion.set(ev.address || undefined);
            this.headerInstitucionId.set(undefined);
          } else {
            const inst = header as import('../../../data-access/dto/institution.dto').InstitutionDTO;
            this.headerNombre.set(inst.name);
            this.headerDireccion.set(inst.address || undefined);
            this.headerLatitud.set(inst.lat);
            this.headerLongitud.set(inst.lng);
            this.headerInstitucionId.set(Number(inst.id));
          }

          this.roster.set(tickets);
          this.loading.set(false);

          if (preselectTicketId != null) {
            const exists = tickets.some(t => t.id === preselectTicketId);
            this.selectedTicketId.set(exists ? preselectTicketId : (tickets[0]?.id ?? null));
          } else if (tickets.length > 0) {
            this.selectedTicketId.set(null);
          }
        },
        error: () => {
          this.error.set('Error al cargar el operativo. Verificá tu conexión e intentá de nuevo.');
          this.loading.set(false);
        },
      });
  }

  loadRoster(): void {
    this.loadingRoster.set(true);
    const obs =
      this.tipo() === 'evento'
        ? this.emergencyApi.getAsistenciasPorEvento(this.contextoId())
        : this.tipo() === 'contexto'
          ? this.emergencyApi.getAsistenciasPorContexto(this.contextoId())
          : this.emergencyApi.getAsistenciasPorInstitucion(this.contextoId());

    obs.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: tickets => {
        this.roster.set(tickets);
        this.loadingRoster.set(false);
      },
      error: () => {
        this.loadingRoster.set(false);
      },
    });
  }

  selectTicket(id: number): void {
    this.selectedTicketId.set(id);
  }

  onPersonAdded(): void {
    this.showAddPersonModal.set(false);
    this.loadRoster();
    const ticketId = this.selectedTicketId();
    if (ticketId != null) {
      this.selectedTicketId.set(null);
      queueMicrotask(() => this.selectedTicketId.set(ticketId));
    }
  }

  onTicketClosed(): void {
    this.selectedTicketId.set(null);
    this.loadRoster();
  }

  finalizarOperativo(): void {
    if (this.tipo() === 'evento') {
      this.loading.set(true);
      this.eventsApi.cerrar(this.contextoId()).pipe(
        catchError((error) => {
          console.error('Error al finalizar el operativo:', error);
          const errorMsg = error?.error?.detail || error?.error?.message || error?.message || 'Error desconocido del servidor';
          alert(`Error al finalizar el operativo: ${errorMsg}`);
          this.loading.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      ).subscribe((res) => {
        if (res) {
          this.router.navigate(['/dashboard']);
        }
      });
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
