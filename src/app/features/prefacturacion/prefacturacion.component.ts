import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent, BadgeVariant } from '../../shared/components/status-badge/status-badge.component';
import { PrefacturacionApiService, LotePrefacturacionDTO, TicketPendienteTarifacionDTO } from '../../data-access/api/prefacturacion.api';
import { UserFeedbackService } from '../../core/notifications/user-feedback.service';

@Component({
  selector: 'app-prefacturacion',
  standalone: true,
  imports: [CommonModule, DatePipe, StatusBadgeComponent, FormsModule],
  template: `
    <div class="h-full flex flex-col overflow-hidden">
      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <div class="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div
            style="width:36px;height:36px;border-radius:10px;background:rgba(6,182,212,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </div>
          <div>
            <h1 class="font-semibold text-lg" style="color:var(--text-primary);">Prefacturación</h1>
            <p class="text-xs mt-0.5 font-mono" style="color:var(--text-muted);">GESTIÓN DE LOTES Y TARIFACIÓN</p>
          </div>
        </div>

        <!-- Pestañas de navegación -->
        <div class="flex items-center gap-2 rounded-xl p-1" style="background:var(--surface-glass);border:1px solid var(--border-glass);">
          <button
            type="button"
            class="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
            [style.background]="activeTab() === 'lotes' ? 'var(--accent-cyan)' : 'transparent'"
            [style.color]="activeTab() === 'lotes' ? '#000' : 'var(--text-muted)'"
            (click)="activeTab.set('lotes')"
          >
            Lotes ({{ lotesTotales() }})
          </button>
          <button
            type="button"
            class="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
            [style.background]="activeTab() === 'pendientes' ? 'var(--accent-amber, #f59e0b)' : 'transparent'"
            [style.color]="activeTab() === 'pendientes' ? '#000' : 'var(--text-muted)'"
            (click)="setTabPendientes()"
          >
            Pendientes de Tarifación
            @if (pendientes().length > 0) {
              <span class="px-1.5 py-0.2 rounded-full text-[10px] font-bold" style="background:rgba(0,0,0,0.3);color:#fff;">
                {{ pendientes().length }}
              </span>
            }
          </button>
        </div>

        <div class="flex items-center gap-3">
          @if (activeTab() === 'lotes') {
            <button type="button" class="btn btn--primary" (click)="openCreateModal()">
              + Nuevo Lote
            </button>
          } @else {
            <button type="button" class="btn btn--secondary btn--sm" (click)="loadPendientes()">
              ↻ Actualizar
            </button>
          }
        </div>
      </div>

      <!-- ── Body ───────────────────────────────────────────────────────── -->
      @if (activeTab() === 'lotes') {
        <div class="flex-1 overflow-hidden px-4 pb-4 min-h-0 flex gap-4">
          <!-- Lista de Lotes -->
          <div
            class="h-full flex flex-col rounded-xl overflow-hidden w-1/3 min-w-[350px]"
            style="background:var(--surface-glass);border:1px solid var(--border-glass);backdrop-filter:blur(12px);"
          >
            <div
              class="flex items-center gap-3 px-4 py-3 flex-shrink-0"
              style="border-bottom:1px solid var(--border-glass);"
            >
              <div class="relative" style="flex:1;">
                <input
                  type="text"
                  placeholder="Buscar lote..."
                  [value]="searchQuery()"
                  (input)="searchQuery.set($any($event.target).value)"
                  style="width:100%;padding:6px 10px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:12px;outline:none;"
                />
              </div>
              <button type="button" class="btn btn--secondary btn--sm" (click)="loadLotes()">
                ↻
              </button>
            </div>

            <div class="flex-1 overflow-y-auto">
              @if (loading()) {
                <div class="flex flex-col items-center justify-center py-16" style="color:var(--text-muted);">
                  <span class="ac-spinner"></span>
                  <span style="font-size:13px;margin-top:10px;">Cargando...</span>
                </div>
              } @else if (error()) {
                <div class="flex flex-col items-center justify-center py-16" style="color:var(--accent-red); gap:8px;">
                  <span style="font-size:13px;font-weight:600;">Error: {{ error() }}</span>
                  <button type="button" class="btn btn--secondary btn--sm" (click)="loadLotes()">Reintentar</button>
                </div>
              } @else {
                @for (lote of filteredLotes(); track lote.id) {
                  <button
                    type="button"
                    class="w-full text-left flex flex-col px-4 py-3 transition-colors"
                    style="border-bottom:1px solid var(--border-hairline);background:transparent;border-left:none;border-right:none;border-top:none;cursor:pointer;"
                    [style.background]="selectedLote()?.id === lote.id ? 'rgba(6,182,212,0.1)' : 'transparent'"
                    (click)="selectLote(lote)"
                  >
                    <div class="flex items-center justify-between">
                      <span class="font-mono font-bold" style="font-size:13px;color:var(--accent-cyan);">Lote #{{ lote.id }}</span>
                      <emx-status-badge [variant]="getStatusVariant(lote.estado)">{{ lote.estado }}</emx-status-badge>
                    </div>
                    <div class="font-semibold mt-1" style="font-size:13.5px;color:var(--text-primary);">{{ lote.financiadorNombre }}</div>
                    <div class="flex items-center justify-between mt-1">
                      <span style="font-size:11px;color:var(--text-muted);">{{ lote.fechaCreacion | date:'dd/MM/yyyy' }}</span>
                      <span style="font-size:11px;color:var(--text-muted);">{{ lote.totalTickets }} tickets</span>
                    </div>
                  </button>
                }

                @if (filteredLotes().length === 0) {
                  <div class="flex flex-col items-center justify-center py-16 text-center" style="color:var(--text-muted);">
                    <span style="font-size:13px;max-width:320px;">No hay lotes de prefacturación registrados.</span>
                  </div>
                }
              }
            </div>
          </div>

          <!-- Detalle de Lote -->
          <div class="flex-1 h-full rounded-xl overflow-hidden relative flex flex-col" style="background:var(--surface-glass);border:1px solid var(--border-glass);backdrop-filter:blur(12px);">
            @if (selectedLote(); as lote) {
              <div class="px-6 py-4 flex items-center justify-between border-b border-white/5" style="border-bottom-color:var(--border-glass);">
                <div>
                  <div class="flex items-center gap-3 mb-1">
                    <h2 class="text-lg font-bold" style="color:var(--text-primary);">Detalle Lote #{{ lote.id }}</h2>
                    <emx-status-badge [variant]="getStatusVariant(lote.estado)">{{ lote.estado }}</emx-status-badge>
                  </div>
                  <div class="text-sm" style="color:var(--text-muted);">{{ lote.financiadorNombre }}</div>
                </div>
                <div class="flex gap-2">
                  @if (lote.estado === 'BORRADOR') {
                    <button type="button" class="btn btn--secondary btn--sm" (click)="openGenerarLineasModal()">
                      Generar líneas
                    </button>
                    <button type="button" class="btn btn--primary btn--sm" style="background:#22c55e;border-color:#22c55e;" (click)="confirmarLote(lote.id)">
                      Confirmar Lote
                    </button>
                  }
                  @if (lote.estado === 'CONFIRMADO') {
                    <button type="button" class="btn btn--primary btn--sm" style="background:#06b6d4;border-color:#06b6d4;" (click)="emitirLote(lote.id)">
                      Emitir Lote
                    </button>
                  }
                </div>
              </div>

              <div class="flex-1 overflow-y-auto p-4">
                @if (loadingDetail()) {
                  <div class="flex flex-col items-center justify-center py-16" style="color:var(--text-muted);">
                    <span class="ac-spinner"></span>
                  </div>
                } @else if (lote.items) {
                  <table class="w-full text-left" style="font-size:13px;color:var(--text-primary);">
                    <thead style="border-bottom:1px solid var(--border-glass);color:var(--text-muted);font-size:11px;text-transform:uppercase;">
                      <tr>
                        <th class="py-2 px-3 font-semibold">Ticket</th>
                        <th class="py-2 px-3 font-semibold">Paciente</th>
                        <th class="py-2 px-3 font-semibold">Fecha</th>
                        <th class="py-2 px-3 font-semibold">Valor</th>
                        <th class="py-2 px-3 font-semibold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of lote.items; track item.id) {
                        <tr style="border-bottom:1px solid var(--border-hairline);">
                          <td class="py-2.5 px-3 font-mono">{{ item.numeroTicket }}</td>
                          <td class="py-2.5 px-3">{{ item.pacienteNombre }}</td>
                          <td class="py-2.5 px-3">{{ item.fechaAtencion | date:'dd/MM/yyyy HH:mm' }}</td>
                          <td class="py-2.5 px-3 font-mono font-semibold">{{ item.valor | currency:'ARS':'symbol-narrow':'1.2-2' }}</td>
                          <td class="py-2.5 px-3 text-right">
                            @if (lote.estado === 'BORRADOR') {
                              <button
                                type="button"
                                class="text-xs px-2 py-1 rounded transition-colors"
                                style="color:var(--accent-red);background:rgba(239,68,68,0.1);"
                                (click)="excluirTicket(lote.id, item.ticketId)"
                              >
                                Excluir
                              </button>
                            }
                          </td>
                        </tr>
                      }
                      @if (lote.items.length === 0) {
                        <tr>
                          <td colspan="5" class="py-8 text-center" style="color:var(--text-muted);">
                            No hay tickets asignados a este lote. Generá líneas para comenzar.
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                }
              </div>
            } @else {
              <div class="flex-1 flex flex-col items-center justify-center" style="color:var(--text-muted);">
                <span style="font-size:14px;">Seleccioná un lote de la lista para ver su detalle.</span>
              </div>
            }
          </div>
        </div>
      } @else {
        <!-- ── Bandeja de Pendientes de Tarifación (H-06b / H-18) ────────── -->
        <div class="flex-1 overflow-hidden px-4 pb-4 min-h-0 flex flex-col">
          <div
            class="h-full flex flex-col rounded-xl overflow-hidden p-4"
            style="background:var(--surface-glass);border:1px solid var(--border-glass);backdrop-filter:blur(12px);"
          >
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-3">
              <div>
                <h2 class="text-base font-semibold" style="color:var(--text-primary);">Tickets pendientes de tarifación</h2>
                <p class="text-xs" style="color:var(--text-muted);">Tickets cuya zona o tarifa no se pudo resolver automáticamente (H-06b / H-18).</p>
              </div>
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filtrar por tipo o ID..."
                  [value]="filtroPendientes()"
                  (input)="filtroPendientes.set($any($event.target).value)"
                  class="px-3 py-1 text-xs rounded-lg border"
                  style="background:var(--bg-elevated);border-color:var(--border-glass);color:var(--text-primary);outline:none;width:180px;"
                />
                <span class="font-mono text-xs px-3 py-1 rounded-full" style="background:rgba(245,158,11,0.15);color:#f59e0b;">
                  {{ filteredPendientes().length }} pendientes
                </span>
              </div>
            </div>

            <!-- Barra de acciones masivas -->
            @if (selectedPendientes().size > 0) {
              <div class="flex items-center justify-between px-3 py-2 mb-3 rounded-lg border bg-blue-500/10 border-blue-500/30 text-xs">
                <span class="font-semibold text-blue-300">
                  {{ selectedPendientes().size }} tickets seleccionados
                </span>
                <button
                  type="button"
                  class="btn btn--primary btn--sm"
                  (click)="openCreateModal()"
                >
                  + Crear Lote con Seleccionados
                </button>
              </div>
            }

            <div class="flex-1 overflow-y-auto">
              @if (loadingPendientes()) {
                <div class="flex flex-col items-center justify-center py-16" style="color:var(--text-muted);">
                  <span class="ac-spinner"></span>
                  <span style="font-size:13px;margin-top:10px;">Cargando pendientes...</span>
                </div>
              } @else {
                <table class="w-full text-left" style="font-size:13px;color:var(--text-primary);">
                  <thead style="border-bottom:1px solid var(--border-glass);color:var(--text-muted);font-size:11px;text-transform:uppercase;">
                    <tr>
                      <th class="py-2 px-3 w-8">
                        <input
                          type="checkbox"
                          [checked]="isAllPendientesSelected()"
                          (change)="toggleSelectAllPendientes()"
                        />
                      </th>
                      <th class="py-2 px-3 font-semibold">ID</th>
                      <th class="py-2 px-3 font-semibold">Tipo Asistencia</th>
                      <th class="py-2 px-3 font-semibold">Estado</th>
                      <th class="py-2 px-3 font-semibold">Tarifación</th>
                      <th class="py-2 px-3 font-semibold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of filteredPendientes(); track item.id) {
                      <tr style="border-bottom:1px solid var(--border-hairline);" [class.bg-blue-500/5]="selectedPendientes().has(item.id)">
                        <td class="py-2.5 px-3">
                          <input
                            type="checkbox"
                            [checked]="selectedPendientes().has(item.id)"
                            (change)="toggleSelectPendiente(item.id)"
                          />
                        </td>
                        <td class="py-2.5 px-3 font-mono font-semibold">#{{ item.id }}</td>
                        <td class="py-2.5 px-3">{{ item.tipoAsistencia }}</td>
                        <td class="py-2.5 px-3">
                          <span class="px-2 py-0.5 rounded text-[11px] font-semibold" style="background:rgba(6,182,212,0.15);color:var(--accent-cyan);">
                            {{ item.estadoActual }}
                          </span>
                        </td>
                        <td class="py-2.5 px-3">
                          <span class="px-2 py-0.5 rounded text-[11px] font-semibold" style="background:rgba(245,158,11,0.15);color:#f59e0b;">
                            {{ item.estadoTarifacion || 'PENDIENTE_TARIFACION' }}
                          </span>
                        </td>
                        <td class="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            class="btn btn--primary btn--sm"
                            (click)="abrirModalTarifarManual(item)"
                          >
                            Tarifar Manual
                          </button>
                        </td>
                      </tr>
                    }
                    @if (filteredPendientes().length === 0) {
                      <tr>
                        <td colspan="6" class="py-12 text-center" style="color:var(--text-muted);">
                          No hay tickets pendientes que coincidan con el filtro.
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          </div>
        </div>
      }

      <!-- Modal Nuevo Lote -->
      @if (showCreateModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center" style="background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);">
          <div class="rounded-xl w-[400px]" style="background:var(--surface-glass);border:1px solid var(--border-glass);box-shadow:0 10px 40px rgba(0,0,0,0.5);">
            <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 class="font-bold text-lg" style="color:var(--text-primary);">Nuevo Lote de Prefacturación</h3>
              <button class="text-white/50 hover:text-white" (click)="showCreateModal.set(false)">×</button>
            </div>
            <div class="p-5 flex flex-col gap-4">
              <div>
                <label class="block text-xs uppercase tracking-wider font-semibold mb-2" style="color:var(--text-muted);">ID Financiador</label>
                <input type="number" [(ngModel)]="newFinanciadorId" class="w-full px-3 py-2 rounded-lg" style="background:var(--bg-elevated);border:1px solid var(--border-glass);color:var(--text-primary);" />
              </div>
            </div>
            <div class="px-5 py-4 border-t border-white/10 flex justify-end gap-3 bg-black/20">
              <button class="btn btn--secondary" (click)="showCreateModal.set(false)">Cancelar</button>
              <button class="btn btn--primary" [disabled]="!newFinanciadorId() || processing()" (click)="createLote()">Crear Lote</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Generar Líneas -->
      @if (showGenerarLineasModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center" style="background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);">
          <div class="rounded-xl w-[400px]" style="background:var(--surface-glass);border:1px solid var(--border-glass);box-shadow:0 10px 40px rgba(0,0,0,0.5);">
            <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 class="font-bold text-lg" style="color:var(--text-primary);">Generar Líneas del Lote</h3>
              <button class="text-white/50 hover:text-white" (click)="showGenerarLineasModal.set(false)">×</button>
            </div>
            <div class="p-5 flex flex-col gap-4">
              <div>
                <label class="block text-xs uppercase tracking-wider font-semibold mb-2" style="color:var(--text-muted);">Desde</label>
                <input type="date" [value]="generarDesde()" (input)="generarDesde.set($any($event.target).value)" class="w-full px-3 py-2 rounded-lg" style="background:var(--bg-elevated);border:1px solid var(--border-glass);color:var(--text-primary);" />
              </div>
              <div>
                <label class="block text-xs uppercase tracking-wider font-semibold mb-2" style="color:var(--text-muted);">Hasta</label>
                <input type="date" [value]="generarHasta()" (input)="generarHasta.set($any($event.target).value)" class="w-full px-3 py-2 rounded-lg" style="background:var(--bg-elevated);border:1px solid var(--border-glass);color:var(--text-primary);" />
              </div>
            </div>
            <div class="px-5 py-4 border-t border-white/10 flex justify-end gap-3 bg-black/20">
              <button class="btn btn--secondary" (click)="showGenerarLineasModal.set(false)">Cancelar</button>
              <button class="btn btn--primary" [disabled]="!generarDesde() || !generarHasta() || processing()" (click)="generarLineas()">Generar</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Tarifación Manual (H-06b / H-18) -->
      @if (showTarifarModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center" style="background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);">
          <div class="rounded-xl w-[450px]" style="background:var(--surface-glass);border:1px solid var(--border-glass);box-shadow:0 10px 40px rgba(0,0,0,0.5);">
            <div class="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 class="font-bold text-lg" style="color:var(--text-primary);">Tarifación Manual (Ticket #{{ ticketATarifar()?.id }})</h3>
              <button class="text-white/50 hover:text-white" (click)="showTarifarModal.set(false)">×</button>
            </div>
            <div class="p-5 flex flex-col gap-4">
              <div>
                <label class="block text-xs uppercase tracking-wider font-semibold mb-2" style="color:var(--text-muted);">Cargo Base (ARS)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  [(ngModel)]="manualCargoBase"
                  class="w-full px-3 py-2 rounded-lg"
                  style="background:var(--bg-elevated);border:1px solid var(--border-glass);color:var(--text-primary);"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label class="block text-xs uppercase tracking-wider font-semibold mb-2" style="color:var(--text-muted);">Costo Espera (ARS)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  [(ngModel)]="manualCostoEspera"
                  class="w-full px-3 py-2 rounded-lg"
                  style="background:var(--bg-elevated);border:1px solid var(--border-glass);color:var(--text-primary);"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label class="block text-xs uppercase tracking-wider font-semibold mb-2" style="color:var(--text-muted);">Motivo / Justificación</label>
                <textarea
                  rows="3"
                  [(ngModel)]="manualMotivo"
                  class="w-full px-3 py-2 rounded-lg"
                  style="background:var(--bg-elevated);border:1px solid var(--border-glass);color:var(--text-primary);"
                  placeholder="Ej: Zona fuera de radio habitual tarifada por acuerdo especial..."
                ></textarea>
              </div>
            </div>
            <div class="px-5 py-4 border-t border-white/10 flex justify-end gap-3 bg-black/20">
              <button class="btn btn--secondary" (click)="showTarifarModal.set(false)">Cancelar</button>
              <button
                class="btn btn--primary"
                [disabled]="manualCargoBase() === null || manualCargoBase()! < 0 || !manualMotivo().trim() || processing()"
                (click)="ejecutarTarifacionManual()"
              >
                Aplicar Tarifación
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class PrefacturacionComponent implements OnInit {
  private api = inject(PrefacturacionApiService);
  private destroyRef = inject(DestroyRef);
  private feedback = inject(UserFeedbackService);

  readonly activeTab = signal<'lotes' | 'pendientes'>('lotes');

  readonly lotes = signal<LotePrefacturacionDTO[]>([]);
  readonly searchQuery = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly selectedLote = signal<LotePrefacturacionDTO | null>(null);
  readonly loadingDetail = signal(false);

  readonly showCreateModal = signal(false);
  readonly newFinanciadorId = signal<number | null>(null);
  readonly processing = signal(false);

  readonly showGenerarLineasModal = signal(false);
  readonly generarDesde = signal('');
  readonly generarHasta = signal('');

  readonly pendientes = signal<TicketPendienteTarifacionDTO[]>([]);
  readonly loadingPendientes = signal(false);
  readonly filtroPendientes = signal('');
  readonly selectedPendientes = signal<Set<number>>(new Set());

  readonly showTarifarModal = signal(false);
  readonly ticketATarifar = signal<TicketPendienteTarifacionDTO | null>(null);
  readonly manualCargoBase = signal<number | null>(0);
  readonly manualCostoEspera = signal<number | null>(0);
  readonly manualMotivo = signal('');

  readonly lotesTotales = computed(() => this.lotes().length);

  readonly filteredPendientes = computed(() => {
    const q = this.filtroPendientes().trim().toLowerCase();
    if (!q) return this.pendientes();
    return this.pendientes().filter(p => 
      p.id.toString().includes(q) ||
      (p.tipoAsistencia && p.tipoAsistencia.toLowerCase().includes(q)) ||
      (p.estadoActual && p.estadoActual.toLowerCase().includes(q))
    );
  });

  readonly isAllPendientesSelected = computed(() => {
    const list = this.filteredPendientes();
    const sel = this.selectedPendientes();
    return list.length > 0 && list.every(item => sel.has(item.id));
  });

  toggleSelectPendiente(id: number): void {
    const sel = new Set(this.selectedPendientes());
    if (sel.has(id)) {
      sel.delete(id);
    } else {
      sel.add(id);
    }
    this.selectedPendientes.set(sel);
  }

  toggleSelectAllPendientes(): void {
    const list = this.filteredPendientes();
    const sel = new Set(this.selectedPendientes());
    if (this.isAllPendientesSelected()) {
      list.forEach(item => sel.delete(item.id));
    } else {
      list.forEach(item => sel.add(item.id));
    }
    this.selectedPendientes.set(sel);
  }

  readonly filteredLotes = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.lotes();
    return this.lotes().filter(l => 
      l.id.toString().includes(q) ||
      l.financiadorNombre.toLowerCase().includes(q)
    );
  });

  ngOnInit(): void {
    this.loadLotes();
    this.loadPendientes();
  }

  setTabPendientes(): void {
    this.activeTab.set('pendientes');
    this.loadPendientes();
  }

  loadLotes(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listarLotes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.lotes.set(list || []);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudieron cargar los lotes.');
          this.loading.set(false);
        },
      });
  }

  loadPendientes(): void {
    this.loadingPendientes.set(true);
    this.api
      .listarPendientesTarifacion()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.pendientes.set(list || []);
          this.loadingPendientes.set(false);
        },
        error: () => {
          this.loadingPendientes.set(false);
        }
      });
  }

  abrirModalTarifarManual(ticket: TicketPendienteTarifacionDTO): void {
    this.ticketATarifar.set(ticket);
    this.manualCargoBase.set(ticket.presupuestoAceptado || 0);
    this.manualCostoEspera.set(ticket.costoEspera || 0);
    this.manualMotivo.set('');
    this.showTarifarModal.set(true);
  }

  ejecutarTarifacionManual(): void {
    const ticket = this.ticketATarifar();
    const cargoBase = this.manualCargoBase();
    const costoEspera = this.manualCostoEspera() || 0;
    const motivo = this.manualMotivo().trim();

    if (!ticket || cargoBase === null || cargoBase < 0 || !motivo || this.processing()) return;

    this.processing.set(true);
    this.api.tarifarManual(ticket.id, { cargoBase, costoEspera, motivo })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.processing.set(false);
          this.showTarifarModal.set(false);
          this.feedback.push({
            type: 'success',
            title: 'Tarifación manual aplicada',
            message: `Ticket #${ticket.id} tarifado exitosamente.`
          });
          this.loadPendientes();
        },
        error: (err) => {
          this.processing.set(false);
          this.feedback.fromHttpError(err);
        }
      });
  }

  selectLote(lote: LotePrefacturacionDTO): void {
    this.selectedLote.set(lote);
    this.loadLoteDetail(lote.id);
  }

  loadLoteDetail(id: number): void {
    this.loadingDetail.set(true);
    this.api
      .obtenerLote(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (detail) => {
          this.selectedLote.set(detail);
          this.loadingDetail.set(false);
        },
        error: () => {
          this.loadingDetail.set(false);
        }
      });
  }

  openCreateModal(): void {
    this.newFinanciadorId.set(null);
    this.showCreateModal.set(true);
  }

  createLote(): void {
    const fid = this.newFinanciadorId();
    if (!fid || this.processing()) return;
    this.processing.set(true);
    this.api.crearLote(fid).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (newLote) => {
        this.processing.set(false);
        this.showCreateModal.set(false);
        this.feedback.push({ type: 'success', title: 'Lote creado', message: `Lote #${newLote.id} creado exitosamente.` });
        this.loadLotes();
        this.selectLote(newLote);
      },
      error: (err) => {
        this.processing.set(false);
        this.feedback.fromHttpError(err);
      }
    });
  }

  confirmarLote(id: number): void {
    if (this.processing()) return;
    this.processing.set(true);
    this.api.confirmarLote(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updatedLote) => {
        this.processing.set(false);
        this.selectedLote.set(updatedLote);
        this.feedback.push({ type: 'success', title: 'Lote confirmado', message: `Lote #${updatedLote.id} confirmado exitosamente.` });
        this.loadLotes();
      },
      error: (err) => {
        this.processing.set(false);
        this.feedback.fromHttpError(err);
      }
    });
  }

  emitirLote(id: number): void {
    if (this.processing()) return;
    this.processing.set(true);
    this.api.emitirLote(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updatedLote) => {
        this.processing.set(false);
        this.selectedLote.set(updatedLote);
        this.feedback.push({ type: 'success', title: 'Lote emitido', message: `Lote #${updatedLote.id} emitido exitosamente.` });
        this.loadLotes();
      },
      error: (err) => {
        this.processing.set(false);
        this.feedback.fromHttpError(err);
      }
    });
  }

  openGenerarLineasModal(): void {
    this.generarDesde.set('');
    this.generarHasta.set('');
    this.showGenerarLineasModal.set(true);
  }

  generarLineas(): void {
    const lote = this.selectedLote();
    const desde = this.generarDesde();
    const hasta = this.generarHasta();
    if (!lote || !desde || !hasta || this.processing()) return;
    this.processing.set(true);
    this.api.generarLineas(lote.id, desde, hasta).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.processing.set(false);
        this.showGenerarLineasModal.set(false);
        this.feedback.push({ type: 'success', title: 'Líneas generadas', message: `Líneas generadas para el lote #${lote.id}.` });
        this.loadLoteDetail(lote.id);
        this.loadLotes();
      },
      error: (err) => {
        this.processing.set(false);
        this.feedback.fromHttpError(err);
      }
    });
  }

  excluirTicket(loteId: number, ticketId: number): void {
    if (this.processing()) return;
    this.processing.set(true);
    this.api.excluirTicket(loteId, ticketId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.processing.set(false);
        this.feedback.push({ type: 'info', title: 'Ticket excluido', message: `Ticket #${ticketId} excluido del lote #${loteId}.` });
        this.loadLoteDetail(loteId);
      },
      error: (err) => {
        this.processing.set(false);
        this.feedback.fromHttpError(err);
      }
    });
  }

  getStatusVariant(estado: string): BadgeVariant {
    switch (estado) {
      case 'BORRADOR': return 'urgent';
      case 'CONFIRMADO': return 'stable';
      case 'EMITIDO': return 'cyan';
      case 'ANULADO': return 'critical';
      default: return 'info';
    }
  }
}
