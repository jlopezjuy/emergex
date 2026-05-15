import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { HospitalApiService } from '../../data-access/api/hospital.api';
import { AreaProtegidaDTO } from '../../data-access/dto/hospital.dto';

// Fallback de desarrollo — se usa si el backend no responde
const MOCK_HOSPITALS: AreaProtegidaDTO[] = [
  {
    id: 1,
    nombre: 'Hospital General de Agudos J.A. Fernández',
    direccion: 'Av. Cerviño 3356 · CABA',
    distanciaKm: 2.4,
    tipo: 'GENERAL',
    especialidades: ['Trauma', 'Cardiología', 'Urgencias', 'UCI'],
    camasLibres: 12,
    camasTotales: 40,
    ocupacionUrgencias: 65,
    tiempoEsperaMin: 18,
    estado: 'DISPONIBLE',
    enDerivacion: false,
  },
  {
    id: 2,
    nombre: 'Clínica San Martín',
    direccion: 'Av. Santa Fe 3000 · CABA',
    distanciaKm: 4.1,
    tipo: 'CLINICA',
    especialidades: ['Urgencias', 'Neurología', 'Cirugía'],
    camasLibres: 3,
    camasTotales: 28,
    ocupacionUrgencias: 88,
    tiempoEsperaMin: 42,
    estado: 'LIMITADO',
    enDerivacion: false,
  },
  {
    id: 3,
    nombre: 'Hospital Pediátrico Juan P. Garrahan',
    direccion: 'Combate de los Pozos 1881 · CABA',
    distanciaKm: 5.8,
    tipo: 'PEDIATRICO',
    especialidades: ['Pediatría', 'Neonatología', 'Oncología', 'Cardiología Pediátrica'],
    camasLibres: 0,
    camasTotales: 56,
    ocupacionUrgencias: 97,
    tiempoEsperaMin: 90,
    estado: 'SATURADO',
    enDerivacion: true,
  },
  {
    id: 4,
    nombre: 'Instituto Cardiovascular del Sur',
    direccion: 'Av. Juan B. Justo 4200 · CABA',
    distanciaKm: 7.2,
    tipo: 'ESPECIALIZADO',
    especialidades: ['Cardiología', 'Hemodinamia', 'UCI Cardiovascular'],
    camasLibres: 8,
    camasTotales: 22,
    ocupacionUrgencias: 48,
    tiempoEsperaMin: 12,
    estado: 'DISPONIBLE',
    enDerivacion: false,
  },
  {
    id: 5,
    nombre: 'Sanatorio Norte',
    direccion: 'Gral. Paz 1200 · GBA Norte',
    distanciaKm: 9.0,
    tipo: 'SANATORIO',
    especialidades: ['Cirugía', 'Traumatología'],
    camasLibres: 0,
    camasTotales: 18,
    ocupacionUrgencias: 100,
    tiempoEsperaMin: 120,
    estado: 'SATURADO',
    enDerivacion: true,
  },
  {
    id: 6,
    nombre: 'Hospital Británico de Buenos Aires',
    direccion: 'Perdriel 74 · CABA',
    distanciaKm: 3.6,
    tipo: 'GENERAL',
    especialidades: ['Urgencias', 'Trauma', 'UCI', 'Neurología', 'Cardiología'],
    camasLibres: 18,
    camasTotales: 65,
    ocupacionUrgencias: 54,
    tiempoEsperaMin: 15,
    estado: 'DISPONIBLE',
    enDerivacion: false,
  },
  {
    id: 7,
    nombre: 'FLENI',
    direccion: 'Montañeses 2325 · CABA',
    distanciaKm: 6.1,
    tipo: 'ESPECIALIZADO',
    especialidades: ['Neurología', 'Neurocirugía', 'Rehabilitación'],
    camasLibres: 5,
    camasTotales: 30,
    ocupacionUrgencias: 72,
    tiempoEsperaMin: 30,
    estado: 'DISPONIBLE',
    enDerivacion: false,
  },
  {
    id: 8,
    nombre: 'Hospital Álvarez',
    direccion: 'Av. Aranguren 2701 · CABA',
    distanciaKm: 8.4,
    tipo: 'GENERAL',
    especialidades: ['Urgencias', 'Maternidad', 'Pediatría', 'Cirugía'],
    camasLibres: 7,
    camasTotales: 48,
    ocupacionUrgencias: 81,
    tiempoEsperaMin: 35,
    estado: 'LIMITADO',
    enDerivacion: false,
  },
];

type StatusFilter = 'TODOS' | 'DISPONIBLE' | 'LIMITADO' | 'SATURADO';

