import { Component, signal, computed, inject, OnInit, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BandejasApi } from '../../../data-access/api/bandejas.api';
import {
  BandejaTrabajoResumenDTO,
  ItemBandejaDTO,
  ResumenBandejaCoberturaDTO,
  KpiAdministrativoDTO
} from '../../../data-access/dto/bandejas.dto';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { rutaParaEntidad } from '../../../core/navigation/entidad-ruta';

import { CxcAgingDashboardComponent } from '../../../shared/components/finance/cxc-aging-dashboard/cxc-aging-dashboard.component';
import { CxpAgingDashboardComponent } from '../../../shared/components/finance/cxp-aging-dashboard/cxp-aging-dashboard.component';

export type SeveridadFiltro = 'TODAS' | 'CRITICA' | 'URGENTE' | 'ATENCION';

@Component({
  selector: 'emx-centro-administrativo',
  standalone: true,
  imports: [
    KpiCardComponent,
    StatusBadgeComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    CxcAgingDashboardComponent,
    CxpAgingDashboardComponent
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
                <span>📊</span> Tablero de Gobierno y Métricas Clave (13 KPIs con Drill-Down)
              </h2>
              <span class="text-xs font-mono text-muted">Clic en cualquier KPI para ver su fórmula y lista detallada</span>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              @for (kpi of kpis(); track kpi.codigo) {
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
                    {{ kpi.valorFormateado }}
                  </span>
                  <span class="text-[10px] text-muted truncate">{{ kpi.periodo }}</span>
                </div>
              }
            </div>
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
                Total: {{ resumenCobertura()?.totalAtenciones || 0 }} atenciones · Facturable estimado: $ {{ resumenCobertura()?.totalImporteEstimado || 0 }}
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
                        <span class="font-bold text-emerald-400 block">$ {{ fin.importeEstimado }}</span>
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
                    <div class="flex flex-col gap-1 text-xs p-2 rounded bg-black/20 border border-amber-500/20">
                      <div class="flex items-center justify-between">
                        <span class="font-semibold" style="color: var(--text-primary);">{{ item.numeroTicket || 'Ticket #' + item.ticketId }}</span>
                        <span class="font-mono text-amber-300 font-bold">$ {{ item.importeUnitario || 0 }}</span>
                      </div>
                      <span class="text-[11px]" style="color: var(--text-muted);">{{ item.sujetoNombre || 'Sujeto no especificado' }} · {{ item.modalidadCobertura }}</span>
                      <span class="text-[10px] text-amber-400/80">{{ item.motivoNoFacturable || 'Requiere imputación o cobro particular' }}</span>
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
                    <div class="flex flex-col gap-1 text-xs p-2 rounded bg-black/20 border border-rose-500/20">
                      <div class="flex items-center justify-between">
                        <span class="font-semibold" style="color: var(--text-primary);">{{ item.numeroTicket || 'Ticket #' + item.ticketId }}</span>
                        <emx-status-badge variant="critical">{{ item.estadoIdentificacion || 'NO_IDENTIFICADO' }}</emx-status-badge>
                      </div>
                      <span class="text-[11px]" style="color: var(--text-muted);">{{ item.sujetoNombre || 'NN' }} · {{ item.prestacionNombre }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          </div>
        </div>

        <!-- Fila 3: Las 4 Bandejas Tradicionales de Trabajo por Excepción -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
          <!-- Bandeja 1: Facturación por Excepción -->
          <div class="glass rounded-panel p-4 flex flex-col gap-3 border" style="border-color: var(--border-glass);">
            <div class="flex items-center justify-between border-b pb-2" style="border-color: var(--border-glass);">
              <h3 class="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-primary);">
                <span>🧾</span> Facturación y Tarifación
              </h3>
              <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded" style="background: var(--bg-elevated); color: var(--text-secondary);">
                {{ filteredFacturacion().length }} ítems
              </span>
            </div>

            @if (filteredFacturacion().length === 0) {
              <emx-empty-state message="Sin excepciones de facturación." />
            } @else {
              <div class="flex flex-col gap-2 overflow-y-auto max-h-80 pr-1">
                @for (item of filteredFacturacion(); track $index) {
                  <div
                    class="p-3 rounded-lg border flex flex-col gap-1.5 transition-all"
                    [class.cursor-pointer]="getRouteForItem(item) !== null"
                    [class.hover:border-blue-500]="getRouteForItem(item) !== null"
                    style="background: var(--bg-elevated); border-color: var(--border-glass);"
                    (click)="onSelectItem(item)"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-xs font-bold" style="color: var(--text-primary);">{{ item.titulo }}</span>
                      <emx-status-badge [variant]="mapSeveridadBadge(item.severidad)">
                        {{ item.severidad }}
                      </emx-status-badge>
                    </div>
                    @if (item.detalle) {
                      <p class="text-xs leading-relaxed" style="color: var(--text-muted);">{{ item.detalle }}</p>
                    }
                    <div class="flex items-center justify-between text-[11px] font-mono mt-1 pt-1 border-t" style="border-color: var(--border-glass); color: var(--text-muted);">
                      <span>{{ item.categoria || 'FACTURACIÓN' }}</span>
                      @if (getRouteForItem(item)) {
                        <span class="font-semibold" style="color: var(--accent-blue);">Ver Ficha →</span>
                      } @else {
                        <span style="color: var(--text-muted);">Sin ficha 360</span>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Bandeja 2: Cobranzas y Mora -->
          <div class="glass rounded-panel p-4 flex flex-col gap-3 border" style="border-color: var(--border-glass);">
            <div class="flex items-center justify-between border-b pb-2" style="border-color: var(--border-glass);">
              <h3 class="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-primary);">
                <span>💳</span> Cobranzas y Gestión de Mora
              </h3>
              <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded" style="background: var(--bg-elevated); color: var(--text-secondary);">
                {{ filteredCobranzas().length }} ítems
              </span>
            </div>

            @if (filteredCobranzas().length === 0) {
              <emx-empty-state message="Sin excepciones de cobranzas." />
            } @else {
              <div class="flex flex-col gap-2 overflow-y-auto max-h-80 pr-1">
                @for (item of filteredCobranzas(); track $index) {
                  <div
                    class="p-3 rounded-lg border flex flex-col gap-1.5 transition-all"
                    [class.cursor-pointer]="getRouteForItem(item) !== null"
                    [class.hover:border-blue-500]="getRouteForItem(item) !== null"
                    style="background: var(--bg-elevated); border-color: var(--border-glass);"
                    (click)="onSelectItem(item)"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-xs font-bold" style="color: var(--text-primary);">{{ item.titulo }}</span>
                      <emx-status-badge [variant]="mapSeveridadBadge(item.severidad)">
                        {{ item.severidad }}
                      </emx-status-badge>
                    </div>
                    @if (item.detalle) {
                      <p class="text-xs leading-relaxed" style="color: var(--text-muted);">{{ item.detalle }}</p>
                    }
                    <div class="flex items-center justify-between text-[11px] font-mono mt-1 pt-1 border-t" style="border-color: var(--border-glass); color: var(--text-muted);">
                      <span>{{ item.categoria || 'COBRANZAS' }}</span>
                      @if (getRouteForItem(item)) {
                        <span class="font-semibold" style="color: var(--accent-blue);">Ver Ficha →</span>
                      } @else {
                        <span style="color: var(--text-muted);">Sin ficha 360</span>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Bandeja 3: Compras y Ordenes de Pago -->
          <div class="glass rounded-panel p-4 flex flex-col gap-3 border" style="border-color: var(--border-glass);">
            <div class="flex items-center justify-between border-b pb-2" style="border-color: var(--border-glass);">
              <h3 class="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-primary);">
                <span>🛒</span> Compras y Aprobación de Pagos
              </h3>
              <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded" style="background: var(--bg-elevated); color: var(--text-secondary);">
                {{ filteredCompras().length }} ítems
              </span>
            </div>

            @if (filteredCompras().length === 0) {
              <emx-empty-state message="Sin excepciones de compras." />
            } @else {
              <div class="flex flex-col gap-2 overflow-y-auto max-h-80 pr-1">
                @for (item of filteredCompras(); track $index) {
                  <div
                    class="p-3 rounded-lg border flex flex-col gap-1.5 transition-all"
                    [class.cursor-pointer]="getRouteForItem(item) !== null"
                    [class.hover:border-blue-500]="getRouteForItem(item) !== null"
                    style="background: var(--bg-elevated); border-color: var(--border-glass);"
                    (click)="onSelectItem(item)"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-xs font-bold" style="color: var(--text-primary);">{{ item.titulo }}</span>
                      <emx-status-badge [variant]="mapSeveridadBadge(item.severidad)">
                        {{ item.severidad }}
                      </emx-status-badge>
                    </div>
                    @if (item.detalle) {
                      <p class="text-xs leading-relaxed" style="color: var(--text-muted);">{{ item.detalle }}</p>
                    }
                    <div class="flex items-center justify-between text-[11px] font-mono mt-1 pt-1 border-t" style="border-color: var(--border-glass); color: var(--text-muted);">
                      <span>{{ item.categoria || 'COMPRAS' }}</span>
                      @if (getRouteForItem(item)) {
                        <span class="font-semibold" style="color: var(--accent-blue);">Ver Ficha →</span>
                      } @else {
                        <span style="color: var(--text-muted);">Sin ficha 360</span>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Bandeja 4: Contratos y Convenios -->
          <div class="glass rounded-panel p-4 flex flex-col gap-3 border" style="border-color: var(--border-glass);">
            <div class="flex items-center justify-between border-b pb-2" style="border-color: var(--border-glass);">
              <h3 class="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-primary);">
                <span>📄</span> Contratos y Vencimientos
              </h3>
              <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded" style="background: var(--bg-elevated); color: var(--text-secondary);">
                {{ filteredContratos().length }} ítems
              </span>
            </div>

            @if (filteredContratos().length === 0) {
              <emx-empty-state message="Sin excepciones de contratos." />
            } @else {
              <div class="flex flex-col gap-2 overflow-y-auto max-h-80 pr-1">
                @for (item of filteredContratos(); track $index) {
                  <div
                    class="p-3 rounded-lg border flex flex-col gap-1.5 transition-all"
                    [class.cursor-pointer]="getRouteForItem(item) !== null"
                    [class.hover:border-blue-500]="getRouteForItem(item) !== null"
                    style="background: var(--bg-elevated); border-color: var(--border-glass);"
                    (click)="onSelectItem(item)"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-xs font-bold" style="color: var(--text-primary);">{{ item.titulo }}</span>
                      <emx-status-badge [variant]="mapSeveridadBadge(item.severidad)">
                        {{ item.severidad }}
                      </emx-status-badge>
                    </div>
                    @if (item.detalle) {
                      <p class="text-xs leading-relaxed" style="color: var(--text-muted);">{{ item.detalle }}</p>
                    }
                    <div class="flex items-center justify-between text-[11px] font-mono mt-1 pt-1 border-t" style="border-color: var(--border-glass); color: var(--text-muted);">
                      <span>{{ item.categoria || 'CONTRATOS' }}</span>
                      @if (getRouteForItem(item)) {
                        <span class="font-semibold" style="color: var(--accent-blue);">Ver Ficha →</span>
                      } @else {
                        <span style="color: var(--text-muted);">Sin ficha 360</span>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </div>
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

            <!-- Tabla de Drill-Down -->
            <div class="flex flex-col gap-2 overflow-hidden flex-1">
              <div class="flex items-center justify-between">
                <h4 class="text-xs font-bold uppercase tracking-wider text-muted">
                  Composición del Total ({{ kpiSeleccionado()?.drillDown?.length || 0 }} registros)
                </h4>
                <span class="font-mono font-bold text-emerald-400 text-sm">
                  Total: {{ kpiSeleccionado()?.valorFormateado }}
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
                          <td class="p-2 font-mono text-[11px] text-muted">{{ item.fecha }}</td>
                          <td class="p-2 text-muted">{{ item.responsable || '—' }}</td>
                          <td class="p-2 font-mono text-[10px]">
                            <span class="px-1.5 py-0.5 rounded bg-white/10 text-gray-300">{{ item.estado }}</span>
                          </td>
                          <td class="p-2 text-right font-mono font-bold text-emerald-400">$ {{ item.importe }}</td>
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
    </div>
  `,
})
export class CentroAdministrativoComponent implements OnInit {
  private readonly api = inject(BandejasApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly resumen = signal<BandejaTrabajoResumenDTO | null>(null);
  readonly resumenCobertura = signal<ResumenBandejaCoberturaDTO | null>(null);
  readonly kpis = signal<KpiAdministrativoDTO[]>([]);
  readonly kpiSeleccionado = signal<KpiAdministrativoDTO | null>(null);

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

  mapSeveridadBadge(severidad?: string): 'critical' | 'urgent' | 'info' {
    const sev = severidad?.toUpperCase();
    if (sev === 'CRITICA') return 'critical';
    if (sev === 'URGENTE') return 'urgent';
    return 'info';
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
