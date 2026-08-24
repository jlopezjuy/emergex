import { Component, signal, inject, OnInit, computed, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PatientApiService } from '../../../data-access/api/patient.api';
import { LedgerApiService } from '../../../data-access/api/ledger.api';
import { CobranzasApiService } from '../../../data-access/api/cobranzas.api';
import { UserFeedbackService } from '../../../core/notifications/user-feedback.service';
import {
  PacienteDTO,
  FichaAfiliadoDTO,
  FacturaDTO,
  ConsumoMensualDTO,
  CoberturaVigenteDTO
} from '../../../data-access/dto/patient.dto';
import { LedgerMovimientoDTO } from '../../../data-access/dto/ledger.dto';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';
import { DocumentosAdjuntosComponent } from '../../../shared/components/documentos-adjuntos/documentos-adjuntos.component';
import { GestionCobranzaModalComponent } from '../../../shared/components/finance/gestion-cobranza-modal/gestion-cobranza-modal.component';

export type PatientDetailTab =
  | 'cobertura'
  | 'grupo-familiar'
  | 'facturas'
  | 'cuenta-corriente'
  | 'documentacion'
  | 'historial';

function fmtCurrency(n?: number): string {
  return '$' + (n ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

@Component({
  selector: 'emx-patient-detail',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    KpiCardComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    ModalShellComponent,
    DocumentosAdjuntosComponent,
    GestionCobranzaModalComponent
  ],
  template: `
    <div class="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <!-- Breadcrumb / Volver -->
      <div class="flex items-center justify-between">
        <a routerLink="/patients" class="text-xs font-medium flex items-center gap-1 hover:underline" style="color: var(--accent-blue);">
          ← Volver al listado de afiliados
        </a>
      </div>

      @if (loading()) {
        <emx-loading-state />
      } @else if (!pacienteId()) {
        <emx-error-state message="Afiliado no encontrado. El ID en la URL no es válido." />
      } @else if (mainError()) {
        <emx-error-state [message]="mainError()!" (retry)="cargarPaciente()" />
      } @else {
        <!-- Encabezado Ficha 360 -->
        <div class="glass rounded-panel p-5 flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b pb-4" style="border-color: var(--border-glass);">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-3">
                <h1 class="text-xl font-bold" style="color: var(--text-primary);">
                  {{ paciente()?.apellido }}, {{ paciente()?.nombre }}
                </h1>
                <emx-status-badge [variant]="coberturaBadgeVariant()">
                  {{ estadoCoberturaTexto() }}
                </emx-status-badge>
                <emx-status-badge [variant]="deudaBadgeVariant()">
                  {{ estadoDeudaTexto() }}
                </emx-status-badge>
              </div>
              <span class="text-xs font-mono" style="color: var(--text-muted);">
                Afiliado N°: <strong style="color: var(--text-secondary);">{{ paciente()?.numeroAfiliado || ficha()?.numeroAfiliado || '—' }}</strong> · DNI: <strong style="color: var(--text-secondary);">{{ paciente()?.dni || '—' }}</strong>
              </span>
            </div>

            <!-- Acciones directas Ficha 360 -->
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                style="background-color: var(--accent-blue); color: #fff;"
                (click)="mostrarModalRecibo.set(true)"
              >
                + Registrar Recibo
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-semibold rounded-lg border"
                style="background-color: var(--bg-panel); color: var(--text-primary); border-color: var(--border-glass);"
                (click)="mostrarModalGestion.set(true)"
              >
                Registrar Gestión Mora
              </button>
            </div>
          </div>

          <!-- KPIs principales de resumen (H-04, I-16, A-11 - 3 Totales Financieros) -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <emx-kpi-card label="Plan Actual" [value]="coberturaActual() ? coberturaActual()!.planNombre : (ficha()?.cobertura?.nombre || 'Sin Plan')" accentColor="blue" />
            <emx-kpi-card label="Resp. Paciente" [value]="fmtCurrency(saldoResponsabilidadPaciente())" [accentColor]="saldoResponsabilidadPaciente() > 0 ? 'red' : 'emerald'" />
            <emx-kpi-card label="Pendiente Terceros" [value]="fmtCurrency(saldoPendienteTerceros())" [accentColor]="saldoPendienteTerceros() > 0 ? 'amber' : 'emerald'" />
            <emx-kpi-card label="Total Relacionado" [value]="fmtCurrency(saldoTotalRelacionado())" accentColor="cyan" />
          </div>
        </div>

        <!-- Solapas / Navigation Tabs -->
        <div class="flex items-center gap-1 border-b overflow-x-auto pb-1" style="border-color: var(--border-glass);">
          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2"
            [class.border-blue-500]="activeTab() === 'cobertura'"
            [style.color]="activeTab() === 'cobertura' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('cobertura')"
          >
            Cobertura y Consumo
          </button>

          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2"
            [class.border-blue-500]="activeTab() === 'grupo-familiar'"
            [style.color]="activeTab() === 'grupo-familiar' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('grupo-familiar')"
          >
            Grupo Familiar ({{ integrantesGrupo().length }})
          </button>

          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 border-transparent"
            [class.border-blue-500]="activeTab() === 'facturas'"
            [style.color]="activeTab() === 'facturas' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('facturas')"
          >
            Facturas y Pagos ({{ facturas().length }})
          </button>

          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 border-transparent"
            [class.border-blue-500]="activeTab() === 'cuenta-corriente'"
            [style.color]="activeTab() === 'cuenta-corriente' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('cuenta-corriente')"
          >
            Cuenta Corriente
          </button>

          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 border-transparent"
            [class.border-blue-500]="activeTab() === 'documentacion'"
            [style.color]="activeTab() === 'documentacion' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('documentacion')"
          >
            Documentación
          </button>

          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 border-transparent"
            [class.border-blue-500]="activeTab() === 'historial'"
            [style.color]="activeTab() === 'historial' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('historial')"
          >
            Historial de Asistencias
          </button>
        </div>

        <!-- Tab Content -->
        @switch (activeTab()) {
          @case ('cobertura') {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Bloque Cobertura -->
              <div class="glass rounded-panel p-4 flex flex-col gap-3">
                <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--text-primary);">
                  Detalle de Cobertura Vigente
                </h3>

                @if (coberturaError()) {
                  <emx-error-state message="Error al cargar la cobertura vigente" (retry)="cargarCobertura()" />
                } @else if (coberturaActual()) {
                  <div class="grid grid-cols-2 gap-3 text-xs">
                    <div><span style="color: var(--text-muted);">Origen:</span> <strong style="color: var(--text-primary);">{{ coberturaActual()!.origen }}</strong></div>
                    <div><span style="color: var(--text-muted);">Plan:</span> <strong style="color: var(--text-primary);">{{ coberturaActual()!.planNombre || '—' }}</strong></div>
                    <div><span style="color: var(--text-muted);">Institución:</span> <strong style="color: var(--text-primary);">{{ coberturaActual()!.institucionNombre || '—' }}</strong></div>
                    <div><span style="color: var(--text-muted);">Estado:</span> <strong style="color: var(--text-primary);">{{ coberturaActual()!.estadoCobertura || '—' }}</strong></div>
                    <div><span style="color: var(--text-muted);">Vigencia Hasta:</span> <strong style="color: var(--text-primary);">{{ coberturaActual()!.vigenciaHasta || '—' }}</strong></div>
                    <div><span style="color: var(--text-muted);">Cubierto:</span> <strong style="color: var(--text-primary);">{{ coberturaActual()!.cubierto ? 'Sí' : 'No' }}</strong></div>
                  </div>
                } @else {
                  <emx-empty-state message="No se encontró registro de cobertura vigente para este afiliado." />
                }
              </div>

              <!-- Bloque Consumo Mensual -->
              <div class="glass rounded-panel p-4 flex flex-col gap-3">
                <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--text-primary);">
                  Consumo del Período
                </h3>

                @if (consumoError()) {
                  <emx-error-state message="Error al cargar el consumo mensual" (retry)="cargarConsumo()" />
                } @else if (consumo()) {
                  <div class="grid grid-cols-2 gap-3 text-xs">
                    <div><span style="color: var(--text-muted);">Atenciones Consumidas:</span> <strong style="color: var(--text-primary);">{{ consumo()?.atencionesConsumidas ?? 0 }} / {{ consumo()?.atencionesMaximas ?? 0 }}</strong></div>
                    <div><span style="color: var(--text-muted);">Controles Médicos:</span> <strong style="color: var(--text-primary);">{{ consumo()?.controlesMedicosConsumidos ?? 0 }} / {{ consumo()?.controlesMedicosMaximos ?? 0 }}</strong></div>
                    <div><span style="color: var(--text-muted);">Órdenes Disponibles:</span> <strong style="color: var(--text-primary);">{{ consumo()?.ordenesDisponibles?.length ?? 0 }}</strong></div>
                    <div><span style="color: var(--text-muted);">Alertas Activas:</span> <strong style="color: var(--text-primary);">{{ ficha()?.alertas?.length ?? 0 }}</strong></div>
                  </div>
                } @else {
                  <emx-empty-state message="Sin datos de consumo mensual disponibles." />
                }
              </div>
            </div>
          }

          @case ('grupo-familiar') {
            <div class="glass rounded-panel p-5 flex flex-col gap-4">
              <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--text-primary);">
                Integrantes del Grupo Familiar
              </h3>

              @if (integrantesGrupo().length === 0) {
                <emx-empty-state message="Este afiliado no tiene familiares asociados en su grupo." />
              } @else {
                <div class="overflow-x-auto">
                  <table class="w-full text-xs text-left" style="color: var(--text-primary);">
                    <thead>
                      <tr class="border-b" style="border-color: var(--border-glass); color: var(--text-muted);">
                        <th class="py-2 px-3 font-semibold">Nombre Completo</th>
                        <th class="py-2 px-3 font-semibold">DNI</th>
                        <th class="py-2 px-3 font-semibold">Rol Familiar</th>
                        <th class="py-2 px-3 font-semibold">Estado</th>
                        <th class="py-2 px-3 font-semibold text-right">Ficha</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (m of integrantesGrupo(); track m.id || m.dni) {
                        <tr class="border-b transition-colors hover:bg-white/5" style="border-color: var(--border-glass);">
                          <td class="py-2 px-3 font-medium">{{ m.apellido || m.nombreCompleto || m.nombre }}, {{ m.nombre || '' }}</td>
                          <td class="py-2 px-3 font-mono">{{ m.dni || '—' }}</td>
                          <td class="py-2 px-3">{{ m.rolFamiliar || m.rol || 'DEPENDIENTE' }}</td>
                          <td class="py-2 px-3">
                            <emx-status-badge [variant]="m.estado === 'ACTIVO' || m.estado === 'ACTIVA' ? 'stable' : 'critical'">
                              {{ m.estado || 'ACTIVO' }}
                            </emx-status-badge>
                          </td>
                          <td class="py-2 px-3 text-right">
                            @if (m.id) {
                              <a [routerLink]="['/patients', m.id]" class="text-xs font-semibold hover:underline" style="color: var(--accent-blue);">
                                Ver Ficha →
                              </a>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }

          @case ('facturas') {
            @if (facturasError()) {
              <emx-error-state message="Error al cargar el listado de facturas y pagos." (retry)="cargarFacturas()" />
            } @else if (facturas().length === 0) {
              <emx-empty-state message="No hay facturas registradas para este afiliado." />
            } @else {
              <div class="glass rounded-panel p-5 flex flex-col gap-4">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--text-primary);">
                    Comprobantes y Facturación
                  </h3>
                  <button
                    type="button"
                    class="px-3 py-1 text-xs font-semibold rounded-lg"
                    style="background-color: var(--accent-blue); color: #fff;"
                    (click)="mostrarModalRecibo.set(true)"
                  >
                    + Registrar Pago / Recibo
                  </button>
                </div>

                <div class="overflow-x-auto">
                  <table class="w-full text-xs text-left" style="color: var(--text-primary);">
                    <thead>
                      <tr class="border-b" style="border-color: var(--border-glass); color: var(--text-muted);">
                        <th class="py-2 px-3 font-semibold">Comprobante N°</th>
                        <th class="py-2 px-3 font-semibold">Fecha Emisión</th>
                        <th class="py-2 px-3 font-semibold">Importe Total</th>
                        <th class="py-2 px-3 font-semibold">Saldo Pendiente</th>
                        <th class="py-2 px-3 font-semibold">Estado</th>
                        <th class="py-2 px-3 font-semibold text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (f of facturas(); track f.id) {
                        <tr class="border-b transition-colors hover:bg-white/5" style="border-color: var(--border-glass);">
                          <td class="py-2 px-3 font-mono font-medium">{{ f.numeroFactura || ('FAC-' + f.id) }}</td>
                          <td class="py-2 px-3" style="color: var(--text-muted);">{{ f.fechaEmision || '—' }}</td>
                          <td class="py-2 px-3 font-mono font-semibold">{{ fmtCurrency(f.importeTotal) }}</td>
                          <td class="py-2 px-3 font-mono font-semibold" [style.color]="(f.saldoPendiente ?? 0) > 0 ? 'var(--accent-red, #ef4444)' : 'var(--text-primary)'">
                            {{ fmtCurrency(f.saldoPendiente) }}
                          </td>
                          <td class="py-2 px-3">
                            <emx-status-badge [variant]="f.estado === 'COBRADA' || f.estado === 'PAGADA' ? 'stable' : 'critical'">
                              {{ f.estado || 'PENDIENTE' }}
                            </emx-status-badge>
                          </td>
                          <td class="py-2 px-3 text-right">
                            @if ((f.saldoPendiente ?? f.importeTotal ?? 0) > 0) {
                              <button
                                type="button"
                                class="text-xs font-semibold hover:underline"
                                style="color: var(--accent-blue);"
                                (click)="abrirImputacion(f.id)"
                              >
                                Imputar Cobro
                              </button>
                            } @else {
                              <span style="color: var(--text-muted);">Completa</span>
                            }
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          }

          @case ('cuenta-corriente') {
            <div class="glass rounded-panel p-5 flex flex-col gap-4">
              <div class="flex flex-wrap items-center justify-between gap-4 border-b pb-3" style="border-color: var(--border-glass);">
                <div class="flex items-center gap-3">
                  <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--text-primary);">
                    Cuenta Corriente / Ledger
                  </h3>
                  <emx-status-badge [variant]="saldoResponsabilidadPaciente() > 0 ? 'critical' : 'stable'">
                    {{ saldoResponsabilidadPaciente() > 0 ? 'NOS DEBE SALDO' : 'CUENTA AL DÍA' }}
                  </emx-status-badge>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    class="px-3 py-1.5 text-xs font-semibold rounded-lg"
                    style="background-color: var(--accent-blue); color: #fff;"
                    (click)="mostrarModalRecibo.set(true)"
                  >
                    + Registrar Recibo
                  </button>
                  <button
                    type="button"
                    class="px-3 py-1.5 text-xs font-semibold rounded-lg border"
                    style="background-color: var(--bg-panel); color: var(--text-primary); border-color: var(--border-glass);"
                    (click)="mostrarModalGestion.set(true)"
                  >
                    + Registrar Gestión
                  </button>
                </div>
              </div>

              @if (ledgerError()) {
                <emx-error-state message="Error al consultar los movimientos de cuenta corriente." (retry)="cargarLedger()" />
              } @else if (movimientosLedger().length === 0) {
                <emx-empty-state message="No hay movimientos registrados en la cuenta corriente de este afiliado." />
              } @else {
                <div class="overflow-x-auto">
                  <table class="w-full text-xs text-left" style="color: var(--text-primary);">
                    <thead>
                      <tr class="border-b" style="border-color: var(--border-glass); color: var(--text-muted);">
                        <th class="py-2 px-3 font-semibold">Fecha</th>
                        <th class="py-2 px-3 font-semibold">Tipo Movimiento</th>
                        <th class="py-2 px-3 font-semibold">Concepto / Referencia</th>
                        <th class="py-2 px-3 font-semibold text-right">Debe ($)</th>
                        <th class="py-2 px-3 font-semibold text-right">Haber ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (m of movimientosLedger(); track m.id || m.fechaContable) {
                        <tr class="border-b transition-colors hover:bg-white/5" style="border-color: var(--border-glass);">
                          <td class="py-2 px-3" style="color: var(--text-muted);">{{ m.fechaContable }}</td>
                          <td class="py-2 px-3 font-semibold">{{ m.tipoMovimiento }}</td>
                          <td class="py-2 px-3">{{ m.concepto || '—' }}</td>
                          <td class="py-2 px-3 text-right font-mono">{{ m.montoDebe ? fmtCurrency(m.montoDebe) : '—' }}</td>
                          <td class="py-2 px-3 text-right font-mono">{{ m.montoHaber ? fmtCurrency(m.montoHaber) : '—' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }

          @case ('documentacion') {
            <emx-documentos-adjuntos [entidadTipo]="'AFILIADO'" [entidadId]="pacienteId()!" />
          }

          @case ('historial') {
            <div class="glass rounded-panel p-5 flex flex-col gap-4">
              <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--text-primary);">
                Historial de Asistencias Médicas
              </h3>
              <p class="text-xs" style="color: var(--text-muted);">
                Registro histórico de llamadas y atenciones del paciente.
              </p>
              <emx-empty-state message="Sin asistencias médicas recientes asociadas a la ficha." />
            </div>
          }
        }
      }

      <!-- Modal Registrar Recibo de Cobranza -->
      @if (mostrarModalRecibo()) {
        <emx-modal-shell title="Registrar Recibo de Cobranza (CxC)" (close)="mostrarModalRecibo.set(false)">
          <form [formGroup]="reciboForm" (ngSubmit)="registrarReciboCobranza()" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted);">Número de Recibo</label>
              <input
                type="text"
                formControlName="numeroRecibo"
                placeholder="Ej: REC-2026-0001"
                class="w-full px-3 py-2 text-xs border rounded-lg"
                style="background-color: var(--bg-card); color: var(--text-primary); border-color: var(--border-glass);"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted);">Monto Cobrado ($)</label>
              <input
                type="number"
                formControlName="montoCobrado"
                placeholder="0.00"
                class="w-full px-3 py-2 text-xs border rounded-lg font-mono"
                style="background-color: var(--bg-card); color: var(--text-primary); border-color: var(--border-glass);"
              />
            </div>

            <div class="pt-4 flex justify-end gap-2">
              <button
                type="button"
                class="px-4 py-2 text-xs font-medium rounded-lg"
                style="background-color: var(--bg-panel); color: var(--text-muted);"
                (click)="mostrarModalRecibo.set(false)"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="reciboForm.invalid || guardandoRecibo()"
                class="px-4 py-2 text-xs font-medium text-white rounded-lg disabled:opacity-50"
                style="background-color: var(--accent-blue);"
              >
                {{ guardandoRecibo() ? 'Registrando...' : 'Registrar Recibo' }}
              </button>
            </div>
          </form>
        </emx-modal-shell>
      }

      <!-- Modal Imputar Cobro -->
      @if (mostrarModalImputacion() && facturaSeleccionadaId()) {
        <emx-modal-shell title="Imputar Cobro a Documento" (close)="mostrarModalImputacion.set(false)">
          <form [formGroup]="imputacionForm" (ngSubmit)="confirmarImputacion()" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted);">ID del Recibo de Cobranza</label>
              <input
                type="number"
                formControlName="cobranzaId"
                placeholder="ID de la cobranza previa"
                class="w-full px-3 py-2 text-xs border rounded-lg font-mono"
                style="background-color: var(--bg-card); color: var(--text-primary); border-color: var(--border-glass);"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted);">Monto a Imputar ($)</label>
              <input
                type="number"
                formControlName="montoImputado"
                placeholder="0.00"
                class="w-full px-3 py-2 text-xs border rounded-lg font-mono"
                style="background-color: var(--bg-card); color: var(--text-primary); border-color: var(--border-glass);"
              />
            </div>

            <div class="pt-4 flex justify-end gap-2">
              <button
                type="button"
                class="px-4 py-2 text-xs font-medium rounded-lg"
                style="background-color: var(--bg-panel); color: var(--text-muted);"
                (click)="mostrarModalImputacion.set(false)"
              >
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="imputacionForm.invalid || guardandoImputacion()"
                class="px-4 py-2 text-xs font-medium text-white rounded-lg disabled:opacity-50"
                style="background-color: var(--accent-blue);"
              >
                {{ guardandoImputacion() ? 'Imputando...' : 'Confirmar Imputación' }}
              </button>
            </div>
          </form>
        </emx-modal-shell>
      }

      <!-- Modal Gestión Mora -->
      @if (mostrarModalGestion() && pacienteId()) {
        <emx-gestion-cobranza-modal
          [clienteId]="pacienteId()!"
          (closed)="mostrarModalGestion.set(false)"
          (saved)="cargarPaciente()"
        />
      }
    </div>
  `,
})
export class PatientDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PatientApiService);
  private readonly ledgerApi = inject(LedgerApiService);
  private readonly cobranzasApi = inject(CobranzasApiService);
  private readonly feedback = inject(UserFeedbackService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly pacienteId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly mainError = signal<string | null>(null);

  readonly activeTab = signal<PatientDetailTab>('cobertura');

  readonly paciente = signal<PacienteDTO | null>(null);
  readonly ficha = signal<FichaAfiliadoDTO | null>(null);
  readonly facturas = signal<FacturaDTO[]>([]);
  readonly consumo = signal<ConsumoMensualDTO | null>(null);
  readonly cobertura = signal<CoberturaVigenteDTO[]>([]);
  readonly movimientosLedger = signal<LedgerMovimientoDTO[]>([]);

  // Errores aislados por bloque
  readonly fichaError = signal(false);
  readonly facturasError = signal(false);
  readonly consumoError = signal(false);
  readonly coberturaError = signal(false);
  readonly ledgerError = signal(false);

  // Modales y formularios
  readonly mostrarModalRecibo = signal(false);
  readonly guardandoRecibo = signal(false);
  readonly reciboForm = this.fb.group({
    numeroRecibo: ['', Validators.required],
    montoCobrado: [0, [Validators.required, Validators.min(0.01)]]
  });

  readonly mostrarModalImputacion = signal(false);
  readonly facturaSeleccionadaId = signal<number | null>(null);
  readonly guardandoImputacion = signal(false);
  readonly imputacionForm = this.fb.group({
    cobranzaId: [null as number | null, Validators.required],
    montoImputado: [0, [Validators.required, Validators.min(0.01)]]
  });

  readonly mostrarModalGestion = signal(false);

  readonly integrantesGrupo = computed(() => {
    type MiembroItem = { id?: number; dni?: string; apellido?: string; nombreCompleto?: string; nombre?: string; rolFamiliar?: string; rol?: string; estado?: string };
    const f = this.ficha() as (FichaAfiliadoDTO & { integrantes?: MiembroItem[]; familiares?: MiembroItem[]; miembrosGrupo?: MiembroItem[] }) | null;
    if (!f) return [];
    return f.integrantes || f.familiares || f.miembrosGrupo || [];
  });

  readonly coberturaActual = computed(
    () => this.cobertura().find((c) => c.cubierto) ?? this.cobertura()[0] ?? null
  );

  readonly estadoCoberturaTexto = computed(() => {
    const cob = this.coberturaActual();
    if (!cob) return 'SIN COBERTURA REGISTRADA';
    if (cob.cubierto || cob.estadoCobertura === 'VIGENTE' || cob.estadoCobertura === 'ACTIVA') {
      return 'VIGENTE';
    }
    return cob.estadoCobertura ? cob.estadoCobertura.toUpperCase() : 'INACTIVA';
  });

  readonly coberturaBadgeVariant = computed(() => {
    const txt = this.estadoCoberturaTexto();
    return txt === 'VIGENTE' || txt === 'ACTIVA' ? 'stable' : 'critical';
  });

  readonly fichaFinanciera = signal<import('../../../data-access/dto/patient.dto').FichaFinancieraDTO | null>(null);

  readonly saldoResponsabilidadPaciente = computed(() => {
    if (this.fichaFinanciera()) {
      return this.fichaFinanciera()!.saldoResponsabilidadPaciente ?? 0;
    }
    return this.facturas().reduce((acc, f) => acc + (f.saldoPendiente ?? f.importeTotal ?? 0), 0);
  });

  readonly saldoPendiente = computed(() => this.saldoResponsabilidadPaciente());

  readonly saldoPendienteTerceros = computed(() => {
    return this.fichaFinanciera()?.saldoPendienteTerceros ?? 0;
  });

  readonly saldoTotalRelacionado = computed(() => {
    return this.saldoResponsabilidadPaciente() + this.saldoPendienteTerceros();
  });

  readonly estadoDeudaTexto = computed(() => {
    if (this.facturasError()) {
      return 'ERROR AL DEDUCIR DEUDA';
    }
    return this.saldoResponsabilidadPaciente() > 0 ? 'CON DEUDA PENDIENTE' : 'AL DÍA';
  });

  readonly deudaBadgeVariant = computed(() => {
    if (this.facturasError()) return 'urgent';
    return this.saldoResponsabilidadPaciente() > 0 ? 'critical' : 'stable';
  });

  readonly fmtCurrency = fmtCurrency;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (isNaN(id) || id <= 0) {
      this.pacienteId.set(null);
      this.loading.set(false);
      return;
    }
    this.pacienteId.set(id);

    const tabParam = this.route.snapshot.queryParamMap.get('tab') as PatientDetailTab;
    if (
      tabParam &&
      [
        'cobertura',
        'grupo-familiar',
        'facturas',
        'cuenta-corriente',
        'documentacion',
        'historial'
      ].includes(tabParam)
    ) {
      this.activeTab.set(tabParam);
    }

    this.cargarPaciente();
  }

  selectTab(tab: PatientDetailTab): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
    if (tab === 'cuenta-corriente') {
      this.cargarLedger();
    }
  }

  cargarPaciente(): void {
    const id = this.pacienteId();
    if (!id) return;

    this.loading.set(true);
    this.mainError.set(null);

    this.api
      .getById(id)
      .pipe(
        catchError(() => {
          this.mainError.set('No se pudo cargar el afiliado solicitado.');
          this.loading.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((paciente) => {
        if (!paciente) return;
        this.paciente.set(paciente);
        this.cargarBloques(id, paciente.dni);
      });
  }

  cargarBloques(pacienteId: number, dni: string): void {
    this.cargarFicha(pacienteId);
    this.cargarFichaFinanciera(pacienteId);
    this.cargarFacturas(pacienteId);
    this.cargarConsumo(pacienteId);
    this.cargarCobertura(dni);
    this.cargarLedger(pacienteId);
    this.loading.set(false);
  }

  cargarFichaFinanciera(pacienteId?: number): void {
    const id = pacienteId ?? this.pacienteId();
    if (!id) return;
    this.api
      .getFichaFinanciera(id)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        if (res) {
          this.fichaFinanciera.set(res);
        }
      });
  }

  cargarFicha(pacienteId?: number): void {
    const id = pacienteId ?? this.pacienteId();
    if (!id) return;
    this.fichaError.set(false);
    this.api
      .getFicha(id)
      .pipe(
        catchError(() => {
          this.fichaError.set(true);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((f) => {
        if (f) this.ficha.set(f);
      });
  }

  cargarFacturas(pacienteId?: number): void {
    const id = pacienteId ?? this.pacienteId();
    if (!id) return;
    this.facturasError.set(false);
    this.api
      .getFacturasAfiliado(id)
      .pipe(
        catchError(() => {
          this.facturasError.set(true);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((f) => {
        this.facturas.set(f || []);
      });
  }

  cargarConsumo(pacienteId?: number): void {
    const id = pacienteId ?? this.pacienteId();
    if (!id) return;
    this.consumoError.set(false);
    this.api
      .getConsumoMensual(id)
      .pipe(
        catchError(() => {
          this.consumoError.set(true);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((c) => {
        if (c) this.consumo.set(c);
      });
  }

  cargarCobertura(dni?: string): void {
    const searchDni = dni ?? this.paciente()?.dni;
    if (!searchDni) return;
    this.coberturaError.set(false);
    this.api
      .getCoberturaVigente(searchDni)
      .pipe(
        catchError(() => {
          this.coberturaError.set(true);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((cob) => {
        this.cobertura.set(cob || []);
      });
  }

  cargarLedger(pacienteId?: number): void {
    const id = pacienteId ?? this.pacienteId();
    if (!id) return;
    this.ledgerError.set(false);
    this.ledgerApi
      .getMovimientos(id)
      .pipe(
        catchError(() => {
          this.ledgerError.set(true);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((movs) => {
        this.movimientosLedger.set(movs || []);
      });
  }

  registrarReciboCobranza(): void {
    const id = this.pacienteId();
    if (!id || this.reciboForm.invalid) return;
    this.guardandoRecibo.set(true);

    const val = this.reciboForm.value;
    this.cobranzasApi
      .registrarCobranza({
        terceroEmpresaId: id,
        numeroRecibo: val.numeroRecibo!,
        montoCobrado: val.montoCobrado!
      })
      .pipe(
        catchError((err) => {
          const detail = err?.error?.detail || 'No se pudo registrar el recibo de cobranza.';
          this.feedback.push({ type: 'error', title: 'Error de Recibo', message: detail });
          this.guardandoRecibo.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        this.guardandoRecibo.set(false);
        if (res) {
          this.feedback.push({ type: 'success', title: 'Recibo Registrado', message: `Recibo N° ${res.numeroRecibo} generado exitosamente.` });
          this.mostrarModalRecibo.set(false);
          this.reciboForm.reset({ montoCobrado: 0 });
          this.cargarFacturas(id);
          this.cargarLedger(id);
        }
      });
  }

  abrirImputacion(facturaId: number): void {
    this.facturaSeleccionadaId.set(facturaId);
    const factura = this.facturas().find((f) => f.id === facturaId);
    this.imputacionForm.patchValue({
      montoImputado: factura?.saldoPendiente ?? factura?.importeTotal ?? 0
    });
    this.mostrarModalImputacion.set(true);
  }

  confirmarImputacion(): void {
    const facturaId = this.facturaSeleccionadaId();
    if (!facturaId || this.imputacionForm.invalid) return;
    this.guardandoImputacion.set(true);

    const val = this.imputacionForm.value;
    this.cobranzasApi
      .aplicarADocumento(val.cobranzaId!, {
        documentoComercialId: facturaId,
        montoImputado: val.montoImputado!
      })
      .pipe(
        catchError((err) => {
          const detail = err?.error?.detail || 'Error al imputar cobro a la factura.';
          this.feedback.push({ type: 'error', title: 'Error de Imputación', message: detail });
          this.guardandoImputacion.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        this.guardandoImputacion.set(false);
        if (res) {
          this.feedback.push({ type: 'success', title: 'Imputación Exitosa', message: 'Monto imputado contra la factura.' });
          this.mostrarModalImputacion.set(false);
          const id = this.pacienteId();
          if (id) {
            this.cargarFacturas(id);
            this.cargarLedger(id);
          }
        }
      });
  }
}
