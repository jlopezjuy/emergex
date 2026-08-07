import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TesoreriaApi, CajaStatus, MovimientoCaja } from '../../data-access/api/tesoreria.api';
import { FormsModule } from '@angular/forms';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';

@Component({
  selector: 'emx-tesoreria',
  standalone: true,
  imports: [CommonModule, FormsModule, GlassCardComponent],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-4" style="color: var(--text-primary)">Tesorería</h1>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <emx-glass-card>
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold" style="color: var(--text-primary)">Estado de Caja</h2>
            <span class="px-3 py-1 rounded-full text-sm font-medium"
                  [ngClass]="cajaStatus()?.estado === 'ABIERTA' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'">
              {{ cajaStatus()?.estado || 'DESCONOCIDO' }}
            </span>
          </div>
          <div class="text-3xl font-bold" style="color: var(--accent-cyan)">
            @if (modoArqueoCiego()) {
              <span>••••••</span>
            } @else {
              {{ cajaStatus()?.saldoActual | currency }}
            }
          </div>

          <div class="mt-4 flex items-center gap-2">
            <button (click)="toggleModoArqueoCiego()" class="text-xs text-muted hover:text-white underline">
              {{ modoArqueoCiego() ? '👁️ Mostrar Saldo Teórico' : '🙈 Modo Arqueo Ciego (Ocultar Saldo)' }}
            </button>
          </div>
          
          <div class="mt-4 flex gap-2">
            <button (click)="openMovimientoModal('INGRESO')" class="btn-primary flex-1">Ingreso</button>
            <button (click)="openMovimientoModal('EGRESO')" class="btn-danger flex-1">Egreso</button>
            <button (click)="openArqueoModal()" class="btn-secondary flex-1">Arqueo Ciego</button>
          </div>
        </emx-glass-card>
      </div>

      <emx-glass-card>
        <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">Historial de Movimientos</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-glass)">
                <th class="py-2 px-4">Fecha</th>
                <th class="py-2 px-4">Tipo</th>
                <th class="py-2 px-4">Concepto</th>
                <th class="py-2 px-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              @for (mov of movimientos(); track mov.id) {
                <tr style="border-bottom: 1px solid var(--border-glass)">
                  <td class="py-2 px-4">{{ mov.fecha | date:'short' }}</td>
                  <td class="py-2 px-4">
                    <span [class]="mov.tipo === 'INGRESO' ? 'text-green-400' : 'text-red-400'">
                      {{ mov.tipo }}
                    </span>
                  </td>
                  <td class="py-2 px-4">{{ mov.concepto }}</td>
                  <td class="py-2 px-4 text-right">{{ mov.monto | currency }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </emx-glass-card>

      <!-- Modals for Modifying State could go here, simplified for this implementation -->
    </div>
  `,
  styles: [`
    .btn-primary { background: var(--accent-blue); color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; transition: opacity 0.2s; }
    .btn-primary:hover { opacity: 0.9; }
    .btn-secondary { background: var(--surface-glass); color: var(--text-primary); border: 1px solid var(--border-glass); padding: 0.5rem 1rem; border-radius: 0.5rem; }
    .btn-secondary:hover { background: rgba(255,255,255,0.1); }
    .btn-danger { background: var(--accent-red); color: white; padding: 0.5rem 1rem; border-radius: 0.5rem; transition: opacity 0.2s; }
    .btn-danger:hover { opacity: 0.9; }
  `]
})
export class TesoreriaComponent implements OnInit {
  private readonly api = inject(TesoreriaApi);

  cajaStatus = signal<CajaStatus | null>(null);
  movimientos = signal<MovimientoCaja[]>([]);
  modoArqueoCiego = signal<boolean>(false);

  ngOnInit() {
    this.loadData();
  }

  toggleModoArqueoCiego() {
    this.modoArqueoCiego.update(val => !val);
  }

  private loadData() {
    this.api.getStatus().subscribe(status => this.cajaStatus.set(status));
    this.api.getMovimientos().subscribe(movs => this.movimientos.set(movs));
  }

  openMovimientoModal(tipo: 'INGRESO' | 'EGRESO') {
    // Implement modal logic
    console.log('Open modal for', tipo);
  }

  openArqueoModal() {
    // Implement arqueo logic
    console.log('Open arqueo modal');
  }
}
