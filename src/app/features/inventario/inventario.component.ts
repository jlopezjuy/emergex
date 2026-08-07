import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventarioApi, Lote, MovimientoInventario } from '../../data-access/api/inventario.api';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';

@Component({
  selector: 'emx-inventario',
  standalone: true,
  imports: [CommonModule, GlassCardComponent],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-4" style="color: var(--text-primary)">Inventario y FEFO</h1>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <emx-glass-card>
          <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">Stock Actual por Lote</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-glass)">
                  <th class="py-2 px-4">Producto</th>
                  <th class="py-2 px-4">Lote ID</th>
                  <th class="py-2 px-4 text-right">Cantidad</th>
                  <th class="py-2 px-4">Vencimiento</th>
                </tr>
              </thead>
              <tbody>
                @for (lote of stock(); track lote.id) {
                  <tr style="border-bottom: 1px solid var(--border-glass)">
                    <td class="py-2 px-4">{{ lote.producto }}</td>
                    <td class="py-2 px-4">{{ lote.id }}</td>
                    <td class="py-2 px-4 text-right">{{ lote.cantidad }}</td>
                    <td class="py-2 px-4">
                      <span [ngClass]="getExpirationClass(lote.fechaVencimiento)" class="px-2 py-1 rounded text-xs font-medium">
                        {{ lote.fechaVencimiento | date:'shortDate' }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </emx-glass-card>

        <emx-glass-card>
          <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">Consumos FEFO Recientes</h2>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-glass)">
                  <th class="py-2 px-4">Fecha</th>
                  <th class="py-2 px-4">Producto</th>
                  <th class="py-2 px-4">Lote Usado</th>
                  <th class="py-2 px-4 text-right">Cant.</th>
                </tr>
              </thead>
              <tbody>
                @for (mov of consumos(); track mov.id) {
                  <tr style="border-bottom: 1px solid var(--border-glass)">
                    <td class="py-2 px-4">{{ mov.fecha | date:'short' }}</td>
                    <td class="py-2 px-4">{{ mov.producto }}</td>
                    <td class="py-2 px-4">{{ mov.loteId }}</td>
                    <td class="py-2 px-4 text-right">{{ mov.cantidad }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </emx-glass-card>
      </div>
    </div>
  `
})
export class InventarioComponent implements OnInit {
  private readonly api = inject(InventarioApi);

  stock = signal<Lote[]>([]);
  consumos = signal<MovimientoInventario[]>([]);

  ngOnInit() {
    this.api.getStock().subscribe(data => this.stock.set(data));
    this.api.getConsumosFefo().subscribe(data => this.consumos.set(data));
  }

  getExpirationClass(dateString: string): string {
    const expiration = new Date(dateString);
    const today = new Date();
    const diffTime = expiration.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return 'bg-red-500/20 text-red-400';
    } else if (diffDays <= 30) {
      return 'bg-amber-500/20 text-amber-400';
    }
    return 'bg-green-500/20 text-green-400';
  }
}
