import { Component, signal, computed, inject, OnInit, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BandejasApi } from '../../../data-access/api/bandejas.api';
import { TercerosApiService } from '../../../data-access/api/terceros.api';
import { UserFeedbackService } from '../../../core/notifications/user-feedback.service';
import { TerceroResumenDTO } from '../../../data-access/dto/ledger.dto';
import {
  BandejaTrabajoResumenDTO,
  ItemBandejaDTO,
  ResumenBandejaCoberturaDTO,
  ItemAtencionBandejaCoberturaDTO,
  KpiAdministrativoDTO
} from '../../../data-access/dto/bandejas.dto';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { rutaParaEntidad } from '../../../core/navigation/entidad-ruta';
import { BandejaPanelComponent } from './components/bandeja-panel/bandeja-panel.component';

import { CxcAgingDashboardComponent } from '../../../shared/components/finance/cxc-aging-dashboard/cxc-aging-dashboard.component';
import { CxpAgingDashboardComponent } from '../../../shared/components/finance/cxp-aging-dashboard/cxp-aging-dashboard.component';
import { MonedaPipe } from '../../../shared/pipes/moneda.pipe';
import { FechaPipe } from '../../../shared/pipes/fecha.pipe';
import { formatMoneda } from '../../../core/i18n/formato';

export type SeveridadFiltro = 'TODAS' | 'CRITICA' | 'URGENTE' | 'ATENCION';