@Component({
  selector: 'app-hospitals',
  standalone: true,
  imports: [FormsModule],
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
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
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

        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(380px, 1fr)); gap:16px;">
          @for (h of filtered(); track h.id) {
            <div
              class="glass rounded-panel"
              style="padding:18px; display:flex; flex-direction:column; gap:14px; transition:border-color 0.2s;"
              [style.borderColor]="h.enDerivacion ? 'rgba(245,158,11,0.35)' : 'var(--border-glass)'"
            >
              <!-- Card top row: tipo badge + derivación tag -->
              <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                <span
                  class="eyebrow"
                  style="padding:3px 8px; border-radius:4px; background:rgba(255,255,255,0.06); color:var(--text-secondary);"
                >{{ h.tipo ?? h.nivel ?? '—' }}</span>

                <span
                  class="badge"
                  [class.badge--stable]="h.estado === 'DISPONIBLE'"
                  [class.badge--urgent]="h.estado === 'LIMITADO'"
                  [class.badge--critical]="h.estado === 'SATURADO'"
                >{{ h.estado }}</span>

                @if (h.enDerivacion) {
                  <span style="display:inline-flex; align-items:center; gap:4px; font-size:9px; font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.1em; padding:3px 7px; border-radius:99px; background:rgba(245,158,11,0.15); color:var(--accent-amber); border:1px solid rgba(245,158,11,0.3);">
                    <span style="width:5px;height:5px;border-radius:50%;background:var(--accent-amber);" class="animate-pulse"></span>
                    DERIVACIÓN ACTIVA
                  </span>
                }
              </div>

              <!-- Hospital name & address -->
              <div>
                <h2 style="font-size:14px; font-weight:600; color:var(--text-primary); margin:0 0 3px; line-height:1.3;">
                  {{ h.nombre }}
                </h2>
                <p style="font-size:11px; color:var(--text-muted); margin:0; font-family:var(--font-mono);">
                  {{ h.direccion ?? '—' }}
                </p>
              </div>

              <!-- Specialty chips -->
              @if (h.especialidades && h.especialidades.length > 0) {
                <div style="display:flex; flex-wrap:wrap; gap:5px;">
                  @for (esp of h.especialidades; track esp) {
                    <span style="font-size:10px; font-family:var(--font-mono); padding:2px 7px; border-radius:99px; background:rgba(34,211,238,0.1); color:var(--accent-cyan); border:1px solid rgba(34,211,238,0.2);">{{ esp }}</span>
                  }
                </div>
              }

              <!-- Divider -->
              <div style="height:1px; background:var(--border-hairline);"></div>

              <!-- Capacity section -->
              <div style="display:flex; flex-direction:column; gap:10px;">
                <!-- Camas disponibles -->
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <span style="font-size:11px; color:var(--text-secondary);">Camas disponibles</span>
                    <span style="font-size:11px; font-family:var(--font-mono);"
                      [style.color]="barColor(camasPct(h))">
                      {{ h.camasLibres ?? '—' }} / {{ h.camasTotales ?? '—' }}
                    </span>
                  </div>
                  <div style="height:4px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden;">
                    <div
                      [style.width.%]="camasPct(h)"
                      [style.background]="barColor(camasPct(h))"
                      style="height:100%; border-radius:2px; transition:width 0.3s;"
                    ></div>
                  </div>
                </div>

                <!-- Urgencias -->
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <span style="font-size:11px; color:var(--text-secondary);">Urgencias</span>
                    <span style="font-size:11px; font-family:var(--font-mono);"
                      [style.color]="urgenciasColor(h.ocupacionUrgencias ?? 0)">
                      {{ h.ocupacionUrgencias ?? 0 }}%
                    </span>
                  </div>
                  <div style="height:4px; background:rgba(255,255,255,0.06); border-radius:2px; overflow:hidden;">
                    <div
                      [style.width.%]="h.ocupacionUrgencias ?? 0"
                      [style.background]="urgenciasColor(h.ocupacionUrgencias ?? 0)"
                      style="height:100%; border-radius:2px; transition:width 0.3s;"
                    ></div>
                  </div>
                </div>

                <!-- Espera -->
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <span style="font-size:11px; color:var(--text-secondary);">Espera promedio</span>
                  <span style="font-size:11px; font-family:var(--font-mono);"
                    [style.color]="esperaColor(h.tiempoEsperaMin ?? 0)">
                    {{ h.tiempoEsperaMin ?? '—' }} min
                  </span>
                </div>
              </div>

              <!-- Divider -->
              <div style="height:1px; background:var(--border-hairline);"></div>

              <!-- Footer: distance + actions -->
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <span style="font-size:12px; font-family:var(--font-mono); color:var(--text-muted);">
                  {{ h.distanciaKm != null ? (h.distanciaKm + ' km') : '—' }}
                </span>
                <div style="display:flex; gap:8px;">
                  <button type="button" class="btn btn--ghost btn--sm">
                    Pre-aviso
                  </button>
                  <button
                    type="button"
                    class="btn btn--primary btn--sm"
                    style="background:var(--accent-blue); border-color:var(--accent-blue);"
                    [style.opacity]="h.estado === 'SATURADO' ? '0.4' : '1'"
                    [style.cursor]="h.estado === 'SATURADO' ? 'not-allowed' : 'pointer'"
                    [disabled]="h.estado === 'SATURADO'"
                  >
                    Derivar →
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class HospitalsComponent implements OnInit {
  private api = inject(HospitalApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hospitals = signal<AreaProtegidaDTO[]>([]);

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
    this.loading.set(true);
    this.api
      .getAll()
      .pipe(catchError(() => {
        this.error.set('No se pudo conectar al backend');
        return of(MOCK_HOSPITALS);
      }))
      .subscribe(data => {
        this.hospitals.set(data);
        this.loading.set(false);
      });
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
