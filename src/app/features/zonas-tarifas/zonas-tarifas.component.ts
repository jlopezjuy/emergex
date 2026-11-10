import { Component, signal, inject, OnInit } from '@angular/core';
import { forkJoin, catchError } from 'rxjs';
import {
  ZonesApiService,
  ZonaCoberturaDTO,
  TarifaPrestacionZonaDTO,
  PrestacionMedicaDTO,
} from '../../data-access/api/zones.api';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';

@Component({
  selector: 'emx-zonas-tarifas',
  standalone: true,
  imports: [LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Zonas y tarifas</h1>
        <p class="page-subtitle">Configuración de zonas de cobertura, matriz de precios y catálogo de prestaciones con alícuota de IVA</p>
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'zonas'"
          (click)="activeTab.set('zonas')"
        >
          🗺️ Zonas de cobertura
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'tarifas'"
          (click)="activeTab.set('tarifas')"
        >
          💲 Matriz de tarifas
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'prestaciones'"
          (click)="activeTab.set('prestaciones')"
        >
          🩺 Catálogo de prestaciones
        </button>
      </div>

      @if (loading()) {
        <emx-loading-state />
      } @else if (error()) {
        <emx-error-state [message]="error()!" (retry)="loadData()" />
      } @else {

        @if (activeTab() === 'zonas') {
          <div class="tab-content">
            <div class="section-header">
              <h2 class="section-title">Zonas de cobertura ({{ zonas().length }})</h2>
            </div>
            @if (zonas().length === 0) {
              <emx-empty-state message="Sin zonas de cobertura configuradas" />
            } @else {
              <div class="zona-grid">
                @for (zona of zonas(); track zona.id) {
                  <div class="zona-card">
                    <div class="zona-name">{{ zona.nombre }}</div>
                    <div class="zona-code">{{ zona.codigoPostal }}</div>
                  </div>
                }
              </div>
            }
          </div>
        }

        @if (activeTab() === 'tarifas') {
          <div class="tab-content">
            <div class="section-header">
              <h2 class="section-title">Tarifas por prestación y zona ({{ tarifas().length }})</h2>
            </div>
            @if (tarifas().length === 0) {
              <emx-empty-state message="Sin tarifas configuradas para las zonas actuales" />
            } @else {
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Zona</th>
                      <th>Prestación</th>
                      <th>Cargo mínimo</th>
                      <th>Espera (30 min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (t of tarifas(); track t.id) {
                      <tr>
                        <td class="cell-zona">{{ t.zona.nombre }}</td>
                        <td>{{ t.prestacion.nombre }}</td>
                        <td class="cell-price">&#36;{{ t.cargoMinimo }}</td>
                        <td class="cell-price">&#36;{{ t.costoEspera30Min }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        @if (activeTab() === 'prestaciones') {
          <div class="tab-content">
            <div class="section-header">
              <h2 class="section-title">Prestaciones médicas y alícuotas fiscales ({{ prestaciones().length }})</h2>
            </div>
            @if (prestaciones().length === 0) {
              <emx-empty-state message="Sin prestaciones configuradas" />
            } @else {
              <div class="table-wrapper">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Nombre</th>
                      <th>Tipo Asistencia</th>
                      <th>Alícuota IVA</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (p of prestaciones(); track p.id) {
                      <tr>
                        <td class="cell-zona">{{ p.codigo }}</td>
                        <td>{{ p.nombre }}</td>
                        <td>{{ p.tipoAsistencia }}</td>
                        <td class="cell-iva">
                          <span class="badge-iva" [class.badge-iva-21]="(p.alicuotaIva ?? 21) === 21" [class.badge-iva-105]="p.alicuotaIva === 10.5" [class.badge-iva-0]="p.alicuotaIva === 0">
                            {{ p.alicuotaIva != null ? p.alicuotaIva + '%' : '21%' }}
                          </span>
                        </td>
                        <td>
                          <span class="status-badge" [class.active]="p.activo">
                            {{ p.activo ? 'Activa' : 'Inactiva' }}
                          </span>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

      }
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1100px; margin: 0 auto; }
    .page-header { margin-bottom: 20px; }
    .page-title { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .page-subtitle { font-size: 13px; color: var(--text-muted); margin: 0; }
    .tabs {
      display: flex; gap: 4px;
      border-bottom: 1px solid var(--border-glass);
      margin-bottom: 24px;
    }
    .tab-btn {
      background: none; border: none; padding: 10px 18px; cursor: pointer;
      font-size: 13px; font-weight: 500; color: var(--text-muted);
      border-bottom: 2px solid transparent; margin-bottom: -1px;
      transition: all 0.15s;
    }
    .tab-btn:hover { color: var(--text-primary); }
    .tab-btn.active { color: var(--accent-blue); border-bottom-color: var(--accent-blue); font-weight: 600; }
    .tab-content { }
    .section-header { margin-bottom: 16px; }
    .section-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .zona-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
    .zona-card {
      background: var(--bg-elevated); border: 1px solid var(--border-glass);
      border-radius: 10px; padding: 16px;
    }
    .zona-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .zona-code { font-size: 12px; color: var(--accent-blue); font-weight: 600; margin-top: 4px; }
    .table-wrapper { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th {
      text-align: left; padding: 10px 14px;
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: var(--text-muted);
      border-bottom: 1px solid var(--border-glass);
    }
    .data-table td {
      padding: 11px 14px; color: var(--text-primary);
      border-bottom: 1px solid var(--border-glass);
    }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: var(--surface-glass); }
    .cell-zona { font-weight: 500; }
    .cell-price { font-weight: 600; color: var(--text-primary); }
    .cell-iva { font-weight: 600; }
    .badge-iva {
      display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;
      background: var(--surface-glass); color: var(--text-primary);
    }
    .badge-iva-21 { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
    .badge-iva-105 { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .badge-iva-0 { background: rgba(156, 163, 175, 0.15); color: #9ca3af; }
    .status-badge {
      display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px;
      background: rgba(239, 68, 68, 0.15); color: #ef4444;
    }
    .status-badge.active { background: rgba(16, 185, 129, 0.15); color: #10b981; }
  `],
})
export class ZonasTarifasComponent implements OnInit {
  private readonly zonesApi = inject(ZonesApiService);

  readonly activeTab = signal<'zonas' | 'tarifas' | 'prestaciones'>('zonas');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly zonas = signal<ZonaCoberturaDTO[]>([]);
  readonly tarifas = signal<TarifaPrestacionZonaDTO[]>([]);
  readonly prestaciones = signal<PrestacionMedicaDTO[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      zonas: this.zonesApi.getZones(),
      tarifas: this.zonesApi.getTariffs(),
      prestaciones: this.zonesApi.getPrestaciones(),
    })
      .pipe(
        catchError((err) => {
          this.error.set(err?.error?.detail ?? err?.error?.title ?? 'Error al cargar zonas, tarifas y prestaciones.');
          this.loading.set(false);
          return [];
        }),
      )
      .subscribe(({ zonas, tarifas, prestaciones }) => {
        if (zonas && tarifas && prestaciones) {
          this.zonas.set(zonas);
          this.tarifas.set(tarifas);
          this.prestaciones.set(prestaciones);
          this.loading.set(false);
        }
      });
  }
}
