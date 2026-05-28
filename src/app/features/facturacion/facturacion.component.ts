import { Component, signal, computed, HostListener, inject, OnInit, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuickPaymentModalComponent, QuickPaymentPayload } from '../patients/components/quick-payment-modal/quick-payment-modal.component';
import { catchError, of } from 'rxjs';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { localDateYmd } from '../../shared/utils/date-local.util';
import { DateUtils } from '../../core/utils/date.utils';
import {
  FacturacionApiService,
  FacturaDTO,
  GenerarResponseDTO,
  EstadoFactura,
  MetodoPago,
} from '../../data-access/api/facturacion.api';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

// ─── Constants ────────────────────────────────────────────────────────────────

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const ESTADOS_FILTER: { value: EstadoFactura | 'all'; label: string }[] = [
  { value: 'all',     label: 'Todas' },
  { value: 'EMITIDA', label: 'Emitidas' },
  { value: 'PAGADA',  label: 'Pagadas' },
  { value: 'VENCIDA', label: 'Vencidas' },
  { value: 'ANULADA', label: 'Anuladas' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 });
}

function fmtDate(s?: string): string {
  if (!s) return '—';
  const parts = s.split('T')[0].split('-');
  if (parts.length < 3) return s;
  const [y, m, d] = parts;
  return `${d} ${MESES[parseInt(m) - 1].slice(0, 3)} ${y}`;
}

function fmtPeriodo(desde?: string, hasta?: string, tipoPeriodo?: string): string {
  if (!desde) return '—';
  const d = DateUtils.fromISO(desde);
  if (tipoPeriodo === 'ANUAL') return `Anual ${d.year}`;
  return `${MESES[d.month - 1]} ${d.year}`;
}

function todayISO(): string {
  return localDateYmd();
}

