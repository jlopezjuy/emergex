import { Component, OnInit, computed, signal } from '@angular/core';
import { AreaProtegidaDTO } from '../../data-access/dto/hospital.dto';

interface HospitalLocal extends AreaProtegidaDTO {
  codigo: string;
  nivel: string;
}

// Datos locales que coinciden con el mockup
const MOCK_HOSPITALS: HospitalLocal[] = [
  {
    id: 1, codigo: 'H-01', nivel: 'Nivel III',
    nombre: 'Hospital Médica Sur',
    direccion: 'Av. Insurgentes Sur 3877',
    distanciaKm: 4.2, tipo: 'GENERAL',
    especialidades: ['Cardiología', 'Trauma', 'Pediatría', 'UCI'],
    camasLibres: 28, camasTotales: 320, ocupacionUrgencias: 72, tiempoEsperaMin: 12,
    estado: 'DISPONIBLE', enDerivacion: false,
  },
  {
    id: 2, codigo: 'H-02', nivel: 'Nivel III',
    nombre: 'Centro Médico ABC Observatorio',
    direccion: 'Av. Observatorio 192',
    distanciaKm: 6.7, tipo: 'GENERAL',
    especialidades: ['Cardiología', 'UCI', 'Quemados'],
    camasLibres: 14, camasTotales: 280, ocupacionUrgencias: 88, tiempoEsperaMin: 22,
    estado: 'DISPONIBLE', enDerivacion: false,
  },
  {
    id: 3, codigo: 'H-03', nivel: 'Nivel III',
    nombre: 'Hospital General La Raza',
    direccion: 'Calzada Vallejo 290',
    distanciaKm: 9.1, tipo: 'GENERAL',
    especialidades: ['Trauma', 'UCI', 'Cirugía'],
    camasLibres: 6, camasTotales: 540, ocupacionUrgencias: 96, tiempoEsperaMin: 38,
    estado: 'SATURADO', enDerivacion: true,
  },
  {
    id: 4, codigo: 'H-04', nivel: 'Nivel II',
    nombre: 'Hospital Ángeles del Pedregal',
    direccion: 'Camino al Ajusco 24',
    distanciaKm: 3.4, tipo: 'GENERAL',
    especialidades: ['Cardiología', 'Obstetricia', 'Pediatría'],
    camasLibres: 41, camasTotales: 220, ocupacionUrgencias: 55, tiempoEsperaMin: 8,
    estado: 'DISPONIBLE', enDerivacion: false,
  },
  {
    id: 5, codigo: 'H-05', nivel: 'Nivel III',
    nombre: 'Hospital Español',
    direccion: 'Ejercito Nacional 613',
    distanciaKm: 7.8, tipo: 'GENERAL',
    especialidades: ['Neurología', 'Cardiología', 'UCI'],
    camasLibres: 19, camasTotales: 190, ocupacionUrgencias: 61, tiempoEsperaMin: 14,
    estado: 'DISPONIBLE', enDerivacion: false,
  },
  {
    id: 6, codigo: 'H-06', nivel: 'Nivel III',
    nombre: 'Hospital 20 de Noviembre',
    direccion: 'Félix Cuevas 540',
    distanciaKm: 5.6, tipo: 'GENERAL',
    especialidades: ['Trauma', 'Cirugía', 'UCI'],
    camasLibres: 8, camasTotales: 350, ocupacionUrgencias: 79, tiempoEsperaMin: 28,
    estado: 'LIMITADO', enDerivacion: false,
  },
  {
    id: 7, codigo: 'H-07', nivel: 'Nivel II',
    nombre: 'Clínica Pedregal',
    direccion: 'Periférico Sur 4091',
    distanciaKm: 11.2, tipo: 'CLINICA',
    especialidades: ['Cirugía', 'Traumatología'],
    camasLibres: 3, camasTotales: 80, ocupacionUrgencias: 91, tiempoEsperaMin: 45,
    estado: 'LIMITADO', enDerivacion: false,
  },
  {
    id: 8, codigo: 'H-08', nivel: 'Nivel III',
    nombre: 'Hospital Juárez de México',
    direccion: 'Av. Politécnico Nacional 3720',
    distanciaKm: 14.3, tipo: 'GENERAL',
    especialidades: ['Urgencias', 'Maternidad', 'Pediatría', 'Cirugía'],
    camasLibres: 0, camasTotales: 420, ocupacionUrgencias: 100, tiempoEsperaMin: 95,
    estado: 'SATURADO', enDerivacion: true,
  },
];

