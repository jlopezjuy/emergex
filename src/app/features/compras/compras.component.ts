import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  ComprasApiService,
  SolicitudCompraDTO,
  CotizacionProveedorDTO,
  OrdenCompraDTO,
  ComprobanteProveedorDTO,
  LineaRecepcionBienesDTO
} from '../../data-access/api/compras.api';
import { CostosApiService, CentroCostoDTO } from '../../data-access/api/costos.api';
import { TercerosApiService } from '../../data-access/api/terceros.api';
import { TerceroResumenDTO } from '../../data-access/dto/ledger.dto';
import { UserFeedbackService } from '../../core/notifications/user-feedback.service';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'emx-compras',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    LoadingStateComponent,
    EmptyStateComponent,
    StatusBadgeComponent
  ],
  template: `
    <div class="compras-container p-6 space-y-6 bg-[var(--bg-deep)] min-h-screen text-[var(--text-primary)]">
      <!-- Header -->
      <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-elevated)] p-6 rounded-2xl border border-[var(--border-glass)] shadow-sm">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Módulo Profesional de Compras</h1>
          <p class="text-[var(--text-muted)] text-sm mt-1">Solicitudes, Cotizaciones, Órdenes de Compra, Recepción Multilínea y 3-Way Matching</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            (click)="activeTab.set('solicitudes')"
            [class.bg-blue-600]="activeTab() === 'solicitudes'"
            [class.text-white]="activeTab() === 'solicitudes'"
            class="px-4 py-2 rounded-lg font-medium text-sm transition bg-[var(--surface-glass)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-glass)]"
          >
            Solicitudes
          </button>
          <button
            (click)="activeTab.set('cotizaciones')"
            [class.bg-blue-600]="activeTab() === 'cotizaciones'"
            [class.text-white]="activeTab() === 'cotizaciones'"
            class="px-4 py-2 rounded-lg font-medium text-sm transition bg-[var(--surface-glass)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-glass)]"
          >
            Cotizaciones
          </button>
          <button
            (click)="activeTab.set('ordenes')"
            [class.bg-blue-600]="activeTab() === 'ordenes'"
            [class.text-white]="activeTab() === 'ordenes'"
            class="px-4 py-2 rounded-lg font-medium text-sm transition bg-[var(--surface-glass)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-glass)]"
          >
            Órdenes de Compra
          </button>
          <button
            (click)="activeTab.set('recepciones')"
            [class.bg-blue-600]="activeTab() === 'recepciones'"
            [class.text-white]="activeTab() === 'recepciones'"
            class="px-4 py-2 rounded-lg font-medium text-sm transition bg-[var(--surface-glass)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-glass)]"
          >
            Recepciones
          </button>
          <button
            (click)="activeTab.set('matching')"
            [class.bg-blue-600]="activeTab() === 'matching'"
            [class.text-white]="activeTab() === 'matching'"
            class="px-4 py-2 rounded-lg font-medium text-sm transition bg-[var(--surface-glass)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-glass)]"
          >
            Comprobantes & 3-Way Match
          </button>
        </div>
      </header>

      <!-- SOLAPA 1: SOLICITUDES DE COMPRA CON PAGINACIÓN SERVER-SIDE -->
      @if (activeTab() === 'solicitudes') {
        <section class="bg-[var(--bg-elevated)] rounded-2xl p-6 border border-[var(--border-glass)] shadow-sm space-y-6">
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-bold text-[var(--text-primary)]">Solicitudes de Compra & Imputación por Centro de Costo</h2>
            <button (click)="showSolicitudModal = true" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow transition">
              + Nueva Solicitud
            </button>
          </div>

          @if (loading()) {
            <emx-loading-state message="Cargando solicitudes..."></emx-loading-state>
          } @else if (solicitudes().length === 0) {
            <emx-empty-state title="Sin solicitudes" message="No existen solicitudes de compra pendientes."></emx-empty-state>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-[var(--surface-glass)] text-xs uppercase font-semibold text-[var(--text-muted)] border-b border-[var(--border-glass)]">
                  <tr>
                    <th class="px-4 py-3">N° Solicitud</th>
                    <th class="px-4 py-3">Justificación / Concepto</th>
                    <th class="px-4 py-3">Centro de Costo</th>
                    <th class="px-4 py-3">Monto Estimado</th>
                    <th class="px-4 py-3">Solicitante</th>
                    <th class="px-4 py-3">Estado</th>
                    <th class="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--border-glass)]">
                  @for (sol of solicitudes(); track sol.id) {
                    <tr class="hover:bg-[var(--surface-glass)] transition">
                      <td class="px-4 py-3 font-mono text-xs font-bold text-[var(--text-primary)]">{{ sol.numeroSolicitud || ('SOL-' + sol.id) }}</td>
                      <td class="px-4 py-3 font-medium text-[var(--text-primary)]">{{ sol.justificacion || sol.concepto }}</td>
                      <td class="px-4 py-3 text-xs text-[var(--text-muted)]">{{ sol.centroCostoNombre || (sol.centroCostoId ? 'CC #' + sol.centroCostoId : 'General') }}</td>
                      <td class="px-4 py-3 font-mono text-xs">$ {{ (sol.montoEstimado || 0) | number:'1.2-2' }}</td>
                      <td class="px-4 py-3 text-[var(--text-muted)]">{{ sol.solicitante || sol.solicitadoPor || 'Sistema' }}</td>
                      <td class="px-4 py-3">
                        <emx-status-badge [variant]="sol.estado === 'APROBADA' ? 'stable' : 'pending'">
                          {{ sol.estado }}
                        </emx-status-badge>
                      </td>
                      <td class="px-4 py-3 text-right space-x-2">
                        @if (sol.estado === 'PRESENTADA' || sol.estado === 'PENDIENTE') {
                          <button (click)="aprobarSolicitud(sol.id!)" class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium">
                            Aprobar
                          </button>
                        }
                        <button (click)="seleccionarSolicitudParaCotizar(sol)" class="px-3 py-1 bg-[var(--surface-glass)] border border-[var(--border-glass)] text-[var(--text-primary)] hover:bg-blue-600 hover:text-white rounded text-xs font-medium">
                          Cotizaciones →
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Controles Paginación Solicitudes (V3-S3-01) -->
            <div class="flex items-center justify-between pt-4 border-t border-[var(--border-glass)]">
              <span class="text-xs text-[var(--text-muted)]">
                Página <strong class="text-[var(--text-primary)]">{{ solicitudesPage() + 1 }}</strong> de <strong class="text-[var(--text-primary)]">{{ solicitudesTotalPages() }}</strong> (Total: {{ solicitudesTotal() }})
              </span>
              <div class="flex gap-2">
                <button
                  [disabled]="solicitudesPage() === 0"
                  (click)="cargarSolicitudes(solicitudesPage() - 1)"
                  class="px-3 py-1 text-xs border border-[var(--border-glass)] rounded bg-[var(--surface-glass)] text-[var(--text-primary)] disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <button
                  [disabled]="solicitudesPage() >= solicitudesTotalPages() - 1"
                  (click)="cargarSolicitudes(solicitudesPage() + 1)"
                  class="px-3 py-1 text-xs border border-[var(--border-glass)] rounded bg-[var(--surface-glass)] text-[var(--text-primary)] disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          }
        </section>
      }

      <!-- SOLAPA 2: COTIZACIONES DE PROVEEDORES (V3-S3-02) -->
      @if (activeTab() === 'cotizaciones') {
        <section class="bg-[var(--bg-elevated)] rounded-2xl p-6 border border-[var(--border-glass)] shadow-sm space-y-6">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 class="text-lg font-bold text-[var(--text-primary)]">Comparativa de Cotizaciones por Solicitud</h2>
              <p class="text-xs text-[var(--text-muted)]">Carga y comparativa de ofertas recibidas de proveedores.</p>
            </div>
            @if (solicitudSeleccionada()) {
              <button (click)="showCotizacionModal.set(true)" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow transition">
                + Registrar Cotización
              </button>
            }
          </div>

          <!-- Selector de Solicitud de Compra -->
          <div class="p-4 rounded-xl border border-[var(--border-glass)] bg-[var(--surface-glass)] space-y-2">
            <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase">Seleccionar Solicitud para Comparar</label>
            <select
              [ngModel]="solicitudSeleccionada()?.id"
              (ngModelChange)="onSelectSolicitudId($event)"
              class="w-full md:w-1/2 px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-sm text-[var(--text-primary)]"
            >
              <option [ngValue]="null">-- Seleccioná una solicitud --</option>
              @for (sol of solicitudes(); track sol.id) {
                <option [value]="sol.id">
                  {{ sol.numeroSolicitud || ('SOL-' + sol.id) }} - {{ sol.justificacion || sol.concepto }} ($ {{ sol.montoEstimado | number:'1.2-2' }})
                </option>
              }
            </select>
          </div>

          @if (!solicitudSeleccionada()) {
            <emx-empty-state title="Sin solicitud seleccionada" message="Seleccioná una solicitud de compra para ver o cargar sus cotizaciones."></emx-empty-state>
          } @else if (cotizacionesLoading()) {
            <emx-loading-state message="Cargando cotizaciones..."></emx-loading-state>
          } @else if (cotizaciones().length === 0) {
            <emx-empty-state title="Sin cotizaciones registradas" message="Aún no se ingresaron cotizaciones de proveedores para esta solicitud."></emx-empty-state>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-[var(--surface-glass)] text-xs uppercase font-semibold text-[var(--text-muted)] border-b border-[var(--border-glass)]">
                  <tr>
                    <th class="px-4 py-3">Proveedor</th>
                    <th class="px-4 py-3">Monto Cotizado</th>
                    <th class="px-4 py-3">Plazo Entrega</th>
                    <th class="px-4 py-3">Observaciones</th>
                    <th class="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--border-glass)]">
                  @for (cot of cotizaciones(); track cot.id) {
                    <tr class="hover:bg-[var(--surface-glass)] transition">
                      <td class="px-4 py-3 font-medium text-[var(--text-primary)]">{{ cot.proveedorNombre || ('Proveedor #' + cot.proveedorId) }}</td>
                      <td class="px-4 py-3 font-mono text-xs font-bold text-green-400">$ {{ cot.montoCotizado | number:'1.2-2' }}</td>
                      <td class="px-4 py-3 text-[var(--text-muted)]">{{ cot.plazoEntregaDias ? (cot.plazoEntregaDias + ' días') : 'Inmediato' }}</td>
                      <td class="px-4 py-3 text-xs text-[var(--text-muted)]">{{ cot.observaciones || '-' }}</td>
                      <td class="px-4 py-3">
                        <emx-status-badge [variant]="cot.seleccionada ? 'stable' : 'info'">
                          {{ cot.seleccionada ? 'SELECCIONADA' : 'RECIBIDA' }}
                        </emx-status-badge>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }

      <!-- SOLAPA 3: ÓRDENES DE COMPRA CON PAGINACIÓN SERVER-SIDE -->
      @if (activeTab() === 'ordenes') {
        <section class="bg-[var(--bg-elevated)] rounded-2xl p-6 border border-[var(--border-glass)] shadow-sm space-y-6">
          <h2 class="text-lg font-bold text-[var(--text-primary)]">Órdenes de Compra Emitidas</h2>
          @if (ordenesCompra().length === 0) {
            <emx-empty-state title="Sin órdenes de compra" message="No se registran órdenes de compra emitidas."></emx-empty-state>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-[var(--surface-glass)] text-xs uppercase font-semibold text-[var(--text-muted)] border-b border-[var(--border-glass)]">
                  <tr>
                    <th class="px-4 py-3">N° Orden</th>
                    <th class="px-4 py-3">Fecha Emisión</th>
                    <th class="px-4 py-3">Monto Total</th>
                    <th class="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--border-glass)]">
                  @for (oc of ordenesCompra(); track oc.id) {
                    <tr class="hover:bg-[var(--surface-glass)] transition">
                      <td class="px-4 py-3 font-mono font-medium text-[var(--text-primary)]">{{ oc.numero || ('OC-' + oc.id) }}</td>
                      <td class="px-4 py-3 text-[var(--text-muted)]">{{ oc.fechaEmision || '-' }}</td>
                      <td class="px-4 py-3 font-mono text-xs font-bold">$ {{ (oc.montoTotal || 0) | number:'1.2-2' }}</td>
                      <td class="px-4 py-3">
                        <emx-status-badge [variant]="oc.estado === 'RECEPCIONADA' ? 'stable' : 'info'">
                          {{ oc.estado }}
                        </emx-status-badge>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <!-- Controles Paginación Órdenes (V3-S3-01) -->
            <div class="flex items-center justify-between pt-4 border-t border-[var(--border-glass)]">
              <span class="text-xs text-[var(--text-muted)]">
                Página <strong class="text-[var(--text-primary)]">{{ ordenesPage() + 1 }}</strong> de <strong class="text-[var(--text-primary)]">{{ ordenesTotalPages() }}</strong> (Total: {{ ordenesTotal() }})
              </span>
              <div class="flex gap-2">
                <button
                  [disabled]="ordenesPage() === 0"
                  (click)="cargarOrdenes(ordenesPage() - 1)"
                  class="px-3 py-1 text-xs border border-[var(--border-glass)] rounded bg-[var(--surface-glass)] text-[var(--text-primary)] disabled:opacity-40"
                >
                  ← Anterior
                </button>
                <button
                  [disabled]="ordenesPage() >= ordenesTotalPages() - 1"
                  (click)="cargarOrdenes(ordenesPage() + 1)"
                  class="px-3 py-1 text-xs border border-[var(--border-glass)] rounded bg-[var(--surface-glass)] text-[var(--text-primary)] disabled:opacity-40"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          }
        </section>
      }

      <!-- SOLAPA 4: RECEPCIONES CON LÍNEAS MÚLTIPLES -->
      @if (activeTab() === 'recepciones') {
        <section class="bg-[var(--bg-elevated)] rounded-2xl p-6 border border-[var(--border-glass)] shadow-sm space-y-6">
          <h2 class="text-lg font-bold text-[var(--text-primary)]">Registro de Recepción de Bienes con Trazabilidad Lote/Vencimiento</h2>

          <form (ngSubmit)="onSubmitRecepcion()" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Orden de Compra</label>
                <select [(ngModel)]="newRecepcion.ordenCompraId" name="ordenCompraId" class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-sm text-[var(--text-primary)]">
                  @for (oc of ordenesCompra(); track oc.id) {
                    <option [value]="oc.id">{{ oc.numero || ('OC-' + oc.id) }} ($ {{ oc.montoTotal }})</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">N° Remito Físico</label>
                <input
                  type="text"
                  [(ngModel)]="newRecepcion.numeroRemito"
                  name="numeroRemito"
                  placeholder="REM-0001-00001234"
                  class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1">Recibido Por</label>
                <input
                  type="text"
                  [(ngModel)]="newRecepcion.recibidoPor"
                  name="recibidoPor"
                  placeholder="Farmacia Central"
                  class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>

            <!-- Líneas de Recepción -->
            <div class="bg-[var(--surface-glass)] p-4 rounded-xl border border-[var(--border-glass)] space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-sm font-bold text-[var(--text-primary)]">Líneas de Insumos Recibidos</h3>
                <button type="button" (click)="agregarLineaRecepcion()" class="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium">
                  + Agregar Línea
                </button>
              </div>

              @for (linea of lineasRecepcion; track $index) {
                <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-center bg-[var(--bg-elevated)] p-3 rounded-lg border border-[var(--border-glass)]">
                  <input type="text" [(ngModel)]="linea.descripcionItem" [name]="'desc_' + $index" placeholder="Descripción Insumo Médico" class="px-2 py-1.5 border border-[var(--border-glass)] rounded bg-[var(--surface-inset)] text-xs text-[var(--text-primary)]" />
                  <input type="number" [(ngModel)]="linea.cantidadRecibida" [name]="'cant_' + $index" placeholder="Cant" class="px-2 py-1.5 border border-[var(--border-glass)] rounded bg-[var(--surface-inset)] text-xs text-[var(--text-primary)]" />
                  <input type="text" [(ngModel)]="linea.numeroLote" [name]="'lote_' + $index" placeholder="N° Lote" class="px-2 py-1.5 border border-[var(--border-glass)] rounded bg-[var(--surface-inset)] text-xs font-mono text-[var(--text-primary)]" />
                  <div class="flex gap-2 items-center">
                    <input type="date" [(ngModel)]="linea.fechaVencimiento" [name]="'venc_' + $index" class="w-full px-2 py-1.5 border border-[var(--border-glass)] rounded bg-[var(--surface-inset)] text-xs text-[var(--text-primary)]" />
                    @if (lineasRecepcion.length > 1) {
                      <button type="button" (click)="quitarLineaRecepcion($index)" class="text-red-500 hover:text-red-600 text-xs px-2">✕</button>
                    }
                  </div>
                </div>
              }
            </div>

            <div class="flex justify-end">
              <button type="submit" class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow transition">
                Confirmar & Registrar Recepción Multilínea
              </button>
            </div>
          </form>
        </section>
      }

      <!-- SOLAPA 5: COMPROBANTES Y 3-WAY MATCHING -->
      @if (activeTab() === 'matching') {
        <section class="bg-[var(--bg-elevated)] rounded-2xl p-6 border border-[var(--border-glass)] shadow-sm space-y-6">
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-bold text-[var(--text-primary)]">Comprobantes de Proveedores & 3-Way Match Triangular</h2>
            <button (click)="loadComprobantes()" class="px-3 py-1.5 text-xs font-medium bg-[var(--surface-glass)] text-[var(--text-primary)] border border-[var(--border-glass)] rounded-lg">
              Actualizar Listado
            </button>
          </div>

          <!-- Formulario de Excepción Financial Override sin prompt() -->
          @if (overrideModalId()) {
            <div class="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
              <h3 class="text-sm font-bold text-amber-500">Motivo Obligatorio de Excepción Gerencial (Comprobante #{{ overrideModalId() }})</h3>
              <div class="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  [ngModel]="motivoOverride()"
                  (ngModelChange)="motivoOverride.set($event)"
                  placeholder="Ej: Diferencia de centavos autorizada por gerencia financiera"
                  class="flex-1 px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-sm text-[var(--text-primary)]"
                />
                <div class="flex gap-2">
                  <button (click)="confirmarOverride()" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg shadow">
                    Confirmar Override
                  </button>
                  <button (click)="cancelarOverride()" class="px-3 py-2 bg-[var(--surface-glass)] text-[var(--text-primary)] border border-[var(--border-glass)] rounded-lg text-xs">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          }

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-[var(--surface-glass)] text-xs uppercase font-semibold text-[var(--text-muted)] border-b border-[var(--border-glass)]">
                <tr>
                  <th class="px-4 py-3">ID</th>
                  <th class="px-4 py-3">Tipo Doc</th>
                  <th class="px-4 py-3">N° Comprobante</th>
                  <th class="px-4 py-3">Fecha</th>
                  <th class="px-4 py-3">Monto Total</th>
                  <th class="px-4 py-3">Estado 3-Way Match</th>
                  <th class="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--border-glass)]">
                @for (c of comprobantes(); track c.id) {
                  <tr class="hover:bg-[var(--surface-glass)] transition">
                    <td class="px-4 py-3 font-mono text-xs">{{ c.id }}</td>
                    <td class="px-4 py-3 font-medium text-[var(--text-primary)]">{{ c.tipoDocumento }}</td>
                    <td class="px-4 py-3 font-mono text-xs">{{ c.puntoVenta }}-{{ c.numeroDocumento }}</td>
                    <td class="px-4 py-3 text-[var(--text-muted)]">{{ c.fechaComprobante }}</td>
                    <td class="px-4 py-3 font-mono text-xs font-bold">$ {{ c.montoTotal | number:'1.2-2' }}</td>
                    <td class="px-4 py-3">
                      <emx-status-badge [variant]="c.estadoMatching === 'MATCH_OK' ? 'stable' : 'critical'">
                        {{ c.estadoMatching || 'PENDIENTE' }}
                      </emx-status-badge>
                    </td>
                    <td class="px-4 py-3 text-right">
                      @if (c.estadoMatching === 'BLOQUEADO_DIFERENCIA') {
                        <button (click)="iniciarOverride(c.id!)" class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium">
                          Destrabar (Override)
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <!-- Modal Alta Solicitud de Compra con Centro de Costo (V3-S3-03) -->
      @if (showSolicitudModal) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-[var(--bg-elevated)] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[var(--border-glass)]">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-bold text-[var(--text-primary)]">Nueva Solicitud de Compra</h3>
              <button (click)="showSolicitudModal = false" class="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
            </div>

            <form [formGroup]="solicitudForm" (ngSubmit)="onSubmitSolicitud()" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold uppercase text-[var(--text-muted)] mb-1">Concepto / Descripción</label>
                <input
                  type="text"
                  formControlName="concepto"
                  placeholder="Ej: Insumos de bioseguridad para móviles"
                  class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-sm text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase text-[var(--text-muted)] mb-1">Monto Estimado ($)</label>
                <input
                  type="number"
                  formControlName="montoEstimado"
                  placeholder="15000.00"
                  class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-sm text-[var(--text-primary)] font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase text-[var(--text-muted)] mb-1">Centro de Costo Imputable (V3-S3-03)</label>
                <select formControlName="centroCostoId" class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-sm text-[var(--text-primary)]">
                  <option [ngValue]="null">-- Sin centro de costo --</option>
                  @for (cc of centrosCosto(); track cc.id) {
                    <option [value]="cc.id">{{ cc.codigo }} - {{ cc.nombre }}</option>
                  }
                </select>
              </div>

              <div class="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  (click)="showSolicitudModal = false"
                  class="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--surface-glass)] border border-[var(--border-glass)] rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="solicitudForm.invalid"
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Generar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Modal Registrar Cotización de Proveedor (V3-S3-02) -->
      @if (showCotizacionModal()) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-[var(--bg-elevated)] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[var(--border-glass)]">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-bold text-[var(--text-primary)]">Registrar Cotización de Proveedor</h3>
              <button (click)="showCotizacionModal.set(false)" class="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
            </div>

            <form [formGroup]="cotizacionForm" (ngSubmit)="onSubmitCotizacion()" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold uppercase text-[var(--text-muted)] mb-1">Proveedor</label>
                <select formControlName="proveedorId" class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-sm text-[var(--text-primary)]">
                  @for (prov of proveedores(); track prov.id) {
                    <option [value]="prov.id">{{ prov.razonSocial }} ({{ prov.cuit }})</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase text-[var(--text-muted)] mb-1">Monto Cotizado ($)</label>
                <input
                  type="number"
                  formControlName="montoCotizado"
                  placeholder="12500.00"
                  class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-sm text-[var(--text-primary)] font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase text-[var(--text-muted)] mb-1">Plazo de Entrega (Días)</label>
                <input
                  type="number"
                  formControlName="plazoEntregaDias"
                  placeholder="3"
                  class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-sm text-[var(--text-primary)] font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase text-[var(--text-muted)] mb-1">Observaciones</label>
                <textarea
                  formControlName="observaciones"
                  placeholder="Incluye flete e IVA..."
                  rows="3"
                  class="w-full px-3 py-2 border border-[var(--border-glass)] rounded-lg bg-[var(--surface-inset)] text-sm text-[var(--text-primary)]"
                ></textarea>
              </div>

              <div class="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  (click)="showCotizacionModal.set(false)"
                  class="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--surface-glass)] border border-[var(--border-glass)] rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="cotizacionForm.invalid"
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Registrar Cotización
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class ComprasComponent implements OnInit {
  activeTab = signal<'solicitudes' | 'cotizaciones' | 'ordenes' | 'recepciones' | 'matching'>('solicitudes');

  solicitudes = signal<SolicitudCompraDTO[]>([]);
  solicitudesPage = signal(0);
  solicitudesTotal = signal(0);
  solicitudesTotalPages = signal(1);

  ordenesCompra = signal<OrdenCompraDTO[]>([]);
  ordenesPage = signal(0);
  ordenesTotal = signal(0);
  ordenesTotalPages = signal(1);

  comprobantes = signal<ComprobanteProveedorDTO[]>([]);
  centrosCosto = signal<CentroCostoDTO[]>([]);
  proveedores = signal<TerceroResumenDTO[]>([]);

  solicitudSeleccionada = signal<SolicitudCompraDTO | null>(null);
  cotizaciones = signal<CotizacionProveedorDTO[]>([]);
  cotizacionesLoading = signal(false);
  showCotizacionModal = signal(false);

  loading = signal(true);
  error = signal(false);

  showSolicitudModal = false;
  overrideModalId = signal<number | null>(null);
  motivoOverride = signal<string>('');

  newRecepcion = {
    ordenCompraId: 10,
    numeroRemito: '',
    recibidoPor: 'Farmacia Central',
    fechaRecepcion: new Date().toISOString().split('T')[0]
  };

  lineasRecepcion: LineaRecepcionBienesDTO[] = [
    { descripcionItem: 'Insumo Farmacéutico General', cantidadRecibida: 1, numeroLote: '', fechaVencimiento: '' }
  ];

  private comprasApi = inject(ComprasApiService);
  private costosApi = inject(CostosApiService);
  private tercerosApi = inject(TercerosApiService);
  private feedback = inject(UserFeedbackService);
  private fb = inject(FormBuilder);

  solicitudForm = this.fb.group({
    concepto: ['', Validators.required],
    montoEstimado: [0, Validators.required],
    centroCostoId: [null as number | null]
  });

  cotizacionForm = this.fb.group({
    proveedorId: [null as number | null, Validators.required],
    montoCotizado: [0, [Validators.required, Validators.min(0.01)]],
    plazoEntregaDias: [1],
    observaciones: ['']
  });

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales(): void {
    this.loading.set(true);

    this.cargarSolicitudes(0);
    this.cargarOrdenes(0);

    this.costosApi.getCentrosCosto().subscribe({
      next: (data) => this.centrosCosto.set(data || []),
      error: () => {}
    });

    this.tercerosApi.buscar('').subscribe({
      next: (data) => this.proveedores.set(data || []),
      error: () => {}
    });

    this.loadComprobantes();
  }

  cargarSolicitudes(page: number): void {
    this.comprasApi.getSolicitudesPage(page, 10).subscribe({
      next: (res) => {
        this.solicitudes.set(res.data || []);
        this.solicitudesPage.set(page);
        this.solicitudesTotal.set(res.total || 0);
        this.solicitudesTotalPages.set(res.totalPages || Math.ceil((res.total || 0) / 10) || 1);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.feedback.fromHttpError(err);
      }
    });
  }

  cargarOrdenes(page: number): void {
    this.comprasApi.getOrdenesCompraPage(page, 10).subscribe({
      next: (res) => {
        this.ordenesCompra.set(res.data || []);
        this.ordenesPage.set(page);
        this.ordenesTotal.set(res.total || 0);
        this.ordenesTotalPages.set(res.totalPages || Math.ceil((res.total || 0) / 10) || 1);
        if (res.data && res.data.length > 0 && res.data[0].id) {
          this.newRecepcion.ordenCompraId = res.data[0].id;
        }
      },
      error: () => {}
    });
  }

  seleccionarSolicitudParaCotizar(sol: SolicitudCompraDTO): void {
    this.solicitudSeleccionada.set(sol);
    this.activeTab.set('cotizaciones');
    if (sol.id) {
      this.cargarCotizaciones(sol.id);
    }
  }

  onSelectSolicitudId(id: number | null): void {
    if (!id) {
      this.solicitudSeleccionada.set(null);
      this.cotizaciones.set([]);
      return;
    }
    const sol = this.solicitudes().find(s => s.id === Number(id)) || null;
    this.solicitudSeleccionada.set(sol);
    if (id) {
      this.cargarCotizaciones(Number(id));
    }
  }

  cargarCotizaciones(solicitudId: number): void {
    this.cotizacionesLoading.set(true);
    this.comprasApi.getCotizacionesPorSolicitud(solicitudId).subscribe({
      next: (data) => {
        this.cotizaciones.set(data || []);
        this.cotizacionesLoading.set(false);
      },
      error: () => {
        this.cotizacionesLoading.set(false);
      }
    });
  }

  onSubmitCotizacion(): void {
    const sol = this.solicitudSeleccionada();
    if (this.cotizacionForm.invalid || !sol || !sol.id) return;

    const val = this.cotizacionForm.value;
    const dto: CotizacionProveedorDTO = {
      solicitudCompraId: sol.id,
      proveedorId: Number(val.proveedorId),
      montoCotizado: Number(val.montoCotizado),
      plazoEntregaDias: Number(val.plazoEntregaDias || 0),
      observaciones: val.observaciones || ''
    };

    this.comprasApi.registrarCotizacion(dto).subscribe({
      next: () => {
        this.feedback.push({
          type: 'success',
          title: 'Cotización Registrada',
          message: 'La cotización del proveedor fue cargada exitosamente.'
        });
        this.showCotizacionModal.set(false);
        this.cotizacionForm.reset();
        if (sol.id) {
          this.cargarCotizaciones(sol.id);
        }
      },
      error: (err) => this.feedback.fromHttpError(err)
    });
  }

  loadComprobantes(): void {
    this.comprasApi.getComprobantesProveedor().subscribe({
      next: (data) => this.comprobantes.set(data || []),
      error: (err) => this.feedback.fromHttpError(err)
    });
  }

  agregarLineaRecepcion(): void {
    this.lineasRecepcion.push({
      descripcionItem: '',
      cantidadRecibida: 1,
      numeroLote: '',
      fechaVencimiento: ''
    });
  }

  quitarLineaRecepcion(index: number): void {
    if (this.lineasRecepcion.length > 1) {
      this.lineasRecepcion.splice(index, 1);
    }
  }

  onSubmitSolicitud(): void {
    if (this.solicitudForm.invalid) return;

    const val = this.solicitudForm.value;
    this.comprasApi.crearSolicitud({
      concepto: val.concepto || '',
      justificacion: val.concepto || '',
      montoEstimado: val.montoEstimado || 0,
      centroCostoId: val.centroCostoId ? Number(val.centroCostoId) : undefined,
      solicitadoPor: 'Usuario Sesión'
    }).subscribe({
      next: () => {
        this.feedback.push({
          type: 'success',
          title: 'Solicitud Creada',
          message: 'La solicitud de compra fue enviada exitosamente.'
        });
        this.showSolicitudModal = false;
        this.solicitudForm.reset();
        this.cargarSolicitudes(0);
      },
      error: (err) => this.feedback.fromHttpError(err)
    });
  }

  aprobarSolicitud(id: number): void {
    this.comprasApi.aprobarSolicitud(id).subscribe({
      next: () => {
        this.feedback.push({
          type: 'success',
          title: 'Solicitud Aprobada',
          message: 'La solicitud ha sido APROBADA.'
        });
        this.cargarSolicitudes(this.solicitudesPage());
      },
      error: (err) => this.feedback.fromHttpError(err)
    });
  }

  onSubmitRecepcion(): void {
    if (!this.newRecepcion.numeroRemito.trim()) {
      this.feedback.push({ type: 'warning', title: 'Validación', message: 'Ingresá el número de remito físico.' });
      return;
    }

    this.comprasApi.registrarRecepcion({
      ordenCompraId: this.newRecepcion.ordenCompraId,
      recepcionBienes: {
        numeroRemito: this.newRecepcion.numeroRemito.trim(),
        fechaRecepcion: this.newRecepcion.fechaRecepcion,
        recibidoPor: this.newRecepcion.recibidoPor.trim() || 'Farmacia Central'
      },
      lineas: this.lineasRecepcion,
      esParcial: false
    }).subscribe({
      next: () => {
        this.feedback.push({
          type: 'success',
          title: 'Recepción Multilínea Registrada',
          message: 'Recepción de bienes y remito registrados exitosamente.'
        });
        this.newRecepcion.numeroRemito = '';
      },
      error: (err) => this.feedback.fromHttpError(err)
    });
  }

  iniciarOverride(comprobanteId: number): void {
    this.overrideModalId.set(comprobanteId);
    this.motivoOverride.set('');
  }

  cancelarOverride(): void {
    this.overrideModalId.set(null);
    this.motivoOverride.set('');
  }

  confirmarOverride(): void {
    const id = this.overrideModalId();
    const motivo = this.motivoOverride().trim();
    if (!id) return;
    if (!motivo) {
      this.feedback.push({ type: 'warning', title: 'Validación', message: 'El motivo de excepción es obligatorio.' });
      return;
    }

    this.comprasApi.overrideMatching({
      comprobanteId: id,
      motivoExcepcion: motivo,
      usuarioAprobador: 'gerente.aprobador'
    }).subscribe({
      next: () => {
        this.feedback.push({
          type: 'success',
          title: 'Comprobante Destrabado',
          message: 'Matching triangulado override registrado exitosamente.'
        });
        this.overrideModalId.set(null);
        this.motivoOverride.set('');
        this.loadComprobantes();
      },
      error: (err) => this.feedback.fromHttpError(err)
    });
  }
}
