import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
  ComprasApiService,
  SolicitudCompraDTO,
  OrdenCompraDTO,
  ComprobanteProveedorDTO,
  LineaRecepcionBienesDTO
} from '../../data-access/api/compras.api';
import { CostosApiService, CentroCostoDTO } from '../../data-access/api/costos.api';
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
    <div class="compras-container p-6 space-y-6 bg-[var(--color-bg-app)] min-h-screen text-[var(--color-text-main)]">
      <!-- Header -->
      <header class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--color-bg-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-[var(--color-text-main)]">Módulo Profesional de Compras</h1>
          <p class="text-[var(--color-text-muted)] text-sm mt-1">Solicitudes, Órdenes de Compra, Recepción Multilínea y 3-Way Matching</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            (click)="activeTab.set('solicitudes')"
            [class.bg-blue-600]="activeTab() === 'solicitudes'"
            [class.text-white]="activeTab() === 'solicitudes'"
            class="px-4 py-2 rounded-lg font-medium text-sm transition bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border)]"
          >
            Solicitudes
          </button>
          <button
            (click)="activeTab.set('ordenes')"
            [class.bg-blue-600]="activeTab() === 'ordenes'"
            [class.text-white]="activeTab() === 'ordenes'"
            class="px-4 py-2 rounded-lg font-medium text-sm transition bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border)]"
          >
            Órdenes de Compra
          </button>
          <button
            (click)="activeTab.set('recepciones')"
            [class.bg-blue-600]="activeTab() === 'recepciones'"
            [class.text-white]="activeTab() === 'recepciones'"
            class="px-4 py-2 rounded-lg font-medium text-sm transition bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border)]"
          >
            Recepciones
          </button>
          <button
            (click)="activeTab.set('matching')"
            [class.bg-blue-600]="activeTab() === 'matching'"
            [class.text-white]="activeTab() === 'matching'"
            class="px-4 py-2 rounded-lg font-medium text-sm transition bg-[var(--color-bg-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border)]"
          >
            Comprobantes & 3-Way Match
          </button>
        </div>
      </header>

      <!-- SOLAPA 1: SOLICITUDES DE COMPRA -->
      @if (activeTab() === 'solicitudes') {
        <section class="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border)] shadow-sm space-y-6">
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-bold text-[var(--color-text-main)]">Solicitudes de Compra & Imputación</h2>
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
                <thead class="bg-[var(--color-bg-surface)] text-xs uppercase font-semibold text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <tr>
                    <th class="px-4 py-3">ID</th>
                    <th class="px-4 py-3">Concepto / Insumo</th>
                    <th class="px-4 py-3">Monto Estimado</th>
                    <th class="px-4 py-3">Solicitado Por</th>
                    <th class="px-4 py-3">Estado</th>
                    <th class="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--color-border)]">
                  @for (sol of solicitudes(); track sol.id) {
                    <tr class="hover:bg-[var(--color-bg-surface)] transition">
                      <td class="px-4 py-3 font-mono text-xs">{{ sol.id }}</td>
                      <td class="px-4 py-3 font-medium text-[var(--color-text-main)]">{{ sol.concepto }}</td>
                      <td class="px-4 py-3 font-mono text-xs">$ {{ (sol.montoEstimado || 0) | number:'1.2-2' }}</td>
                      <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ sol.solicitadoPor || 'Sistema' }}</td>
                      <td class="px-4 py-3">
                        <emx-status-badge [variant]="sol.estado === 'APROBADA' ? 'stable' : 'pending'">
                          {{ sol.estado }}
                        </emx-status-badge>
                      </td>
                      <td class="px-4 py-3 text-right">
                        @if (sol.estado === 'PENDIENTE') {
                          <button (click)="aprobarSolicitud(sol.id!)" class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium">
                            Aprobar
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      }

      <!-- SOLAPA 2: ÓRDENES DE COMPRA -->
      @if (activeTab() === 'ordenes') {
        <section class="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border)] shadow-sm space-y-6">
          <h2 class="text-lg font-bold text-[var(--color-text-main)]">Órdenes de Compra Emitidas</h2>
          @if (ordenesCompra().length === 0) {
            <emx-empty-state title="Sin órdenes de compra" message="No se registran órdenes de compra emitidas."></emx-empty-state>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-[var(--color-bg-surface)] text-xs uppercase font-semibold text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <tr>
                    <th class="px-4 py-3">N° Orden</th>
                    <th class="px-4 py-3">Fecha Emisión</th>
                    <th class="px-4 py-3">Monto Total</th>
                    <th class="px-4 py-3">Estado</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--color-border)]">
                  @for (oc of ordenesCompra(); track oc.id) {
                    <tr class="hover:bg-[var(--color-bg-surface)] transition">
                      <td class="px-4 py-3 font-mono font-medium text-[var(--color-text-main)]">{{ oc.numero || ('OC-' + oc.id) }}</td>
                      <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ oc.fechaEmision || '-' }}</td>
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
          }
        </section>
      }

      <!-- SOLAPA 3: RECEPCIONES CON LÍNEAS MÚLTIPLES Y SELECTOR OC -->
      @if (activeTab() === 'recepciones') {
        <section class="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border)] shadow-sm space-y-6">
          <h2 class="text-lg font-bold text-[var(--color-text-main)]">Registro de Recepción de Bienes con Trazabilidad Lote/Vencimiento</h2>

          <form (ngSubmit)="onSubmitRecepcion()" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">Orden de Compra</label>
                <select [(ngModel)]="newRecepcion.ordenCompraId" name="ordenCompraId" class="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-input)] text-sm text-[var(--color-text-main)]">
                  @for (oc of ordenesCompra(); track oc.id) {
                    <option [value]="oc.id">{{ oc.numero || ('OC-' + oc.id) }} ($ {{ oc.montoTotal }})</option>
                  }
                </select>
              </div>

              <div>
                <label class="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">N° Remito Físico</label>
                <input
                  type="text"
                  [(ngModel)]="newRecepcion.numeroRemito"
                  name="numeroRemito"
                  placeholder="REM-0001-00001234"
                  class="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-input)] text-sm text-[var(--color-text-main)]"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold text-[var(--color-text-muted)] uppercase mb-1">Recibido Por</label>
                <input
                  type="text"
                  [(ngModel)]="newRecepcion.recibidoPor"
                  name="recibidoPor"
                  placeholder="Farmacia Central"
                  class="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-input)] text-sm text-[var(--color-text-main)]"
                />
              </div>
            </div>

            <!-- Líneas de Recepción -->
            <div class="bg-[var(--color-bg-surface)] p-4 rounded-xl border border-[var(--color-border)] space-y-4">
              <div class="flex justify-between items-center">
                <h3 class="text-sm font-bold text-[var(--color-text-main)]">Líneas de Insumos Recibidos</h3>
                <button type="button" (click)="agregarLineaRecepcion()" class="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium">
                  + Agregar Línea
                </button>
              </div>

              @for (linea of lineasRecepcion; track $index) {
                <div class="grid grid-cols-1 md:grid-cols-4 gap-3 items-center bg-[var(--color-bg-card)] p-3 rounded-lg border border-[var(--color-border)]">
                  <input type="text" [(ngModel)]="linea.descripcionItem" [name]="'desc_' + $index" placeholder="Descripción Insumo Médico" class="px-2 py-1.5 border border-[var(--color-border)] rounded bg-[var(--color-bg-input)] text-xs text-[var(--color-text-main)]" />
                  <input type="number" [(ngModel)]="linea.cantidadRecibida" [name]="'cant_' + $index" placeholder="Cant" class="px-2 py-1.5 border border-[var(--color-border)] rounded bg-[var(--color-bg-input)] text-xs text-[var(--color-text-main)]" />
                  <input type="text" [(ngModel)]="linea.numeroLote" [name]="'lote_' + $index" placeholder="N° Lote" class="px-2 py-1.5 border border-[var(--color-border)] rounded bg-[var(--color-bg-input)] text-xs font-mono text-[var(--color-text-main)]" />
                  <div class="flex gap-2 items-center">
                    <input type="date" [(ngModel)]="linea.fechaVencimiento" [name]="'venc_' + $index" class="w-full px-2 py-1.5 border border-[var(--color-border)] rounded bg-[var(--color-bg-input)] text-xs text-[var(--color-text-main)]" />
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

      <!-- SOLAPA 4: COMPROBANTES Y 3-WAY MATCHING -->
      @if (activeTab() === 'matching') {
        <section class="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border)] shadow-sm space-y-6">
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-bold text-[var(--color-text-main)]">Comprobantes de Proveedores & 3-Way Match Triangular</h2>
            <button (click)="loadComprobantes()" class="px-3 py-1.5 text-xs font-medium bg-[var(--color-bg-surface)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-lg">
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
                  class="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-input)] text-sm text-[var(--color-text-main)]"
                />
                <div class="flex gap-2">
                  <button (click)="confirmarOverride()" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg shadow">
                    Confirmar Override
                  </button>
                  <button (click)="cancelarOverride()" class="px-3 py-2 bg-[var(--color-bg-surface)] text-[var(--color-text-main)] border border-[var(--color-border)] rounded-lg text-xs">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          }

          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-[var(--color-bg-surface)] text-xs uppercase font-semibold text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
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
              <tbody class="divide-y divide-[var(--color-border)]">
                @for (c of comprobantes(); track c.id) {
                  <tr class="hover:bg-[var(--color-bg-surface)] transition">
                    <td class="px-4 py-3 font-mono text-xs">{{ c.id }}</td>
                    <td class="px-4 py-3 font-medium text-[var(--color-text-main)]">{{ c.tipoDocumento }}</td>
                    <td class="px-4 py-3 font-mono text-xs">{{ c.puntoVenta }}-{{ c.numeroDocumento }}</td>
                    <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ c.fechaComprobante }}</td>
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

      <!-- Modal Alta Solicitud de Compra (F3-07: Centro de costo) -->
      @if (showSolicitudModal) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-[var(--color-bg-card)] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[var(--color-border)]">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-bold text-[var(--color-text-main)]">Nueva Solicitud de Compra</h3>
              <button (click)="showSolicitudModal = false" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">✕</button>
            </div>

            <form [formGroup]="solicitudForm" (ngSubmit)="onSubmitSolicitud()" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-1">Concepto / Descripción</label>
                <input
                  type="text"
                  formControlName="concepto"
                  placeholder="Ej: Insumos de bioseguridad para móviles"
                  class="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-input)] text-sm text-[var(--color-text-main)]"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-1">Monto Estimado ($)</label>
                <input
                  type="number"
                  formControlName="montoEstimado"
                  placeholder="15000.00"
                  class="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-input)] text-sm text-[var(--color-text-main)] font-mono"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-1">Centro de Costo Imputable</label>
                <select formControlName="centroCostoId" class="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-input)] text-sm text-[var(--color-text-main)]">
                  @for (cc of centrosCosto(); track cc.id) {
                    <option [value]="cc.id">{{ cc.codigo }} - {{ cc.nombre }}</option>
                  }
                </select>
              </div>

              <div class="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  (click)="showSolicitudModal = false"
                  class="px-4 py-2 text-sm font-medium text-[var(--color-text-main)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg"
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
    </div>
  `
})
export class ComprasComponent implements OnInit {
  activeTab = signal<'solicitudes' | 'ordenes' | 'recepciones' | 'matching'>('solicitudes');

  solicitudes = signal<SolicitudCompraDTO[]>([]);
  ordenesCompra = signal<OrdenCompraDTO[]>([]);
  comprobantes = signal<ComprobanteProveedorDTO[]>([]);
  centrosCosto = signal<CentroCostoDTO[]>([]);

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
  private feedback = inject(UserFeedbackService);
  private fb = inject(FormBuilder);

  solicitudForm = this.fb.group({
    concepto: ['', Validators.required],
    montoEstimado: [0, Validators.required],
    centroCostoId: [1]
  });

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales(): void {
    this.loading.set(true);

    this.comprasApi.getSolicitudes().subscribe({
      next: (data) => this.solicitudes.set(data || []),
      error: (err) => this.feedback.fromHttpError(err)
    });

    this.comprasApi.getOrdenesCompra().subscribe({
      next: (data) => {
        this.ordenesCompra.set(data || []);
        if (data && data.length > 0 && data[0].id) {
          this.newRecepcion.ordenCompraId = data[0].id;
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });

    this.costosApi.getCentrosCosto().subscribe({
      next: (data) => this.centrosCosto.set(data || []),
      error: () => {}
    });

    this.loadComprobantes();
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
      montoEstimado: val.montoEstimado || 0,
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
        this.cargarDatosIniciales();
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
        this.cargarDatosIniciales();
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
