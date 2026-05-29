import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

interface GrupoFamiliarRow {
  id: number;
  numeroCuenta: string;
  estadoGrupo: string;
  observacion?: string;
  ciudad?: string;
  provincia?: string;
  telefono?: string;
  miembros?: any[];
}

@Component({
  selector: 'emx-grupos-familiares',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page-container">
      <div class="page-header">
        <h1 class="page-title">Grupos familiares</h1>
        <p class="page-subtitle">Gestión de grupos de afiliados y sus dependientes</p>
      </div>

      <!-- Filtros -->
      <div class="filters-bar">
        <input
          type="text"
          class="search-input"
          placeholder="Buscar por número de cuenta…"
          [value]="searchQ()"
          (input)="onSearch($event)"
        />
        <select class="status-select" [value]="statusFilter()" (change)="onStatusChange($event)">
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="EN_MORA">En mora</option>
          <option value="BLOQUEADO">Bloqueado</option>
          <option value="INACTIVO">Inactivo</option>
        </select>
      </div>

      @if (loading()) {
        <div class="loading-state">
          <p class="loading-msg">Cargando grupos…</p>
        </div>
      } @else if (filtered().length === 0) {
        <div class="empty-state">
          <p class="empty-icon">👨‍👩‍👧</p>
          <p class="empty-title">Sin grupos familiares</p>
          <p class="empty-sub">
            Los grupos se crean automáticamente al dar de alta un afiliado.<br>
            <a routerLink="/patients" class="link-inline">Ir al listado de afiliados →</a>
          </p>
        </div>
      } @else {
        <div class="grupos-grid">
          @for (g of filtered(); track g.id) {
            <div class="grupo-card">
              <div class="grupo-header">
                <div class="grupo-cuenta">{{ g.numeroCuenta || 'Sin cuenta' }}</div>
                <span class="estado-badge" [attr.data-estado]="(g.estadoGrupo || 'ACTIVO').toLowerCase()">
                  {{ estadoLabel(g.estadoGrupo) }}
                </span>
              </div>
              @if (g.observacion) {
                <div class="grupo-obs">{{ g.observacion }}</div>
              }
              <div class="grupo-meta">
                @if (g.miembros?.length) {
                  <span>{{ g.miembros!.length }} miembro{{ g.miembros!.length !== 1 ? 's' : '' }}</span>
                }
                @if (g.ciudad) {
                  <span class="separator">·</span>
                  <span>{{ g.ciudad }}</span>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1100px; margin: 0 auto; }
    .page-header { margin-bottom: 20px; }
    .page-title { font-size: 22px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .page-subtitle { font-size: 13px; color: var(--text-muted); margin: 0; }
    .filters-bar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .search-input {
      flex: 1; min-width: 200px;
      background: var(--surface-glass); border: 1px solid var(--border-glass);
      border-radius: 8px; padding: 9px 14px; font-size: 13px; color: var(--text-primary); outline: none;
    }
    .search-input:focus { border-color: var(--accent-blue); }
    .status-select {
      background: var(--surface-glass); border: 1px solid var(--border-glass);
      border-radius: 8px; padding: 9px 14px; font-size: 13px; color: var(--text-primary); outline: none;
    }
    .loading-state { text-align: center; padding: 40px; }
    .loading-msg { color: var(--text-muted); font-size: 14px; }
    .empty-state { text-align: center; padding: 48px 24px; }
    .empty-icon { font-size: 40px; margin: 0 0 12px; }
    .empty-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 6px; }
    .empty-sub { font-size: 13px; color: var(--text-muted); margin: 0; line-height: 1.6; }
    .link-inline { color: var(--accent-blue); text-decoration: none; }
    .link-inline:hover { text-decoration: underline; }
    .grupos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
    .grupo-card {
      background: var(--bg-elevated); border: 1px solid var(--border-glass);
      border-radius: 10px; padding: 16px;
      transition: border-color 0.15s;
    }
    .grupo-card:hover { border-color: var(--accent-blue); }
    .grupo-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .grupo-cuenta { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .estado-badge {
      font-size: 10px; font-weight: 700; padding: 2px 8px;
      border-radius: 999px; text-transform: uppercase; letter-spacing: 0.06em;
    }
    .estado-badge[data-estado="activo"] { background: rgba(16,185,129,0.12); color: #10b981; }
    .estado-badge[data-estado="en_mora"] { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .estado-badge[data-estado="bloqueado"] { background: rgba(239,68,68,0.12); color: #ef4444; }
    .estado-badge[data-estado="inactivo"] { background: rgba(148,163,184,0.12); color: #94a3b8; }
    .grupo-obs { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .grupo-meta { font-size: 12px; color: var(--text-muted); display: flex; gap: 4px; align-items: center; }
    .separator { color: var(--border-glass); }
  `],
})
export class GruposFamiliaresComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly loading = signal(true);
  readonly grupos = signal<GrupoFamiliarRow[]>([]);
  readonly searchQ = signal('');
  readonly statusFilter = signal('');

  readonly filtered = computed(() => {
    let list = this.grupos();
    const q = this.searchQ().toLowerCase().trim();
    const s = this.statusFilter();
    if (q) list = list.filter(g => g.numeroCuenta?.toLowerCase().includes(q));
    if (s) list = list.filter(g => g.estadoGrupo === s);
    return list;
  });

  ngOnInit(): void {
    this.http
      .get<GrupoFamiliarRow[]>(`${environment.apiUrl}/api/grupo-familiars`)
      .pipe(catchError(() => of([] as GrupoFamiliarRow[])))
      .subscribe(data => {
        this.grupos.set(data);
        this.loading.set(false);
      });
  }

  onSearch(event: Event): void {
    this.searchQ.set((event.target as HTMLInputElement).value);
  }

  onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }

  estadoLabel(estado: string): string {
    const map: Record<string, string> = {
      ACTIVO: 'Activo',
      EN_MORA: 'En mora',
      BLOQUEADO: 'Bloqueado',
      INACTIVO: 'Inactivo',
    };
    return map[estado] ?? estado;
  }
}
