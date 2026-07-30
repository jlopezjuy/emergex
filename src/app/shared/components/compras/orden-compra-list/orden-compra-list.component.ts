import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComprasService } from '../../../core/services/compras.service';
import { OrdenDeCompra } from '../../../core/models/compras.model';

@Component({
  selector: 'app-orden-compra-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Órdenes de Compra (OC)</h2>
          <p class="text-sm text-gray-500">Compromisos comerciales emitidos a proveedores</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left text-gray-600 dark:text-gray-300">
          <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th class="px-4 py-3">Número OC</th>
              <th class="px-4 py-3">Fecha Emisión</th>
              <th class="px-4 py-3">Proveedor ID</th>
              <th class="px-4 py-3 text-right">Monto Total</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3">Emitida Por</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let oc of ordenes" class="border-b dark:border-gray-700">
              <td class="px-4 py-3 font-semibold">{{ oc.numeroOc }}</td>
              <td class="px-4 py-3">{{ oc.fechaEmision }}</td>
              <td class="px-4 py-3">{{ oc.proveedorId }}</td>
              <td class="px-4 py-3 text-right font-bold text-blue-600">{{ oc.montoTotal | currency: oc.moneda }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-bold bg-blue-100 text-blue-800 rounded-full">
                  {{ oc.estado }}
                </span>
              </td>
              <td class="px-4 py-3">{{ oc.emitidaPor }}</td>
            </tr>
            <tr *ngIf="ordenes.length === 0">
              <td colspan="6" class="text-center py-6 text-gray-400">No hay órdenes de compra emitidas.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class OrdenCompraListComponent implements OnInit {
  private comprasService = inject(ComprasService);
  ordenes: OrdenDeCompra[] = [];

  ngOnInit(): void {
    this.comprasService.getOrdenes().subscribe(o => this.ordenes = o);
  }
}
