import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  StockProductosApi,
  ProductoDTO,
  MovimientoStockDTO,
  EquipoInternacionDTO,
  MedicamentoDTO,
} from '../../data-access/api/stock-productos.api';
import { UserFeedbackService } from '../../core/notifications/user-feedback.service';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent, BadgeVariant } from '../../shared/components/status-badge/status-badge.component';
import { ModalShellComponent } from '../../shared/components/modal-shell/modal-shell.component';

export type TabType = 'productos' | 'movimientos' | 'equipos' | 'medicamentos';

@Component({
  selector: 'emx-inventario',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GlassCardComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    ModalShellComponent,
  ],
  template: `
    <div class="screen p-6">
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 class="text-2xl font-bold" style="color: var(--text-primary)">
            Inventario, Productos y Medicamentos
          </h1>
          <p class="text-sm" style="color: var(--text-secondary)">
            Gestión integral de stock, trazabilidad de movimientos y vademécum
          </p>
        </div>

        <div class="flex gap-2">
          @if (activeTab() === 'productos') {
            <button
              class="px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition"
              (click)="openNuevoProductoModal()"
            >
              + Nuevo Producto
            </button>
          } @else if (activeTab() === 'movimientos') {
            <button
              class="px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition"
              (click)="openNuevoMovimientoModal()"
            >
              + Registrar Movimiento
            </button>
          } @else if (activeTab() === 'medicamentos') {
            <button
              class="px-4 py-2 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition"
              (click)="openNuevoMedicamentoModal()"
            >
              + Nuevo Medicamento
            </button>
          }
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="flex border-b mb-6 gap-4" style="border-color: var(--border-glass)">
        <button
          class="pb-3 px-4 text-sm font-semibold transition border-b-2"
          [ngClass]="activeTab() === 'productos' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-slate-200'"
          (click)="setTab('productos')"
        >
          Catálogo de Productos ({{ totalProductos() }})
        </button>
        <button
          class="pb-3 px-4 text-sm font-semibold transition border-b-2"
          [ngClass]="activeTab() === 'movimientos' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-slate-200'"
          (click)="setTab('movimientos')"
        >
          Movimientos de Stock ({{ totalMovimientos() }})
        </button>
        <button
          class="pb-3 px-4 text-sm font-semibold transition border-b-2"
          [ngClass]="activeTab() === 'equipos' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-slate-200'"
          (click)="setTab('equipos')"
        >
          Equipamiento Internación ({{ totalEquipos() }})
        </button>
        <button
          class="pb-3 px-4 text-sm font-semibold transition border-b-2"
          [ngClass]="activeTab() === 'medicamentos' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-400 hover:text-slate-200'"
          (click)="setTab('medicamentos')"
        >
          Vademécum / Medicamentos ({{ totalMedicamentos() }})
        </button>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <emx-loading-state message="Cargando inventario..." />
      }

      <!-- Error State -->
      @if (error() && !loading()) {
        <emx-error-state [message]="error()!" (retry)="reintentarCarga()" />
      }

      <!-- Tab Contents -->
      @if (!loading() && !error()) {
        <!-- TAB 1: PRODUCTOS -->
        @if (activeTab() === 'productos') {
          @if (productos().length === 0) {
            <emx-empty-state
              title="No hay productos registrados"
              message="Registrá productos para comenzar el seguimiento del catálogo de insumos y medicamentos."
            />
          } @else {
            <emx-glass-card>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse data-table">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--border-glass)">
                      <th class="py-3 px-4">Código / SKU</th>
                      <th class="py-3 px-4">Nombre</th>
                      <th class="py-3 px-4 text-right">Stock</th>
                      <th class="py-3 px-4 text-right">Precio</th>
                      <th class="py-3 px-4">Lote / Vencimiento</th>
                      <th class="py-3 px-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (prod of productos(); track prod.id) {
                      <tr style="border-bottom: 1px solid var(--border-glass)">
                        <td class="py-3 px-4 font-mono text-xs">
                          {{ prod.codigo || prod.sku || 'N/A' }}
                        </td>
                        <td class="py-3 px-4">
                          <div class="font-medium" style="color: var(--text-primary)">
                            {{ prod.nombre }}
                          </div>
                          @if (prod.descripcion) {
                            <div class="text-xs" style="color: var(--text-secondary)">
                              {{ prod.descripcion }}
                            </div>
                          }
                        </td>
                        <td class="py-3 px-4 text-right font-bold">
                          {{ prod.stock }}
                          @if (prod.stockMinimo && prod.stock! <= prod.stockMinimo) {
                            <span class="text-xs text-amber-500 font-normal block">¡Bajo stock!</span>
                          }
                        </td>
                        <td class="py-3 px-4 text-right">
                          {{ prod.precio | currency: 'ARS' : 'symbol' : '1.2-2' }}
                        </td>
                        <td class="py-3 px-4 text-xs">
                          @if (prod.lote) {
                            <div>Lote: {{ prod.lote }}</div>
                          }
                          @if (prod.fechaVencimiento) {
                            <div>Venc: {{ prod.fechaVencimiento | date: 'shortDate' }}</div>
                          }
                        </td>
                        <td class="py-3 px-4">
                          <emx-status-badge [variant]="mapEstadoProductoVariant(prod.estadoProducto || (prod.activo ? 'DISPONIBLE' : 'AGOTADO'))">
                            {{ prod.estadoProducto || (prod.activo ? 'DISPONIBLE' : 'AGOTADO') }}
                          </emx-status-badge>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>

              <!-- Paginación -->
              <div class="flex justify-between items-center mt-4 pt-4 border-t" style="border-color: var(--border-glass)">
                <span class="text-xs" style="color: var(--text-secondary)">
                  Página {{ pageProductos() + 1 }} de {{ totalPaginasProductos() }} ({{ totalProductos() }} ítems)
                </span>
                <div class="flex gap-2">
                  <button
                    class="px-3 py-1 text-xs rounded border transition"
                    style="border-color: var(--border-glass); color: var(--text-primary)"
                    [disabled]="pageProductos() === 0"
                    (click)="cambiarPaginaProductos(-1)"
                  >
                    Anterior
                  </button>
                  <button
                    class="px-3 py-1 text-xs rounded border transition"
                    style="border-color: var(--border-glass); color: var(--text-primary)"
                    [disabled]="(pageProductos() + 1) >= totalPaginasProductos()"
                    (click)="cambiarPaginaProductos(1)"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </emx-glass-card>
          }
        }

        <!-- TAB 2: MOVIMIENTOS -->
        @if (activeTab() === 'movimientos') {
          @if (movimientos().length === 0) {
            <emx-empty-state
              title="No hay movimientos de stock registrados"
              message="Registrá un ingreso o egreso de insumos para llevar el historial auditor."
            />
          } @else {
            <emx-glass-card>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse data-table">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--border-glass)">
                      <th class="py-3 px-4">Fecha</th>
                      <th class="py-3 px-4">Tipo</th>
                      <th class="py-3 px-4">Producto</th>
                      <th class="py-3 px-4 text-right">Cant. Movimiento</th>
                      <th class="py-3 px-4 text-right">Stock Resultante</th>
                      <th class="py-3 px-4">Motivo / Responsable</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (mov of movimientos(); track mov.id) {
                      <tr style="border-bottom: 1px solid var(--border-glass)">
                        <td class="py-3 px-4 text-xs">
                          {{ mov.fechaMovimiento | date: 'short' }}
                        </td>
                        <td class="py-3 px-4">
                          <emx-status-badge [variant]="mov.tipoMovimiento === 'INGRESO' ? 'stable' : 'urgent'">
                            {{ mov.tipoMovimiento || 'INGRESO' }}
                          </emx-status-badge>
                        </td>
                        <td class="py-3 px-4 font-medium" style="color: var(--text-primary)">
                          {{ mov.producto?.nombre || 'ID: ' + mov.producto?.id }}
                        </td>
                        <td class="py-3 px-4 text-right font-bold">
                          {{ mov.tipoMovimiento === 'EGRESO' ? '-' : '+' }}{{ mov.cantidadMovimiento }}
                        </td>
                        <td class="py-3 px-4 text-right text-xs">
                          {{ mov.cantidadPosterior }}
                        </td>
                        <td class="py-3 px-4 text-xs">
                          <div>{{ mov.motivo }}</div>
                          <div class="text-slate-400">Por: {{ mov.usuarioResponsable }}</div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </emx-glass-card>
          }
        }

        <!-- TAB 3: EQUIPAMIENTO -->
        @if (activeTab() === 'equipos') {
          @if (equipos().length === 0) {
            <emx-empty-state
              title="No hay equipos de internación asignados"
              message="Los equipos asignados a internación domiciliaria aparecerán en este panel."
            />
          } @else {
            <emx-glass-card>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse data-table">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--border-glass)">
                      <th class="py-3 px-4">ID / Producto</th>
                      <th class="py-3 px-4 text-right">Cantidad</th>
                      <th class="py-3 px-4">Estado Equipo</th>
                      <th class="py-3 px-4">Entrega</th>
                      <th class="py-3 px-4">Devolución</th>
                      <th class="py-3 px-4">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (eq of equipos(); track eq.id) {
                      <tr style="border-bottom: 1px solid var(--border-glass)">
                        <td class="py-3 px-4 font-medium" style="color: var(--text-primary)">
                          #{{ eq.id }} - {{ eq.producto?.nombre || 'Equipo Médico' }}
                        </td>
                        <td class="py-3 px-4 text-right font-bold">
                          {{ eq.cantidad }}
                        </td>
                        <td class="py-3 px-4">
                          <emx-status-badge [variant]="mapEstadoEquipoVariant(eq.estadoEquipo || 'DISPONIBLE')">
                            {{ eq.estadoEquipo || 'DISPONIBLE' }}
                          </emx-status-badge>
                        </td>
                        <td class="py-3 px-4 text-xs">
                          <div>{{ eq.fechaEntrega | date: 'shortDate' }}</div>
                          <div class="text-slate-400">{{ eq.responsableEntrega }}</div>
                        </td>
                        <td class="py-3 px-4 text-xs">
                          <div>{{ eq.fechaDevolucion ? (eq.fechaDevolucion | date: 'shortDate') : 'Pendiente' }}</div>
                          <div class="text-slate-400">{{ eq.responsableDevolucion }}</div>
                        </td>
                        <td class="py-3 px-4 text-xs">
                          {{ eq.observacionEntrega || eq.observacionDevolucion || 'Sin observaciones' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </emx-glass-card>
          }
        }

        <!-- TAB 4: MEDICAMENTOS / VADEMÉCUM -->
        @if (activeTab() === 'medicamentos') {
          @if (medicamentos().length === 0) {
            <emx-empty-state
              title="No hay medicamentos en el vademécum"
              message="Registrá medicamentos genéricos y dosis recomendadas para prescripción."
            />
          } @else {
            <emx-glass-card>
              <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse data-table">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--border-glass)">
                      <th class="py-3 px-4">Nombre Genérico</th>
                      <th class="py-3 px-4">Dosis</th>
                      <th class="py-3 px-4">Forma Farmacéutica</th>
                      <th class="py-3 px-4">Código Nacional</th>
                      <th class="py-3 px-4">Controlado / Receta</th>
                      <th class="py-3 px-4">Almacenamiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (med of medicamentos(); track med.id) {
                      <tr style="border-bottom: 1px solid var(--border-glass)">
                        <td class="py-3 px-4 font-semibold" style="color: var(--text-primary)">
                          {{ med.nombreGenerico }}
                        </td>
                        <td class="py-3 px-4 text-sm font-mono">
                          {{ med.dosis }}
                        </td>
                        <td class="py-3 px-4 text-xs">
                          {{ med.formaFarmaceutica || 'N/A' }}
                        </td>
                        <td class="py-3 px-4 text-xs font-mono">
                          {{ med.codigoNacional || 'N/A' }}
                        </td>
                        <td class="py-3 px-4 text-xs">
                          @if (med.medicamentoControlado) {
                            <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-400 font-semibold mr-1">
                              Controlado
                            </span>
                          }
                          @if (med.requiereRecetaEspecial) {
                            <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-semibold">
                              Receta Esp.
                            </span>
                          }
                          @if (!med.medicamentoControlado && !med.requiereRecetaEspecial) {
                            <span class="text-slate-400">Venta Libre / Normal</span>
                          }
                        </td>
                        <td class="py-3 px-4 text-xs">
                          {{ med.almacenamientoRecomendado || 'Ambiente normal' }}
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </emx-glass-card>
          }
        }
      }

      <!-- MODAL 1: NUEVO PRODUCTO -->
      @if (modalNuevoProductoOpen()) {
        <emx-modal-shell
          title="Alta de Producto en Catálogo"
          (closed)="closeNuevoProductoModal()"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium mb-1" style="color: var(--text-primary)">Código *</label>
              <input
                type="text"
                class="w-full px-3 py-2 rounded border bg-transparent text-sm"
                style="border-color: var(--border-glass); color: var(--text-primary)"
                [(ngModel)]="nuevoProducto.codigo"
              />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" style="color: var(--text-primary)">SKU *</label>
              <input
                type="text"
                class="w-full px-3 py-2 rounded border bg-transparent text-sm"
                style="border-color: var(--border-glass); color: var(--text-primary)"
                [(ngModel)]="nuevoProducto.sku"
              />
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-medium mb-1" style="color: var(--text-primary)">Nombre del Producto *</label>
              <input
                type="text"
                class="w-full px-3 py-2 rounded border bg-transparent text-sm"
                style="border-color: var(--border-glass); color: var(--text-primary)"
                [(ngModel)]="nuevoProducto.nombre"
              />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" style="color: var(--text-primary)">Stock Inicial *</label>
              <input
                type="number"
                class="w-full px-3 py-2 rounded border bg-transparent text-sm"
                style="border-color: var(--border-glass); color: var(--text-primary)"
                [(ngModel)]="nuevoProducto.stock"
              />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" style="color: var(--text-primary)">Precio *</label>
              <input
                type="number"
                class="w-full px-3 py-2 rounded border bg-transparent text-sm"
                style="border-color: var(--border-glass); color: var(--text-primary)"
                [(ngModel)]="nuevoProducto.precio"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <button
              class="px-4 py-2 rounded border text-sm"
              style="border-color: var(--border-glass); color: var(--text-primary)"
              (click)="closeNuevoProductoModal()"
            >
              Cancelar
            </button>
            <button
              class="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              (click)="guardarNuevoProducto()"
            >
              Guardar Producto
            </button>
          </div>
        </emx-modal-shell>
      }

      <!-- MODAL 2: REGISTRAR MOVIMIENTO -->
      @if (modalNuevoMovimientoOpen()) {
        <emx-modal-shell
          title="Registrar Movimiento de Stock"
          (closed)="closeNuevoMovimientoModal()"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium mb-1" style="color: var(--text-primary)">Tipo Movimiento *</label>
              <select
                class="w-full px-3 py-2 rounded border bg-slate-900 text-sm text-white"
                style="border-color: var(--border-glass)"
                [(ngModel)]="nuevoMovimiento.tipoMovimiento"
              >
                <option value="INGRESO">INGRESO</option>
                <option value="EGRESO">EGRESO</option>
                <option value="AJUSTE_INVENTARIO">AJUSTE DE INVENTARIO</option>
                <option value="CONSUMO_PROPIO">CONSUMO PROPIO</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" style="color: var(--text-primary)">Cantidad *</label>
              <input
                type="number"
                class="w-full px-3 py-2 rounded border bg-transparent text-sm"
                style="border-color: var(--border-glass); color: var(--text-primary)"
                [(ngModel)]="nuevoMovimiento.cantidadMovimiento"
              />
            </div>
            <div class="col-span-2">
              <label class="block text-xs font-medium mb-1" style="color: var(--text-primary)">Motivo *</label>
              <input
                type="text"
                class="w-full px-3 py-2 rounded border bg-transparent text-sm"
                style="border-color: var(--border-glass); color: var(--text-primary)"
                [(ngModel)]="nuevoMovimiento.motivo"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <button
              class="px-4 py-2 rounded border text-sm"
              style="border-color: var(--border-glass); color: var(--text-primary)"
              (click)="closeNuevoMovimientoModal()"
            >
              Cancelar
            </button>
            <button
              class="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              (click)="guardarNuevoMovimiento()"
            >
              Registrar Movimiento
            </button>
          </div>
        </emx-modal-shell>
      }

      <!-- MODAL 3: NUEVO MEDICAMENTO -->
      @if (modalNuevoMedicamentoOpen()) {
        <emx-modal-shell
          title="Agregar Medicamento al Vademécum"
          (closed)="closeNuevoMedicamentoModal()"
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="col-span-2">
              <label class="block text-xs font-medium mb-1" style="color: var(--text-primary)">Nombre Genérico *</label>
              <input
                type="text"
                class="w-full px-3 py-2 rounded border bg-transparent text-sm"
                style="border-color: var(--border-glass); color: var(--text-primary)"
                [(ngModel)]="nuevoMedicamento.nombreGenerico"
              />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" style="color: var(--text-primary)">Dosis (ej: 500 mg) *</label>
              <input
                type="text"
                class="w-full px-3 py-2 rounded border bg-transparent text-sm"
                style="border-color: var(--border-glass); color: var(--text-primary)"
                [(ngModel)]="nuevoMedicamento.dosis"
              />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1" style="color: var(--text-primary)">Forma Farmacéutica</label>
              <input
                type="text"
                class="w-full px-3 py-2 rounded border bg-transparent text-sm"
                style="border-color: var(--border-glass); color: var(--text-primary)"
                [(ngModel)]="nuevoMedicamento.formaFarmaceutica"
              />
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-6">
            <button
              class="px-4 py-2 rounded border text-sm"
              style="border-color: var(--border-glass); color: var(--text-primary)"
              (click)="closeNuevoMedicamentoModal()"
            >
              Cancelar
            </button>
            <button
              class="px-4 py-2 rounded bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              (click)="guardarNuevoMedicamento()"
            >
              Guardar Medicamento
            </button>
          </div>
        </emx-modal-shell>
      }
    </div>
  `,
})
export class InventarioComponent implements OnInit {
  private readonly api = inject(StockProductosApi);
  private readonly feedback = inject(UserFeedbackService);

