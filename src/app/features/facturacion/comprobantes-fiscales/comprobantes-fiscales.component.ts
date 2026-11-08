import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComprobantesFiscalesApiService, ComprobanteFiscalDTO } from '../../../data-access/api/comprobantes-fiscales.api';
import { MonedaPipe } from '../../../shared/pipes/moneda.pipe';
import { FechaPipe } from '../../../shared/pipes/fecha.pipe';

/** Fiscal numbers are identifiers, not quantities: "0004" and "00000001", never "0,004". */
export function numeroFiscal(valor: number | string | null | undefined, digitos: number): string {
  if (valor === null || valor === undefined || valor === '') return '—';
  const entero = String(valor).replace(/\D/g, '');
  return entero ? entero.padStart(digitos, '0') : '—';
}

const PALABRAS_TIPO: Record<string, string> = { CREDITO: 'crédito', DEBITO: 'débito' };

/** "FACTURA_A" -> "Factura A", "NOTA_CREDITO_B" -> "Nota crédito B". */
export function etiquetaTipoComprobante(tipo: string | null | undefined): string {
  if (!tipo) return '—';
  const palabras = tipo.split('_').map((p) =>
    p.length === 1 ? p.toUpperCase() : (PALABRAS_TIPO[p] ?? p.toLowerCase()),
  );
  const texto = palabras.join(' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

@Component({
  selector: 'app-comprobantes-fiscales',
  standalone: true,
  imports: [MonedaPipe, FechaPipe, CommonModule, FormsModule],
  styles: [
    `
      .num {
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
  template: `
    <div class="h-full flex flex-col overflow-hidden">
      <!-- ── Banner de Modo Simulado ──────────────────────────────────────── -->
      @if (isModoSimulado()) {
        <div
          data-testid="banner-modo-simulado"
          class="px-6 py-2.5 flex items-center gap-3 text-xs font-semibold"
          style="background: rgba(245, 158, 11, 0.15); border-bottom: 1px solid rgba(245, 158, 11, 0.3); color: #f59e0b;"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Modo de pruebas: la emisión real hacia ARCA está desactivada. Los comprobantes se generan con CAE simulado sin validez fiscal.</span>
        </div>
      }

      <!-- ── Header ───────────────────────────────────────────────────────── -->
      <div class="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div
            style="width:36px;height:36px;border-radius:10px;background:rgba(6,182,212,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan, #06b6d4)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div>
            <h1 class="font-semibold text-lg" style="color:var(--text-primary);">Comprobantes fiscales (ARCA)</h1>
            <p class="text-xs mt-0.5" style="color:var(--text-muted);">Comprobantes electrónicos emitidos y su estado ante ARCA</p>
          </div>
        </div>

        <!-- Acciones de emisión manual y refresco -->
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <input
              type="number"
              placeholder="N.º de documento"
              [ngModel]="documentoIdInput()"
              (ngModelChange)="documentoIdInput.set($event)"
              class="px-3 py-1.5 rounded-lg text-xs font-mono outline-none"
              style="width:130px;background:var(--bg-elevated, rgba(255,255,255,0.05));border:1px solid var(--border-glass);color:var(--text-primary);"
            />
            <button
              type="button"
              data-testid="btn-emitir"
              class="btn btn--primary px-4 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              [disabled]="emitLoading() || !documentoIdInput()"
              (click)="emitirComprobante()"
            >
              @if (emitLoading()) {
                <span>Emitiendo...</span>
              } @else {
                <span>+ Emitir comprobante</span>
              }
            </button>
          </div>
          <button type="button" class="btn btn--secondary px-3 py-1.5 rounded-lg text-xs" (click)="cargarComprobantes()">
            ↻ Refrescar
          </button>
        </div>
      </div>

      <!-- ── Filtros y Toolbar ────────────────────────────────────────────── -->
      <div class="flex items-center justify-between px-6 py-2 flex-shrink-0" style="border-bottom: 1px solid var(--border-glass);">
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            [style.background]="filtroEstado() === null ? 'var(--accent-cyan, #06b6d4)' : 'transparent'"
            [style.color]="filtroEstado() === null ? '#000' : 'var(--text-muted)'"
            (click)="setFiltroEstado(null)"
          >
            Todos ({{ comprobantes().length }})
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            [style.background]="filtroEstado() === 'PENDIENTE_CAE' ? 'rgba(6,182,212,0.2)' : 'transparent'"
            [style.color]="filtroEstado() === 'PENDIENTE_CAE' ? 'var(--accent-cyan, #06b6d4)' : 'var(--text-muted)'"
            (click)="setFiltroEstado('PENDIENTE_CAE')"
          >
            En trámite ({{ totalPendientes() }})
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            [style.background]="filtroEstado() === 'AUTORIZADO' ? 'rgba(34,197,94,0.2)' : 'transparent'"
            [style.color]="filtroEstado() === 'AUTORIZADO' ? '#22c55e' : 'var(--text-muted)'"
            (click)="setFiltroEstado('AUTORIZADO')"
          >
            Autorizados ({{ totalAutorizados() }})
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
            [style.background]="filtroEstado() === 'RECHAZADO_ARCA' ? 'rgba(239,68,68,0.2)' : 'transparent'"
            [style.color]="filtroEstado() === 'RECHAZADO_ARCA' ? '#ef4444' : 'var(--text-muted)'"
            (click)="setFiltroEstado('RECHAZADO_ARCA')"
          >
            Rechazados ({{ totalRechazados() }})
          </button>
        </div>
      </div>

      <!-- ── Tabla de Comprobantes Fiscales ───────────────────────────────── -->
      <div class="flex-1 overflow-auto px-6 py-4">
        <div
          class="rounded-xl overflow-hidden"
          style="background:var(--surface-glass, rgba(15,23,42,0.6));border:1px solid var(--border-glass);backdrop-filter:blur(12px);"
        >
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr style="border-bottom:1px solid var(--border-glass);background:rgba(0,0,0,0.2);color:var(--text-muted);">
                <th class="py-3 px-4 font-semibold">Tipo</th>
                <th class="py-3 px-4 font-semibold text-right">Punto de venta</th>
                <th class="py-3 px-4 font-semibold text-right">Número</th>
                <th class="py-3 px-4 font-semibold">Fecha</th>
                <th class="py-3 px-4 font-semibold">Receptor / documento</th>
                <th class="py-3 px-4 font-semibold text-right">Monto total</th>
                <th class="py-3 px-4 font-semibold">Estado</th>
                <th class="py-3 px-4 font-semibold">CAE / vencimiento</th>
                <th class="py-3 px-4 font-semibold">Reintentos</th>
                <th class="py-3 px-4 font-semibold">Detalle / error</th>
              </tr>
            </thead>
            <tbody>
              @for (c of comprobantesFiltrados(); track c.id) {
                <tr
                  class="transition-colors hover:bg-white/5"
                  style="border-bottom:1px solid var(--border-glass);color:var(--text-primary);"
                >
                  <td class="py-3 px-4 font-semibold">{{ etiquetaTipo(c.tipoComprobante) }}</td>
                  <td class="py-3 px-4 font-mono num text-right" [attr.data-testid]="'pv-' + c.id">{{ numeroFiscal(c.puntoVenta, 4) }}</td>
                  <td class="py-3 px-4 font-mono num text-right" [attr.data-testid]="'nro-' + c.id">{{ numeroFiscal(c.numeroComprobante, 8) }}</td>
                  <td class="py-3 px-4 font-mono num text-muted">{{ c.fechaEmision | fecha }}</td>
                  <td class="py-3 px-4">
                    <div class="font-semibold">{{ c.receptorNombre || 'Financiador' }}</div>
                    @if (c.documentoComercialId) {
                      <div class="text-[10px] text-muted">Documento {{ c.documentoComercialId }}</div>
                    }
                  </td>
                  <td class="py-3 px-4 text-right font-mono font-semibold num" [attr.data-testid]="'monto-' + c.id">
                    {{ c.montoTotal | moneda }}
                  </td>
                  <td class="py-3 px-4">
                    @if (c.estado === 'PENDIENTE_CAE') {
                      <span
                        data-testid="estado-PENDIENTE_CAE"
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style="background:rgba(6,182,212,0.15);color:#06b6d4;"
                      >
                        <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        En trámite
                      </span>
                    } @else if (c.estado === 'AUTORIZADO') {
                      <span
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style="background:rgba(34,197,94,0.15);color:#22c55e;"
                      >
                        ✓ Autorizado
                      </span>
                    } @else {
                      <span
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                        style="background:rgba(239,68,68,0.15);color:#ef4444;"
                      >
                        ✕ Rechazado
                      </span>
                    }
                  </td>
                  <td class="py-3 px-4 font-mono">
                    @if (c.cae) {
                      <div class="font-semibold num" style="color:var(--text-primary);">{{ c.cae }}</div>
                      @if (c.vencimientoCae) {
                        <div class="text-[10px] text-muted">Vence: {{ c.vencimientoCae | fecha }}</div>
                      }
                    } @else {
                      <span class="text-muted italic">-</span>
                    }
                  </td>
                  <td class="py-3 px-4 font-mono num text-muted">
                    {{ c.retryCount }} / {{ c.maxRetries }}
                  </td>
                  <td class="py-3 px-4">
                    @if (c.lastError) {
                      <div
                        [attr.data-testid]="'error-' + c.id"
                        class="text-[11px] text-red-400 max-w-[280px] truncate"
                        [title]="c.lastError"
                      >
                        {{ c.lastError }}
                      </div>
                    } @else {
                      <span class="text-muted text-[11px]">-</span>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="10" class="py-8 text-center text-muted">
                    No se encontraron comprobantes fiscales registrados.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
})
export class ComprobantesFiscalesComponent implements OnInit {
  private api = inject(ComprobantesFiscalesApiService);

  readonly numeroFiscal = numeroFiscal;
  readonly etiquetaTipo = etiquetaTipoComprobante;

  comprobantes = signal<ComprobanteFiscalDTO[]>([]);
  filtroEstado = signal<string | null>(null);
  isModoSimulado = signal<boolean>(false);
  documentoIdInput = signal<number | null>(null);
  emitLoading = signal<boolean>(false);

  comprobantesFiltrados = computed(() => {
    const estado = this.filtroEstado();
    const list = this.comprobantes();
    if (!estado) return list;
    return list.filter((c) => c.estado === estado);
  });

  totalPendientes = computed(() => this.comprobantes().filter((c) => c.estado === 'PENDIENTE_CAE').length);
  totalAutorizados = computed(() => this.comprobantes().filter((c) => c.estado === 'AUTORIZADO').length);
  totalRechazados = computed(() => this.comprobantes().filter((c) => c.estado === 'RECHAZADO_ARCA').length);

  ngOnInit(): void {
    this.cargarComprobantes();
    this.cargarArcaStatus();
  }

  cargarComprobantes(): void {
    this.api.listarComprobantes().subscribe({
      next: (list) => {
        this.comprobantes.set(list || []);
      },
    });
  }

  cargarArcaStatus(): void {
    this.api.getArcaStatus().subscribe({
      next: (status) => {
        const modoPruebas = status?.modoPruebas ?? (!status?.arcaEnabled && status?.caeSimuladoHabilitado);
        this.isModoSimulado.set(Boolean(modoPruebas));
      },
    });
  }

  setFiltroEstado(estado: string | null): void {
    this.filtroEstado.set(estado);
  }

  emitirComprobante(): void {
    const docId = this.documentoIdInput();
    if (!docId || this.emitLoading()) return;

    this.emitLoading.set(true);
    const idempotencyKey = 'web-emision-' + docId + '-' + Date.now();

    this.api.emitirComprobante(docId, idempotencyKey).subscribe({
      next: () => {
        this.emitLoading.set(false);
        this.cargarComprobantes();
      },
      error: () => {
        this.emitLoading.set(false);
      },
    });
  }
}