function estadoColor(estado: string): string {
  if (estado === 'PAGADA')  return 'var(--accent-emerald)';
  if (estado === 'VENCIDA') return 'var(--accent-red)';
  if (estado === 'ANULADA') return 'var(--text-dim)';
  return 'var(--accent-amber)';
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-facturacion',
  standalone: true,
  imports: [FormsModule, StatusBadgeComponent, QuickPaymentModalComponent],
  template: `
    <div class="screen">

      <!-- ── Header ── -->
      <div class="screen-head">
        <div class="screen-head__title">
          <div class="screen-head__icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--accent-emerald)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="14" height="14" rx="2"/>
              <path d="M5 7h8M5 10h5M5 13h3"/>
              <path d="M11 12l2 2 3-3" stroke="var(--accent-emerald)" stroke-width="1.8"/>
            </svg>
          </div>
          <div>
            <h2>Facturación</h2>
            <div class="eyebrow">GESTIÓN DE FACTURAS · COBROS · PAGOS</div>
          </div>
        </div>

        <div class="screen-head__kpis">
          <div class="screen-kpi">
            <div class="eyebrow">Total facturado</div>
            <div class="mono" style="font-size:18px;font-weight:500">{{ fmtCurrency(kpis().totalFacturado) }}</div>
          </div>
          <div class="screen-kpi">
            <div class="eyebrow">Cobrado</div>
            <div class="mono" style="font-size:18px;font-weight:500;color:var(--accent-emerald)">{{ fmtCurrency(kpis().cobrado) }}</div>
          </div>
          <div class="screen-kpi">
            <div class="eyebrow">Pendiente</div>
            <div class="mono" style="font-size:18px;font-weight:500;color:var(--accent-amber)">{{ fmtCurrency(kpis().pendiente) }}</div>
          </div>
          <div class="screen-kpi">
            <div class="eyebrow">Vencidas</div>
            <div class="mono" style="font-size:18px;font-weight:500;color:var(--accent-red)">{{ kpis().vencidas }}</div>
          </div>
        </div>

        <div class="screen-head__actions">
          <button class="btn btn--ghost btn--sm">Exportar CSV</button>
          <button class="btn btn--primary btn--sm" (click)="openGenerarModal()">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
            Generar facturación
          </button>
        </div>
      </div>

      <!-- ── Table card ── -->
      <div class="glass-strong ft-card">

        <!-- Toolbar -->
        <div class="ft-toolbar">
          <div class="ft-filters">
            <span class="eyebrow" style="white-space:nowrap">Estado:</span>
            @for (s of estadosFiltro; track s.value) {
              <button class="filter-chip" [attr.data-on]="estadoFilter() === s.value" (click)="estadoFilter.set(s.value); page.set(0)">
                {{ s.label }}
              </button>
            }
          </div>
          <div class="ft-filters">
            <span class="eyebrow" style="white-space:nowrap">Período:</span>
            @for (t of ['MENSUAL', 'ANUAL', 'all']; track t) {
              <button class="filter-chip" [attr.data-on]="periodoFilter() === t" (click)="periodoFilter.set(t); page.set(0)">
                {{ t === 'all' ? 'Todos' : t === 'MENSUAL' ? 'Mensual' : 'Anual' }}
              </button>
            }
          </div>
        </div>

        <!-- Table -->
        <div class="data-table-wrap">
          @if (loading()) {
            <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:12px">Cargando facturas…</div>
          } @else if (paged().length === 0) {
            <div style="padding:48px;text-align:center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="1.2" stroke-linecap="round" style="margin-bottom:12px"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>
              <div style="font-size:13px;color:var(--text-muted)">No hay facturas que mostrar</div>
              <div class="mono micro" style="margin-top:4px;color:var(--text-dim)">Generá la facturación mensual o anual desde el botón superior.</div>
            </div>
          } @else {
            <table class="data-table" style="width:100%;min-width:700px">
              <thead>
                <tr>
                  <th>N° Factura</th>
                  <th>Período</th>
                  <th>Grupo</th>
                  <th style="text-align:right">Importe</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Emisión</th>
                  <th style="width:48px"></th>
                </tr>
              </thead>
              <tbody>
                @for (f of paged(); track f.id) {
                  <tr>
                    <td class="mono" style="font-size:11.5px;color:var(--accent-blue)">{{ f.numeroFactura }}</td>
                    <td style="font-size:12.5px">{{ fmtPeriodo(f.periodoDesde, f.periodoHasta, f.tipoPeriodo) }}</td>
                    <td class="mono micro">{{ f.grupoNumeroCuenta ?? '—' }}</td>
                    <td class="mono" style="text-align:right;font-weight:600;font-size:13px">{{ fmtCurrency(f.importeTotal) }}</td>
                    <td>
                      <span class="period-badge" [attr.data-type]="f.tipoPeriodo">
                        {{ f.tipoPeriodo === 'ANUAL' ? 'Anual' : 'Mensual' }}
                      </span>
                    </td>
                    <td>
                      <span class="mono micro" style="text-transform:uppercase;letter-spacing:0.1em;font-weight:600"
                        [style.color]="estadoColor(f.estado)">
                        ● {{ f.estado }}
                      </span>
                    </td>
                    <td class="mono micro" style="color:var(--text-muted)">{{ fmtDate(f.fechaEmision) }}</td>
                    <td>
                      @if (f.estado !== 'PAGADA' && f.estado !== 'ANULADA') {
                        <button class="btn btn--ghost btn--sm" style="font-size:11px;height:26px;padding:0 8px" (click)="openPayModal(f)">
                          Cobrar
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="ft-pagination">
            <div class="mono micro" style="color:var(--text-muted)">
              Mostrando <strong style="color:var(--text-primary)">{{ paged().length }}</strong> de
              <strong style="color:var(--text-primary)">{{ filtered().length }}</strong>
            </div>
            <div style="display:flex;gap:4px;align-items:center">
              <button class="btn btn--ghost btn--sm" [disabled]="page() === 0" [style.opacity]="page() === 0 ? '0.4':'1'" (click)="page.set(page()-1)">‹</button>
              @for (i of pageRange(); track i) {
                <button class="page-btn" [attr.data-active]="page() === i" (click)="page.set(i)">{{ i + 1 }}</button>
              }
              <button class="btn btn--ghost btn--sm" [disabled]="page() >= totalPages()-1" [style.opacity]="page() >= totalPages()-1 ? '0.4':'1'" (click)="page.set(page()+1)">›</button>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════
         GENERAR FACTURACIÓN MODAL
         ═══════════════════════════════════════════════════════ -->
    @if (showGenerarModal()) {
      <div class="qc-overlay" (click)="closeGenerarModal()">
        <div class="qc-modal glass-strong" (click)="$event.stopPropagation()" style="max-width:500px">
          <div class="qc-head">
            <div>
              <div class="eyebrow" style="color:var(--accent-emerald)">● GENERAR FACTURACIÓN</div>
              <h2 style="margin:4px 0 0;font-size:18px;font-weight:600">Nueva tanda de facturas</h2>
            </div>
            <button class="qc-close-btn" (click)="closeGenerarModal()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
          </div>

          <div class="qc-body" style="padding:20px;display:flex;flex-direction:column;gap:16px">

            <!-- Tipo de período -->
            <div class="qc-field">
              <label class="eyebrow">Tipo de facturación</label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:2px">
                <button type="button" class="period-card"
                  [attr.data-active]="genTipoPeriodo() === 'MENSUAL'"
                  (click)="genTipoPeriodo.set('MENSUAL')">
                  <div style="font-size:22px;margin-bottom:4px">📅</div>
                  <div style="font-size:13px;font-weight:600">Mensual</div>
                  <div class="mono micro" style="margin-top:2px;color:var(--text-muted)">Genera 1 factura por grupo por mes</div>
                </button>
                <button type="button" class="period-card"
                  [attr.data-active]="genTipoPeriodo() === 'ANUAL'"
                  (click)="genTipoPeriodo.set('ANUAL')">
                  <div style="font-size:22px;margin-bottom:4px">📆</div>
                  <div style="font-size:13px;font-weight:600">Anual</div>
                  <div class="mono micro" style="margin-top:2px;color:var(--text-muted)">Descuento por pago anticipado del año</div>
                </button>
              </div>
            </div>

            @if (genTipoPeriodo() === 'MENSUAL') {
              <div class="qc-row">
                <div class="qc-field" style="flex:1">
                  <label class="eyebrow">Mes <span style="color:var(--accent-red)">*</span></label>
                  <select class="qc-input" [(ngModel)]="genMes">
                    @for (m of meses; track $index) {
                      <option [value]="$index + 1">{{ m }}</option>
                    }
                  </select>
                </div>
                <div class="qc-field" style="flex:1">
                  <label class="eyebrow">Año <span style="color:var(--accent-red)">*</span></label>
                  <input class="qc-input" type="number" min="2020" max="2099" [(ngModel)]="genAnio"/>
                </div>
              </div>
            } @else {
              <div class="qc-field">
                <label class="eyebrow">Año <span style="color:var(--accent-red)">*</span></label>
                <input class="qc-input" type="number" min="2020" max="2099" [(ngModel)]="genAnio"/>
              </div>
              <div style="padding:10px 12px;border-radius:8px;background:rgba(16,185,129,0.07);border:1px solid rgba(16,185,129,0.2);font-size:12px;color:var(--text-secondary)">
                <strong style="color:var(--accent-emerald)">Período:</strong> 1 Enero {{ genAnio }} → 31 Diciembre {{ genAnio }}<br>
                El importe usa <strong>precio anual acordado</strong> del plan; si no tiene, usa <strong>12 × precio mensual</strong>.
              </div>
            }

            @if (generarResult()) {
              <div class="generar-result" [attr.data-ok]="generarResult()!.totalGeneradas > 0">
                <div style="display:flex;align-items:center;gap:10px">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <div>
                    <div style="font-size:13px;font-weight:600;color:var(--text-primary)">
                      {{ generarResult()!.totalGeneradas }} facturas generadas
                    </div>
                    <div class="mono micro" style="color:var(--text-muted);margin-top:2px">
                      {{ generarResult()!.totalOmitidas }} grupos omitidos (ya existía o sin cobertura)
                    </div>
                  </div>
                </div>
              </div>
            }

            @if (generarError()) {
              <div style="padding:10px 12px;border-radius:8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);font-size:12px;color:var(--accent-red)">
                {{ generarError() }}
              </div>
            }

          </div>

          <div class="qc-foot">
            <div></div>
            <div style="display:flex;gap:8px">
              <button class="btn btn--ghost" (click)="closeGenerarModal()">
                {{ generarResult() ? 'Cerrar' : 'Cancelar' }}
              </button>
              @if (!generarResult()) {
                <button class="btn btn--primary" [disabled]="generando()" [style.opacity]="generando() ? '0.5':'1'" (click)="confirmarGenerar()">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  {{ generando() ? 'Generando…' : 'Generar facturas' }}
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ═══════════════════════════════════════════════════════
         REGISTRAR PAGO — componente unificado
         ═══════════════════════════════════════════════════════ -->
    @if (showPayModal()) {
      <app-quick-payment-modal
        [invoiceContext]="payInvoiceContext()"
        [suggestedAmount]="payFactura()?.saldoPendiente ?? payFactura()?.importeTotal ?? 0"
        [error]="payError()"
        (close)="closePayModal()"
        (submit)="confirmarPago($event)"
      />
    }
  `,
  styles: [`
    :host { display: block; }

    .ft-card { border-radius: var(--r-card); overflow: hidden; padding: 0; }

    .ft-toolbar {
      display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-hairline);
    }
    .ft-filters { display: flex; align-items: center; gap: 6px; }
    .filter-chip {
      height: 28px; padding: 0 12px; border-radius: 20px;
      border: 1px solid var(--border-glass); background: transparent;
      color: var(--text-muted); font-size: 11.5px; font-family: var(--font-sans);
      cursor: pointer; transition: all 0.15s;
    }
    .filter-chip:hover { color: var(--text-primary); background: rgba(255,255,255,0.04); }
    .filter-chip[data-on="true"] { background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.4); color: var(--accent-blue); }

    .data-table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .data-table th {
      padding: 10px 14px; text-align: left;
      font-size: 10.5px; font-family: var(--font-mono); text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-muted);
      border-bottom: 1px solid var(--border-hairline);
      background: rgba(255,255,255,0.02); white-space: nowrap;
    }
    .data-table td {
      padding: 11px 14px; border-bottom: 1px solid var(--border-hairline);
      color: var(--text-secondary); vertical-align: middle;
    }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: rgba(255,255,255,0.02); }

    .period-badge {
      display: inline-block; padding: 2px 8px; border-radius: 4px;
      font-size: 10.5px; font-family: var(--font-mono); font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .period-badge[data-type="MENSUAL"] { background: rgba(59,130,246,0.1); color: var(--accent-blue); }
    .period-badge[data-type="ANUAL"]   { background: rgba(139,92,246,0.12); color: var(--accent-purple, #a78bfa); }

    .ft-pagination {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; border-top: 1px solid var(--border-hairline);
    }
    .page-btn {
      width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
      border-radius: 6px; border: 1px solid var(--border-glass); background: transparent;
      font-size: 12px; font-family: var(--font-mono); color: var(--text-muted); cursor: pointer;
    }
    .page-btn:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
    .page-btn[data-active="true"] { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.4); color: var(--accent-blue); }

    /* ── Modals ── */
    .qc-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
    .qc-modal { width: 100%; max-width: 580px; border-radius: 16px; display: flex; flex-direction: column; animation: modal-in 0.18s ease-out; }
    @keyframes modal-in { from { transform: scale(0.96) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
    .qc-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 20px 14px; border-bottom: 1px solid var(--border-hairline); }
    .qc-body { padding: 16px 20px; }
    .qc-foot { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-top: 1px solid var(--border-hairline); gap: 8px; }
    .qc-close-btn { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.04); color: var(--text-muted); cursor: pointer; }
    .qc-close-btn:hover { background: rgba(255,255,255,0.09); color: var(--text-primary); }
    .qc-row { display: flex; gap: 12px; }
    .qc-field { display: flex; flex-direction: column; gap: 5px; }
    .qc-input {
      height: 36px; border-radius: var(--r-btn); border: 1px solid var(--border-glass);
      background: rgba(255,255,255,0.04); color: var(--text-primary);
      font-size: 12.5px; font-family: var(--font-sans);
      padding: 0 10px; outline: none; width: 100%; box-sizing: border-box; transition: border-color 0.15s;
    }
    .qc-input:focus { border-color: rgba(59,130,246,0.5); }
    textarea.qc-input { height: auto; padding: 8px 10px; resize: vertical; }

    .period-card {
      padding: 14px; border-radius: 12px; border: 1px solid var(--border-glass);
      background: transparent; cursor: pointer; text-align: center; transition: all 0.15s;
    }
    .period-card:hover { background: rgba(255,255,255,0.04); }
    .period-card[data-active="true"] {
      background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.4);
    }

    .generar-result {
      padding: 12px 14px; border-radius: 10px;
      background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.25);
    }
  `],
})
export class FacturacionComponent implements OnInit {
    private destroyRef = inject(DestroyRef);
  private api = inject(FacturacionApiService);

