import { Component, input, computed } from '@angular/core';
import { DonutChartComponent, DonutSegment } from '../charts/donut-chart/donut-chart.component';
import { SparklineComponent } from '../charts/sparkline/sparkline.component';
import { BarsChartComponent } from '../charts/bars-chart/bars-chart.component';
import { UnidadMovilDTO } from '../../../data-access/dto/ambulancia.dto';
import { DashboardOperativoDTO } from '../../../data-access/dto/dashboard.dto';

// Typical hourly load pattern for an emergency service (0–23h)
const HOURLY_PATTERN = [
  18, 12, 8, 6, 7, 10, 22, 45, 68, 72, 78, 82,
  75, 70, 65, 60, 72, 88, 92, 85, 70, 55, 38, 25,
];

@Component({
  selector: 'emx-telemetry-bar',
  standalone: true,
  imports: [DonutChartComponent, SparklineComponent, BarsChartComponent],
  template: `
    <div class="grid grid-cols-4 gap-3 h-full">

      <!-- Card 1: Fleet donut -->
      <div class="glass rounded-panel px-3 py-2 flex items-center gap-3 overflow-hidden">
        <emx-donut-chart
          [segments]="fleetSegments()"
          [size]="72"
          [strokeWidth]="8"
          [centerLabel]="disponibles()"
          centerSub="disp."
        />
        <div class="flex flex-col gap-1 min-w-0">
          <span class="eyebrow" style="color: var(--text-muted);">Unidades</span>
          @for (item of fleetLegend(); track item.label) {
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 rounded-full flex-shrink-0" [style.background]="item.color"></div>
              <span class="font-mono text-xs" style="color: var(--text-secondary);">
                {{ item.count }} {{ item.label }}
              </span>
            </div>
          }
        </div>
      </div>

      <!-- Card 2: Response time sparkline -->
      <div class="glass rounded-panel px-3 py-2 flex flex-col gap-1 overflow-hidden">
        <span class="eyebrow" style="color: var(--text-muted);">Resp. Promedio</span>
        <div class="flex items-end gap-2">
          <span class="font-mono font-bold" style="font-size: 22px; color: var(--text-primary); line-height: 1;">
            {{ respTime() }}
          </span>
          <span class="font-mono text-xs mb-0.5" style="color: var(--text-muted);">min</span>
        </div>
        <emx-sparkline
          [values]="sparkValues()"
          color="var(--accent-cyan)"
          [width]="160"
          [height]="30"
        />
        <div class="flex items-center gap-2 mt-auto">
          <span
            class="badge font-mono"
            [style.background]="slaOk() ? 'var(--accent-emerald-dim)' : 'var(--accent-red-dim)'"
            [style.color]="slaOk() ? 'var(--accent-emerald)' : 'var(--accent-red)'"
          >SLA {{ sla() }}%</span>
          <span class="font-mono" style="font-size: 10px; color: var(--text-muted);">P95 · {{ p95() }}m</span>
        </div>
      </div>

      <!-- Card 3: System load bars -->
      <div class="glass rounded-panel px-3 py-2 flex flex-col gap-1 overflow-hidden">
        <span class="eyebrow" style="color: var(--text-muted);">Carga del Sistema</span>
        <div class="flex items-end gap-1">
          <span
            class="font-mono font-bold"
            style="font-size: 22px; line-height: 1;"
            [style.color]="loadColor()"
          >{{ loadPct() }}%</span>
          <span class="font-mono text-xs mb-0.5" style="color: var(--text-muted);">actual</span>
        </div>
        <emx-bars-chart
          [values]="loadBars()"
          [labels]="loadLabels()"
          [width]="190"
          [height]="44"
        />
        <div class="flex items-center justify-between mt-auto">
          <span class="font-mono" style="font-size: 10px; color: var(--text-muted);">
            Pico · {{ peakHour() }}h
          </span>
          <span class="font-mono" style="font-size: 10px; color: var(--accent-red);">
            {{ peakVal() }}% max
          </span>
        </div>
      </div>

      <!-- Card 4: Criticals -->
      <div class="glass rounded-panel px-3 py-2 flex flex-col gap-1 overflow-hidden">
        <span class="eyebrow" style="color: var(--text-muted);">Activas Críticas</span>
        <div class="flex items-end gap-2">
          <span
            class="font-mono font-bold"
            style="font-size: 32px; line-height: 1; color: var(--accent-red);"
          >{{ criticas() }}</span>
          <span class="font-mono text-xs mb-1" style="color: var(--text-muted);">en curso</span>
        </div>
        <div class="grid grid-cols-2 gap-1 mt-auto">
          <div
            class="rounded px-2 py-1 flex flex-col"
            style="background: var(--accent-amber-dim);"
          >
            <span class="font-mono font-semibold text-sm" style="color: var(--accent-amber); line-height: 1.2;">
              {{ urgentes() }}
            </span>
            <span class="font-mono" style="font-size: 9px; color: var(--text-muted);">urgentes</span>
          </div>
          <div
            class="rounded px-2 py-1 flex flex-col"
            style="background: var(--surface-glass);"
          >
            <span class="font-mono font-semibold text-sm" style="color: var(--text-secondary); line-height: 1.2;">
              {{ sinAsignar() }}
            </span>
            <span class="font-mono" style="font-size: 9px; color: var(--text-muted);">sin asignar</span>
          </div>
        </div>
      </div>

    </div>
  `,
})
export class TelemetryBarComponent {
  ambulances = input<UnidadMovilDTO[]>([]);
  dashboard = input<DashboardOperativoDTO | null>(null);

