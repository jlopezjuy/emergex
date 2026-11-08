import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrdenesPagoApiService } from '../../../data-access/api/ordenes-pago.api';
import { TercerosApiService } from '../../../data-access/api/terceros.api';
import { LedgerApiService } from '../../../data-access/api/ledger.api';
import { UserFeedbackService } from '../../../core/notifications/user-feedback.service';
import { OrdenDePagoDTO } from '../../../data-access/dto/ordenes-pago.dto';
import { TerceroResumenDTO, LedgerMovimientoDTO } from '../../../data-access/dto/ledger.dto';
import { CuentaBancariaTerceroDTO } from '../../../data-access/dto/terceros.dto';
import { CbuMakerCheckerModalComponent } from '../../../shared/components/finance/cbu-maker-checker-modal/cbu-maker-checker-modal.component';
import { OrdenPagoFormModalComponent } from '../../../shared/components/finance/orden-pago-form-modal/orden-pago-form-modal.component';
import { DocumentosAdjuntosComponent } from '../../../shared/components/documentos-adjuntos/documentos-adjuntos.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { MonedaPipe } from '../../../shared/pipes/moneda.pipe';

@Component({
  selector: 'emx-proveedor-detail',
  standalone: true,
  imports: [MonedaPipe, 
    CommonModule,
    RouterLink,
    CbuMakerCheckerModalComponent,
    OrdenPagoFormModalComponent,
    StatusBadgeComponent,
    DocumentosAdjuntosComponent
  ],
  template: `
    <div class="p-6 space-y-6 bg-[var(--bg-deep)] min-h-screen text-[var(--text-primary)]">
      <!-- Breadcrumb & Top Bar -->
      <div class="flex justify-between items-center">
        <a routerLink="/administracion/proveedores" class="text-sm text-[var(--accent-blue)] hover:underline font-medium">
          ← Volver al catálogo de proveedores
        </a>
        <span class="text-xs font-mono text-[var(--text-muted)]">ID Proveedor: {{ proveedorId }}</span>
      </div>

      <!-- Ficha 360 Encabezado -->
      <div class="bg-[var(--bg-elevated)] p-6 rounded-2xl border border-[var(--border-glass)] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          @if (proveedorInfo(); as info) {
            <h1 class="text-2xl font-bold text-[var(--text-primary)]">{{ info.razonSocial }}</h1>
            <div class="flex flex-wrap items-center gap-3 mt-1 text-sm text-[var(--text-muted)]">
              <span>CUIT: <strong class="font-mono text-[var(--text-primary)]">{{ info.cuit }}</strong></span>
              @if (info.nombreComercial) {
                <span>• Nombre Comercial: <strong class="text-[var(--text-primary)]">{{ info.nombreComercial }}</strong></span>
              }
            </div>
          } @else if (loadingProveedor()) {
            <h1 class="text-2xl font-bold text-[var(--text-muted)] animate-pulse">Cargando datos del proveedor...</h1>
          } @else {
            <h1 class="text-2xl font-bold text-[var(--text-primary)]">Ficha 360 del Proveedor #{{ proveedorId }}</h1>
            <p class="text-xs text-[var(--accent-amber)] mt-1">⚠️ {{ errorProveedor() || 'No se pudo resolver la razón social del proveedor.' }}</p>
          }
          <p class="text-xs text-[var(--text-muted)] mt-2">Gestión fiscal, cuentas bancarias y órdenes de pago (CxP).</p>
        </div>
        <button
          (click)="showCbuModal = true"
          class="px-4 py-2 bg-[var(--accent-blue)] hover:opacity-90 text-white font-medium text-sm rounded-lg shadow transition"
        >
          Workflow CBU Maker-Checker
        </button>
      </div>

      <!-- Solapas Navigation -->
      <div class="border-b border-[var(--border-glass)] flex gap-6 text-sm font-semibold">
        <button
          (click)="activeTab.set('op')"
          [class.border-b-2]="activeTab() === 'op'"
          [class.border-[var(--accent-blue)]]="activeTab() === 'op'"
          [class.text-[var(--accent-blue)]]="activeTab() === 'op'"
          class="pb-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
        >
          Órdenes de Pago (CxP)
        </button>
        <button
          (click)="activeTab.set('cxp')"
          [class.border-b-2]="activeTab() === 'cxp'"
          [class.border-[var(--accent-blue)]]="activeTab() === 'cxp'"
          [class.text-[var(--accent-blue)]]="activeTab() === 'cxp'"
          class="pb-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
        >
          Submayor de Cuenta Corriente (CxP)
        </button>
        <button
          (click)="activeTab.set('cbu')"
          [class.border-b-2]="activeTab() === 'cbu'"
          [class.border-[var(--accent-blue)]]="activeTab() === 'cbu'"
          [class.text-[var(--accent-blue)]]="activeTab() === 'cbu'"
          class="pb-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
        >
          Cuentas Bancarias & CBU
        </button>
        <button
          (click)="activeTab.set('docs')"
          [class.border-b-2]="activeTab() === 'docs'"
          [class.border-[var(--accent-blue)]]="activeTab() === 'docs'"
          [class.text-[var(--accent-blue)]]="activeTab() === 'docs'"
          class="pb-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
        >
          Documentación Adjunta
        </button>
      </div>

      <!-- Tab Content: Órdenes de Pago -->
      @if (activeTab() === 'op') {
        <div class="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-glass)] overflow-hidden shadow-sm">
          <div class="p-4 border-b border-[var(--border-glass)] flex justify-between items-center">
            <h3 class="font-bold text-sm text-[var(--text-primary)]">Órdenes de pago de la empresa</h3>
          </div>
          <div class="px-4 py-2 bg-[var(--surface-glass)] text-xs text-[var(--accent-amber)] border-b border-[var(--border-glass)] flex items-center gap-2">
            <span>⚠️</span>
            <span>Atención: El listado expuesto corresponde a las órdenes de pago de toda la empresa.</span>
          </div>
          @if (ordenesPago().length === 0) {
            <div class="p-8 text-center text-sm text-[var(--text-muted)]">
              No hay órdenes de pago registradas en la empresa.
            </div>
          } @else {
            <table class="w-full text-left text-sm">
              <thead class="bg-[var(--surface-glass)] text-xs uppercase font-semibold text-[var(--text-muted)] border-b border-[var(--border-glass)]">
                <tr>
                  <th class="px-6 py-3">Número OP</th>
                  <th class="px-6 py-3">Monto Bruto</th>
                  <th class="px-6 py-3">Retenciones</th>
                  <th class="px-6 py-3">Monto Neto</th>
                  <th class="px-6 py-3">Estado</th>
                  <th class="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--border-glass)]">
                @for (op of ordenesPago(); track op.id) {
                  <tr class="hover:bg-[var(--surface-glass)] transition">
                    <td class="px-6 py-4 font-mono font-medium text-[var(--text-primary)]">{{ op.numeroOp }}</td>
                    <td class="px-6 py-4 font-mono text-xs text-[var(--text-primary)]">{{ op.montoBruto | moneda }}</td>
                    <td class="px-6 py-4 font-mono text-xs text-[var(--accent-amber)]">{{ (op.montoRetenciones || 0) | moneda }}</td>
                    <td class="px-6 py-4 font-mono font-bold text-xs text-[var(--accent-emerald)]">{{ op.montoNeto | moneda }}</td>
                    <td class="px-6 py-4">
                      <emx-status-badge [variant]="getOpBadgeVariant(op.estado)">{{ op.estado }}</emx-status-badge>
                    </td>
                    <td class="px-6 py-4 text-right space-x-2">
                      @if (op.estado === 'PENDIENTE_APROBACION') {
                        <button
                          (click)="aprobarOp(op.id)"
                          class="px-3 py-1 bg-[var(--accent-blue)] hover:opacity-90 text-white rounded text-xs font-medium"
                        >
                          Aprobar
                        </button>
                      }
                      @if (op.estado === 'APROBADA') {
                        <button
                          (click)="abrirModalEjecutar(op)"
                          class="px-3 py-1 bg-[var(--accent-emerald)] hover:opacity-90 text-white rounded text-xs font-medium"
                        >
                          Ejecutar Pago
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }

      <!-- Tab Content: Submayor de Cuenta Corriente (CxP) -->
      @if (activeTab() === 'cxp') {
        <div class="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-glass)] overflow-hidden shadow-sm space-y-4 p-6">
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--surface-glass)] p-4 rounded-xl border border-[var(--border-glass)]">
            <div>
              <span class="text-xs font-bold uppercase tracking-wider text-amber-400 block">Saldo Actual a Pagar (Deuda Proveedor)</span>
              <span class="text-3xl font-extrabold text-[var(--text-primary)]">{{ saldoCxp() | moneda }}</span>
            </div>
            <button
              type="button"
              (click)="cargarSubmayorCxp()"
              class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--border-glass)] bg-[var(--bg-elevated)] hover:bg-white/5 transition"
            >
              ↻ Actualizar Submayor
            </button>
          </div>

          @if (loadingCxp()) {
            <div class="p-8 text-center text-sm text-[var(--text-muted)]">
              Cargando libro mayor de cuentas por pagar...
            </div>
          } @else if (movimientosCxp().length === 0) {
            <div class="p-8 text-center text-sm text-[var(--text-muted)]">
              Sin movimientos contables registrados en el Submayor CxP para este proveedor.
            </div>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-[var(--surface-glass)] text-xs uppercase font-semibold text-[var(--text-muted)] border-b border-[var(--border-glass)]">
                  <tr>
                    <th class="px-4 py-3">ID</th>
                    <th class="px-4 py-3">Fecha Contable</th>
                    <th class="px-4 py-3">Tipo Movimiento</th>
                    <th class="px-4 py-3">Concepto</th>
                    <th class="px-4 py-3 text-right">DEBE</th>
                    <th class="px-4 py-3 text-right">HABER</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--border-glass)]">
                  @for (m of movimientosCxp(); track m.id) {
                    <tr class="hover:bg-[var(--surface-glass)] transition">
                      <td class="px-4 py-3 font-mono text-xs">{{ m.id }}</td>
                      <td class="px-4 py-3 font-mono text-xs">{{ m.fechaContable }}</td>
                      <td class="px-4 py-3 font-semibold text-xs">{{ m.tipoMovimiento }}</td>
                      <td class="px-4 py-3 text-xs">{{ m.concepto }}</td>
                      <td class="px-4 py-3 font-mono text-xs text-right" [class.text-emerald-400]="m.montoDebe > 0">
                        {{ m.montoDebe > 0 ? ('$ ' + (m.montoDebe | number:'1.2-2')) : '—' }}
                      </td>
                      <td class="px-4 py-3 font-mono text-xs text-right" [class.text-amber-400]="m.montoHaber > 0">
                        {{ m.montoHaber > 0 ? ('$ ' + (m.montoHaber | number:'1.2-2')) : '—' }}
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- Tab Content: CBU -->
      @if (activeTab() === 'cbu') {
        <div class="bg-[var(--bg-elevated)] p-6 rounded-xl border border-[var(--border-glass)] space-y-4">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="font-bold text-sm text-[var(--text-primary)]">Verificación Segregada de CBU (Maker-Checker)</h3>
              <p class="text-xs text-[var(--text-muted)]">El creador de la cuenta no puede ser la misma persona que aprueba.</p>
            </div>
            <button
              (click)="showCbuModal = true"
              class="px-3 py-1.5 bg-[var(--accent-blue)] hover:opacity-90 text-white rounded-lg text-xs font-medium"
            >
              Abrir Workflow CBU
            </button>
          </div>
        </div>
      }

      <!-- Tab Content: Documentación Adjunta -->
      @if (activeTab() === 'docs') {
        <emx-documentos-adjuntos [entidadTipo]="'PROVEEDOR'" [entidadId]="proveedorId"></emx-documentos-adjuntos>
      }

      <!-- Modal CBU Maker-Checker -->
      @if (showCbuModal) {
        <emx-cbu-maker-checker-modal
          [terceroEmpresaId]="proveedorId"
          [cuentas]="cuentasBancarias()"
          (closed)="showCbuModal = false"
          (updated)="cargarCuentasBancarias(); cargarOrdenesPago()"
        ></emx-cbu-maker-checker-modal>
      }

      <!-- Modal Ejecución de Orden de Pago -->
      @if (opAEjecutar(); as op) {
        <emx-orden-pago-form-modal
          [opId]="op.id"
          [numeroOp]="op.numeroOp"
          [montoNeto]="op.montoNeto"
          (closed)="cerrarModalEjecutar()"
          (executed)="confirmarEjecucionOp($event)"
        ></emx-orden-pago-form-modal>
      }
    </div>
  `
})
export class ProveedorDetailComponent implements OnInit {
  proveedorId = 0;
  activeTab = signal<'op' | 'cxp' | 'cbu' | 'docs'>('op');
  ordenesPago = signal<OrdenDePagoDTO[]>([]);
  showCbuModal = false;
  readonly cuentasBancarias = signal<CuentaBancariaTerceroDTO[]>([]);

