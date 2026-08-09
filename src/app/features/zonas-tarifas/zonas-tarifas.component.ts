import { Component, signal, inject, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { catchError } from 'rxjs';
import {
  ZonesApiService,
  ZonaCoberturaDTO,
  TarifaPrestacionZonaDTO,
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
        <p class="page-subtitle">Configuración de zonas de cobertura y matriz de precios por prestación</p>
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
  `],
})
export class ZonasTarifasComponent implements OnInit {
  private readonly zonesApi = inject(ZonesApiService);

  readonly activeTab = signal<'zonas' | 'tarifas'>('zonas');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly zonas = signal<ZonaCoberturaDTO[]>([]);
  readonly tarifas = signal<TarifaPrestacionZonaDTO[]>([]);

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      zonas: this.zonesApi.getZones(),
      tarifas: this.zonesApi.getTariffs(),
    })
      .pipe(
        catchError((err) => {
          this.error.set(err?.error?.detail ?? err?.error?.title ?? 'Error al cargar zonas y tarifas.');
          this.loading.set(false);
          return [];
        }),
      )
      .subscribe(({ zonas, tarifas }) => {
        if (zonas && tarifas) {
          this.zonas.set(zonas);
          this.tarifas.set(tarifas);
          this.loading.set(false);
        }
      });
  }
}
