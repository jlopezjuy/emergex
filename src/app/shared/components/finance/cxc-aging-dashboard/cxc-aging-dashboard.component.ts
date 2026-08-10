import { Component, OnInit, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { ReportesApiService } from '../../../../data-access/api/reportes.api';
import { CxCAgingReportDTO } from '../../../../data-access/dto/reportes.dto';
import { LoadingStateComponent } from '../../loading-state/loading-state.component';
import { ErrorStateComponent } from '../../error-state/error-state.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';

@Component({
  selector: 'emx-cxc-aging-dashboard',
  standalone: true,
  imports: [CommonModule, LoadingStateComponent, ErrorStateComponent, EmptyStateComponent],
  template: `
    <div class="p-6 glass rounded-panel border flex flex-col gap-6" style="border-color: var(--border-glass);">
      <div class="flex justify-between items-center">
        <div>
          <h2 class="text-xl font-bold" style="color: var(--text-primary);">
            Cuentas por Cobrar — Aging Server-Side
          </h2>
          <p class="text-xs" style="color: var(--text-muted);">
            Antigüedad de deuda B2C, B2B y Obras Sociales derivada del Ledger
          </p>
        </div>
      </div>

      @if (loading()) {
        <emx-loading-state />
      } @else if (error()) {
        <emx-error-state [message]="error()!" (retry)="cargarAging()" />
      } @else if (!aging()) {
        <emx-empty-state message="Sin información de aging disponible." />
      } @else {
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-4 rounded-lg border flex flex-col gap-1" style="background: var(--bg-elevated); border-color: var(--border-glass);">
            <span class="text-xs font-semibold uppercase tracking-wider text-blue-600">Corriente (0-30d)</span>
            <p class="text-xl font-extrabold" style="color: var(--text-primary);">
              {{ aging()?.total0a30 | currency:'ARS':'symbol-narrow':'1.2-2' }}
            </p>
          </div>
          <div class="p-4 rounded-lg border flex flex-col gap-1" style="background: var(--bg-elevated); border-color: var(--border-glass);">
            <span class="text-xs font-semibold uppercase tracking-wider text-amber-600">Mora Media (31-60d)</span>
            <p class="text-xl font-extrabold" style="color: var(--text-primary);">
              {{ aging()?.total31a60 | currency:'ARS':'symbol-narrow':'1.2-2' }}
            </p>
          </div>
          <div class="p-4 rounded-lg border flex flex-col gap-1" style="background: var(--bg-elevated); border-color: var(--border-glass);">
            <span class="text-xs font-semibold uppercase tracking-wider text-orange-600">Mora Alta (61-90d)</span>
            <p class="text-xl font-extrabold" style="color: var(--text-primary);">
              {{ aging()?.total61a90 | currency:'ARS':'symbol-narrow':'1.2-2' }}
            </p>
          </div>
          <div class="p-4 rounded-lg border flex flex-col gap-1" style="background: var(--bg-elevated); border-color: var(--border-glass);">
            <span class="text-xs font-semibold uppercase tracking-wider text-red-600">Crítica (+90d)</span>
            <p class="text-xl font-extrabold" style="color: var(--text-primary);">
              {{ aging()?.total90Mas | currency:'ARS':'symbol-narrow':'1.2-2' }}
            </p>
          </div>
        </div>
      }
    </div>
  `
})
export class CxcAgingDashboardComponent implements OnInit {
  private readonly reportesApi = inject(ReportesApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly aging = signal<CxCAgingReportDTO | null>(null);

  ngOnInit(): void {
    this.cargarAging();
  }

  cargarAging(): void {
    this.loading.set(true);
    this.error.set(null);

    this.reportesApi
      .financiero()
      .pipe(
        catchError(() => {
          this.error.set('No se pudo cargar la información de aging CxC.');
          this.loading.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        if (res?.aging) {
          this.aging.set(res.aging);
        }
        this.loading.set(false);
      });
  }
}
