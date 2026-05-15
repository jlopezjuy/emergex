import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';
import { SparklineComponent } from '../../shared/components/charts/sparkline/sparkline.component';
import { StaffApiService } from '../../data-access/api/staff.api';
import { ProfesionalSaludDTO } from '../../data-access/dto/staff.dto';

interface StaffMember {
  id: number;
  codigo: string;
  nombre: string;
  rol: string;
  unidad: string;
  estado: 'EN_TURNO' | 'LIBRE';
  certs: string[];
  certsDetalle: { nombre: string; vigente: boolean; anio: number }[];
  exp: number;
  avatar: string;
  turno: string;
  serviciosHoy: number;
  serviciosMes: number;
  horasSemana: number;
  rendimiento: number;
  cargaSemanal: number[];
  // campos reales del backend
  email?: string;
  especialidad?: string;
  activo?: boolean;
  atencionDomiciliaria?: boolean;
  atencionEmergencia?: boolean;
  empresa?: { id: number; nombre: string };
}

function dtoToMember(p: ProfesionalSaludDTO): StaffMember {
  const iniciales = `${p.nombre.charAt(0)}${p.apellido.charAt(0)}`.toUpperCase();
  return {
    id: p.id,
    codigo: `P-${String(p.id).padStart(3, '0')}`,
    nombre: `${p.nombre} ${p.apellido}`,
    rol: p.especialidad ?? 'Profesional',
    unidad: '—',
    estado: p.activo ? 'EN_TURNO' : 'LIBRE',
    certs: [],
    certsDetalle: [],
    exp: 0,
    avatar: iniciales,
    turno: '—',
    serviciosHoy: 0,
    serviciosMes: 0,
    horasSemana: 0,
    rendimiento: 0,
    cargaSemanal: Array(7).fill(0),
    email: p.email,
    especialidad: p.especialidad,
    activo: p.activo,
    atencionDomiciliaria: p.atencionDomiciliaria,
    atencionEmergencia: p.atencionEmergencia,
    empresa: p.empresa,
  };
}

