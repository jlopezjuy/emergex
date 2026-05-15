import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { catchError, of } from 'rxjs';
import { FleetApiService } from '../../data-access/api/fleet.api';
import { TurnoMovilDTO } from '../../data-access/dto/ambulancia.dto';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';
import { KpiCardComponent } from '../../shared/components/kpi-card/kpi-card.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { SparklineComponent } from '../../shared/components/charts/sparkline/sparkline.component';

interface StaffProfile {
  id: number;
  nombre: string;
  rol: string;
  exp: number;
  avatar: string;
  certs: Array<{ nombre: string; vigente: boolean; anio: number }>;
  horasUltimaSemana: number[];
}

const STAFF_POOL: StaffProfile[] = [
  {
    id: 1, nombre: 'Martínez, Roberto', rol: 'Médico de Urgencias', exp: 12, avatar: 'MR',
    certs: [
      { nombre: 'ACLS', vigente: true, anio: 2027 },
      { nombre: 'ATLS', vigente: true, anio: 2026 },
      { nombre: 'PHTLS', vigente: false, anio: 2024 },
    ],
    horasUltimaSemana: [8, 12, 8, 0, 12, 8, 8],
  },
  {
    id: 2, nombre: 'González, Ana', rol: 'Paramédico ALS', exp: 7, avatar: 'AG',
    certs: [
      { nombre: 'EMT-P', vigente: true, anio: 2026 },
      { nombre: 'ACLS', vigente: true, anio: 2027 },
    ],
    horasUltimaSemana: [12, 8, 12, 12, 0, 8, 12],
  },
  {
    id: 3, nombre: 'López, Carlos', rol: 'TUM Básico', exp: 3, avatar: 'LC',
    certs: [
      { nombre: 'EMT-B', vigente: true, anio: 2025 },
      { nombre: 'BLS', vigente: true, anio: 2026 },
    ],
    horasUltimaSemana: [8, 8, 0, 12, 8, 12, 8],
  },
  {
    id: 4, nombre: 'Rodríguez, María', rol: 'Enfermera UCI', exp: 9, avatar: 'RM',
    certs: [
      { nombre: 'ACLS', vigente: true, anio: 2027 },
      { nombre: 'PALS', vigente: true, anio: 2026 },
      { nombre: 'NRP', vigente: true, anio: 2025 },
    ],
    horasUltimaSemana: [0, 12, 8, 8, 12, 0, 12],
  },
  {
    id: 5, nombre: 'Fernández, Diego', rol: 'Paramédico BLS', exp: 5, avatar: 'FD',
    certs: [
      { nombre: 'EMT-I', vigente: true, anio: 2026 },
      { nombre: 'ACLS', vigente: false, anio: 2024 },
    ],
    horasUltimaSemana: [12, 0, 12, 8, 8, 12, 8],
  },
  {
    id: 6, nombre: 'Suárez, Laura', rol: 'Despachadora', exp: 4, avatar: 'SL',
    certs: [{ nombre: 'EMD', vigente: true, anio: 2027 }],
    horasUltimaSemana: [8, 8, 8, 8, 8, 0, 0],
  },
];

interface StaffRow {
  id: number;
  nombre: string;
  rol: string;
  turnoId?: number;
  ambulanciaId?: number;
  estado: string;
  profile?: StaffProfile;
}