  activeTab = signal<TabType>('productos');
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // Tab 1: Productos
  productos = signal<ProductoDTO[]>([]);
  totalProductos = signal<number>(0);
  pageProductos = signal<number>(0);

  // Tab 2: Movimientos
  movimientos = signal<MovimientoStockDTO[]>([]);
  totalMovimientos = signal<number>(0);
  pageMovimientos = signal<number>(0);

  // Tab 3: Equipos
  equipos = signal<EquipoInternacionDTO[]>([]);
  totalEquipos = signal<number>(0);
  pageEquipos = signal<number>(0);

  // Tab 4: Medicamentos
  medicamentos = signal<MedicamentoDTO[]>([]);
  totalMedicamentos = signal<number>(0);
  pageMedicamentos = signal<number>(0);

  // Modales
  modalNuevoProductoOpen = signal<boolean>(false);
  nuevoProducto: Partial<ProductoDTO> = {};

  modalNuevoMovimientoOpen = signal<boolean>(false);
  nuevoMovimiento: Partial<MovimientoStockDTO> = { tipoMovimiento: 'INGRESO', cantidadMovimiento: 1 };

  modalNuevoMedicamentoOpen = signal<boolean>(false);
  nuevoMedicamento: Partial<MedicamentoDTO> = {};

  totalPaginasProductos = computed(() => Math.ceil(this.totalProductos() / 10) || 1);