type StaffTab = 'TODOS' | 'MEDICO' | 'PARAMEDICO' | 'ENFERMERIA' | 'DESPACHO';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [SparklineComponent],
  template: `
    <div class="h-full flex flex-col overflow-hidden">

      <!-- Header -->
      <div class="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(34,211,238,0.12);display:flex;align-items:center;justify-content:center;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--accent-cyan)" stroke-width="1.5">
              <circle cx="8" cy="5" r="3"/><path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6"/>
            </svg>
          </div>
          <div>
            <h1 class="font-semibold text-lg" style="color:var(--text-primary);">Personal Operativo</h1>
            <p class="text-xs mt-0.5 font-mono" style="color:var(--text-muted);">MÉDICOS · PARAMÉDICOS · ENFERMERÍA · DESPACHO</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <!-- KPIs inline -->
          <div class="flex items-center gap-4 px-4 py-2 rounded-lg" style="background:var(--surface-glass);border:1px solid var(--border-glass);">
            @for (kpi of headerKpis(); track kpi.label) {
              <div class="text-center">
                <div class="font-mono text-xs uppercase tracking-wider mb-0.5" style="color:var(--text-muted);">{{ kpi.label }}</div>
                <div class="font-mono font-bold text-lg leading-none" [style.color]="kpi.color">{{ kpi.value }}</div>
              </div>
            }
          </div>
          <button type="button" class="btn btn--ghost btn--sm">Reporte de turnos</button>
          <button type="button" class="btn btn--primary btn--sm">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 1v10M1 6h10"/></svg>
            Alta de personal
          </button>
        </div>
      </div>

      <!-- Loading / Error states -->
      @if (loading()) {
        <div class="flex-1 flex items-center justify-center" style="color:var(--text-muted);font-size:13px;">
          Cargando personal…
        </div>
      } @else if (error()) {
        <div class="flex-1 flex items-center justify-center" style="color:var(--accent-red);font-size:13px;">
          {{ error() }}
        </div>
      } @else {

      <!-- Body -->
      <div class="flex flex-1 overflow-hidden min-h-0">

        <!-- LEFT -->
        <div class="flex-1 flex flex-col overflow-hidden px-4 pb-4 gap-3 min-h-0">

          <!-- Tabs -->
          <div class="flex items-center gap-0.5 flex-shrink-0">
            @for (tab of tabs; track tab.id) {
              <button type="button"
                class="px-3 py-1.5 text-xs font-medium transition-all"
                [style.color]="activeTab() === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)'"
                [style.border-bottom]="activeTab() === tab.id ? '2px solid var(--accent-cyan)' : '2px solid transparent'"
                (click)="activeTab.set(tab.id)"
              >{{ tab.label }}</button>
            }
          </div>

          <!-- Search -->
          <div class="flex-shrink-0">
            <div class="relative">
              <svg class="absolute" style="left:10px;top:50%;transform:translateY(-50%);" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
                <circle cx="5.5" cy="5.5" r="4"/><path d="M9 9l3 3"/>
              </svg>
              <input type="text" placeholder="Buscar nombre o especialidad..."
                [value]="search()" (input)="search.set($any($event.target).value)"
                style="width:100%;padding:7px 10px 7px 30px;border-radius:8px;border:1px solid var(--border-glass);background:var(--surface-glass);color:var(--text-primary);font-size:12px;outline:none;" />
            </div>
          </div>

          <!-- Table -->
          <div class="flex-1 overflow-auto rounded-xl min-h-0" style="border:1px solid var(--border-glass);background:var(--surface-glass);">
            <table class="w-full text-xs">
              <thead>
                <tr style="border-bottom:1px solid var(--border-glass);">
                  <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color:var(--text-muted);">Profesional</th>
                  <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color:var(--text-muted);">Especialidad</th>
                  <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color:var(--text-muted);">Empresa</th>
                  <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color:var(--text-muted);">Estado</th>
                  <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color:var(--text-muted);">Atenciones</th>
                </tr>
              </thead>
              <tbody>
                @for (m of filtered(); track m.id) {
                  <tr class="cursor-pointer transition-colors"
                    style="border-bottom:1px solid var(--border-hairline);"
                    [style.background]="selected()?.id === m.id ? 'rgba(34,211,238,0.07)' : 'transparent'"
                    (click)="selected.set(m)">
                    <!-- Profesional -->
                    <td class="px-3 py-2.5">
                      <div class="flex items-center gap-2">
                        <div style="width:28px;height:28px;border-radius:50%;background:rgba(59,130,246,0.2);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-weight:700;font-size:10px;color:var(--accent-blue);flex-shrink:0;">
                          {{ m.avatar }}
                        </div>
                        <div>
                          <div class="font-medium" style="color:var(--text-primary);">{{ m.nombre }}</div>
                          <div class="font-mono" style="font-size:10px;color:var(--text-muted);">{{ m.codigo }}</div>
                        </div>
                      </div>
                    </td>
                    <!-- Especialidad -->
                    <td class="px-3 py-2.5" style="color:var(--text-secondary);">{{ m.rol }}</td>
                    <!-- Empresa -->
                    <td class="px-3 py-2.5 font-mono font-semibold" style="color:var(--accent-cyan);">{{ m.empresa?.nombre ?? '—' }}</td>
                    <!-- Estado -->
                    <td class="px-3 py-2.5">
                      <span class="badge" [class]="estadoBadge(m.estado)">{{ estadoLabel(m.activo) }}</span>
                    </td>
                    <!-- Atenciones -->
                    <td class="px-3 py-2.5">
                      <div class="flex gap-1 flex-wrap">
                        @if (m.atencionDomiciliaria) {
                          <span style="padding:1px 5px;border-radius:4px;background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.2);color:var(--accent-cyan);font-family:var(--font-mono);font-size:9px;font-weight:600;">DOM</span>
                        }
                        @if (m.atencionEmergencia) {
                          <span style="padding:1px 5px;border-radius:4px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:var(--accent-red);font-family:var(--font-mono);font-size:9px;font-weight:600;">EMRG</span>
                        }
                        @if (!m.atencionDomiciliaria && !m.atencionEmergencia) {
                          <span style="color:var(--text-muted);font-size:10px;">—</span>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- RIGHT: detail panel -->
        @if (selected(); as m) {
          <div style="width:300px;border-left:1px solid var(--border-glass);flex-shrink:0;display:flex;flex-direction:column;overflow:hidden;">
            <div style="overflow-y:auto;flex:1;">

              <!-- Profile header -->
              <div style="padding:16px;border-bottom:1px solid var(--border-glass);">
                <div style="display:flex;align-items:flex-start;gap:12px;">
                  <div style="width:48px;height:48px;border-radius:50%;background:rgba(59,130,246,0.2);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-weight:700;font-size:15px;color:var(--accent-blue);flex-shrink:0;">
                    {{ m.avatar }}
                  </div>
                  <div style="flex:1;min-width:0;">
                    <div style="font-weight:600;font-size:15px;color:var(--text-primary);">{{ m.nombre }}</div>
                    <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">{{ m.rol }}</div>
                    <div style="margin-top:6px;display:flex;align-items:center;gap:8px;">
                      <span class="badge" [class]="estadoBadge(m.estado)">{{ estadoLabel(m.activo) }}</span>
                      <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);">{{ m.codigo }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Info real del backend -->
              <div style="padding:14px;border-bottom:1px solid var(--border-glass);">
                <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;letter-spacing:0.08em;">Información</div>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  @if (m.email) {
                    <div>
                      <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:2px;">Email</div>
                      <div style="font-size:12px;color:var(--text-primary);">{{ m.email }}</div>
                    </div>
                  }
                  @if (m.especialidad) {
                    <div>
                      <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:2px;">Especialidad</div>
                      <div style="font-size:12px;color:var(--text-primary);">{{ m.especialidad }}</div>
                    </div>
                  }
                  @if (m.empresa) {
                    <div>
                      <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:2px;">Empresa</div>
                      <div style="font-size:12px;color:var(--accent-cyan);">{{ m.empresa.nombre }}</div>
                    </div>
                  }
                </div>
              </div>

              <!-- Tipos de atención -->
              <div style="padding:14px;border-bottom:1px solid var(--border-glass);">
                <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;letter-spacing:0.08em;">Tipos de atención</div>
                <div style="display:flex;flex-direction:column;gap:6px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:8px;background:var(--surface-glass);border:1px solid var(--border-glass);">
                    <span style="font-size:12px;color:var(--text-primary);">Domiciliaria</span>
                    <span style="font-family:var(--font-mono);font-size:10px;" [style.color]="m.atencionDomiciliaria ? 'var(--accent-emerald)' : 'var(--text-muted)'">
                      {{ m.atencionDomiciliaria ? 'SÍ' : 'NO' }}
                    </span>
                  </div>
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:8px;background:var(--surface-glass);border:1px solid var(--border-glass);">
                    <span style="font-size:12px;color:var(--text-primary);">Emergencia</span>
                    <span style="font-family:var(--font-mono);font-size:10px;" [style.color]="m.atencionEmergencia ? 'var(--accent-emerald)' : 'var(--text-muted)'">
                      {{ m.atencionEmergencia ? 'SÍ' : 'NO' }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Sparkline placeholder -->
              <div style="padding:14px;border-bottom:1px solid var(--border-glass);">
                <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;letter-spacing:0.08em;">Carga semanal</div>
                <emx-sparkline [values]="m.cargaSemanal" color="var(--accent-cyan)" [width]="252" [height]="40" />
                <div style="display:flex;justify-content:space-between;font-family:var(--font-mono);font-size:9px;color:var(--text-muted);margin-top:3px;">
                  @for (d of ['L','M','M','J','V','S','D']; track $index) {<span>{{ d }}</span>}
                </div>
              </div>

              <!-- Actions -->
              <div style="padding:14px;display:flex;gap:8px;">
                <button type="button" class="btn btn--primary btn--sm" style="flex:1;justify-content:center;">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 1a2 2 0 0 1 2 2v1a2 2 0 0 1-4 0V3a2 2 0 0 1 2-2zM2 11c0-2.21 1.79-4 4-4s4 1.79 4 4"/></svg>
                  Contactar
                </button>
                <button type="button" class="btn btn--ghost btn--sm" style="flex:1;justify-content:center;">Historial</button>
              </div>

            </div>
          </div>
        }

      </div>
      } <!-- end else -->
    </div>
  `,
})
export class StaffComponent implements OnInit {
  private staffApi = inject(StaffApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly staff = signal<StaffMember[]>([]);

  readonly activeTab = signal<StaffTab>('TODOS');
  readonly search = signal('');
  readonly selected = signal<StaffMember | null>(null);

  readonly tabs: { id: StaffTab; label: string }[] = [
    { id: 'TODOS', label: 'Todos' },
    { id: 'MEDICO', label: 'Médicos' },
    { id: 'PARAMEDICO', label: 'Paramédicos' },
    { id: 'ENFERMERIA', label: 'Enfermería' },
    { id: 'DESPACHO', label: 'Despacho' },
  ];

  ngOnInit(): void {
    this.loading.set(true);
    this.staffApi
      .getProfesionales()
      .pipe(catchError(() => of([])))
      .subscribe(dtos => {
        const members = dtos.map(dtoToMember);
        this.staff.set(members);
        this.selected.set(members[0] ?? null);
        this.loading.set(false);
      });
  }

  readonly headerKpis = computed(() => {
    const all = this.staff();
    const activos = all.filter(m => m.activo).length;
    const medicos = all.filter(m => m.rol.toLowerCase().includes('médic') || m.rol.toLowerCase().includes('medic')).length;
    const dom = all.filter(m => m.atencionDomiciliaria).length;
    return [
      { label: 'Plantilla',    value: all.length, color: 'var(--text-primary)' },
      { label: 'Activos',      value: activos,    color: 'var(--accent-cyan)' },
      { label: 'Médicos',      value: medicos,    color: 'var(--accent-blue)' },
      { label: 'Domiciliaria', value: dom,        color: 'var(--accent-emerald)' },
    ];
  });

  readonly filtered = computed(() => {
    const tab = this.activeTab();
    const q = this.search().toLowerCase();
    const tabMap: Record<StaffTab, string[]> = {
      TODOS: [],
      MEDICO: ['médic', 'medic'],
      PARAMEDICO: ['paramédico', 'paramedico'],
      ENFERMERIA: ['enfermero', 'enfermera'],
      DESPACHO: ['despachador', 'despachadora'],
    };
    return this.staff().filter(m => {
      if (tab !== 'TODOS') {
        const kws = tabMap[tab];
        if (!kws.some(k => m.rol.toLowerCase().includes(k))) return false;
      }
      if (q) {
        return (
          m.nombre.toLowerCase().includes(q) ||
          m.rol.toLowerCase().includes(q) ||
          m.codigo.toLowerCase().includes(q) ||
          (m.email?.toLowerCase().includes(q) ?? false) ||
          (m.empresa?.nombre.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  });

  estadoBadge(e: string): string {
    return e === 'EN_TURNO' ? 'badge--stable' : 'badge--stable';
  }

  estadoLabel(activo?: boolean): string {
    return activo ? 'Activo' : 'Inactivo';
  }
}
