import { Component, OnInit, signal, inject, DestroyRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, forkJoin } from 'rxjs';
import { ReportesApiService } from '../../../data-access/api/reportes.api';
import { ReporteFinancieroDTO, ReporteComprasDTO, ReportePadronContratosDTO } from '../../../data-access/dto/reportes.dto';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { MonedaPipe } from '../../../shared/pipes/moneda.pipe';
import { FechaPipe } from '../../../shared/pipes/fecha.pipe';

export type ReporteTab = 'FINANCIERO' | 'COMPRAS' | 'PADRON';

@Component({
  selector: 'emx-reportes-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    KpiCardComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    MonedaPipe,
    FechaPipe,
  ],
  template: `
    <div class="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <!-- Header y Filtro de Fecha -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold" style="color: var(--text-primary);">
            Reportes administrativos
          </h1>
          <p class="text-xs" style="color: var(--text-muted);">
            Cobranzas y deuda, compras a proveedores, padrón y contratos
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2 glass px-3 py-1.5 rounded-lg border" style="border-color: var(--border-glass);">
            <label class="text-xs font-semibold" style="color: var(--text-muted);">Desde:</label>
            <input
              type="date"
              class="bg-transparent text-xs font-semibold outline-none"
              style="color: var(--text-primary);"
              [ngModel]="fechaDesde()"
              (ngModelChange)="fechaDesde.set($event); cargarReportes()"
            />
          </div>
          <div class="flex items-center gap-2 glass px-3 py-1.5 rounded-lg border" style="border-color: var(--border-glass);">
            <label class="text-xs font-semibold" style="color: var(--text-muted);">Hasta:</label>
            <input
              type="date"
              class="bg-transparent text-xs font-semibold outline-none"
              style="color: var(--text-primary);"
              [ngModel]="fechaHasta()"
              (ngModelChange)="fechaHasta.set($event); cargarReportes()"
            />
          </div>

          <button
            type="button"
            class="px-4 py-2 text-xs font-bold rounded-lg text-white transition-opacity bg-blue-600 hover:opacity-90 flex items-center gap-1.5"
            (click)="exportarCsvActual()"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <!-- Solapas de Reporte -->
      <div class="flex border-b" style="border-color: var(--border-glass);">
        <button
          type="button"
          class="px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2"
          [class.border-blue-500]="tabActiva() === 'FINANCIERO'"
          [style.color]="tabActiva() === 'FINANCIERO' ? 'var(--accent-blue)' : 'var(--text-muted)'"
          (click)="setTab('FINANCIERO')"
        >
          Financiero y antigüedad de deuda
        </button>
        <button
          type="button"
          class="px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2"
          [class.border-blue-500]="tabActiva() === 'COMPRAS'"
          [style.color]="tabActiva() === 'COMPRAS' ? 'var(--accent-blue)' : 'var(--text-muted)'"
          (click)="setTab('COMPRAS')"
        >
          Compras y cuentas a pagar
        </button>
        <button
          type="button"
          class="px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2"
          [class.border-blue-500]="tabActiva() === 'PADRON'"
          [style.color]="tabActiva() === 'PADRON' ? 'var(--accent-blue)' : 'var(--text-muted)'"
          (click)="setTab('PADRON')"
        >
          Padrón y contratos
        </button>
      </div>

      @if (loading()) {
        <emx-loading-state />
      } @else if (error()) {
        <emx-error-state [message]="error()!" (retry)="cargarReportes()" />
      } @else {
        <!-- Solapa 1: Financiero -->
        @if (tabActiva() === 'FINANCIERO') {
          <div class="flex flex-col gap-6">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <emx-kpi-card label="Total cobrado" [value]="financiero()?.totalCobranza | moneda" accentColor="emerald" />
              <emx-kpi-card label="Total deuda pendiente" [value]="financiero()?.totalDeuda | moneda" [accentColor]="acentoDeuda()" />
              <emx-kpi-card label="Débitos procesados" [value]="financiero()?.totalDebitos | moneda" accentColor="amber" />
            </div>
            <p class="text-xs -mt-3" style="color: var(--text-muted);" data-testid="reporte-alcance">
              Cobranza: recibos registrados en Cuentas corrientes. Deuda pendiente: documentos de Cuentas corrientes.
              No incluye las cuotas de afiliados, que se controlan en Facturación.
            </p>

            <!-- Tabla de Facturación por Cliente -->
            <div class="glass rounded-panel p-4 border flex flex-col gap-3" style="border-color: var(--border-glass);">
              <h3 class="text-sm font-bold" style="color: var(--text-primary);">
                Facturación y saldo por cliente
              </h3>
              @if ((financiero()?.facturacionPorCliente?.length || 0) === 0) {
                <emx-empty-state message="Sin registros de facturación por cliente en el período." />
              } @else {
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="border-b text-muted font-semibold" style="border-color: var(--border-glass); color: var(--text-muted);">
                        <th class="py-2 px-3">Cliente</th>
                        <th class="py-2 px-3 text-right">Facturado</th>
                        <th class="py-2 px-3 text-right">Cobrado</th>
                        <th class="py-2 px-3 text-right">Saldo pendiente</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (c of financiero()?.facturacionPorCliente; track c.clienteId) {
                        <tr class="border-b hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style="border-color: var(--border-glass); color: var(--text-primary);">
                          <td class="py-2.5 px-3 font-semibold">{{ c.nombreCliente }}</td>
                          <td class="py-2.5 px-3 text-right tabular-nums">{{ c.totalFacturado | moneda }}</td>
                          <td class="py-2.5 px-3 text-right tabular-nums">{{ c.totalCobrado | moneda }}</td>
                          <td class="py-2.5 px-3 text-right tabular-nums font-bold" [class.text-slate-400]="!c.saldoPendiente">{{ c.saldoPendiente | moneda }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        }

        <!-- Solapa 2: Compras -->
        @if (tabActiva() === 'COMPRAS') {
          <div class="flex flex-col gap-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <emx-kpi-card label="Total a pagar a proveedores" [value]="compras()?.totalCuentasPorPagar | moneda" accentColor="blue" />
              <emx-kpi-card label="Proveedores con compras" [value]="compras()?.gastoPorProveedor?.length" accentColor="cyan" />
              <emx-kpi-card label="Centros de costo con gasto" [value]="compras()?.gastoPorCentroCosto?.length" accentColor="amber" />
              <emx-kpi-card label="Próximos pagos" [value]="compras()?.pagosProximos?.length" accentColor="amber" />
            </div>

            <!-- Tabla de Gasto por Proveedor -->
            <div class="glass rounded-panel p-4 border flex flex-col gap-3" style="border-color: var(--border-glass);">
              <h3 class="text-sm font-bold" style="color: var(--text-primary);">
                Gasto por proveedor
              </h3>
              @if ((compras()?.gastoPorProveedor?.length || 0) === 0) {
                <emx-empty-state message="Sin compras acumuladas en el período seleccionado." />
              } @else {
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="border-b text-muted font-semibold" style="border-color: var(--border-glass); color: var(--text-muted);">
                        <th class="py-2 px-3">Razón social</th>
                        <th class="py-2 px-3 text-right">Total acumulado</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (p of compras()?.gastoPorProveedor; track p.proveedorId) {
                        <tr class="border-b hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style="border-color: var(--border-glass); color: var(--text-primary);">
                          <td class="py-2.5 px-3 font-semibold">{{ p.razonSocial }}</td>
                          <td class="py-2.5 px-3 text-right tabular-nums font-bold">{{ p.totalGasto | moneda }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        }

        <!-- Solapa 3: Padrón y Contratos -->
        @if (tabActiva() === 'PADRON') {
          <div class="flex flex-col gap-6">
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <emx-kpi-card label="Afiliados activos" [value]="padron()?.totalAfiliadosActivos" accentColor="cyan" />
              <emx-kpi-card label="Altas en el período" [value]="padron()?.altasEnPeriodo" accentColor="emerald" />
              <emx-kpi-card label="Bajas en el período" [value]="padron()?.bajasEnPeriodo" accentColor="red" />
              <emx-kpi-card label="Grupos familiares" [value]="padron()?.totalGruposFamiliares" accentColor="blue" />
              <emx-kpi-card label="Contratos activos" [value]="padron()?.contratosActivos" accentColor="amber" />
              <emx-kpi-card label="Contratos por vencer" [value]="padron()?.contratosPorVencer" accentColor="amber" />
            </div>

            <!-- Tabla Resumen de Contratos por Vencer -->
            <div class="glass rounded-panel p-4 border flex flex-col gap-3" style="border-color: var(--border-glass);">
              <h3 class="text-sm font-bold" style="color: var(--text-primary);">
                Contratos próximos a vencer
              </h3>
              @if ((padron()?.resumenContratosPorVencer?.length || 0) === 0) {
                <emx-empty-state message="Sin contratos próximos a vencer." />
              } @else {
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="border-b text-muted font-semibold" style="border-color: var(--border-glass); color: var(--text-muted);">
                        <th class="py-2 px-3">Contrato N°</th>
                        <th class="py-2 px-3">Institución</th>
                        <th class="py-2 px-3">Vencimiento</th>
                        <th class="py-2 px-3 text-right">Días restantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (c of padron()?.resumenContratosPorVencer; track c.contratoId) {
                        <tr class="border-b hover:bg-black/5 dark:hover:bg-white/5 transition-colors" style="border-color: var(--border-glass); color: var(--text-primary);">
                          <td class="py-2.5 px-3 font-bold tabular-nums">{{ c.numeroContrato }}</td>
                          <td class="py-2.5 px-3 font-semibold">{{ c.institucionNombre }}</td>
                          <td class="py-2.5 px-3 tabular-nums">{{ c.fechaVencimiento | fecha }}</td>
                          <td class="py-2.5 px-3 text-right tabular-nums font-bold text-amber-600">{{ c.diasParaVencer }} días</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class ReportesAdminComponent implements OnInit {
  private readonly reportesApi = inject(ReportesApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly tabActiva = signal<ReporteTab>('FINANCIERO');

  readonly fechaDesde = signal<string>('');
  readonly fechaHasta = signal<string>('');

  readonly financiero = signal<ReporteFinancieroDTO | null>(null);
  readonly compras = signal<ReporteComprasDTO | null>(null);
  readonly padron = signal<ReportePadronContratosDTO | null>(null);

  /** Pending debt is "attention", not an error: amber when there is some, neutral at $0. */
  readonly acentoDeuda = computed<'amber' | 'cyan'>(() => ((this.financiero()?.totalDeuda ?? 0) > 0 ? 'amber' : 'cyan'));

  ngOnInit(): void {
    this.cargarReportes();
  }

  setTab(tab: ReporteTab): void {
    this.tabActiva.set(tab);
  }

  cargarReportes(): void {
    this.loading.set(true);
    this.error.set(null);

    const d = this.fechaDesde() ? `${this.fechaDesde()}T00:00:00Z` : undefined;
    const h = this.fechaHasta() ? `${this.fechaHasta()}T23:59:59Z` : undefined;

    forkJoin({
      fin: this.reportesApi.financiero(d, h).pipe(catchError(() => of(null))),
      com: this.reportesApi.compras(d, h).pipe(catchError(() => of(null))),
      pad: this.reportesApi.padronContratos(d, h).pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ fin, com, pad }) => {
        if (!fin && !com && !pad) {
          this.error.set('No se pudo cargar la información de reportes desde el servidor.');
        } else {
          this.financiero.set(fin);
          this.compras.set(com);
          this.padron.set(pad);
        }
        this.loading.set(false);
      });
  }

  exportarCsvActual(): void {
    const tab = this.tabActiva();
    let csvContent = 'data:text/csv;charset=utf-8,';
    let filename = `reporte-${tab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (tab === 'FINANCIERO') {
      csvContent += 'Cliente,Total Facturado,Total Cobrado,Saldo Pendiente\n';
      const items = this.financiero()?.facturacionPorCliente || [];
      items.forEach((item) => {
        csvContent += `"${item.nombreCliente || ''}",${item.totalFacturado || 0},${item.totalCobrado || 0},${item.saldoPendiente || 0}\n`;
      });
    } else if (tab === 'COMPRAS') {
      csvContent += 'Razon Social,Total Gasto\n';
      const items = this.compras()?.gastoPorProveedor || [];
      items.forEach((item) => {
        csvContent += `"${item.razonSocial || ''}",${item.totalGasto || 0}\n`;
      });
    } else {
      csvContent += 'Numero Contrato,Institucion,Fecha Vencimiento,Dias Para Vencer\n';
      const items = this.padron()?.resumenContratosPorVencer || [];
      items.forEach((item) => {
        csvContent += `"${item.numeroContrato || ''}","${item.institucionNombre || ''}",${item.fechaVencimiento || ''},${item.diasParaVencer || 0}\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