  readonly proveedorInfo = signal<TerceroResumenDTO | null>(null);
  readonly loadingProveedor = signal<boolean>(true);
  readonly errorProveedor = signal<string | null>(null);
  readonly opAEjecutar = signal<OrdenDePagoDTO | null>(null);

  readonly saldoCxp = signal<number>(0);
  readonly movimientosCxp = signal<LedgerMovimientoDTO[]>([]);
  readonly loadingCxp = signal<boolean>(false);

  private route = inject(ActivatedRoute);
  private ordenesPagoApi = inject(OrdenesPagoApiService);
  private tercerosApi = inject(TercerosApiService);
  private ledgerApi = inject(LedgerApiService);
  private feedbackService = inject(UserFeedbackService);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.proveedorId = idParam ? parseInt(idParam, 10) : 0;

    const navState = history.state?.proveedor as TerceroResumenDTO | undefined;
    if (navState && navState.id === this.proveedorId) {
      this.proveedorInfo.set(navState);
      this.loadingProveedor.set(false);
    } else {
      this.cargarProveedorInfo();
    }

    this.cargarOrdenesPago();
    this.cargarCuentasBancarias();
    this.cargarSubmayorCxp();
  }

  cargarCuentasBancarias(): void {
    if (!this.proveedorId) return;
    this.tercerosApi.listarCuentasBancarias(this.proveedorId).subscribe({
      next: (cuentas) => this.cuentasBancarias.set(cuentas || []),
      error: () => this.cuentasBancarias.set([]),
    });
  }

  cargarSubmayorCxp(): void {
    if (!this.proveedorId) return;
    this.loadingCxp.set(true);

    this.ledgerApi.getSaldoCxp(this.proveedorId).subscribe({
      next: (saldo) => this.saldoCxp.set(saldo),
      error: () => this.saldoCxp.set(0)
    });

    this.ledgerApi.getMovimientosCxp(this.proveedorId).subscribe({
      next: (movs) => {
        this.movimientosCxp.set(movs || []);
        this.loadingCxp.set(false);
      },
      error: () => {
        this.movimientosCxp.set([]);
        this.loadingCxp.set(false);
      }
    });
  }

  cargarProveedorInfo(): void {
    this.loadingProveedor.set(true);
    this.errorProveedor.set(null);

    this.tercerosApi.buscar('').subscribe({
      next: (terceros) => {
        const match = terceros.find((t) => t.id === this.proveedorId);
        if (match) {
          this.proveedorInfo.set(match);
        } else {
          this.errorProveedor.set('Proveedor no encontrado en el catálogo.');
        }
        this.loadingProveedor.set(false);
      },
      error: () => {
        this.errorProveedor.set('No se pudo resolver la identidad del proveedor.');
        this.loadingProveedor.set(false);
      }
    });
  }

  cargarOrdenesPago(): void {
    this.ordenesPagoApi.getOrdenesDePago().subscribe({
      next: (res) => {
        this.ordenesPago.set(res || []);
      },
      error: () => {
        this.feedbackService.push({
          type: 'error',
          title: 'Error de Carga',
          message: 'No se pudieron listar las órdenes de pago del proveedor.'
        });
      }
    });
  }

  aprobarOp(opId: number): void {
    this.ordenesPagoApi.aprobarOrdenDePago(opId).subscribe({
      next: () => {
        this.feedbackService.push({
          type: 'success',
          title: 'OP Aprobada',
          message: 'La orden de pago fue cambiada a estado APROBADA.'
        });
        this.cargarOrdenesPago();
      },
      error: (err) => {
        this.feedbackService.push({
          type: 'error',
          title: 'Error de Aprobación',
          message: err?.error?.detail || 'No se pudo aprobar la orden de pago.'
        });
      }
    });
  }

  abrirModalEjecutar(op: OrdenDePagoDTO): void {
    this.opAEjecutar.set(op);
  }

  cerrarModalEjecutar(): void {
    this.opAEjecutar.set(null);
  }

  confirmarEjecucionOp(datos: { medioPago: string; referenciaTransf: string }): void {
    const op = this.opAEjecutar();
    if (!op) return;

    const key = `OP-EXEC-${op.id}-${Date.now()}`;
    this.ordenesPagoApi.ejecutarOrdenDePago(op.id, datos, key).subscribe({
      next: () => {
        this.feedbackService.push({
          type: 'success',
          title: 'Pago Ejecutado',
          message: 'La orden de pago ha sido EJECUTADA.'
        });
        this.cerrarModalEjecutar();
        this.cargarOrdenesPago();
      },
      error: (err) => {
        this.feedbackService.push({
          type: 'error',
          title: 'Error de Ejecución',
          message: err?.error?.detail || 'No se pudo ejecutar el pago de la orden.'
        });
      }
    });
  }

  getOpBadgeVariant(estado: string): 'stable' | 'urgent' | 'info' | 'critical' {
    switch (estado) {
      case 'EJECUTADA': return 'stable';
      case 'APROBADA': return 'info';
      case 'PENDIENTE_APROBACION': return 'urgent';
      default: return 'critical';
    }
  }
}
