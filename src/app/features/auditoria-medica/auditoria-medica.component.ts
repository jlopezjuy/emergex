import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuditoriaMedicaApiService, TicketAuditDTO } from '../../data-access/api/auditoria-medica.api';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-auditoria-medica',
  standalone: true,
  imports: [CommonModule, DatePipe, StatusBadgeComponent],
  template: `
    <div class="h-full flex flex-col overflow-hidden">
      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <div class="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div
            style="width:36px;height:36px;border-radius:10px;background:rgba(6,182,212,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </div>
          <div>
            <h1 class="font-semibold text-lg" style="color:var(--text-primary);">Auditoría Médica</h1>
            <p class="text-xs mt-0.5 font-mono" style="color:var(--text-muted);">REVISIÓN Y CONTROL DE TICKETS</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div
            class="flex items-center gap-4 px-4 py-2 rounded-lg"
            style="background:var(--surface-glass);border:1px solid var(--border-glass);"
          >
            <div class="text-center">
              <div class="font-mono text-xs uppercase tracking-wider mb-0.5" style="color:var(--text-muted);">Pendientes</div>
              <div class="font-mono font-bold text-lg leading-none" style="color:var(--accent-cyan);">{{ pendientesTotales() }}</div>
            </div>
            <div class="text-center">
              <div class="font-mono text-xs uppercase tracking-wider mb-0.5" style="color:var(--text-muted);">Aprobados</div>
              <div class="font-mono font-bold text-lg leading-none" style="color:#22c55e;">{{ aprobadosHoy() }}</div>
            </div>
            <div class="text-center">
              <div class="font-mono text-xs uppercase tracking-wider mb-0.5" style="color:var(--text-muted);">Observados</div>
              <div class="font-mono font-bold text-lg leading-none" style="color:var(--accent-amber, #f59e0b);">{{ observadosHoy() }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Body ───────────────────────────────────────────────────────── -->
      <div class="flex-1 overflow-hidden px-4 pb-4 min-h-0">
        <div
          class="h-full flex flex-col rounded-xl overflow-hidden"
          style="background:var(--surface-glass);border:1px solid var(--border-glass);backdrop-filter:blur(12px);"
        >
          <!-- Toolbar -->
          <div
            class="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style="border-bottom:1px solid var(--border-glass);"
          >
            <div class="relative" style="flex:1;max-width:320px;">
              <svg
                class="absolute"
                style="left:9px;top:50%;transform:translateY(-50%);"
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
                stroke="var(--text-muted)"
                stroke-width="1.5"
              >
                <circle cx="5.5" cy="5.5" r="4"/><path d="M9 9l3 3"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar por paciente o N° de ticket..."
                [value]="searchQuery()"
                (input)="searchQuery.set($any($event.target).value)"
                style="width:100%;padding:6px 10px 6px 28px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:12px;outline:none;"
              />
            </div>
            <div class="flex-1"></div>
            <button type="button" class="btn btn--secondary btn--sm" (click)="loadTickets()">
              ↻ Actualizar
            </button>
          </div>

          <!-- List body -->
          <div class="flex-1 overflow-y-auto">
            @if (loading()) {
              <div class="flex flex-col items-center justify-center py-16" style="color:var(--text-muted);">
                <span class="ac-spinner"></span>
                <span style="font-size:13px;margin-top:10px;">Cargando tickets...</span>
              </div>
            } @else if (error()) {
              <div class="flex flex-col items-center justify-center py-16" style="color:var(--accent-red); gap:8px;">
                <span style="font-size:13px;font-weight:600;">Error al cargar tickets pendientes</span>
                <button type="button" class="btn btn--secondary btn--sm" (click)="loadTickets()">Reintentar</button>
              </div>
            } @else {
              @for (ticket of filteredTickets(); track ticket.id) {
                <button
                  type="button"
                  class="w-full text-left flex items-center gap-3 px-4 py-3 transition-colors"
                  style="border-bottom:1px solid var(--border-hairline);background:transparent;border-left:none;border-right:none;border-top:none;cursor:pointer;"
                  (click)="openDetail(ticket)"
                >
                  <div
                    style="width:4px;align-self:stretch;border-radius:2px;flex-shrink:0;background:var(--accent-cyan);"
                  ></div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="font-mono font-bold" style="font-size:13px;color:var(--accent-cyan);">{{ ticket.numero ?? '#' + ticket.id }}</span>
                      <span class="font-semibold truncate" style="font-size:13.5px;color:var(--text-primary);">{{ ticket.pacienteNombre || 'Paciente No Identificado' }}</span>
                      @if (ticket.pacienteDni) {
                        <span class="font-mono" style="font-size:11px;color:var(--text-muted);">DNI {{ ticket.pacienteDni }}</span>
                      }
                    </div>
                    <div class="flex items-center gap-2 mt-0.5">
                      <span style="font-size:12px;color:var(--text-secondary);">{{ ticket.fechaCompletado | date:'dd/MM/yyyy HH:mm' }}</span>
                      @if (ticket.tipoAsistencia) {
                        <span style="font-size:11px;color:var(--text-muted);">· {{ ticket.tipoAsistencia }}</span>
                      }
                    </div>
                  </div>
                  <div class="flex items-center gap-3 flex-shrink-0">
                    @if (ticket.nivelUrgencia) {
                      <span class="font-mono font-bold" style="font-size:11px;padding:2px 6px;border-radius:4px;background:rgba(239,68,68,0.1);color:var(--accent-red);">{{ ticket.nivelUrgencia }}</span>
                    }
                    <emx-status-badge variant="info">PENDIENTE</emx-status-badge>
                  </div>
                </button>
              }

              @if (filteredTickets().length === 0) {
                <div class="flex flex-col items-center justify-center py-16" style="color:var(--text-muted);">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="margin-bottom:10px;opacity:0.4;">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span style="font-size:13px;">No hay tickets pendientes de auditoría</span>
                </div>
              }
            }
          </div>
        </div>
      </div>

      <!-- ── Modal de detalle ───────────────────────────────────────────── -->
      @if (selected(); as ticket) {
        <div
          style="position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000;"
          (click)="selected.set(null)"
        >
          <div
            style="width:min(600px,92vw);max-height:90vh;background:var(--surface-glass);border:1px solid var(--border-glass);border-radius:16px;backdrop-filter:blur(20px);display:flex;flex-direction:column;overflow:hidden;"
            (click)="$event.stopPropagation()"
          >
            <!-- Head -->
            <div style="padding:18px 20px 14px;border-bottom:1px solid var(--border-glass);">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-mono uppercase tracking-wider mb-1" style="font-size:10px;color:var(--accent-cyan);">
                    ● AUDITORÍA DE TICKET
                  </div>
                  <h2 style="font-size:17px;font-weight:700;color:var(--text-primary);margin:0 0 2px;">
                    {{ ticket.numero ?? '#' + ticket.id }} - {{ ticket.pacienteNombre || 'Paciente No Identificado' }}
                  </h2>
                  <div style="font-size:13px;color:var(--text-secondary);">
                    {{ ticket.tipoAsistencia || 'Sin tipo' }}
                  </div>
                </div>
                <button
                  type="button"
                  style="width:28px;height:28px;border-radius:6px;border:1px solid var(--border-glass);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted);flex-shrink:0;"
                  (click)="selected.set(null)"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l10 10M11 1L1 11"/></svg>
                </button>
              </div>
            </div>

            <!-- Datos del ticket -->
            <div style="flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:16px;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                  <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">DNI</div>
                  <div style="font-size:13px;color:var(--text-primary);">{{ ticket.pacienteDni || '—' }}</div>
                </div>
                <div>
                  <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">Nivel de Urgencia</div>
                  <div style="font-size:13px;color:var(--accent-red);font-weight:600;">{{ ticket.nivelUrgencia || '—' }}</div>
                </div>
                <div>
                  <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">Fecha Completado</div>
                  <div style="font-size:13px;color:var(--text-primary);">{{ ticket.fechaCompletado | date:'dd/MM/yyyy HH:mm' }}</div>
                </div>
                <div>
                  <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">Dirección</div>
                  <div style="font-size:13px;color:var(--text-primary);">{{ ticket.direccion || '—' }}</div>
                </div>
              </div>

              @if (ticket.diagnosticoCie10) {
                <div style="padding:12px;border-radius:8px;background:rgba(6,182,212,0.05);border:1px solid var(--border-glass);">
                  <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">Diagnóstico CIE-10</div>
                  <div style="font-size:13px;color:var(--text-primary);">{{ ticket.diagnosticoCie10 }}</div>
                </div>
              }

              @if (ticket.observaciones) {
                <div>
                  <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">Síntomas / Observaciones del Ticket</div>
                  <div style="font-size:13px;color:var(--text-primary);padding:12px;border-radius:8px;background:var(--bg-elevated);border:1px solid var(--border-glass);white-space:pre-wrap;">{{ ticket.observaciones }}</div>
                </div>
              }

              <!-- Sección de Observación Auditoría -->
              @if (showObservarInput()) {
                <div style="margin-top:8px;padding-top:16px;border-top:1px dashed var(--border-glass);">
                  <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.04em;">Motivo de la Observación *</label>
                  <textarea
                    placeholder="Indique qué falta o qué es incorrecto..."
                    rows="3"
                    [value]="motivoInput()"
                    (input)="motivoInput.set($any($event.target).value)"
                    style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:13px;outline:none;resize:vertical;box-sizing:border-box;"
                  ></textarea>
                </div>
              }
            </div>

            <!-- Footer -->
            <div style="padding:12px 20px;border-top:1px solid var(--border-glass);display:flex;align-items:center;justify-content:space-between;background:var(--bg-elevated);">
              <span class="font-mono" style="font-size:10px;color:var(--text-muted);">
                @if (processing()) { Guardando... }
              </span>
              <div class="flex gap-2">
                @if (showObservarInput()) {
                  <button type="button" class="btn btn--ghost btn--sm" [disabled]="processing()" (click)="showObservarInput.set(false)">Cancelar</button>
                  <button type="button" class="btn btn--danger btn--sm" [disabled]="!motivoInput().trim() || processing()" (click)="confirmarObservacion(ticket.id)">Confirmar Observación</button>
                } @else {
                  <button type="button" class="btn btn--secondary btn--sm" [disabled]="processing()" style="color:var(--accent-amber);" (click)="showObservarInput.set(true)">Observar</button>
                  <button type="button" class="btn btn--primary btn--sm" [disabled]="processing()" style="background:#22c55e;border-color:#22c55e;" (click)="aprobarTicket(ticket.id)">Aprobar</button>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AuditoriaMedicaComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private auditoriaApi = inject(AuditoriaMedicaApiService);

  readonly tickets = signal<TicketAuditDTO[]>([]);
  readonly searchQuery = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly selected = signal<TicketAuditDTO | null>(null);
  readonly showObservarInput = signal(false);
  readonly motivoInput = signal('');
  readonly processing = signal(false);

  // Counters locales
  readonly aprobadosHoy = signal(0);
  readonly observadosHoy = signal(0);
  
  readonly pendientesTotales = computed(() => this.filteredTickets().length);

  readonly filteredTickets = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.tickets();
    return this.tickets().filter(t => 
      (t.numero ?? '').toLowerCase().includes(q) ||
      (t.pacienteNombre ?? '').toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.loadTickets();
  }

  loadTickets(): void {
    this.loading.set(true);
    this.error.set(null);
    this.auditoriaApi
      .pendientes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.tickets.set(list || []);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar la lista de tickets.');
          this.loading.set(false);
        },
      });
  }

  openDetail(ticket: TicketAuditDTO): void {
    this.selected.set(ticket);
    this.showObservarInput.set(false);
    this.motivoInput.set('');
  }

  aprobarTicket(ticketId: number): void {
    if (this.processing()) return;
    this.processing.set(true);
    this.auditoriaApi
      .aprobar(ticketId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.aprobadosHoy.update(v => v + 1);
          this.processing.set(false);
          this.selected.set(null);
          this.loadTickets();
        },
        error: err => {
          this.processing.set(false);
          const msg = err?.error?.detail || err?.error?.message || err?.message || 'Error al aprobar.';
          alert(msg);
        }
      });
  }

  confirmarObservacion(ticketId: number): void {
    const motivo = this.motivoInput().trim();
    if (!motivo || this.processing()) return;
    this.processing.set(true);
    this.auditoriaApi
      .observar(ticketId, motivo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.observadosHoy.update(v => v + 1);
          this.processing.set(false);
          this.selected.set(null);
          this.loadTickets();
        },
        error: err => {
          this.processing.set(false);
          const msg = err?.error?.detail || err?.error?.message || err?.message || 'Error al observar.';
          alert(msg);
        }
      });
  }
}