  // --- Card 1: Fleet ---
  disponibles = computed(() =>
    String(this.ambulances().filter((a) => a.estado === 'DISPONIBLE').length || this.dashboard()?.unidadesDisponibles || 0),
  );

  fleetSegments = computed((): DonutSegment[] => {
    const ambs = this.ambulances();
    if (ambs.length === 0) {
      const d = this.dashboard();
      const disp = d?.unidadesDisponibles ?? 0;
      const total = d?.totalUnidades ?? disp;
      const other = total - disp;
      return [
        { value: disp, color: '#10B981', label: 'Disponible' },
        { value: other, color: '#3B82F6', label: 'En servicio' },
      ].filter((s) => s.value > 0);
    }
    const counts = ambs.reduce<Record<string, number>>((acc, a) => {
      const k = a.estado ?? 'DESCONOCIDO';
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    const colorMap: Record<string, string> = {
      DISPONIBLE: '#10B981',
      EN_RUTA: '#3B82F6',
      EN_SITIO: '#F59E0B',
      TRASLADO: '#22D3EE',
      MANTENIMIENTO: '#64748B',
    };
    return Object.entries(counts).map(([estado, count]) => ({
      value: count,
      color: colorMap[estado] ?? '#64748B',
      label: estado,
    }));
  });

  fleetLegend = computed(() => {
    const ambs = this.ambulances();
    const items = [
      { key: 'DISPONIBLE', label: 'Disp.', color: '#10B981' },
      { key: 'EN_RUTA', label: 'En ruta', color: '#3B82F6' },
      { key: 'EN_SITIO', label: 'En sitio', color: '#F59E0B' },
      { key: 'TRASLADO', label: 'Traslado', color: '#22D3EE' },
      { key: 'MANTENIMIENTO', label: 'Mant.', color: '#64748B' },
    ];
    if (ambs.length === 0) {
      return items.slice(0, 2).map((item) => ({ ...item, count: 0 }));
    }
    return items
      .map((item) => ({
        ...item,
        count: ambs.filter((a) => a.estado === item.key).length,
      }))
      .filter((item) => item.count > 0);
  });

  // --- Card 2: Response time ---
  respTime = computed(() => {
    const t = this.dashboard()?.tiempoRespuestaPromedio;
    return t != null ? t.toFixed(1) : '—';
  });

  sla = computed(() => this.dashboard()?.slaPromedio ?? 0);
  slaOk = computed(() => this.sla() >= 85);
  p95 = computed(() => {
    const t = this.dashboard()?.tiempoRespuestaPromedio ?? 8;
    return (t * 1.6).toFixed(0);
  });

  // 12-point sparkline based on typical response pattern (minutes)
  sparkValues = computed(() => {
    const base = this.dashboard()?.tiempoRespuestaPromedio ?? 8;
    return [9.2, 8.8, 10.1, 8.3, 7.9, 9.5, 11.2, 8.4, 7.8, 9.1, base, base].map(
      (v) => Math.max(0, v + (base - 8.4)),
    );
  });

  // --- Card 3: System load ---
  loadPct = computed(() => this.dashboard()?.slaPromedio ?? 0);

  loadColor = computed(() => {
    const v = this.loadPct();
    if (v >= 90) return 'var(--accent-red)';
    if (v >= 75) return 'var(--accent-amber)';
    return 'var(--accent-emerald)';
  });

  loadBars = computed((): number[] => {
    const now = new Date().getHours();
    return HOURLY_PATTERN.slice(now - 17 < 0 ? 0 : now - 17, now + 1);
  });

  loadLabels = computed((): string[] => {
    const now = new Date().getHours();
    const start = Math.max(0, now - 17);
    return Array.from({ length: this.loadBars().length }, (_, i) =>
      String((start + i) % 24).padStart(2, '0'),
    );
  });

  peakHour = computed((): string => {
    const bars = this.loadBars();
    const labels = this.loadLabels();
    const maxIdx = bars.reduce((mi, v, i) => (v > bars[mi] ? i : mi), 0);
    return labels[maxIdx] ?? '—';
  });

  peakVal = computed((): number => Math.max(...this.loadBars(), 0));

  // --- Card 4: Criticals ---
  criticas = computed(() => this.dashboard()?.ticketsCriticos ?? 0);
  urgentes = computed(() => this.dashboard()?.ticketsPorPrioridad?.['URGENTE'] ?? 0);
  sinAsignar = computed(() => {
    const activos = this.dashboard()?.ticketsActivos ?? 0;
    const disp = this.ambulances().filter((a) => a.estado === 'EN_RUTA' || a.estado === 'EN_SITIO' || a.estado === 'TRASLADO').length;
    return Math.max(0, activos - disp);
  });
}