  // ── Constants ──
  readonly estadosFiltro = ESTADOS_FILTER;
  readonly meses         = MESES;

  // ── Table state ──
  readonly loading       = signal(false);
  readonly facturas      = signal<FacturaDTO[]>([]);
  readonly estadoFilter  = signal<EstadoFactura | 'all'>('all');
  readonly periodoFilter = signal<string>('all');
  readonly page          = signal(0);

  // ── Generar modal ──
  readonly showGenerarModal = signal(false);
  readonly genTipoPeriodo   = signal<'MENSUAL' | 'ANUAL'>('MENSUAL');
  genMes  = DateUtils.now().month;
  genAnio = DateUtils.now().year;
  readonly generando      = signal(false);
  readonly generarResult  = signal<GenerarResponseDTO | null>(null);
  readonly generarError   = signal<string | null>(null);

  // ── Pago modal ──
  readonly showPayModal = signal(false);
  readonly payFactura   = signal<FacturaDTO | null>(null);
  readonly savingPay    = signal(false);
  readonly payError     = signal<string | null>(null);

  readonly payInvoiceContext = computed(() => {
    const f = this.payFactura();
    if (!f) return null;
    return {
      numero:  f.numeroFactura,
      periodo: fmtPeriodo(f.periodoDesde, f.periodoHasta, f.tipoPeriodo),
      importe: f.saldoPendiente ?? f.importeTotal,
    };
  });

