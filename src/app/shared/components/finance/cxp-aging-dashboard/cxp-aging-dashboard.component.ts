import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { ReportesApiService } from '../../../../data-access/api/reportes.api';
import { ReporteComprasDTO } from '../../../../data-access/dto/reportes.dto';
import { LoadingStateComponent } from '../../loading-state/loading-state.component';
import { ErrorStateComponent } from '../../error-state/error-state.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';

@Component({
  selector: 'emx-cxp-aging-dashboard',
  standalone: true,
  imports: [CommonModule, LoadingStateComponent, ErrorStateComponent, EmptyStateComponent],
  template: `
    <div class="p-6 glass rounded-panel border flex flex-col gap-6" style="border-color: var(--border-glass);">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold" style="color: var(--text-primary);">
            Cuentas por Pagar — Aging de Deuda Proveedores
          </h2>
          <p class="text-xs" style="color: var(--text-muted);">
            Antigüedad de saldos a pagar con validación de 3-Way Match y resumen por proveedor
          </p>
        </div>
      </div>

      @if (loading()) {
        <emx-loading-state />
      } @else if (error()) {
        <emx-error-state [message]="error()!" (retry)="cargarReporte()" />
      } @else if (!compras()) {
        <emx-empty-state message="Sin información de CxP disponible." />
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-4 rounded-lg border flex flex-col gap-1" style="background: var(--bg-elevated); border-color: var(--border-glass);">
            <span class="text-xs font-semibold uppercase tracking-wider text-green-600">Total Cuentas x Pagar</span>
            <p class="text-xl font-extrabold" style="color: var(--text-primary);">
              {{ totalCuentasPorPagar() | currency:'ARS':'symbol-narrow':'1.2-2' }}
            </p>
          </div>
          <div class="p-4 rounded-lg border flex flex-col gap-1" style="background: var(--bg-elevated); border-color: var(--border-glass);">
            <span class="text-xs font-semibold uppercase tracking-wider text-blue-600">Proveedores Activos</span>
            <p class="text-xl font-extrabold" style="color: var(--text-primary);">
              {{ compras()?.gastoPorProveedor?.length || 0 }}
            </p>
          </div>
          <div class="p-4 rounded-lg border flex flex-col gap-1" style="background: var(--bg-elevated); border-color: var(--border-glass);">
            <span class="text-xs font-semibold uppercase tracking-wider text-amber-600">Centros de Costo</span>
            <p class="text-xl font-extrabold" style="color: var(--text-primary);">
              {{ compras()?.gastoPorCentroCosto?.length || 0 }}
            </p>
          </div>
          <div class="p-4 rounded-lg border flex flex-col gap-1" style="background: var(--bg-elevated); border-color: var(--border-glass);">
            <span class="text-xs font-semibold uppercase tracking-wider text-purple-600">Próximos Pagos</span>
            <p class="text-xl font-extrabold" style="color: var(--text-primary);">
              {{ compras()?.pagosProximos?.length || 0 }}
            </p>
          </div>
        </div>
      }
    </div>
  `
})
export class CxpAgingDashboardComponent implements OnInit {
  private readonly reportesApi = inject(ReportesApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly compras = signal<ReporteComprasDTO | null>(null);

  readonly totalCuentasPorPagar = signal<number>(0);

  ngOnInit(): void {
    this.cargarReporte();
  }

  cargarReporte(): void {
    this.loading.set(true);
    this.error.set(null);

    this.reportesApi
      .compras()
      .pipe(
        catchError(() => {
          this.error.set('No se pudo cargar el reporte de CxP de proveedores.');
          this.loading.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        if (res) {
          this.compras.set(res);
          this.totalCuentasPorPagar.set(res.totalCuentasPorPagar || 0);
        }
        this.loading.set(false);
      });
  }
}