  ngOnInit() {
    this.cargarDatosSolapaActual();
  }

  setTab(tab: TabType) {
    this.activeTab.set(tab);
    this.error.set(null);
    this.cargarDatosSolapaActual();
  }

  cargarDatosSolapaActual() {
    switch (this.activeTab()) {
      case 'productos':
        this.cargarProductos();
        break;
      case 'movimientos':
        this.cargarMovimientos();
        break;
      case 'equipos':
        this.cargarEquipos();
        break;
      case 'medicamentos':
        this.cargarMedicamentos();
        break;
    }
  }

  reintentarCarga() {
    this.error.set(null);
    this.cargarDatosSolapaActual();
  }

  cargarProductos() {
    this.loading.set(true);
    this.api.getProductos(this.pageProductos(), 10).subscribe({
      next: (res) => {
        this.productos.set(res.content);
        this.totalProductos.set(res.totalElements);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('No se pudieron cargar los productos');
        this.loading.set(false);
        this.feedback.fromHttpError(err);
      },
    });
  }

  cambiarPaginaProductos(delta: number) {
    const nuevaPage = this.pageProductos() + delta;
    if (nuevaPage >= 0 && nuevaPage < this.totalPaginasProductos()) {
      this.pageProductos.set(nuevaPage);
      this.cargarProductos();
    }
  }

