import { Component, input, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { InternacionApiService } from '../../../../data-access/api/internacion.api';
import { InternacionDomiciliariaDTO, SignosVitalesDTO } from '../../../../data-access/dto/internacion.dto';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

type VitalsKey = 'temperatura' | 'frecuenciaCardiaca' | 'presionSistolica' | 'presionDiastolica' | 'saturacionOxigeno' | 'frecuenciaRespiratoria';

const VITALS_META: { key: VitalsKey; label: string; unit: string; color: string; min: number; max: number }[] = [
  { key: 'temperatura', label: 'Temperatura', unit: '°C', color: 'var(--accent-red)', min: 35, max: 42 },
  { key: 'frecuenciaCardiaca', label: 'Frec. Cardíaca', unit: 'bpm', color: 'var(--accent-red)', min: 40, max: 180 },
  { key: 'presionSistolica', label: 'Presión Sistólica', unit: 'mmHg', color: 'var(--accent-blue)', min: 60, max: 220 },
  { key: 'presionDiastolica', label: 'Presión Diastólica', unit: 'mmHg', color: 'var(--accent-cyan)', min: 30, max: 140 },
  { key: 'saturacionOxigeno', label: 'Sat O2', unit: '%', color: 'var(--accent-emerald)', min: 70, max: 100 },
  { key: 'frecuenciaRespiratoria', label: 'Frec. Respiratoria', unit: 'rpm', color: '#a855f7', min: 8, max: 40 },
];

@Component({
  selector: 'emx-signos-tab',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="max-w-4xl">
      <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">Signos Vitales</h2>

      <!-- Metric Pills -->
      <div class="flex flex-wrap gap-2 mb-6">
        @for (m of VITALS_META; track m.key) {
          <button (click)="selected.set(m)"
            class="px-3 py-2 rounded-full text-sm font-medium transition-all border"
            [style.background]="selected().key === m.key ? m.color + '22' : 'var(--surface-glass)'"
            [style.color]="selected().key === m.key ? m.color : 'var(--text-secondary)'"
            [style.borderColor]="selected().key === m.key ? m.color : 'var(--border-glass)'">
            {{ m.label }}
          </button>
        }
      </div>

      @if (loading()) {
        <p class="text-center py-8" style="color: var(--text-muted)">Cargando...</p>
      } @else if (chartData().length === 0) {
        <div class="rounded-xl p-8 text-center border border-dashed"
          style="background: var(--surface-glass); border-color: var(--border-glass)">
          <p style="color: var(--text-muted)">No hay registros de signos vitales</p>
        </div>
      } @else {
        <!-- Chart -->
        <div class="rounded-xl p-6 mb-6" style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium" style="color: var(--text-primary)">
              {{ selected().label }} ({{ selected().unit }})
            </span>
            <span class="text-xs" style="color: var(--text-muted)">{{ chartData().length }} registros</span>
          </div>
          <svg viewBox="0 0 700 200" class="w-full" style="overflow: visible">
            <!-- Grid lines -->
            @for (y of gridLines(); track y) {
              <line x1="50" [attr.x2]="700" [attr.y1]="y" [attr.y2]="y" stroke="var(--border-glass)" stroke-width="0.5" />
              <text x="46" [attr.y]="y + 4" text-anchor="end" font-size="10" fill="var(--text-muted)">{{ gridLabel(y) }}</text>
            }
            <!-- Area fill -->
            <path [attr.d]="areaPath()" [attr.fill]="selected().color + '22'" stroke="none" />
            <!-- Line -->
            <polyline [attr.points]="linePoints()" fill="none" [attr.stroke]="selected().color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
            <!-- Data points -->
            @for (p of chartPoints(); track p.x) {
              <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3" [attr.fill]="selected().color">
                <title>{{ p.label }}: {{ p.value }} {{ selected().unit }}</title>
              </circle>
            }
          </svg>
        </div>

        <!-- Table -->
        <div class="rounded-xl overflow-hidden" style="background: var(--surface-glass); border: 1px solid var(--border-glass)">
          <table class="w-full text-sm">
            <thead>
              <tr style="border-bottom: 1px solid var(--border-glass)">
                <th class="text-left px-4 py-2 text-xs uppercase tracking-wider" style="color: var(--text-muted)">Fecha/Hora</th>
                <th class="text-right px-4 py-2 text-xs uppercase tracking-wider" style="color: var(--text-muted)">Valor</th>
                <th class="text-right px-4 py-2 text-xs uppercase tracking-wider" style="color: var(--text-muted)">Unidad</th>
              </tr>
            </thead>
            <tbody>
              @for (r of tableData(); track r.fecha) {
                <tr class="border-t" style="border-color: var(--border-glass)">
                  <td class="px-4 py-2" style="color: var(--text-primary)">{{ r.fecha | date:'dd/MM HH:mm' }}</td>
                  <td class="px-4 py-2 text-right font-mono" style="color: var(--text-primary)">{{ r.value }}</td>
                  <td class="px-4 py-2 text-right" style="color: var(--text-muted)">{{ selected().unit }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class SignosTabComponent implements OnInit {
    private destroyRef = inject(DestroyRef);
  internacion = input.required<InternacionDomiciliariaDTO>();
  private api = inject(InternacionApiService);

  VITALS_META = VITALS_META;
  selected = signal(VITALS_META[0]);
  loading = signal(false);
  data = signal<SignosVitalesDTO[]>([]);

  chartData = computed(() => {
    const key = this.selected().key;
    return this.data().filter((d) => d[key] != null).map((d) => ({
      fecha: d.fechaHora,
      value: d[key] as number,
    }));
  });

  chartPoints = computed(() => {
    const pts = this.chartData();
    if (pts.length === 0) return [];
    const min = this.selected().min;
    const max = this.selected().max;
    const range = max - min;
    return pts.map((p, i) => {
      const x = 50 + (i / Math.max(pts.length - 1, 1)) * 650;
      const y = 180 - ((p.value - min) / range) * 160;
      return { x, y, value: p.value, label: p.fecha };
    });
  });

  linePoints = computed(() => this.chartPoints().map((p) => `${p.x},${p.y}`).join(' '));
  areaPath = computed(() => {
    const pts = this.chartPoints();
    if (pts.length === 0) return '';
    const first = pts[0];
    const last = pts[pts.length - 1];
    return `M${first.x},180 L${pts.map((p) => `${p.x},${p.y}`).join(' L')} L${last.x},180 Z`;
  });

  gridLines = computed(() => [60, 100, 140]);
  gridLabel(y: number): string {
    const min = this.selected().min;
    const max = this.selected().max;
    const range = max - min;
    const val = max - ((y - 20) / 160) * range;
    return val.toFixed(0);
  }

  tableData = computed(() => [...this.chartData()].reverse());

  ngOnInit(): void {
    this.loading.set(true);
    this.api.getSignosVitalesSerie(this.internacion().id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => {
              this.data.set((data ?? []).sort((a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime()));
              this.loading.set(false);
            },
            error: () => this.loading.set(false),
          });
  }
}
