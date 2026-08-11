import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { catchError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { rutaParaEntidad } from '../../core/navigation/entidad-ruta';

export interface MiembroFamiliarRow {
  id: number;
  pacienteId?: number;
  nombre?: string;
  apellido?: string;
  dni?: string;
  rolFamiliar?: 'TITULAR' | 'CO_TITULAR' | 'DEPENDIENTE' | string;
  estado?: string;
}

export interface GrupoFamiliarRow {
  id: number;
  numeroCuenta: string;
  estadoGrupo: string;
  observacion?: string;
  ciudad?: string;
  provincia?: string;
  telefono?: string;
  titularNombre?: string;
  titularDni?: string;
  titularPacienteId?: number;
  miembros?: MiembroFamiliarRow[];
}

/**
 * Componente de gestión de Grupos Familiares.
 * Permite visualizar el titular explícito y los miembros dependientes vinculados
 * con enlace directo a la ficha 360 del paciente (rutaParaEntidad).
 */
@Component({
  selector: 'emx-grupos-familiares',
  standalone: true,
  imports: [RouterLink, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent],
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
          placeholder="Buscar por número de cuenta o titular…"
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
        <emx-loading-state />
      } @else if (error()) {
        <emx-error-state [message]="error()!" (retry)="loadData()" />
      } @else if (filtered().length === 0) {
        <emx-empty-state message="Sin grupos familiares registrados. Los grupos se generan automáticamente al dar de alta un afiliado." />
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

              <!-- Titular Destacado -->
              @let titular = obtenerTitular(g);
              <div class="grupo-titular">
                <span class="titular-label">Titular:</span>
                @if (titular?.pacienteId || g.titularPacienteId) {
                  <a
                    [routerLink]="obtenerRutaPaciente(titular?.pacienteId ?? g.titularPacienteId)"
                    class="titular-link"
                    title="Ver ficha 360 del titular"
                  >
                    {{ titular?.nombre ? (titular?.nombre + ' ' + (titular?.apellido || '')) : (g.titularNombre || 'Ver Ficha Titular') }}
                    @if (titular?.dni || g.titularDni) {
                      <span class="titular-dni">({{ titular?.dni || g.titularDni }})</span>
                    }
                  </a>
                } @else {
                  <span class="titular-name">{{ g.titularNombre || 'Sin asignar' }}</span>
                }
              </div>

              @if (g.observacion) {
                <div class="grupo-obs">{{ g.observacion }}</div>
              }

              <!-- Lista de miembros navegables -->
              @if (g.miembros?.length) {
                <div class="miembros-section">
                  <div class="miembros-title">Miembros del grupo ({{ g.miembros!.length }}):</div>
                  <ul class="miembros-list">
                    @for (m of g.miembros; track m.id) {
                      <li class="miembro-item">
                        @if (m.pacienteId) {
                          <a [routerLink]="obtenerRutaPaciente(m.pacienteId)" class="miembro-link">
                            {{ m.nombre }} {{ m.apellido }}
                          </a>
                        } @else {
                          <span class="miembro-nombre">{{ m.nombre }} {{ m.apellido }}</span>
                        }
                        @if (m.rolFamiliar) {
                          <span class="rol-badge" [class.is-titular]="m.rolFamiliar === 'TITULAR'">
                            {{ m.rolFamiliar }}
                          </span>
                        }
                      </li>
                    }
                  </ul>
                </div>
              }

              <div class="grupo-meta">
                @if (g.ciudad) {
                  <span>{{ g.ciudad }}</span>
                }
                @if (g.telefono) {
                  <span class="separator">·</span>
                  <span>{{ g.telefono }}</span>
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
    .grupos-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
    .grupo-card {
      background: var(--bg-elevated); border: 1px solid var(--border-glass);
      border-radius: 10px; padding: 16px;
      transition: border-color 0.15s;
    }
    .grupo-card:hover { border-color: var(--accent-blue); }
    .grupo-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .grupo-cuenta { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .estado-badge {
      font-size: 10px; font-weight: 700; padding: 2px 8px;
      border-radius: 999px; text-transform: uppercase; letter-spacing: 0.06em;
    }
    .estado-badge[data-estado="activo"] { background: rgba(16,185,129,0.12); color: #10b981; }
    .estado-badge[data-estado="en_mora"] { background: rgba(245,158,11,0.12); color: #f59e0b; }
    .estado-badge[data-estado="bloqueado"] { background: rgba(239,68,68,0.12); color: #ef4444; }
    .estado-badge[data-estado="inactivo"] { background: rgba(148,163,184,0.12); color: #94a3b8; }
    .grupo-titular { font-size: 13px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
    .titular-label { color: var(--text-muted); font-weight: 500; }
    .titular-link { color: var(--accent-blue); font-weight: 600; text-decoration: none; }
    .titular-link:hover { text-decoration: underline; }
    .titular-dni { font-size: 11px; color: var(--text-muted); margin-left: 2px; }
    .titular-name { color: var(--text-primary); font-weight: 600; }
    .grupo-obs { font-size: 12px; color: var(--text-muted); margin-bottom: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .miembros-section { margin-bottom: 12px; background: rgba(255,255,255,0.03); border-radius: 6px; padding: 8px; }
    .miembros-title { font-size: 11px; font-weight: 600; color: var(--text-muted); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.05em; }
    .miembros-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
    .miembro-item { font-size: 12px; display: flex; justify-content: space-between; align-items: center; }
    .miembro-link { color: var(--text-primary); text-decoration: none; font-weight: 500; }
    .miembro-link:hover { color: var(--accent-blue); text-decoration: underline; }
    .miembro-nombre { color: var(--text-primary); }
    .rol-badge { font-size: 9px; padding: 1px 6px; border-radius: 4px; background: var(--surface-glass); color: var(--text-muted); font-weight: 600; }
    .rol-badge.is-titular { background: rgba(59,130,246,0.15); color: var(--accent-blue); }
    .grupo-meta { font-size: 12px; color: var(--text-muted); display: flex; gap: 4px; align-items: center; margin-top: 8px; }
    .separator { color: var(--border-glass); }
  `],
})
export class GruposFamiliaresComponent implements OnInit {
  private readonly http = inject(HttpClient);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly grupos = signal<GrupoFamiliarRow[]>([]);
  readonly searchQ = signal('');
  readonly statusFilter = signal('');

  readonly filtered = computed(() => {
    let list = this.grupos();
    const q = this.searchQ().toLowerCase().trim();
    const s = this.statusFilter();
    if (q) {
      list = list.filter(
        g =>
          g.numeroCuenta?.toLowerCase().includes(q) ||
          g.titularNombre?.toLowerCase().includes(q) ||
          g.miembros?.some(m => `${m.nombre} ${m.apellido}`.toLowerCase().includes(q) || m.dni?.includes(q))
      );
    }
    if (s) list = list.filter(g => g.estadoGrupo === s);
    return list;
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading.set(true);
    this.error.set(null);
    this.http
      .get<GrupoFamiliarRow[]>(`${environment.apiUrl}/api/grupo-familiars`)
      .pipe(
        catchError((err) => {
          this.error.set(err?.error?.detail ?? err?.error?.title ?? 'No se pudieron cargar los grupos familiares.');
          this.loading.set(false);
          return [];
        })
      )
      .subscribe(data => {
        if (data) {
          this.grupos.set(data);
          this.loading.set(false);
        }
      });
  }

  onSearch(event: Event): void {
    this.searchQ.set((event.target as HTMLInputElement).value);
  }

  onStatusChange(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }

  obtenerTitular(g: GrupoFamiliarRow): MiembroFamiliarRow | undefined {
    return g.miembros?.find(m => m.rolFamiliar === 'TITULAR');
  }

  obtenerRutaPaciente(pacienteId?: number): string {
    return rutaParaEntidad('AFILIADO', pacienteId) ?? '/patients';
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
