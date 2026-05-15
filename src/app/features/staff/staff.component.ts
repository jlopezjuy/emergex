import { Component, signal, computed } from '@angular/core';
import { SparklineComponent } from '../../shared/components/charts/sparkline/sparkline.component';

interface Cert { nombre: string; vigente: boolean; anio: number }
interface StaffMember {
  id: number;
  codigo: string;
  nombre: string;
  rol: string;
  unidad: string;
  estado: 'EN_TURNO' | 'EN_RUTA' | 'EN_SITIO' | 'TRASLADO' | 'LIBRE';
  certs: string[];
  certsDetalle: Cert[];
  exp: number;
  avatar: string;
  turno: string;
  serviciosHoy: number;
  serviciosMes: number;
  horasSemana: number;
  rendimiento: number;
  cargaSemanal: number[];
}

const STAFF: StaffMember[] = [
  {
    id: 1, codigo: 'P-004', nombre: 'Dr. Mariana Soto', rol: 'Médico ALS', unidad: 'U-04',
    estado: 'EN_TURNO', avatar: 'MS', exp: 12, turno: '06:00 → 18:00',
    serviciosHoy: 4, serviciosMes: 87, horasSemana: 48, rendimiento: 96,
    certs: ['ACLS', 'PALS', 'BLS'],
    certsDetalle: [
      { nombre: 'ACLS', vigente: true, anio: 2027 },
      { nombre: 'PALS', vigente: true, anio: 2027 },
      { nombre: 'BLS',  vigente: true, anio: 2027 },
    ],
    cargaSemanal: [6, 10, 8, 12, 10, 8, 6],
  },
  {
    id: 2, codigo: 'P-007', nombre: 'Lic. Pablo Lara', rol: 'Paramédico', unidad: 'U-07',
    estado: 'EN_RUTA', avatar: 'PL', exp: 8, turno: '06:00 → 18:00',
    serviciosHoy: 2, serviciosMes: 61, horasSemana: 44, rendimiento: 91,
    certs: ['ACLS', 'BLS'],
    certsDetalle: [
      { nombre: 'ACLS', vigente: true, anio: 2026 },
      { nombre: 'BLS',  vigente: true, anio: 2027 },
    ],
    cargaSemanal: [8, 6, 10, 8, 10, 6, 8],
  },
  {
    id: 3, codigo: 'P-009', nombre: 'Dr. Andrea Mora', rol: 'Médico ALS', unidad: 'U-09',
    estado: 'EN_TURNO', avatar: 'AM', exp: 14, turno: '07:00 → 19:00',
    serviciosHoy: 5, serviciosMes: 102, horasSemana: 50, rendimiento: 98,
    certs: ['ACLS', 'BLS'],
    certsDetalle: [
      { nombre: 'ACLS', vigente: true, anio: 2027 },
      { nombre: 'BLS',  vigente: true, anio: 2026 },
    ],
    cargaSemanal: [10, 12, 8, 10, 12, 8, 6],
  },
  {
    id: 4, codigo: 'P-012', nombre: 'Enf. Tomás Ortega', rol: 'Enfermero', unidad: 'U-12',
    estado: 'EN_SITIO', avatar: 'TO', exp: 6, turno: '06:00 → 18:00',
    serviciosHoy: 3, serviciosMes: 55, horasSemana: 40, rendimiento: 88,
    certs: ['ACLS', 'BLS', 'NRP'],
    certsDetalle: [
      { nombre: 'ACLS', vigente: true, anio: 2026 },
      { nombre: 'BLS',  vigente: true, anio: 2027 },
      { nombre: 'NRP',  vigente: true, anio: 2025 },
    ],
    cargaSemanal: [8, 8, 6, 10, 8, 8, 6],
  },
  {
    id: 5, codigo: 'P-014', nombre: 'Dra. Sofía Bello', rol: 'Médico ALS', unidad: 'U-14',
    estado: 'EN_TURNO', avatar: 'SB', exp: 19, turno: '06:00 → 18:00',
    serviciosHoy: 6, serviciosMes: 118, horasSemana: 52, rendimiento: 99,
    certs: ['ACLS', 'PALS', 'BLS', 'ATLS'],
    certsDetalle: [
      { nombre: 'ACLS', vigente: true, anio: 2027 },
      { nombre: 'PALS', vigente: true, anio: 2026 },
      { nombre: 'BLS',  vigente: true, anio: 2027 },
      { nombre: 'ATLS', vigente: true, anio: 2026 },
    ],
    cargaSemanal: [10, 12, 10, 12, 10, 8, 10],
  },
  {
    id: 6, codigo: 'P-018', nombre: 'Lic. Roberto Téllez', rol: 'Paramédico', unidad: 'U-18',
    estado: 'TRASLADO', avatar: 'RT', exp: 5, turno: '07:00 → 19:00',
    serviciosHoy: 3, serviciosMes: 48, horasSemana: 42, rendimiento: 85,
    certs: ['ACLS', 'BLS'],
    certsDetalle: [
      { nombre: 'ACLS', vigente: true, anio: 2026 },
      { nombre: 'BLS',  vigente: true, anio: 2026 },
    ],
    cargaSemanal: [6, 8, 6, 10, 8, 6, 8],
  },
  {
    id: 7, codigo: 'P-021', nombre: 'Enf. Camila Gil', rol: 'Enfermera', unidad: 'U-21',
    estado: 'EN_TURNO', avatar: 'CG', exp: 3, turno: '06:00 → 18:00',
    serviciosHoy: 2, serviciosMes: 35, horasSemana: 36, rendimiento: 82,
    certs: ['BLS'],
    certsDetalle: [{ nombre: 'BLS', vigente: true, anio: 2026 }],
    cargaSemanal: [6, 6, 8, 6, 8, 6, 6],
  },
  {
    id: 8, codigo: 'P-022', nombre: 'Lic. Daniel Aro', rol: 'Paramédico', unidad: 'U-22',
    estado: 'EN_SITIO', avatar: 'DA', exp: 7, turno: '07:00 → 19:00',
    serviciosHoy: 4, serviciosMes: 72, horasSemana: 46, rendimiento: 93,
    certs: ['ACLS', 'BLS'],
    certsDetalle: [
      { nombre: 'ACLS', vigente: true, anio: 2027 },
      { nombre: 'BLS',  vigente: true, anio: 2026 },
    ],
    cargaSemanal: [8, 10, 8, 10, 8, 8, 6],
  },
  {
    id: 9, codigo: 'P-025', nombre: 'Dr. Ignacio Pino', rol: 'Médico ALS', unidad: 'U-25',
    estado: 'EN_TURNO', avatar: 'IP', exp: 11, turno: '06:00 → 18:00',
    serviciosHoy: 5, serviciosMes: 94, horasSemana: 48, rendimiento: 95,
    certs: ['ACLS', 'BLS'],
    certsDetalle: [
      { nombre: 'ACLS', vigente: true, anio: 2027 },
      { nombre: 'BLS',  vigente: true, anio: 2026 },
    ],
    cargaSemanal: [8, 10, 10, 8, 10, 8, 8],
  },
  {
    id: 10, codigo: 'P-030', nombre: 'Lic. Sandra Vega', rol: 'Despachadora', unidad: '—',
    estado: 'EN_TURNO', avatar: 'SV', exp: 6, turno: '06:00 → 18:00',
    serviciosHoy: 0, serviciosMes: 0, horasSemana: 40, rendimiento: 97,
    certs: ['EMD'],
    certsDetalle: [{ nombre: 'EMD', vigente: true, anio: 2027 }],
    cargaSemanal: [8, 8, 8, 8, 8, 0, 0],
  },
  {
    id: 11, codigo: 'P-031', nombre: 'Lic. Fernanda Cruz', rol: 'Despachadora', unidad: '—',
    estado: 'EN_TURNO', avatar: 'FC', exp: 4, turno: '18:00 → 06:00',
    serviciosHoy: 0, serviciosMes: 0, horasSemana: 40, rendimiento: 94,
    certs: ['EMD'],
    certsDetalle: [{ nombre: 'EMD', vigente: true, anio: 2026 }],
    cargaSemanal: [0, 0, 8, 8, 8, 8, 8],
  },
];

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
              <input type="text" placeholder="Buscar nombre o ID..."
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
                  <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color:var(--text-muted);">Rol</th>
                  <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color:var(--text-muted);">Unidad</th>
                  <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color:var(--text-muted);">Estado</th>
                  <th class="text-left px-3 py-2 font-semibold uppercase tracking-wider" style="color:var(--text-muted);">Certificaciones</th>
                  <th class="text-right px-3 py-2 font-semibold uppercase tracking-wider" style="color:var(--text-muted);">Exp.</th>
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
                    <!-- Rol -->
                    <td class="px-3 py-2.5" style="color:var(--text-secondary);">{{ m.rol }}</td>
                    <!-- Unidad -->
                    <td class="px-3 py-2.5 font-mono font-semibold" style="color:var(--accent-cyan);">{{ m.unidad }}</td>
                    <!-- Estado -->
                    <td class="px-3 py-2.5">
                      <span class="badge" [class]="estadoBadge(m.estado)">{{ estadoLabel(m.estado) }}</span>
                    </td>
                    <!-- Certs -->
                    <td class="px-3 py-2.5">
                      <div class="flex flex-wrap gap-1">
                        @for (c of m.certs; track c) {
                          <span style="padding:1px 5px;border-radius:4px;background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.2);color:var(--accent-cyan);font-family:var(--font-mono);font-size:9px;font-weight:600;">{{ c }}</span>
                        }
                      </div>
                    </td>
                    <!-- Exp -->
                    <td class="px-3 py-2.5 text-right font-mono" style="color:var(--text-muted);">{{ m.exp }}a</td>
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
                    <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">{{ m.rol }} · {{ m.exp }} años</div>
                    <div style="margin-top:6px;display:flex;align-items:center;gap:8px;">
                      <span class="badge" [class]="estadoBadge(m.estado)">{{ estadoLabel(m.estado) }}</span>
                      <span style="font-family:var(--font-mono);font-size:10px;color:var(--text-muted);">{{ m.codigo }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Stats grid -->
              <div style="padding:14px;border-bottom:1px solid var(--border-glass);">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                  <div>
                    <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:3px;">Unidad asignada</div>
                    <div style="font-family:var(--font-mono);font-size:13px;font-weight:600;color:var(--accent-cyan);">{{ m.unidad }}</div>
                  </div>
                  <div>
                    <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:3px;">Turno</div>
                    <div style="font-family:var(--font-mono);font-size:12px;color:var(--text-primary);">{{ m.turno }}</div>
                  </div>
                  <div>
                    <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:3px;">Servicios hoy</div>
                    <div style="font-family:var(--font-mono);font-size:13px;font-weight:600;color:var(--text-primary);">{{ m.serviciosHoy }}</div>
                  </div>
                  <div>
                    <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:3px;">Servicios mes</div>
                    <div style="font-family:var(--font-mono);font-size:13px;color:var(--text-primary);">{{ m.serviciosMes }}</div>
                  </div>
                  <div>
                    <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:3px;">Horas semana</div>
                    <div style="font-family:var(--font-mono);font-size:13px;color:var(--text-primary);">{{ m.horasSemana }} h</div>
                  </div>
                  <div>
                    <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:3px;">Rendimiento</div>
                    <div style="font-family:var(--font-mono);font-size:13px;font-weight:600;" style="color:var(--accent-emerald);">{{ m.rendimiento }}%</div>
                  </div>
                </div>
              </div>

              <!-- Certificaciones -->
              <div style="padding:14px;border-bottom:1px solid var(--border-glass);">
                <div style="font-family:var(--font-mono);font-size:9px;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;letter-spacing:0.08em;">Certificaciones vigentes</div>
                @for (cert of m.certsDetalle; track cert.nombre) {
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;border-radius:8px;background:var(--surface-glass);border:1px solid var(--border-glass);margin-bottom:5px;">
                    <span style="font-weight:600;font-size:12px;color:var(--text-primary);">{{ cert.nombre }}</span>
                    <span style="font-family:var(--font-mono);font-size:10px;" [style.color]="cert.vigente ? 'var(--accent-emerald)' : 'var(--accent-red)'">
                      {{ cert.vigente ? 'VIGENTE · ' + cert.anio : 'VENCIDA · ' + cert.anio }}
                    </span>
                  </div>
                }
              </div>

              <!-- Sparkline -->
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
    </div>
  `,
})
export class StaffComponent {
  readonly activeTab = signal<StaffTab>('TODOS');
  readonly search = signal('');
  readonly selected = signal<StaffMember | null>(STAFF[0]);

  readonly tabs: { id: StaffTab; label: string }[] = [
    { id: 'TODOS', label: 'Todos' },
    { id: 'MEDICO', label: 'Médicos' },
    { id: 'PARAMEDICO', label: 'Paramédicos' },
    { id: 'ENFERMERIA', label: 'Enfermería' },
    { id: 'DESPACHO', label: 'Despacho' },
  ];

  readonly headerKpis = computed(() => {
    const all = STAFF;
    const enTurno = all.filter(m => m.estado !== 'LIBRE').length;
    const medicos = all.filter(m => m.rol.toLowerCase().includes('médico')).length;
    const paramedicos = all.filter(m => m.rol.toLowerCase().includes('paramédico')).length;
    return [
      { label: 'Plantilla', value: all.length, color: 'var(--text-primary)' },
      { label: 'En turno',  value: enTurno,    color: 'var(--accent-cyan)' },
      { label: 'Médicos',   value: medicos,     color: 'var(--accent-blue)' },
      { label: 'Paramédicos', value: paramedicos, color: 'var(--accent-emerald)' },
    ];
  });

  readonly filtered = computed(() => {
    const tab = this.activeTab();
    const q = this.search().toLowerCase();
    const tabMap: Record<StaffTab, string[]> = {
      TODOS: [],
      MEDICO: ['médico'],
      PARAMEDICO: ['paramédico'],
      ENFERMERIA: ['enfermero', 'enfermera'],
      DESPACHO: ['despachador', 'despachadora'],
    };
    return STAFF.filter(m => {
      if (tab !== 'TODOS') {
        const kws = tabMap[tab];
        if (!kws.some(k => m.rol.toLowerCase().includes(k))) return false;
      }
      if (q) return m.nombre.toLowerCase().includes(q) || m.rol.toLowerCase().includes(q) || m.codigo.toLowerCase().includes(q);
      return true;
    });
  });

  estadoBadge(e: string): string {
    switch (e) {
      case 'EN_TURNO':  return 'badge--stable';
      case 'EN_RUTA':   return 'badge--info';
      case 'EN_SITIO':  return 'badge--urgent';
      case 'TRASLADO':  return 'badge--cyan';
      default:          return 'badge--stable';
    }
  }

  estadoLabel(e: string): string {
    switch (e) {
      case 'EN_TURNO':  return 'En turno';
      case 'EN_RUTA':   return 'En ruta';
      case 'EN_SITIO':  return 'En sitio';
      case 'TRASLADO':  return 'Traslado';
      default:          return 'Libre';
    }
  }
}