  cargarMovimientos() {
    this.loading.set(true);
    this.api.getMovimientosStock(this.pageMovimientos(), 10).subscribe({
      next: (res) => {
        this.movimientos.set(res.content);
        this.totalMovimientos.set(res.totalElements);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('No se pudieron cargar los movimientos de stock');
        this.loading.set(false);
        this.feedback.fromHttpError(err);
      },
    });
  }

  cargarEquipos() {
    this.loading.set(true);
    this.api.getEquiposInternacion(this.pageEquipos(), 10).subscribe({
      next: (res) => {
        this.equipos.set(res.content);
        this.totalEquipos.set(res.totalElements);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('No se pudieron cargar los equipos de internación');
        this.loading.set(false);
        this.feedback.fromHttpError(err);
      },
    });
  }

  cargarMedicamentos() {
    this.loading.set(true);
    this.api.getMedicamentos(this.pageMedicamentos(), 10).subscribe({
      next: (res) => {
        this.medicamentos.set(res.content);
        this.totalMedicamentos.set(res.totalElements);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('No se pudieron cargar los medicamentos');
        this.loading.set(false);
        this.feedback.fromHttpError(err);
      },
    });
  }

  mapEstadoProductoVariant(estado: string): BadgeVariant {
    if (estado === 'DISPONIBLE') return 'stable';
    if (estado === 'AGOTADO' || estado === 'VENCIDO') return 'critical';
    if (estado === 'EN_RESERVA') return 'urgent';
    return 'info';
  }

