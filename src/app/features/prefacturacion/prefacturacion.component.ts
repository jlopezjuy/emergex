import { Component, OnInit, inject, signal, computed, DestroyRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent, BadgeVariant } from '../../shared/components/status-badge/status-badge.component';
import { PrefacturacionApiService, LotePrefacturacionDTO } from '../../data-access/api/prefacturacion.api';

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
            <p class="text-xs mt-0.5 font-mono" style="color:var(--text-muted);">GESTIÓN DE LOTES Y TICKETS</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div
            class="flex items-center gap-4 px-4 py-2 rounded-lg"
            style="background:var(--surface-glass);border:1px solid var(--border-glass);"
          >
            <div class="text-center">
              <div class="font-mono text-xs uppercase tracking-wider mb-0.5" style="color:var(--text-muted);">Total Lotes</div>
              <div class="font-mono font-bold text-lg leading-none" style="color:var(--accent-cyan);">{{ lotesTotales() }}</div>
            </div>
          </div>
          <button type="button" class="btn btn--primary" (click)="openCreateModal()">
            + Nuevo Lote
          </button>
        </div>
      </div>

      <!-- ── Body ───────────────────────────────────────────────────────── -->
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
                  <button type="button" class="btn btn--primary btn--sm" style="background:#22c55e;border-color:#22c55e;" (click)="confirmarLote(lote.id)">
                    Confirmar Lote
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
                      <tr style="border-bottom:1px solid var(--border-hairline);" [style.opacity]="!item.incluido ? '0.5' : '1'">
                        <td class="py-3 px-3 font-mono" style="color:var(--accent-cyan);">{{ item.numeroTicket }}</td>
                        <td class="py-3 px-3">{{ item.pacienteNombre }}</td>
                        <td class="py-3 px-3">{{ item.fechaAtencion | date:'short' }}</td>
                        <td class="py-3 px-3">\${{ item.valor }}</td>
                        <td class="py-3 px-3 text-right">
                          @if (lote.estado === 'BORRADOR' && item.incluido) {
                            <button type="button" class="btn btn--danger btn--sm" (click)="excluirTicket(lote.id, item.ticketId)">Excluir</button>
                          } @else if (!item.incluido) {
                            <span class="text-xs" style="color:var(--accent-red);">Excluido</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              }
            </div>
          } @else {
            <div class="flex-1 flex flex-col items-center justify-center h-full text-center" style="color:var(--text-muted);">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" style="margin-bottom:16px;opacity:0.3;">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <p>Seleccione un lote para ver los detalles.</p>
            </div>
          }
        </div>
      </div>
    </div>

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
  `,
})
export class PrefacturacionComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(PrefacturacionApiService);

  readonly lotes = signal<LotePrefacturacionDTO[]>([]);
  readonly searchQuery = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly selectedLote = signal<LotePrefacturacionDTO | null>(null);
  readonly loadingDetail = signal(false);

  readonly showCreateModal = signal(false);
  readonly newFinanciadorId = signal<number | null>(null);
  readonly processing = signal(false);

  readonly lotesTotales = computed(() => this.lotes().length);

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
        this.loadLotes();
        this.selectLote(newLote);
      },
      error: () => {
        this.processing.set(false);
        alert('Error al crear lote');
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
        this.loadLotes(); // Reload list to update status
      },
      error: () => {
        this.processing.set(false);
        alert('Error al confirmar lote');
      }
    });
  }

  excluirTicket(loteId: number, ticketId: number): void {
    if (this.processing()) return;
    if (!confirm('¿Seguro que desea excluir este ticket del lote?')) return;
    this.processing.set(true);
    this.api.excluirTicket(loteId, ticketId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.processing.set(false);
        this.loadLoteDetail(loteId); // Reload detail
      },
      error: () => {
        this.processing.set(false);
        alert('Error al excluir ticket');
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
