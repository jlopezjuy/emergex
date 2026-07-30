import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatchingService } from '../../../../core/services/matching.service';
import { ComprobanteProveedor } from '../../../../core/models/recepcion-matching.model';

@Component({
  selector: 'app-three-way-matching-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Dashboard 3-Way Matching</h2>
          <p class="text-sm text-gray-500">Confrontación tripartita (OC vs Recepción vs Factura Proveedor)</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left text-gray-600 dark:text-gray-300">
          <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th class="px-4 py-3">Comprobante</th>
              <th class="px-4 py-3">Fecha</th>
              <th class="px-4 py-3 text-right">Monto Total</th>
              <th class="px-4 py-3">Estado Matching</th>
              <th class="px-4 py-3">Motivo Bloqueo</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of comprobantes" class="border-b dark:border-gray-700">
              <td class="px-4 py-3 font-semibold">{{ c.tipoDocumento }} {{ c.puntoVenta }}-{{ c.numeroDocumento }}</td>
              <td class="px-4 py-3">{{ c.fechaComprobante }}</td>
              <td class="px-4 py-3 text-right font-bold">{{ c.montoTotal | currency: 'ARS' }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-bold rounded-full"
                      [ngClass]="{
                        'bg-green-100 text-green-800': c.estadoMatching === 'MATCH_OK',
                        'bg-red-100 text-red-800': c.estadoMatching === 'BLOQUEADO_DIFERENCIA',
                        'bg-yellow-100 text-yellow-800': c.estadoMatching === 'PENDIENTE_MATCHING'
                      }">
                  {{ c.estadoMatching }}
                </span>
              </td>
              <td class="px-4 py-3 text-xs text-red-600">{{ c.motivoBloqueo || '-' }}</td>
            </tr>
            <tr *ngIf="comprobantes.length === 0">
              <td colspan="5" class="text-center py-6 text-gray-400">No hay comprobantes de proveedores registrados para matching.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class ThreeWayMatchingDashboardComponent implements OnInit {
  private matchingService = inject(MatchingService);
  comprobantes: ComprobanteProveedor[] = [];

  ngOnInit(): void {
    this.matchingService.getComprobantesProveedor().subscribe(c => this.comprobantes = c);
  }
}