  mapEstadoEquipoVariant(estado: string): BadgeVariant {
    if (estado === 'DISPONIBLE') return 'stable';
    if (estado === 'ENTREGADO') return 'cyan';
    if (estado === 'EN_REPARACION') return 'urgent';
    return 'critical';
  }

  // Action Modals
  openNuevoProductoModal() {
    this.nuevoProducto = { codigo: '', sku: '', nombre: '', stock: 0, precio: 0, costo: 0, precioCompra: 0, precioVenta: 0, precioBase: 0, porcentajeImpuesto: 21, peso: 1, activo: true, proveedor: 'General', estadoProducto: 'DISPONIBLE', codigoBarras: '0000' };
    this.modalNuevoProductoOpen.set(true);
  }

  closeNuevoProductoModal() {
    this.modalNuevoProductoOpen.set(false);
  }

  guardarNuevoProducto() {
    if (!this.nuevoProducto.nombre || !this.nuevoProducto.codigo) {
      this.feedback.push({ type: 'warning', title: 'Campos requeridos', message: 'Completá código y nombre del producto.' });
      return;
    }
    this.api.createProducto(this.nuevoProducto).subscribe({
      next: () => {
        this.feedback.push({ type: 'success', title: 'Producto creado', message: 'El producto fue agregado al catálogo.' });
        this.closeNuevoProductoModal();
        this.cargarProductos();
      },
      error: (err) => this.feedback.fromHttpError(err),
    });
  }

