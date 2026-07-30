import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComprasService } from '../../../../core/services/compras.service';
import { SolicitudCompra } from '../../../../core/models/compras.model';

@Component({
  selector: 'app-solicitud-compra-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-xl font-bold text-gray-900 dark:text-white">Solicitudes de Compra</h2>
          <p class="text-sm text-gray-500">Control de necesidad -> compromiso (Workflow por Monto y SoD)</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left text-gray-600 dark:text-gray-300">
          <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th class="px-4 py-3">Número</th>
              <th class="px-4 py-3">Solicitante</th>
              <th class="px-4 py-3">Justificación</th>
              <th class="px-4 py-3 text-right">Monto Estimado</th>
              <th class="px-4 py-3">Estado</th>
              <th class="px-4 py-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let s of solicitudes" class="border-b dark:border-gray-700">
              <td class="px-4 py-3 font-semibold">{{ s.numeroSolicitud }}</td>
              <td class="px-4 py-3">{{ s.solicitante }}</td>
              <td class="px-4 py-3">{{ s.justificacion }}</td>
              <td class="px-4 py-3 text-right font-bold">{{ s.montoEstimado | currency: 'ARS' }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-bold rounded-full"
                      [ngClass]="{
                        'bg-yellow-100 text-yellow-800': s.estado === 'PRESENTADA',
                        'bg-green-100 text-green-800': s.estado === 'APROBADA',
                        'bg-red-100 text-red-800': s.estado === 'RECHAZADA'
                      }">
                  {{ s.estado }}
                </span>
              </td>
              <td class="px-4 py-3 text-center">
                <button *ngIf="s.estado === 'PRESENTADA'" (click)="aprobar(s.id!)" class="px-3 py-1 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700">
                  Aprobar (SoD)
                </button>
              </td>
            </tr>
            <tr *ngIf="solicitudes.length === 0">
              <td colspan="6" class="text-center py-6 text-gray-400">No hay solicitudes de compra registradas.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `
})
export class SolicitudCompraListComponent implements OnInit {
  private comprasService = inject(ComprasService);
  solicitudes: SolicitudCompra[] = [];

  ngOnInit(): void {
    this.cargarSolicitudes();
  }

  cargarSolicitudes(): void {
    this.comprasService.getSolicitudes().subscribe(s => this.solicitudes = s);
  }

  aprobar(id: number): void {
    this.comprasService.aprobarSolicitud(id).subscribe(() => this.cargarSolicitudes());
  }
}
