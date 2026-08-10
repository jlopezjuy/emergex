import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrdenesPagoApiService } from '../../../data-access/api/ordenes-pago.api';
import { UserFeedbackService } from '../../../core/notifications/user-feedback.service';
import { OrdenDePagoDTO } from '../../../data-access/dto/ordenes-pago.dto';
import { CbuMakerCheckerModalComponent } from '../../../shared/components/finance/cbu-maker-checker-modal/cbu-maker-checker-modal.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'emx-proveedor-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    CbuMakerCheckerModalComponent,
    StatusBadgeComponent
  ],
  template: `
    <div class="p-6 space-y-6 bg-[var(--color-bg-app)] min-h-screen text-[var(--color-text-main)]">
      <!-- Breadcrumb & Top Bar -->
      <div class="flex justify-between items-center">
        <a routerLink="/administracion/proveedores" class="text-sm text-blue-500 hover:text-blue-600 font-medium">
          ← Volver al catálogo de proveedores
        </a>
        <span class="text-xs font-mono text-[var(--color-text-muted)]">ID Proveedor: {{ proveedorId }}</span>
      </div>

      <!-- Ficha 360 Encabezado -->
      <div class="bg-[var(--color-bg-card)] p-6 rounded-2xl border border-[var(--color-border)] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-[var(--color-text-main)]">Ficha 360 del Proveedor</h1>
          <p class="text-sm text-[var(--color-text-muted)]">Gestión fiscal, cuentas bancarias y órdenes de pago (CxP).</p>
        </div>
        <button
          (click)="showCbuModal = true"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow transition"
        >
          Workflow CBU Maker-Checker
        </button>
      </div>

      <!-- Solapas Navigation -->
      <div class="border-b border-[var(--color-border)] flex gap-6 text-sm font-semibold">
        <button
          (click)="activeTab.set('op')"
          [class.border-b-2]="activeTab() === 'op'"
          [class.border-blue-600]="activeTab() === 'op'"
          [class.text-blue-500]="activeTab() === 'op'"
          class="pb-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition"
        >
          Órdenes de Pago (CxP)
        </button>
        <button
          (click)="activeTab.set('cbu')"
          [class.border-b-2]="activeTab() === 'cbu'"
          [class.border-blue-600]="activeTab() === 'cbu'"
          [class.text-blue-500]="activeTab() === 'cbu'"
          class="pb-3 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition"
        >
          Cuentas Bancarias & CBU
        </button>
      </div>

      <!-- Tab Content: Órdenes de Pago -->
      @if (activeTab() === 'op') {
        <div class="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
          <div class="p-4 border-b border-[var(--color-border)] flex justify-between items-center">
            <h3 class="font-bold text-sm text-[var(--color-text-main)]">Circuito Formal de Órdenes de Pago</h3>
          </div>
          @if (ordenesPago().length === 0) {
            <div class="p-8 text-center text-sm text-[var(--color-text-muted)]">
              No hay órdenes de pago registradas para este proveedor.
            </div>
          } @else {
            <table class="w-full text-left text-sm">
              <thead class="bg-[var(--color-bg-surface)] text-xs uppercase font-semibold text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                <tr>
                  <th class="px-6 py-3">Número OP</th>
                  <th class="px-6 py-3">Monto Bruto</th>
                  <th class="px-6 py-3">Retenciones</th>
                  <th class="px-6 py-3">Monto Neto</th>
                  <th class="px-6 py-3">Estado</th>
                  <th class="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[var(--color-border)]">
                @for (op of ordenesPago(); track op.id) {
                  <tr class="hover:bg-[var(--color-bg-surface)] transition">
                    <td class="px-6 py-4 font-mono font-medium text-[var(--color-text-main)]">{{ op.numeroOp }}</td>
                    <td class="px-6 py-4 font-mono text-xs text-[var(--color-text-main)]">$ {{ op.montoBruto | number:'1.2-2' }}</td>
                    <td class="px-6 py-4 font-mono text-xs text-amber-500">$ {{ (op.montoRetenciones || 0) | number:'1.2-2' }}</td>
                    <td class="px-6 py-4 font-mono font-bold text-xs text-green-500">$ {{ op.montoNeto | number:'1.2-2' }}</td>
                    <td class="px-6 py-4">
                      <emx-status-badge [variant]="getOpBadgeVariant(op.estado)">{{ op.estado }}</emx-status-badge>
                    </td>
                    <td class="px-6 py-4 text-right space-x-2">
                      @if (op.estado === 'PENDIENTE_APROBACION') {
                        <button
                          (click)="aprobarOp(op.id)"
                          class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
                        >
                          Aprobar
                        </button>
                      }
                      @if (op.estado === 'APROBADA') {
                        <button
                          (click)="ejecutarOp(op.id)"
                          class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium"
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

      <!-- Tab Content: CBU -->
      @if (activeTab() === 'cbu') {
        <div class="bg-[var(--color-bg-card)] p-6 rounded-xl border border-[var(--color-border)] space-y-4">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="font-bold text-sm text-[var(--color-text-main)]">Verificación Segregada de CBU (Maker-Checker)</h3>
              <p class="text-xs text-[var(--color-text-muted)]">El creador de la cuenta no puede ser la misma persona que aprueba.</p>
            </div>
            <button
              (click)="showCbuModal = true"
              class="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
            >
              Abrir Workflow CBU
            </button>
          </div>
        </div>
      }

      <!-- Modal CBU Maker-Checker -->
      @if (showCbuModal) {
        <emx-cbu-maker-checker-modal
          [terceroEmpresaId]="proveedorId"
          (closed)="showCbuModal = false"
          (updated)="cargarOrdenesPago()"
        ></emx-cbu-maker-checker-modal>
      }
    </div>
  `
})
export class ProveedorDetailComponent implements OnInit {
  proveedorId = 0;
  activeTab = signal<'op' | 'cbu'>('op');
  ordenesPago = signal<OrdenDePagoDTO[]>([]);
  showCbuModal = false;

  private route = inject(ActivatedRoute);
  private ordenesPagoApi = inject(OrdenesPagoApiService);
  private feedbackService = inject(UserFeedbackService);

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.proveedorId = idParam ? parseInt(idParam, 10) : 0;
    this.cargarOrdenesPago();
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

  ejecutarOp(opId: number): void {
    const key = `OP-EXEC-${opId}-${Date.now()}`;
    this.ordenesPagoApi.ejecutarOrdenDePago(opId, { medioPago: 'TRANSFERENCIA', referenciaTransf: 'REF-MANUAL' }, key).subscribe({
      next: () => {
        this.feedbackService.push({
          type: 'success',
          title: 'Pago Ejecutado',
          message: 'La orden de pago ha sido EJECUTADA.'
        });
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
