import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

export interface LedgerMovimientoDTO {
  id: number;
  fechaContable: string;
  tipoMovimiento: string;
  concepto: string;
  montoDebe: number;
  montoHaber: number;
}

@Component({
  selector: 'app-cuentas-corrientes',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cxp-container p-6 space-y-6">
      <header class="flex justify-between items-center bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-800">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Submayor de Cuentas Corrientes (CxC / CxP)</h1>
          <p class="text-slate-400 text-sm mt-1">Libro de Entrada Inmutable (Append-Only) para Auditoría Financiera SAE</p>
        </div>
      </header>

      <section class="bg-white rounded-xl shadow p-6 border border-slate-200">
        <h2 class="text-lg font-semibold text-slate-800 mb-4">Movimientos de Cuentas por Pagar (CxP Ledger)</h2>
        <table class="w-full text-left text-sm border-collapse">
          <thead>
            <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
              <th class="p-3">ID</th>
              <th class="p-3">Fecha Contable</th>
              <th class="p-3">Tipo Movimiento</th>
              <th class="p-3">Concepto / Obligación</th>
              <th class="p-3 text-right">DEBE (Pagos/Débitos)</th>
              <th class="p-3 text-right">HABER (Facturas/Créditos)</th>
            </tr>
          </thead>
          <tbody>
            @for (m of movimientos(); track m.id) {
              <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="p-3 font-mono text-xs">{{ m.id }}</td>
                <td class="p-3">{{ m.fechaContable }}</td>
                <td class="p-3">
                  <span class="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                    {{ m.tipoMovimiento }}
                  </span>
                </td>
                <td class="p-3 font-medium text-slate-800">{{ m.concepto }}</td>
                <td class="p-3 text-right font-mono font-semibold text-blue-600">$ {{ m.montoDebe | number:'1.2-2' }}</td>
                <td class="p-3 text-right font-mono font-semibold text-red-600">$ {{ m.montoHaber | number:'1.2-2' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </section>
    </div>
  `,
})
export class CuentasCorrientesComponent implements OnInit {
  private http = inject(HttpClient);
  movimientos = signal<LedgerMovimientoDTO[]>([]);

  ngOnInit() {
    this.http.get<LedgerMovimientoDTO[]>('/api/ledger-cuenta-corriente').subscribe({
      next: (data) => this.movimientos.set(data),
      error: (err) => console.error('Error al cargar movimientos de ledger:', err),
    });
  }
}