type StatusFilter = 'TODOS' | 'DISPONIBLE' | 'LIMITADO' | 'SATURADO';

@Component({
  selector: 'app-hospitals',
  standalone: true,
  imports: [],
  template: `
    <div style="display:flex; flex-direction:column; height:100%; overflow:hidden; background:var(--bg-deep);">

      <!-- Page header -->
      <div style="padding:24px 24px 0; flex-shrink:0;">

        <!-- Title + stats bar -->
        <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; gap:12px; flex-wrap:wrap;">
          <div>
            <h1 style="font-size:18px; font-weight:600; color:var(--text-primary); margin:0 0 2px;">Red Hospitalaria</h1>
            <p style="font-size:11px; font-family:var(--font-mono); color:var(--text-muted); margin:0;">CONVENIOS · CAPACIDAD EN TIEMPO REAL</p>
          </div>
          <!-- Aggregate stats -->
          <div style="display:flex; align-items:center; gap:0; border-radius:10px; overflow:hidden; border:1px solid var(--border-glass); background:var(--bg-elevated);">
            @for (stat of aggregateStats(); track stat.label) {
              <div style="padding:10px 20px; text-align:center; border-right:1px solid var(--border-glass);"
                [style.borderRight]="$last ? 'none' : '1px solid var(--border-glass)'">
                <div style="font-size:10px; font-family:var(--font-mono); color:var(--text-muted); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:4px;">{{ stat.label }}</div>
                <div style="font-size:18px; font-weight:700; font-family:var(--font-mono);"
                  [style.color]="stat.color ?? 'var(--text-primary)'">{{ stat.value }}</div>
              </div>
            }
          </div>
          <button type="button" class="btn btn--ghost btn--sm">Actualizar capacidades</button>
        </div>

        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:8px;">
          <!-- dummy for search/filter row alignment -->
          <div style="flex:1; min-width:0;"></div>

          <!-- Search -->
          <div style="position:relative; width:220px;">
            <svg
              style="position:absolute; left:10px; top:50%; transform:translateY(-50%); pointer-events:none;"
              width="14" height="14" viewBox="0 0 16 16" fill="none"
              stroke="var(--text-muted)" stroke-width="1.5"
            >
              <circle cx="7" cy="7" r="5"/>
              <path d="M11 11l3 3"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar hospital..."
              [value]="searchQuery()"
              (input)="searchQuery.set($any($event.target).value)"
              style="width:100%; box-sizing:border-box; padding:7px 10px 7px 32px; border-radius:8px; border:1px solid var(--border-glass); background:var(--surface-glass); color:var(--text-primary); font-size:12px; outline:none; font-family:inherit;"
            />
          </div>

          <!-- Status filter -->
          <div style="display:flex; gap:4px;">
            @for (opt of filterOptions; track opt.value) {
              <button
                type="button"
                (click)="statusFilter.set(opt.value)"
                [style.background]="statusFilter() === opt.value ? 'rgba(59,130,246,0.15)' : 'transparent'"
                [style.color]="statusFilter() === opt.value ? 'var(--accent-blue)' : 'var(--text-muted)'"
                [style.borderColor]="statusFilter() === opt.value ? 'rgba(59,130,246,0.4)' : 'var(--border-glass)'"
                style="padding:5px 12px; font-size:11px; font-family:var(--font-mono); border-radius:6px; border:1px solid; cursor:pointer; text-transform:uppercase; letter-spacing:0.08em; transition:all 0.15s;"
              >{{ opt.label }}</button>
            }
          </div>
        </div>
        <!-- end search/filter row -->

        <!-- Loading / error bar -->
        @if (loading()) {
          <div style="height:2px; background:var(--accent-blue); border-radius:2px; margin-top:12px; opacity:0.7; animation:pulse 1.5s ease-in-out infinite;"></div>
        }
        @if (error()) {
          <div style="margin-top:10px; padding:8px 12px; border-radius:6px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); font-size:11px; font-family:var(--font-mono); color:var(--accent-red);">
            {{ error() }} — mostrando datos de desarrollo
          </div>
        }

        <!-- Divider -->
        <div style="height:1px; background:var(--border-hairline); margin-top:16px;"></div>
      </div>

      <!-- Scrollable grid -->
      <div style="flex:1; overflow-y:auto; padding:20px 24px 24px;">
        @if (filtered().length === 0 && !loading()) {
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:200px; color:var(--text-muted); font-size:13px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="margin-bottom:12px; opacity:0.4;">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            Sin resultados para los filtros aplicados
          </div>
        }

        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:16px;">
          @for (h of filtered(); track h.id) {
            <div
              class="glass rounded-panel"
              style="padding:18px; display:flex; flex-direction:column; gap:12px; transition:border-color 0.2s;"
              [style.borderColor]="h.enDerivacion ? 'rgba(245,158,11,0.35)' : 'var(--border-glass)'"
            >
              <!-- Card header row: icon + name + status badge at right -->
              <div style="display:flex; align-items:flex-start; gap:10px;">
                <!-- Hospital icon -->
                <div style="width:32px;height:32px;border-radius:8px;background:rgba(59,130,246,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--accent-blue)" stroke-width="1.5">
                    <rect x="1" y="4" width="14" height="11" rx="1"/><path d="M5 15V9h6v6M8 1v4M6 3h4"/>
                  </svg>
                </div>
                <!-- Name + meta -->
                <div style="flex:1;min-width:0;">
                  <h2 style="font-size:14px;font-weight:600;color:var(--text-primary);margin:0 0 3px;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">{{ h.nombre }}</h2>
                  <p style="font-size:10px;color:var(--text-muted);margin:0;font-family:var(--font-mono);">
                    {{ asLocal(h).codigo ?? '' }}{{ asLocal(h).nivel ? ' · ' + asLocal(h).nivel : '' }}{{ h.distanciaKm != null ? ' · ' + h.distanciaKm + ' km' : '' }}
                  </p>
                </div>
                <!-- Status badge -->
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
                  <span class="badge"
                    [class.badge--stable]="h.estado === 'DISPONIBLE'"
                    [class.badge--urgent]="h.estado === 'LIMITADO'"
                    [class.badge--critical]="h.estado === 'SATURADO'"
                  >{{ estadoLabel(h.estado) }}</span>
                  @if (h.enDerivacion) {
                    <span style="display:inline-flex;align-items:center;gap:3px;font-size:9px;font-family:var(--font-mono);text-transform:uppercase;padding:2px 6px;border-radius:99px;background:rgba(245,158,11,0.15);color:var(--accent-amber);border:1px solid rgba(245,158,11,0.3);">
                      <span style="width:4px;height:4px;border-radius:50%;background:var(--accent-amber);"></span>
                      DESVÍO ACTIVO
                    </span>
                  }
                </div>
              </div>

              <!-- Stats: 3 columns -->
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                <div>
                  <div style="font-size:9px;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Camas libres</div>
                  <div style="font-size:16px;font-weight:700;font-family:var(--font-mono);" [style.color]="barColor(camasPct(h))">
                    {{ h.camasLibres ?? '—' }}<span style="font-size:11px;font-weight:400;color:var(--text-muted);"> / {{ h.camasTotales ?? '—' }}</span>
                  </div>
                  <div style="height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;margin-top:5px;">
                    <div [style.width.%]="camasPct(h)" [style.background]="barColor(camasPct(h))" style="height:100%;border-radius:2px;"></div>
                  </div>
                </div>
                <div>
                  <div style="font-size:9px;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Urgencias · Ocup.</div>
                  <div style="font-size:16px;font-weight:700;font-family:var(--font-mono);" [style.color]="urgenciasColor(h.ocupacionUrgencias ?? 0)">
                    {{ h.ocupacionUrgencias ?? 0 }}%
                  </div>
                  <div style="height:3px;background:rgba(255,255,255,0.06);border-radius:2px;overflow:hidden;margin-top:5px;">
                    <div [style.width.%]="h.ocupacionUrgencias ?? 0" [style.background]="urgenciasColor(h.ocupacionUrgencias ?? 0)" style="height:100%;border-radius:2px;"></div>
                  </div>
                </div>
                <div>
                  <div style="font-size:9px;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">Espera estimada</div>
                  <div style="font-size:16px;font-weight:700;font-family:var(--font-mono);" [style.color]="esperaColor(h.tiempoEsperaMin ?? 0)">
                    {{ h.tiempoEsperaMin ?? '—' }}<span style="font-size:11px;font-weight:400;color:var(--text-muted);"> min</span>
                  </div>
                  <div style="height:3px;background:rgba(255,255,255,0.06);border-radius:2px;margin-top:5px;"></div>
                </div>
              </div>

              <!-- Specialty chips -->
              @if (h.especialidades?.length) {
                <div>
                  <div style="font-size:9px;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Especialidades</div>
                  <div style="display:flex;flex-wrap:wrap;gap:4px;">
                    @for (esp of h.especialidades; track esp) {
                      <span style="font-size:10px;font-family:var(--font-mono);padding:2px 7px;border-radius:4px;background:rgba(59,130,246,0.1);color:var(--accent-blue);border:1px solid rgba(59,130,246,0.2);">{{ esp }}</span>
                    }
                  </div>
                </div>
              }

              <!-- Actions -->
              <div style="display:flex;gap:8px;padding-top:2px;border-top:1px solid var(--border-hairline);">
                <button type="button" class="btn btn--ghost btn--sm" style="flex:1;justify-content:center;">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 1a2 2 0 0 1 2 2v1a2 2 0 0 1-4 0V3a2 2 0 0 1 2-2zM2 11c0-2.21 1.79-4 4-4s4 1.79 4 4"/></svg>
                  Pre-aviso
                </button>
                <button type="button" class="btn btn--primary btn--sm" style="flex:1;justify-content:center;"
                  [style.opacity]="h.estado === 'SATURADO' ? '0.4' : '1'"
                  [disabled]="h.estado === 'SATURADO'"
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6h8M7 3l3 3-3 3"/></svg>
                  Derivar
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class HospitalsComponent implements OnInit {

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hospitals = signal<HospitalLocal[]>(MOCK_HOSPITALS);

  readonly searchQuery = signal('');
  readonly statusFilter = signal<StatusFilter>('TODOS');

  readonly filterOptions: { label: string; value: StatusFilter }[] = [
    { label: 'Todos', value: 'TODOS' },
    { label: 'Disponibles', value: 'DISPONIBLE' },
    { label: 'Limitados', value: 'LIMITADO' },
    { label: 'Saturados', value: 'SATURADO' },
  ];

  readonly aggregateStats = computed(() => {
    const all = this.hospitals();
    const camasLibres = all.reduce((s, h) => s + (h.camasLibres ?? 0), 0);
    const enDesvio = all.filter(h => h.enDerivacion).length;
    const espera = all.length
      ? Math.round(all.reduce((s, h) => s + (h.tiempoEsperaMin ?? 0), 0) / all.length)
      : 0;
    return [
      { label: 'Hospitales',  value: all.length,             color: 'var(--text-primary)' },
      { label: 'Camas libres', value: camasLibres,            color: 'var(--accent-emerald)' },
      { label: 'En desvío',   value: enDesvio,               color: enDesvio > 0 ? 'var(--accent-amber)' : 'var(--text-primary)' },
      { label: 'Espera med.', value: espera + ' min',        color: 'var(--text-primary)' },
    ];
  });

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const st = this.statusFilter();

    return this.hospitals().filter(h => {
      const matchesStatus = st === 'TODOS' || h.estado === st;
      const matchesSearch =
        !q ||
        h.nombre.toLowerCase().includes(q) ||
        (h.especialidades ?? []).some(e => e.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  });

  ngOnInit(): void {
    // Hospitals uses local data — backend data is not yet in the right shape
  }

  asLocal(h: AreaProtegidaDTO): Partial<HospitalLocal> {
    return h as HospitalLocal;
  }

  estadoLabel(estado?: string): string {
    switch (estado) {
      case 'DISPONIBLE': return 'Disponible';
      case 'LIMITADO':   return 'Limitado';
      case 'SATURADO':   return 'Saturado';
      default:           return estado ?? '—';
    }
  }

  camasPct(h: AreaProtegidaDTO): number {
    if (!h.camasTotales) return 0;
    return ((h.camasLibres ?? 0) / h.camasTotales) * 100;
  }

  barColor(pct: number): string {
    if (pct >= 40) return 'var(--accent-emerald)';
    if (pct >= 20) return 'var(--accent-amber)';
    return 'var(--accent-red)';
  }

  urgenciasColor(pct: number): string {
    if (pct <= 60) return 'var(--accent-emerald)';
    if (pct <= 80) return 'var(--accent-amber)';
    return 'var(--accent-red)';
  }

  esperaColor(min: number): string {
    if (min >= 60) return 'var(--accent-red)';
    if (min >= 30) return 'var(--accent-amber)';
    return 'var(--accent-emerald)';
  }
}