  openNuevoMovimientoModal() {
    this.nuevoMovimiento = { tipoMovimiento: 'INGRESO', cantidadMovimiento: 1, motivo: '', usuarioResponsable: 'Sistema' };
    this.modalNuevoMovimientoOpen.set(true);
  }

  closeNuevoMovimientoModal() {
    this.modalNuevoMovimientoOpen.set(false);
  }

  guardarNuevoMovimiento() {
    if (!this.nuevoMovimiento.motivo || !this.nuevoMovimiento.cantidadMovimiento) {
      this.feedback.push({ type: 'warning', title: 'Campos requeridos', message: 'Completá motivo y cantidad.' });
      return;
    }
    this.api.createMovimientoStock(this.nuevoMovimiento).subscribe({
      next: () => {
        this.feedback.push({ type: 'success', title: 'Movimiento registrado', message: 'El movimiento de stock fue guardado.' });
        this.closeNuevoMovimientoModal();
        this.cargarMovimientos();
      },
      error: (err) => this.feedback.fromHttpError(err),
    });
  }

  openNuevoMedicamentoModal() {
    this.nuevoMedicamento = { nombreGenerico: '', dosis: '500 mg', formaFarmaceutica: 'Comprimido' };
    this.modalNuevoMedicamentoOpen.set(true);
  }

  closeNuevoMedicamentoModal() {
    this.modalNuevoMedicamentoOpen.set(false);
  }

  guardarNuevoMedicamento() {
    if (!this.nuevoMedicamento.nombreGenerico || !this.nuevoMedicamento.dosis) {
      this.feedback.push({ type: 'warning', title: 'Campos requeridos', message: 'Completá nombre genérico y dosis.' });
      return;
    }
    this.api.createMedicamento(this.nuevoMedicamento).subscribe({
      next: () => {
        this.feedback.push({ type: 'success', title: 'Medicamento guardado', message: 'Se agregó el medicamento al vademécum.' });
        this.closeNuevoMedicamentoModal();
        this.cargarMedicamentos();
      },
      error: (err) => this.feedback.fromHttpError(err),
    });
  }
}