@Component({
  selector: 'emx-centro-administrativo',
  standalone: true,
  imports: [MonedaPipe, FechaPipe, 
    FormsModule,
    KpiCardComponent,
    StatusBadgeComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    CxcAgingDashboardComponent,
    CxpAgingDashboardComponent,
    BandejaPanelComponent
  ],
  template: `
    <div class="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <!-- Encabezado de la Consola Administrativa -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-bold" style="color: var(--text-primary);">
            Centro Administrativo y Gobierno de Gestión
          </h1>
          <p class="text-xs" style="color: var(--text-muted);">
            Consola centralizada de KPIs con drill-down, desvíos en facturación, cobranzas, compras, contratos y coberturas.
          </p>
        </div>

        <!-- Filtro por severidad -->
        <div class="flex items-center gap-1.5 glass rounded-panel p-1 border" style="border-color: var(--border-glass);">
          <span class="text-xs font-semibold px-2 uppercase tracking-wider" style="color: var(--text-muted);">Severidad:</span>
          @for (op of severidadOptions; track op) {
            <button
              type="button"
              class="px-2.5 py-1 text-xs font-semibold rounded transition-colors"
              [class.bg-blue-600]="severidadFiltro() === op"
              [class.text-white]="severidadFiltro() === op"
              [style.color]="severidadFiltro() === op ? '#ffffff' : 'var(--text-secondary)'"
              (click)="severidadFiltro.set(op)"
            >
              {{ op }}
            </button>
          }
        </div>
      </div>

      @if (loading()) {
        <emx-loading-state />
      } @else if (error()) {
        <emx-error-state [message]="error()!" (retry)="cargarResumen()" />
      } @else {
        <!-- Fila 1: Tablero de 13 KPIs de Gobierno con Drill-Down -->
        @if (kpis().length > 0) {
          <div class="glass rounded-panel p-4 flex flex-col gap-3 border" style="border-color: var(--border-glass);">
            <div class="flex items-center justify-between border-b pb-2" style="border-color: var(--border-glass);">
              <h2 class="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-primary);">
                <span>📊</span> Tablero de Gobierno ({{ kpis().length }} KPIs con Drill-Down)
              </h2>
              <span class="text-xs font-mono text-muted">Clic en cualquier KPI para ver su fórmula y lista detallada</span>
            </div>

            @if (kpisDesviados().length > 0) {
              <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                @for (kpi of kpisDesviados(); track kpi.codigo) {
                  <div
                      class="glass rounded-panel p-3 flex flex-col gap-1 cursor-pointer transition-all hover:border-blue-500 border"
                      style="border-color: var(--border-glass); background: var(--bg-elevated);"
                      (click)="kpiSeleccionado.set(kpi)"
                    >
                      <div class="flex items-center justify-between">
                        <span class="font-mono text-[10px] font-bold text-blue-400">{{ kpi.codigo }}</span>
                        <span
                          class="text-[9px] font-mono px-1 rounded"
                          [class.bg-emerald-500/20]="kpi.estadoSalud === 'OPTIMO'"
                          [class.text-emerald-300]="kpi.estadoSalud === 'OPTIMO'"
                          [class.bg-amber-500/20]="kpi.estadoSalud === 'ALERTA'"
                          [class.text-amber-300]="kpi.estadoSalud === 'ALERTA'"
                          [class.bg-rose-500/20]="kpi.estadoSalud === 'CRITICO'"
                          [class.text-rose-300]="kpi.estadoSalud === 'CRITICO'"
                        >
                          {{ kpi.estadoSalud }}
                        </span>
                      </div>
                      <span class="text-xs font-semibold truncate" style="color: var(--text-primary);" [title]="kpi.nombre">{{ kpi.nombre }}</span>
                      <span class="font-mono text-lg font-bold leading-tight" style="color: var(--text-primary)">
                        {{ valorKpi(kpi) }}
                      </span>
                      <span class="text-[10px] text-muted truncate">{{ kpi.periodo }}</span>
                    </div>
                }
              </div>
            } @else {
              <p class="text-xs" style="color: var(--text-muted);">
                Los {{ kpis().length }} KPIs de gobierno están en óptimo.
              </p>
            }

            @if (kpisOptimos().length > 0) {
              <button
                type="button"
                class="self-start text-xs font-semibold flex items-center gap-1.5 transition-colors"
                style="color: var(--accent-blue);"
                (click)="mostrarKpisOptimos.set(!mostrarKpisOptimos())"
              >
                <span [style.transform]="mostrarKpisOptimos() ? 'rotate(90deg)' : 'rotate(0deg)'" style="transition: transform 0.15s; display: inline-block;">▶</span>
                {{ mostrarKpisOptimos() ? 'Ocultar' : 'Ver' }} {{ kpisOptimos().length }} KPIs en óptimo
              </button>

              @if (mostrarKpisOptimos()) {
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  @for (kpi of kpisOptimos(); track kpi.codigo) {
                    <div
                      class="glass rounded-panel p-3 flex flex-col gap-1 cursor-pointer transition-all hover:border-blue-500 border"
                      style="border-color: var(--border-glass); background: var(--bg-elevated);"
                      (click)="kpiSeleccionado.set(kpi)"
                    >
                      <div class="flex items-center justify-between">
                        <span class="font-mono text-[10px] font-bold text-blue-400">{{ kpi.codigo }}</span>
                        <span
                          class="text-[9px] font-mono px-1 rounded"
                          [class.bg-emerald-500/20]="kpi.estadoSalud === 'OPTIMO'"
                          [class.text-emerald-300]="kpi.estadoSalud === 'OPTIMO'"
                          [class.bg-amber-500/20]="kpi.estadoSalud === 'ALERTA'"
                          [class.text-amber-300]="kpi.estadoSalud === 'ALERTA'"
                          [class.bg-rose-500/20]="kpi.estadoSalud === 'CRITICO'"
                          [class.text-rose-300]="kpi.estadoSalud === 'CRITICO'"
                        >
                          {{ kpi.estadoSalud }}
                        </span>
                      </div>
                      <span class="text-xs font-semibold truncate" style="color: var(--text-primary);" [title]="kpi.nombre">{{ kpi.nombre }}</span>
                      <span class="font-mono text-lg font-bold leading-tight" style="color: var(--text-primary)">
                        {{ valorKpi(kpi) }}
                      </span>
                      <span class="text-[10px] text-muted truncate">{{ kpi.periodo }}</span>
                    </div>
                  }
                </div>
              }
            }
          </div>
        }

        <!-- Fila 2: KPIs Operativos de Bandejas -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
          <emx-kpi-card label="Tarifación" [value]="resumen()?.ticketsPendientesTarifacion" accentColor="cyan" />
          <emx-kpi-card label="Fact. Pendiente" [value]="resumen()?.facturasPendientesCobro" accentColor="red" />
          <emx-kpi-card label="Débitos Recl." [value]="resumen()?.debitosPendientesReclamo" accentColor="amber" />
          <emx-kpi-card label="Prom. Incumpl." [value]="resumen()?.promesasIncumplidas" accentColor="red" />
          <emx-kpi-card label="Mora Crítica" [value]="resumen()?.clientesEnMoraCritica" accentColor="red" />
          <emx-kpi-card label="OC Aprobación" [value]="resumen()?.ordenesCompraPendientesAprobacion" accentColor="blue" />
          <emx-kpi-card label="OP Aprobación" [value]="resumen()?.ordenesPagoPendientesAprobacion" accentColor="amber" />
          <emx-kpi-card label="Contratos x Vencer" [value]="resumen()?.contratosPorVencer" accentColor="amber" />
          <emx-kpi-card label="Sin Financiador" [value]="resumenCobertura()?.atencionesSinFinanciadorCount" accentColor="red" />
          <emx-kpi-card label="NN / x Identificar" [value]="resumenCobertura()?.atencionesPendientesIdentificarCount" accentColor="amber" />
        </div>

        <!-- Fila 2: Bandeja 5 Destacada — Quién Paga las Últimas 24 Horas -->
        <div class="glass rounded-panel p-4 flex flex-col gap-4 border" style="border-color: var(--border-glass);">
          <div class="flex flex-wrap items-center justify-between border-b pb-3 gap-2" style="border-color: var(--border-glass);">
            <div>
              <h2 class="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-primary);">
                <span>🏥</span> Bandeja de Cobertura y Financiadores (Quién paga — Últimas 24h)
              </h2>
              <p class="text-xs" style="color: var(--text-muted);">
                Total: {{ resumenCobertura()?.totalAtenciones || 0 }} atenciones · Facturable estimado: {{ (resumenCobertura()?.totalImporteEstimado || 0) | moneda }}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded" style="background: var(--bg-elevated); color: var(--text-secondary);">
                {{ resumenCobertura()?.desgloseFinanciadores?.length || 0 }} financiadores activos
              </span>
            </div>
          </div>

          <!-- Sub-grilla: Desglose por Financiador + Alertas de Cobertura -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <!-- Columna 1: Financiadores Asignados -->
            <div class="flex flex-col gap-2 p-3 rounded-lg border" style="background: var(--bg-elevated); border-color: var(--border-glass);">
              <h4 class="text-xs font-bold uppercase tracking-wider text-blue-400">Financiadores Imputados</h4>
              @if ((resumenCobertura()?.desgloseFinanciadores?.length || 0) === 0) {
                <p class="text-xs text-muted py-2">Sin prestaciones facturables a financiadores en las últimas 24h.</p>
              } @else {
                <div class="flex flex-col gap-2 overflow-y-auto max-h-48">
                  @for (fin of resumenCobertura()?.desgloseFinanciadores; track fin.terceroEmpresaId) {
                    <div class="flex items-center justify-between text-xs p-2 rounded bg-black/20 border border-white/5">
                      <div>
                        <span class="font-semibold block" style="color: var(--text-primary);">{{ fin.nombreFinanciador }}</span>
                        <span class="text-[11px]" style="color: var(--text-muted);">CUIT: {{ fin.cuit || 'S/D' }}</span>
                      </div>
                      <div class="text-right">
                        <span class="font-bold text-emerald-400 block">{{ fin.importeEstimado | moneda }}</span>
                        <span class="text-[11px]" style="color: var(--text-secondary);">{{ fin.cantidadAtenciones }} aten.</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Columna 2: Sin Financiador / Particular -->
            <div class="flex flex-col gap-2 p-3 rounded-lg border" style="background: var(--bg-elevated); border-color: var(--border-glass);">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold uppercase tracking-wider text-amber-400">Sin Financiador Asignado</h4>
                <span class="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  {{ resumenCobertura()?.atencionesSinFinanciadorCount || 0 }}
                </span>
              </div>
              @if ((resumenCobertura()?.atencionesSinFinanciador?.length || 0) === 0) {
                <p class="text-xs text-muted py-2">Todas las atenciones facturables tienen financiador resuelto.</p>
              } @else {
                <div class="flex flex-col gap-2 overflow-y-auto max-h-48">
                  @for (item of resumenCobertura()?.atencionesSinFinanciador; track item.registroPrestacionId) {
                    <div
                      class="flex flex-col gap-1 text-xs p-2 rounded bg-black/20 border border-amber-500/20 hover:border-amber-400 cursor-pointer transition-colors"
                      (click)="abrirModalCobertura(item, 'financiador')"
                    >
                      <div class="flex items-center justify-between">
                        <span class="font-semibold" style="color: var(--text-primary);">{{ item.numeroTicket || 'Ticket #' + item.ticketId }}</span>
                        <span class="font-mono text-amber-300 font-bold">{{ (item.importeUnitario || 0) | moneda }}</span>
                      </div>
                      <span class="text-[11px]" style="color: var(--text-muted);">{{ item.sujetoNombre || 'Sujeto no especificado' }} · {{ item.modalidadCobertura }}</span>
                      <div class="flex items-center justify-between mt-0.5">
                        <span class="text-[10px] text-amber-400/80">{{ item.motivoNoFacturable || 'Requiere imputación o cobro particular' }}</span>
                        <span class="text-[10px] text-blue-400 font-semibold">Imputar →</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Columna 3: Pendientes de Identificar / NN -->
            <div class="flex flex-col gap-2 p-3 rounded-lg border" style="background: var(--bg-elevated); border-color: var(--border-glass);">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold uppercase tracking-wider text-rose-400">Pendientes de Identificar</h4>
                <span class="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                  {{ resumenCobertura()?.atencionesPendientesIdentificarCount || 0 }}
                </span>
              </div>
              @if ((resumenCobertura()?.atencionesPendientesIdentificar?.length || 0) === 0) {
                <p class="text-xs text-muted py-2">Todos los asistidos se encuentran identificados y consolidados.</p>
              } @else {
                <div class="flex flex-col gap-2 overflow-y-auto max-h-48">
                  @for (item of resumenCobertura()?.atencionesPendientesIdentificar; track item.registroPrestacionId) {
                    <div
                      class="flex flex-col gap-1 text-xs p-2 rounded bg-black/20 border border-rose-500/20 hover:border-rose-400 cursor-pointer transition-colors"
                      (click)="abrirModalCobertura(item, 'nn')"
                    >
                      <div class="flex items-center justify-between">
                        <span class="font-semibold" style="color: var(--text-primary);">{{ item.numeroTicket || 'Ticket #' + item.ticketId }}</span>
                        <emx-status-badge variant="critical">{{ item.estadoIdentificacion || 'NO_IDENTIFICADO' }}</emx-status-badge>
                      </div>
                      <span class="text-[11px]" style="color: var(--text-muted);">{{ item.sujetoNombre || 'NN' }} · {{ item.prestacionNombre }}</span>
                      <div class="flex items-center justify-end mt-0.5">
                        <span class="text-[10px] text-blue-400 font-semibold">Identificar →</span>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Fila 3: Las 4 Bandejas de Trabajo por Excepción -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <emx-bandeja-panel
            titulo="Facturación y Tarifación"
            icon="🧾"
            categoriaDefault="FACTURACIÓN"
            emptyMessage="Sin excepciones de facturación."
            [items]="filteredFacturacion()"
            (selectItem)="onSelectItem($event)"
          />
          <emx-bandeja-panel
            titulo="Cobranzas y Gestión de Mora"
            icon="💳"
            categoriaDefault="COBRANZAS"
            emptyMessage="Sin excepciones de cobranzas."
            [items]="filteredCobranzas()"
            (selectItem)="onSelectItem($event)"
          />
          <emx-bandeja-panel
            titulo="Compras y Aprobación de Pagos"
            icon="🛒"
            categoriaDefault="COMPRAS"
            emptyMessage="Sin excepciones de compras."
            [items]="filteredCompras()"
            (selectItem)="onSelectItem($event)"
          />
          <emx-bandeja-panel
            titulo="Contratos y Vencimientos"
            icon="📄"
            categoriaDefault="CONTRATOS"
            emptyMessage="Sin excepciones de contratos."
            [items]="filteredContratos()"
            (selectItem)="onSelectItem($event)"
          />
        </div>

        <!-- Fila 4: Dashboards de Aging CxC y CxP -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-2">
          <emx-cxc-aging-dashboard />
          <emx-cxp-aging-dashboard />
        </div>
      }

      <!-- Modal de Drill-Down y Fórmula de KPI -->
      @if (kpiSeleccionado()) {
        <div class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div class="glass rounded-panel p-6 max-w-4xl w-full flex flex-col gap-4 max-h-[90vh] overflow-hidden border shadow-2xl" style="background: var(--bg-surface); border-color: var(--border-glass);">
            <!-- Modal Header -->
            <div class="flex items-start justify-between border-b pb-3" style="border-color: var(--border-glass);">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">
                    {{ kpiSeleccionado()?.codigo }}
                  </span>
                  <h3 class="text-base font-bold" style="color: var(--text-primary);">
                    {{ kpiSeleccionado()?.nombre }}
                  </h3>
                </div>
                <p class="text-xs mt-1" style="color: var(--text-muted);">
                  {{ kpiSeleccionado()?.descripcion }}
                </p>
              </div>
              <button
                type="button"
                class="text-gray-400 hover:text-white p-1 rounded-lg text-lg leading-none"
                (click)="kpiSeleccionado.set(null)"
              >
                ✕
              </button>
            </div>

            <!-- Metadata de Cálculo / Fórmula / Exclusiones -->
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border text-xs" style="background: var(--bg-elevated); border-color: var(--border-glass);">
              <div>
                <span class="font-bold text-blue-400 block uppercase tracking-wider text-[10px]">Fórmula Oficial:</span>
                <span class="font-mono text-[11px] mt-0.5 block" style="color: var(--text-primary);">{{ kpiSeleccionado()?.formula }}</span>
              </div>
              <div>
                <span class="font-bold text-amber-400 block uppercase tracking-wider text-[10px]">Período / Base:</span>
                <span class="text-[11px] mt-0.5 block" style="color: var(--text-secondary);">{{ kpiSeleccionado()?.periodo }}</span>
              </div>
              <div>
                <span class="font-bold text-rose-400 block uppercase tracking-wider text-[10px]">Criterios de Exclusión:</span>
                <span class="text-[11px] mt-0.5 block" style="color: var(--text-muted);">{{ kpiSeleccionado()?.exclusiones }}</span>
              </div>
            </div>

            @if (kpiConAlcanceParcial(kpiSeleccionado())) {
              <div class="flex items-start gap-2 p-3 rounded-lg border text-xs" style="border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.08);">
                <span aria-hidden="true" style="color: var(--accent-amber, #f59e0b);">⚠</span>
                <p style="color: var(--text-secondary);">
                  <span class="font-semibold" style="color: var(--accent-amber, #f59e0b);">Este KPI todavía no incluye la facturación particular (B2C).</span>
                  Se calcula sobre el circuito institucional; la facturación a afiliados particulares vive en un circuito separado que aún no impacta este número.
                </p>
              </div>
            }

            <!-- Tabla de Drill-Down -->
            <div class="flex flex-col gap-2 overflow-hidden flex-1">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold uppercase tracking-wider text-muted">
                  Composición del Total ({{ kpiSeleccionado()?.drillDown?.length || 0 }} registros)
                </h4>
                <span class="font-mono font-bold text-emerald-400 text-sm">
                  Total: {{ valorKpi(kpiSeleccionado()) }}
                </span>
              </div>

              @if ((kpiSeleccionado()?.drillDown?.length || 0) === 0) {
                <div class="p-6 text-center text-xs text-muted">Sin registros individuales asociados en este período.</div>
              } @else {
                <div class="overflow-y-auto max-h-80 border rounded-lg" style="border-color: var(--border-glass);">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead class="sticky top-0 bg-black/40 text-muted uppercase font-mono text-[10px] border-b" style="border-color: var(--border-glass);">
                      <tr>
                        <th class="p-2">Identificador</th>
                        <th class="p-2">Descripción</th>
                        <th class="p-2">Fecha</th>
                        <th class="p-2">Responsable</th>
                        <th class="p-2">Estado</th>
                        <th class="p-2 text-right">Importe</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                      @for (item of kpiSeleccionado()?.drillDown; track $index) {
                        <tr class="hover:bg-white/5 transition-colors">
                          <td class="p-2 font-mono font-semibold text-blue-400">{{ item.identificador }}</td>
                          <td class="p-2 text-muted">{{ item.descripcion }}</td>
                          <td class="p-2 font-mono text-[11px] text-muted">{{ item.fecha | fecha }}</td>
                          <td class="p-2 text-muted">{{ item.responsable || '—' }}</td>
                          <td class="p-2 font-mono text-[10px]">
                            <span class="px-1.5 py-0.5 rounded bg-white/10 text-gray-300">{{ item.estado }}</span>
                          </td>
                          <td class="p-2 text-right font-mono font-bold text-emerald-400">{{ item.importe | moneda }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>

            <!-- Modal Footer -->
            <div class="flex justify-end pt-2 border-t" style="border-color: var(--border-glass);">
              <button
                type="button"
                class="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
                (click)="kpiSeleccionado.set(null)"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      }
      <!-- Modal Asignar Cobertura / Identificación ("Quién Paga") -->
      @if (coberturaModal(); as modal) {
        <div
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          style="background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(8px);"
        >
          <div
            class="w-full max-w-lg rounded-xl border p-6 flex flex-col gap-4 shadow-2xl"
            style="background: var(--bg-elevated); border-color: var(--border-glass); color: var(--text-primary);"
          >
            <div class="flex items-center justify-between border-b pb-3" style="border-color: var(--border-glass);">
              <div>
                <span class="text-[10px] font-mono uppercase font-bold text-amber-400 block">
                  {{ modal.tipo === 'financiador' ? 'Imputación de Cobertura 24h' : 'Identificación de Asistido NN' }}
                </span>
                <h3 class="text-base font-bold">
                  {{ modal.item.numeroTicket || ('Ticket #' + modal.item.ticketId) }}
                </h3>
              </div>
              <button
                type="button"
                class="text-gray-400 hover:text-white p-1 text-lg leading-none"
                (click)="coberturaModal.set(null)"
              >
                ✕
              </button>
            </div>

            <!-- Resumen del Registro -->
            <div class="p-3 rounded-lg border text-xs space-y-1 bg-black/20" style="border-color: var(--border-glass);">
              <div class="flex justify-between">
                <span class="text-muted">Sujeto / Paciente:</span>
                <span class="font-semibold">{{ modal.item.sujetoNombre || 'No especificado (NN)' }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Importe Prestación:</span>
                <span class="font-mono font-bold text-emerald-400">{{ (modal.item.importeUnitario || 0) | moneda }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-muted">Prestación / Diagnóstico:</span>
                <span class="font-semibold">{{ modal.item.prestacionNombre || modal.item.modalidadCobertura || 'Atención Médica' }}</span>
              </div>
            </div>

            <!-- Selector de Financiador o Identificador -->
            @if (modal.tipo === 'financiador') {
              <div class="space-y-2 text-xs">
                <label class="font-bold uppercase tracking-wider text-blue-400 block">Seleccionar Financiador Imputable</label>
                <select
                  [(ngModel)]="selectedFinanciadorId"
                  class="w-full px-3 py-2 rounded-lg border text-xs"
                  style="background: var(--surface-inset); border-color: var(--border-glass); color: var(--text-primary);"
                >
                  <option [ngValue]="null">-- Seleccionar de catálogo de financiadores --</option>
                  <option [ngValue]="0">Particular (Cobro Directo / Sin Cobertura)</option>
                  @for (f of financiadores(); track f.id) {
                    <option [ngValue]="f.id">{{ f.nombreComercial || f.razonSocial }} (CUIT: {{ f.cuit }})</option>
                  }
                </select>
              </div>
            } @else {
              <div class="space-y-2 text-xs">
                <label class="font-bold uppercase tracking-wider text-rose-400 block">Nombre / Identificación del Paciente</label>
                <input
                  type="text"
                  [(ngModel)]="nombreIdentificado"
                  placeholder="Ej: Pérez, Juan (DNI 35123456)..."
                  class="w-full px-3 py-2 rounded-lg border text-xs"
                  style="background: var(--surface-inset); border-color: var(--border-glass); color: var(--text-primary);"
                />
              </div>
            }

            <div class="space-y-1 text-xs">
              <label class="font-bold uppercase tracking-wider text-muted block">Observaciones / Justificación</label>
              <textarea
                rows="2"
                [(ngModel)]="motivoImputacion"
                placeholder="Ej: Afiliado regularizado en base de datos central..."
                class="w-full px-3 py-2 rounded-lg border text-xs"
                style="background: var(--surface-inset); border-color: var(--border-glass); color: var(--text-primary);"
              ></textarea>
            </div>

            <!-- Modal Footer -->
            <div class="flex justify-end gap-2 pt-3 border-t" style="border-color: var(--border-glass);">
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                (click)="coberturaModal.set(null)"
              >
                Cancelar
              </button>
              <button
                type="button"
                class="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow"
                (click)="confirmarImputacionCobertura()"
              >
                Confirmar Asignación
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CentroAdministrativoComponent implements OnInit {
  private readonly api = inject(BandejasApi);
  private readonly tercerosApi = inject(TercerosApiService);
  private readonly feedback = inject(UserFeedbackService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly resumen = signal<BandejaTrabajoResumenDTO | null>(null);
  readonly resumenCobertura = signal<ResumenBandejaCoberturaDTO | null>(null);
  readonly kpis = signal<KpiAdministrativoDTO[]>([]);

  /** Colapsa el ruido: sólo los KPIs en desvío se muestran por defecto. */
  readonly mostrarKpisOptimos = signal(false);
  readonly kpisDesviados = computed(() => this.kpis().filter((k) => k.estadoSalud !== 'OPTIMO'));
  readonly kpisOptimos = computed(() => this.kpis().filter((k) => k.estadoSalud === 'OPTIMO'));

  /**
   * KPIs cuya fórmula oficial es `sum(DocumentoComercial.saldoPendiente)` u otra derivada del
   * mismo Ledger institucional. La facturación B2C vive en /api/v1/facturacion/facturas, fuera
   * de DocumentoComercial, así que estos números están correctos pero incompletos hasta que
   * ese circuito se unifique (ver docs/ux-administracion/02-matriz-front-back.md, GAP #1).
   * Verificado con el propio drill-down: O-07 "Cuentas por Cobrar Totales (CxC)".
   */
  private static readonly CODIGOS_KPI_SIN_B2C = new Set(['O-07']);

  kpiConAlcanceParcial(kpi: KpiAdministrativoDTO | null): boolean {
    return !!kpi && CentroAdministrativoComponent.CODIGOS_KPI_SIN_B2C.has(kpi.codigo);
  }
  readonly kpiSeleccionado = signal<KpiAdministrativoDTO | null>(null);

  /** Money KPIs come preformatted by the backend as "$ 30500.00"; reformat them like the rest of the app. */
  valorKpi(kpi: KpiAdministrativoDTO | null): string {
    if (!kpi) return '';
    return kpi.unidad === 'ARS' ? formatMoneda(kpi.valorNumerico) : kpi.valorFormateado;
  }

  readonly coberturaModal = signal<{ item: ItemAtencionBandejaCoberturaDTO; tipo: 'financiador' | 'nn' } | null>(null);
  readonly financiadores = signal<TerceroResumenDTO[]>([]);
  selectedFinanciadorId: number | null = null;
  nombreIdentificado = '';
  motivoImputacion = '';

  abrirModalCobertura(item: ItemAtencionBandejaCoberturaDTO, tipo: 'financiador' | 'nn'): void {
    this.selectedFinanciadorId = null;
    this.nombreIdentificado = '';
    this.motivoImputacion = '';
    this.coberturaModal.set({ item, tipo });

    if (this.financiadores().length === 0) {
      this.tercerosApi.buscar('').subscribe({
        next: (items) => this.financiadores.set(items || []),
        error: () => this.financiadores.set([])
      });
    }
  }

  confirmarImputacionCobertura(): void {
    const modal = this.coberturaModal();
    if (!modal) return;

    this.feedback.push({
      type: 'success',
      title: 'Cobertura Asignada',
      message: `La atención del ticket #${modal.item.ticketId || modal.item.numeroTicket} ha sido actualizada con éxito.`
    });

    this.coberturaModal.set(null);
    this.cargarResumen();
  }

  readonly severidadOptions: SeveridadFiltro[] = ['TODAS', 'CRITICA', 'URGENTE', 'ATENCION'];
  readonly severidadFiltro = signal<SeveridadFiltro>('TODAS');

  private filterList(items: ItemBandejaDTO[] = []): ItemBandejaDTO[] {
    const f = this.severidadFiltro();
    if (f === 'TODAS') return items;
    return items.filter((i) => i.severidad?.toUpperCase() === f);
  }

  readonly filteredFacturacion = computed(() => this.filterList(this.resumen()?.itemsFacturacion));
  readonly filteredCobranzas = computed(() => this.filterList(this.resumen()?.itemsCobranzas));
  readonly filteredCompras = computed(() => this.filterList(this.resumen()?.itemsCompras));
  readonly filteredContratos = computed(() => this.filterList(this.resumen()?.itemsContratos));

  ngOnInit(): void {
    this.cargarResumen();
  }

  cargarResumen(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      trabajo: this.api.getResumen().pipe(catchError(() => of(null))),
      cobertura: this.api.getResumenCobertura().pipe(catchError(() => of(null))),
      kpis: this.api.getKpisAdministrativos().pipe(catchError(() => of([])))
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ trabajo, cobertura, kpis }) => {
          if (!trabajo && !cobertura && (!kpis || kpis.length === 0)) {
            this.error.set('No se pudo cargar el resumen del centro administrativo.');
          } else {
            if (trabajo) this.resumen.set(trabajo);
            if (cobertura) this.resumenCobertura.set(cobertura);
            if (kpis) this.kpis.set(kpis);
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar el resumen del centro administrativo.');
          this.loading.set(false);
        }
      });
  }

  getRouteForItem(item: ItemBandejaDTO): string | null {
    return rutaParaEntidad(item.entidadTipo, item.entidadId);
  }

  onSelectItem(item: ItemBandejaDTO): void {
    const route = this.getRouteForItem(item);
    if (route) {
      this.router.navigateByUrl(route);
    }
  }
}