type StaffTab = 'TODOS' | 'MEDICO' | 'PARAMEDICO' | 'ENFERMERIA' | 'DESPACHO';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [
    GlassCardComponent,
    KpiCardComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    SparklineComponent,
  ],
  template: `
    <div class="h-full flex flex-col overflow-hidden">

      @if (loading()) {
        <div class="p-6"><emx-loading-state /></div>
      } @else if (error()) {
        <div class="p-6"><emx-error-state [message]="error()!" (retry)="load()" /></div>
      } @else {
        <!-- Header -->
        <div class="flex items-center justify-between px-6 pt-6 pb-0 flex-shrink-0">
          <div class="flex items-center gap-3">
            <div style="width:36px;height:36px;border-radius:10px;background:rgba(34,211,238,0.12);display:flex;align-items:center;justify-content:center;">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent-cyan)" stroke-width="1.5">
                <circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6"/>
              </svg>
            </div>
            <div>
              <h1 class="font-semibold text-lg" style="color: var(--text-primary);">Personal Operativo</h1>
              <p class="text-xs mt-0.5 font-mono" style="color: var(--text-muted);">MÉDICOS · PARAMÉDICOS · ENFERMERÍA · DESPACHO</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" class="btn btn--ghost btn--sm">Reporte de turnos</button>
            <button type="button" class="btn btn--primary btn--sm">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 1v10M1 6h10"/>
              </svg>
              Alta de personal
            </button>
          </div>
        </div>

        <!-- Body: left + right -->
        <div class="flex flex-1 overflow-hidden">

          <!-- LEFT -->
          <div class="flex-1 flex flex-col overflow-hidden p-4 gap-4">

            <!-- KPIs -->
            <div class="grid grid-cols-4 gap-4 flex-shrink-0">
              <emx-kpi-card label="Plantilla" [value]="STAFF_POOL.length" />
              <emx-kpi-card label="En turno" [value]="staff().length" accentColor="cyan" />
              <emx-kpi-card label="Médicos" [value]="medicosCount()" accentColor="blue" />
              <emx-kpi-card label="Paramédicos" [value]="paramedicosCount()" accentColor="emerald" />
            </div>

            <!-- Staff tabs -->
            <div class="flex items-center gap-0.5 flex-shrink-0">
              @for (tab of staffTabs; track tab.id) {
                <button
                  type="button"
                  class="px-2.5 py-1 text-xs font-medium rounded-t transition-all"
                  [style.color]="staffTab() === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)'"
                  [style.border-bottom]="staffTab() === tab.id ? '2px solid var(--accent-cyan)' : '2px solid transparent'"
                  (click)="staffTab.set(tab.id)"
                >{{ tab.label }}</button>
              }
            </div>

            <!-- Search -->
            <div class="flex-shrink-0">
              <input
                type="text"
                placeholder="Buscar por nombre o rol..."
                [value]="searchQuery()"
                (input)="searchQuery.set($any($event.target).value)"
                style="
                  width: 100%;
                  padding: 8px 12px;
                  border-radius: 8px;
                  border: 1px solid var(--border-glass);
                  background: var(--surface-glass);
                  color: var(--text-primary);
                  font-size: 13px;
                  outline: none;
                "
              />
            </div>

            <!-- Table -->
            <emx-glass-card extraClass="!p-0 overflow-hidden flex-1 flex flex-col min-h-0">
              <div class="px-4 pt-4 pb-2 border-b flex-shrink-0" style="border-color: var(--border-glass);">
                <h2 class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">
                  Tripulación activa
                </h2>
              </div>

              @if (filteredStaff().length === 0) {
                <div class="p-4">
                  <emx-empty-state message="No hay personal en turno activo" />
                </div>
              } @else {
                <div class="overflow-auto flex-1">
                  <table class="w-full text-sm">
                    <thead>
                      <tr style="border-bottom: 1px solid var(--border-glass);">
                        <th class="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Nombre</th>
                        <th class="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Rol</th>
                        <th class="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Turno</th>
                        <th class="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Unidad</th>
                        <th class="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider" style="color: var(--text-muted);">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of filteredStaff(); track row.id) {
                        <tr
                          style="border-bottom: 1px solid var(--border-glass); cursor: pointer; transition: background 0.15s;"
                          [style.background]="selectedRow()?.id === row.id ? 'rgba(34,211,238,0.07)' : ''"
                          (click)="selectedRow.set(row)"
                        >
                          <td class="px-4 py-3 font-medium" style="color: var(--text-primary);">
                            {{ row.nombre }}
                          </td>
                          <td class="px-4 py-3 text-xs uppercase" style="color: var(--text-secondary);">{{ row.rol }}</td>
                          <td class="px-4 py-3 font-mono text-xs" style="color: var(--text-muted);">
                            #{{ row.turnoId ?? '—' }}
                          </td>
                          <td class="px-4 py-3 font-mono text-xs" style="color: var(--accent-cyan);">
                            {{ row.ambulanciaId ? 'AMB-' + row.ambulanciaId : '—' }}
                          </td>
                          <td class="px-4 py-3">
                            <span class="badge badge--stable text-xs">{{ row.estado }}</span>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </emx-glass-card>

          </div>

          <!-- RIGHT: detail panel -->
          @if (selectedRow()) {
            <div
              style="
                width: 320px;
                border-left: 1px solid var(--border-glass);
                flex-shrink: 0;
                display: flex;
                flex-direction: column;
                overflow: hidden;
              "
            >
              <div style="overflow-y: auto; flex: 1;">

                <!-- Header -->
                <div style="display:flex; align-items:center; gap:12px; padding:16px; border-bottom: 1px solid var(--border-glass);">
                  <div style="
                    width:48px; height:48px; border-radius:50%;
                    background:rgba(59,130,246,0.2);
                    display:flex; align-items:center; justify-content:center;
                    font-family:var(--font-mono); font-weight:700; font-size:14px;
                    color:var(--accent-blue); flex-shrink:0;
                  ">
                    {{ selectedRow()!.profile?.avatar }}
                  </div>
                  <div style="flex:1; min-width:0;">
                    <div style="font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                      {{ selectedRow()!.nombre }}
                    </div>
                    <div style="font-size:12px; color:var(--text-secondary);">{{ selectedRow()!.profile?.rol }}</div>
                    <div style="font-family:var(--font-mono); font-size:10px; color:var(--text-muted);">
                      {{ selectedRow()!.profile?.exp }} años de exp.
                    </div>
                  </div>
                  <button
                    (click)="selectedRow.set(null)"
                    style="
                      background: none; border: none; cursor: pointer;
                      color: var(--text-muted); font-size: 18px; line-height:1;
                      padding: 4px; border-radius: 4px;
                    "
                    title="Cerrar"
                  >×</button>
                </div>

                <!-- Info grid -->
                <div style="padding: 16px; border-bottom: 1px solid var(--border-glass);">
                  <div style="
                    display: grid; grid-template-columns: 1fr 1fr;
                    gap: 12px;
                  ">
                    <div>
                      <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">Turno</div>
                      <div style="font-family:var(--font-mono);font-size:13px;color:var(--text-primary);">#{{ selectedRow()!.turnoId ?? '—' }}</div>
                    </div>
                    <div>
                      <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">Unidad</div>
                      <div style="font-family:var(--font-mono);font-size:13px;color:var(--accent-cyan);">
                        {{ selectedRow()!.ambulanciaId ? 'AMB-' + selectedRow()!.ambulanciaId : '—' }}
                      </div>
                    </div>
                    <div>
                      <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">Estado</div>
                      <div style="font-size:13px;color:var(--text-primary);">{{ selectedRow()!.estado }}</div>
                    </div>
                    <div>
                      <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:4px;">Horas hoy</div>
                      <div style="font-family:var(--font-mono);font-size:13px;color:var(--text-primary);">8h</div>
                    </div>
                  </div>
                </div>

                <!-- Certifications -->
                <div style="padding: 16px; border-bottom: 1px solid var(--border-glass);">
                  <div class="font-mono text-xs uppercase tracking-wider" style="color:var(--text-muted); margin-bottom:10px;">
                    Certificaciones
                  </div>
                  @for (cert of selectedRow()!.profile?.certs ?? []; track cert.nombre) {
                    <div style="
                      display:flex; align-items:center; justify-content:space-between;
                      padding:8px 12px; border-radius:8px;
                      background:var(--surface-glass); border:1px solid var(--border-glass);
                      margin-bottom:6px;
                    ">
                      <div style="font-weight:500; font-size:13px; color:var(--text-primary);">{{ cert.nombre }}</div>
                      <div
                        style="font-family:var(--font-mono); font-size:10px;"
                        [style.color]="cert.vigente ? 'var(--accent-emerald)' : 'var(--accent-red)'"
                      >
                        {{ cert.vigente ? 'VIGENTE · ' + cert.anio : 'VENCIDA · ' + cert.anio }}
                      </div>
                    </div>
                  }
                </div>

                <!-- Sparkline -->
                <div style="padding: 16px;">
                  <div class="font-mono text-xs uppercase tracking-wider" style="color:var(--text-muted); margin-bottom:10px;">
                    Carga últimos 7 días
                  </div>
                  <emx-sparkline
                    [values]="selectedRow()!.profile?.horasUltimaSemana ?? []"
                    color="var(--accent-cyan)"
                    [width]="264"
                    [height]="44"
                  />
                  <div style="
                    display:flex; justify-content:space-between;
                    font-family:var(--font-mono); font-size:9px;
                    color:var(--text-muted); margin-top:4px;
                  ">
                    @for (d of ['L','M','M','J','V','S','D']; track $index) {
                      <span>{{ d }}</span>
                    }
                  </div>
                </div>

              </div>
            </div>
          }

        </div>
      }

    </div>
  `,
})
export class StaffComponent implements OnInit {
  private fleetApi = inject(FleetApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly turnos = signal<TurnoMovilDTO[]>([]);
  readonly selectedRow = signal<StaffRow | null>(null);
  readonly searchQuery = signal('');
  readonly staffTab = signal<StaffTab>('TODOS');

  readonly staffTabs: { id: StaffTab; label: string }[] = [
    { id: 'TODOS', label: 'Todos' },
    { id: 'MEDICO', label: 'Médicos' },
    { id: 'PARAMEDICO', label: 'Paramédicos' },
    { id: 'ENFERMERIA', label: 'Enfermería' },
    { id: 'DESPACHO', label: 'Despacho' },
  ];

  readonly staff = computed<StaffRow[]>(() => {
    const rows: StaffRow[] = [];
    let idx = 0;
    for (const turno of this.turnos()) {
      for (const m of turno.tripulacion ?? []) {
        const profile = STAFF_POOL[idx % STAFF_POOL.length];
        rows.push({
          id: m.id ?? -(idx + 1),
          nombre: m.nombre ?? `Profesional ${m.profesionalId}`,
          rol: m.rol ?? '—',
          turnoId: turno.id,
          ambulanciaId: turno.ambulanciaId,
          estado: turno.activo ? 'Activo' : 'Inactivo',
          profile,
        });
        idx++;
      }
    }
    return rows;
  });

  readonly filteredStaff = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const tab = this.staffTab();

    const tabKeywords: Record<StaffTab, string[]> = {
      TODOS: [],
      MEDICO: ['médico', 'medico', 'doctor'],
      PARAMEDICO: ['paramédico', 'paramedico', 'tum'],
      ENFERMERIA: ['enfermera', 'enfermero', 'enfermería', 'enfermeria'],
      DESPACHO: ['despachador', 'despachadora', 'despacho'],
    };

    return this.staff().filter((r) => {
      if (tab !== 'TODOS') {
        const keywords = tabKeywords[tab];
        const rolLower = r.rol.toLowerCase();
        if (!keywords.some((k) => rolLower.includes(k))) return false;
      }
      if (q) {
        return r.nombre.toLowerCase().includes(q) || r.rol.toLowerCase().includes(q);
      }
      return true;
    });
  });

  readonly ambulanciasCubiertas = computed(() => {
    const ids = new Set(this.turnos().map((t) => t.ambulanciaId));
    return ids.size;
  });

  readonly medicosCount = computed(() =>
    this.staff().filter((r) => ['médico', 'medico', 'doctor'].some((k) => r.rol.toLowerCase().includes(k))).length,
  );

  readonly paramedicosCount = computed(() =>
    this.staff().filter((r) => ['paramédico', 'paramedico', 'tum'].some((k) => r.rol.toLowerCase().includes(k))).length,
  );

  // Expose STAFF_POOL length for template access
  readonly STAFF_POOL = STAFF_POOL;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.fleetApi
      .turnos()
      .pipe(catchError(() => of([])))
      .subscribe({
        next: (data) => {
          this.turnos.set(data);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Error al cargar el personal');
          this.loading.set(false);
        },
      });
  }
}
