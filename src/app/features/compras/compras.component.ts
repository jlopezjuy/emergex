import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComprasApiService, ComprobanteProveedorDTO, RecepcionBienesDTO } from '../../data-access/api/compras.api';

@Component({
  selector: 'app-compras',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="compras-container p-6 space-y-6">
      <header class="flex justify-between items-center bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-800">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Módulo Profesional de Compras & Proveedores SAE</h1>
          <p class="text-slate-400 text-sm mt-1">Recepción de Bienes con Trazabilidad Médica, Facturas CxP y 3-Way Matching Triangular</p>
        </div>
        <div class="flex space-x-3">
          <button (click)="activeTab.set('remitos')" [class.bg-blue-600]="activeTab() === 'remitos'" class="px-4 py-2 rounded-lg font-medium transition text-sm bg-slate-800 hover:bg-slate-700">
            Remitos & Recepción
          </button>
          <button (click)="activeTab.set('facturas')" [class.bg-blue-600]="activeTab() === 'facturas'" class="px-4 py-2 rounded-lg font-medium transition text-sm bg-slate-800 hover:bg-slate-700">
            Facturas Proveedores
          </button>
          <button (click)="activeTab.set('matching')" [class.bg-blue-600]="activeTab() === 'matching'" class="px-4 py-2 rounded-lg font-medium transition text-sm bg-slate-800 hover:bg-slate-700">
            3-Way Matching
          </button>
        </div>
      </header>

      <!-- TAB 1: RECEPCION DE REMITOS Y LOTES -->
      @if (activeTab() === 'remitos') {
        <section class="bg-white rounded-xl shadow p-6 border border-slate-200">
          <h2 class="text-lg font-semibold text-slate-800 mb-4">Registro de Recepción de Bienes con Lotes Médicos</h2>
          <form (submit)="onSubmitRecepcion($event)" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">N° Orden de Compra</label>
              <input type="number" [(ngModel)]="newRecepcion.ordenCompraId" name="ordenCompraId" required class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Ej. 10" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">N° Remito Físico</label>
              <input type="text" [(ngModel)]="newRecepcion.numeroRemito" name="numeroRemito" required class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="REM-0001-00001234" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase mb-1">Recibido Por (Personal)</label>
              <input type="text" [(ngModel)]="newRecepcion.recibidoPor" name="recibidoPor" required class="w-full border rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Farmacia Central" />
            </div>
            <div class="flex items-end">
              <button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm shadow transition">
                Registrar Recepción
              </button>
            </div>
          </form>

          <!-- LINEAS CON LOTE Y VENCIMIENTO -->
          <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6">
            <h3 class="text-sm font-semibold text-slate-700 mb-2">Insumo Farmacéutico / Aparatología (Lote & Vencimiento)</h3>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input type="text" [(ngModel)]="newLinea.descripcionItem" name="descItem" placeholder="Descripción Ítem Médico" class="border rounded-lg p-2 text-xs" />
              <input type="number" [(ngModel)]="newLinea.cantidadRecibida" name="cantRec" placeholder="Cantidad Recibida" class="border rounded-lg p-2 text-xs" />
              <input type="text" [(ngModel)]="newLinea.numeroLote" name="numLote" placeholder="N° Lote Médico" class="border rounded-lg p-2 text-xs" />
              <input type="date" [(ngModel)]="newLinea.fechaVencimiento" name="fecVenc" class="border rounded-lg p-2 text-xs" />
            </div>
          </div>
        </section>
      }

      <!-- TAB 2 & 3: FACTURAS Y 3-WAY MATCHING -->
      @if (activeTab() === 'facturas' || activeTab() === 'matching') {
        <section class="bg-white rounded-xl shadow p-6 border border-slate-200">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold text-slate-800">Comprobantes de Proveedores (CxP) & 3-Way Match</h2>
            <button (click)="loadComprobantes()" class="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded-lg transition">
              Actualizar Listado
            </button>
          </div>

          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold text-xs uppercase">
                <th class="p-3">ID</th>
                <th class="p-3">Tipo Doc</th>
                <th class="p-3">Punto Vta / N° Documento</th>
                <th class="p-3">Fecha</th>
                <th class="p-3">Monto Total</th>
                <th class="p-3">Estado 3-Way Match</th>
                <th class="p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (c of comprobantes(); track c.id) {
                <tr class="border-b border-slate-100 hover:bg-slate-50">
                  <td class="p-3 font-mono text-xs">{{ c.id }}</td>
                  <td class="p-3 font-medium">{{ c.tipoDocumento }}</td>
                  <td class="p-3 font-mono">{{ c.puntoVenta }}-{{ c.numeroDocumento }}</td>
                  <td class="p-3">{{ c.fechaComprobante }}</td>
                  <td class="p-3 font-semibold text-slate-900">${{ c.montoTotal | number:'1.2-2' }}</td>
                  <td class="p-3">
                    <span [class]="c.estadoMatching === 'MATCH_OK' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'" class="px-2.5 py-1 rounded-full text-xs font-bold">
                      {{ c.estadoMatching || 'PENDIENTE' }}
                    </span>
                  </td>
                  <td class="p-3">
                    @if (c.estadoMatching === 'BLOQUEADO_DIFERENCIA') {
                      <button (click)="onOverride(c.id!)" class="text-xs bg-red-600 hover:bg-red-700 text-white font-medium px-2.5 py-1 rounded-lg transition shadow">
                        Destrabar (Override)
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
    </div>
  `,
})
export class ComprasComponent implements OnInit {
  private comprasApi = inject(ComprasApiService);

  activeTab = signal<'remitos' | 'facturas' | 'matching'>('remitos');
  comprobantes = signal<ComprobanteProveedorDTO[]>([]);

  newRecepcion = {
    ordenCompraId: 10,
    numeroRemito: '',
    recibidoPor: '',
    fechaRecepcion: new Date().toISOString().split('T')[0],
  };

  newLinea = {
    descripcionItem: '',
    cantidadRecibida: 1,
    numeroLote: '',
    fechaVencimiento: '',
  };

  ngOnInit() {
    this.loadComprobantes();
  }

  loadComprobantes() {
    this.comprasApi.getComprobantesProveedor().subscribe({
      next: (data) => this.comprobantes.set(data),
      error: (err) => console.error('Error al cargar comprobantes:', err),
    });
  }

  onSubmitRecepcion(event: Event) {
    event.preventDefault();
    this.comprasApi.registrarRecepcion({
      ordenCompraId: this.newRecepcion.ordenCompraId,
      recepcionBienes: {
        numeroRemito: this.newRecepcion.numeroRemito,
        fechaRecepcion: this.newRecepcion.fechaRecepcion,
        recibidoPor: this.newRecepcion.recibidoPor,
      },
      lineas: [
        {
          descripcionItem: this.newLinea.descripcionItem || 'Insumo Farmacéutico General',
          cantidadRecibida: this.newLinea.cantidadRecibida,
          numeroLote: this.newLinea.numeroLote,
          fechaVencimiento: this.newLinea.fechaVencimiento,
        },
      ],
      esParcial: false,
    }).subscribe({
      next: () => {
        alert('Recepción de bienes y remito registrado exitosamente.');
        this.newRecepcion.numeroRemito = '';
      },
      error: (err) => alert('Error al registrar recepción: ' + (err.error?.message || err.message)),
    });
  }

  onOverride(comprobanteId: number) {
    const motivo = prompt('Ingrese el motivo de la excepción gerencial para destrabar el 3-Way Match:');
    if (!motivo) return;

    this.comprasApi.overrideMatching({
      comprobanteId,
      motivoExcepcion: motivo,
      usuarioAprobador: 'gerente.aprobador',
    }).subscribe({
      next: () => {
        alert('Comprobante destrabado exitosamente.');
        this.loadComprobantes();
      },
      error: (err) => alert('Error al destrabar comprobante: ' + (err.error?.message || err.message)),
    });
  }
}
