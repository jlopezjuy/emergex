import { Component, Input, OnInit, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LedgerApiService } from '../../../../data-access/api/ledger.api';
import { LedgerMovimientoDTO } from '../../../../data-access/dto/ledger.dto';
import { LoadingStateComponent } from '../../loading-state/loading-state.component';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';
import { ErrorStateComponent } from '../../error-state/error-state.component';
import { StatusBadgeComponent } from '../../status-badge/status-badge.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'emx-estado-cuenta-tercero',
  standalone: true,
  imports: [
    CommonModule,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent
  ],
  template: `
    <div class="p-6 bg-[var(--bg-elevated)] rounded-xl shadow-sm border border-[var(--border-glass)] space-y-6">
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-glass)] pb-4">
        <div>
          <h2 class="text-xl font-bold text-[var(--text-primary)]">Estado de Cuenta Corriente CxP</h2>
          <p class="text-xs text-[var(--text-muted)]">Saldos y movimientos de cuentas por pagar (Ledger Append-Only)</p>
        </div>
        <div class="px-4 py-2 bg-[var(--surface-glass)] border border-[var(--border-glass)] rounded-lg text-right">
          <span class="text-xs text-[var(--accent-blue)] font-semibold uppercase tracking-wider block">Saldo Oficial CxP</span>
          <span class="text-2xl font-extrabold text-[var(--text-primary)] font-mono">
            {{ saldo() | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}
          </span>
        </div>
      </div>

      @if (loading()) {
        <emx-loading-state />
      } @else if (error()) {
        <emx-error-state [message]="error()!" (retry)="cargarDatos()" />
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left text-[var(--text-primary)]">
            <thead class="text-xs text-[var(--text-muted)] uppercase bg-[var(--surface-glass)] border-b border-[var(--border-glass)]">
              <tr>
                <th class="px-4 py-3">Fecha Contable</th>
                <th class="px-4 py-3">Tipo</th>
                <th class="px-4 py-3">Concepto</th>
                <th class="px-4 py-3 text-right">Debe (+Deuda)</th>
                <th class="px-4 py-3 text-right">Haber (-Deuda)</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--border-glass)]">
              @for (m of movimientos(); track m.id || $index) {
                <tr class="hover:bg-[var(--surface-glass)] transition">
                  <td class="px-4 py-3 font-mono text-xs">{{ m.fechaContable }}</td>
                  <td class="px-4 py-3">
                    <emx-status-badge [variant]="mapTipoBadge(m.tipoMovimiento)">
                      {{ m.tipoMovimiento }}
                    </emx-status-badge>
                  </td>
                  <td class="px-4 py-3 text-xs">{{ m.concepto }}</td>
                  <td class="px-4 py-3 text-right font-mono text-xs text-[var(--accent-red)] font-semibold">
                    {{ (m.montoDebe || 0) | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}
                  </td>
                  <td class="px-4 py-3 text-right font-mono text-xs text-[var(--accent-emerald)] font-semibold">
                    {{ (m.montoHaber || 0) | currency: 'ARS' : 'symbol-narrow' : '1.2-2' }}
                  </td>
                </tr>
              }
              @if (movimientos().length === 0) {
                <tr>
                  <td colspan="5" class="p-6">
                    <emx-empty-state message="No se encontraron movimientos registrados en la cuenta corriente CxP." />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `
})
export class EstadoCuentaTerceroComponent implements OnInit, OnChanges {
  @Input() terceroId = 0;

  readonly saldo = signal<number>(0);
  readonly movimientos = signal<LedgerMovimientoDTO[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  private readonly ledgerApi = inject(LedgerApiService);

  ngOnInit(): void {
    if (this.terceroId) {
      this.cargarDatos();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['terceroId'] && !changes['terceroId'].firstChange) {
      this.cargarDatos();
    }
  }

  cargarDatos(): void {
    if (!this.terceroId) return;

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      saldo: this.ledgerApi.getSaldoCxp(this.terceroId),
      movimientos: this.ledgerApi.getMovimientosCxp(this.terceroId)
    }).subscribe({
      next: (res) => {
        this.saldo.set(res.saldo || 0);
        this.movimientos.set(res.movimientos || []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar los datos de la cuenta corriente CxP.');
        this.loading.set(false);
      }
    });
  }

  mapTipoBadge(tipo: string): 'critical' | 'urgent' | 'stable' | 'info' {
    switch (tipo) {
      case 'DEBITO_DOCUMENTO':
      case 'DEBITO_NOTA_DEBITO':
        return 'critical';
      case 'CREDITO_COBRANZA':
      case 'CREDITO_NOTA_CREDITO':
      case 'CREDITO_ANTICIPO':
        return 'stable';
      case 'REVERSA_APLICACION':
      case 'CREDITO_RETENCION':
        return 'urgent';
      default:
        return 'info';
    }
  }
}