  // ── Computed ──
  readonly filtered = computed(() => {
    const est = this.estadoFilter();
    const per = this.periodoFilter();
    return this.facturas().filter(f =>
      (est === 'all' || f.estado === est) &&
      (per === 'all' || f.tipoPeriodo === per)
    );
  });

  readonly PAGE_SIZE = 20;
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.PAGE_SIZE)));
  readonly paged = computed(() => {
    const pg = Math.min(this.page(), this.totalPages() - 1);
    return this.filtered().slice(pg * this.PAGE_SIZE, (pg + 1) * this.PAGE_SIZE);
  });
  readonly pageRange = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));

  readonly kpis = computed(() => {
    const list = this.facturas();
    const totalFacturado = list.reduce((s, f) => s + f.importeTotal, 0);
    const cobrado  = list.filter(f => f.estado === 'PAGADA').reduce((s, f) => s + f.importeTotal, 0);
    const pendiente = list.filter(f => f.estado === 'EMITIDA').reduce((s, f) => s + f.importeTotal, 0);
    const vencidas  = list.filter(f => f.estado === 'VENCIDA').length;
    return { totalFacturado, cobrado, pendiente, vencidas };
  });

  // ── Lifecycle ──
  ngOnInit(): void { this.loadFacturas(); }

  private loadFacturas(): void {
    this.loading.set(true);
    this.api.listarFacturas(null, 0, 200).pipe(
      catchError(() => of([] as FacturaDTO[])), takeUntilDestroyed(this.destroyRef)
    ).subscribe(list => {
      this.facturas.set(list);
      this.loading.set(false);
    });
  }

  // ── Helpers ──
  readonly fmtCurrency = fmtCurrency;
  readonly fmtDate     = fmtDate;
  readonly fmtPeriodo  = fmtPeriodo;
  readonly estadoColor = estadoColor;

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.showPayModal())     { this.closePayModal();     return; }
    if (this.showGenerarModal()) { this.closeGenerarModal(); return; }
  }

  // ── Generar modal ──
  openGenerarModal(): void {
    this.generarResult.set(null);
    this.generarError.set(null);
    this.showGenerarModal.set(true);
  }

  closeGenerarModal(): void {
    this.showGenerarModal.set(false);
    if (this.generarResult()) this.loadFacturas();
  }

  confirmarGenerar(): void {
    if (this.generando()) return;
    this.generando.set(true);
    this.generarError.set(null);

    const req$ = this.genTipoPeriodo() === 'MENSUAL'
      ? this.api.generarMensual(this.genMes, this.genAnio)
      : this.api.generarAnual(this.genAnio);

    req$.pipe(
      catchError(err => {
        this.generarError.set(err?.error?.detail ?? err?.error?.title ?? 'Error al generar facturas.');
        this.generando.set(false);
        return of(null);
      }), takeUntilDestroyed(this.destroyRef)
    ).subscribe(res => {
      this.generando.set(false);
      if (res) this.generarResult.set(res);
    });
  }

  // ── Pago modal ──
  openPayModal(f: FacturaDTO): void {
    this.payFactura.set(f);
    this.payError.set(null);
    this.showPayModal.set(true);
  }

  closePayModal(): void {
    this.showPayModal.set(false);
    this.payError.set(null);
    this.payFactura.set(null);
  }

  confirmarPago(payload: QuickPaymentPayload): void {
    const f = this.payFactura();
    if (!f || this.savingPay()) return;

    this.savingPay.set(true);
    this.payError.set(null);

    this.api.registrarPago(f.id, {
      fechaPago:        payload.fecha,
      monto:            payload.amount,
      metodoPago:       payload.method as MetodoPago,
      numeroReferencia: payload.ref  || undefined,
      nota:             payload.nota || undefined,
    }).pipe(
      catchError(err => {
        this.payError.set(this.translatePayError(err));
        this.savingPay.set(false);
        return of(null);
      }), takeUntilDestroyed(this.destroyRef)
    ).subscribe(res => {
      if (!res) return;
      this.savingPay.set(false);
      this.closePayModal();
      this.loadFacturas();
    });
  }

  private translatePayError(err: any): string {
    const key = err?.error?.message ?? err?.error?.detail ?? '';
    if (key.includes('montoExcedeSaldo') || key.includes('monto excede')) {
      const f = this.payFactura();
      const saldo = f?.saldoPendiente ?? f?.importeTotal;
      const hint = saldo != null ? ` El saldo restante es $${saldo.toLocaleString('es-AR')}.` : '';
      return `El monto ingresado supera el saldo pendiente de la factura.${hint}`;
    }
    if (key.includes('facturaYaPagada') || key.includes('ya fue pagada')) {
      return 'Esta factura ya fue pagada anteriormente.';
    }
    if (key.includes('estadoInvalido')) {
      return 'No se puede registrar un pago sobre una factura anulada.';
    }
    return err?.error?.detail ?? err?.error?.title ?? 'Error al registrar el pago.';
  }
}
