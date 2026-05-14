import { Component, input, computed } from '@angular/core';

export interface DonutSegment {
  value: number;
  color: string;
  label?: string;
}

interface ComputedSegment {
  color: string;
  dashArray: string;
  dashOffset: string;
}

@Component({
  selector: 'emx-donut-chart',
  standalone: true,
  template: `
    <div class="flex flex-col items-center gap-2">
      <svg
        [attr.width]="size()"
        [attr.height]="size()"
        [attr.viewBox]="'0 0 ' + size() + ' ' + size()"
      >
        <!-- Background circle -->
        <circle
          [attr.cx]="cx()"
          [attr.cy]="cy()"
          [attr.r]="radius()"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          [attr.stroke-width]="strokeWidth()"
        />
        <!-- Segments -->
        @for (seg of computedSegments(); track $index) {
          <circle
            [attr.cx]="cx()"
            [attr.cy]="cy()"
            [attr.r]="radius()"
            fill="none"
            [attr.stroke]="seg.color"
            [attr.stroke-width]="strokeWidth()"
            [attr.stroke-dasharray]="seg.dashArray"
            [attr.stroke-dashoffset]="seg.dashOffset"
            stroke-linecap="round"
            style="transition: stroke-dasharray 0.5s ease;"
            [attr.transform]="'rotate(-90 ' + cx() + ' ' + cy() + ')'"
          />
        }
        <!-- Center label -->
        <text
          [attr.x]="cx()"
          [attr.y]="cy() - 6"
          text-anchor="middle"
          dominant-baseline="central"
          font-family="IBM Plex Mono, monospace"
          font-size="16"
          font-weight="600"
          fill="var(--text-primary)"
        >{{ centerLabel() }}</text>
        <text
          [attr.x]="cx()"
          [attr.y]="cy() + 10"
          text-anchor="middle"
          dominant-baseline="central"
          font-family="IBM Plex Mono, monospace"
          font-size="10"
          fill="var(--text-muted)"
        >{{ centerSub() }}</text>
      </svg>
    </div>
  `,
})
export class DonutChartComponent {
  size = input(120);
  strokeWidth = input(12);
  segments = input<DonutSegment[]>([]);
  centerLabel = input('');
  centerSub = input('');

  cx = computed(() => this.size() / 2);
  cy = computed(() => this.size() / 2);
  radius = computed(() => (this.size() - this.strokeWidth() * 2) / 2);

  private circumference = computed(() => 2 * Math.PI * this.radius());

  computedSegments = computed((): ComputedSegment[] => {
    const segs = this.segments();
    const total = segs.reduce((s, seg) => s + seg.value, 0);
    if (total === 0) return [];

    const circ = this.circumference();
    let offset = 0;
    return segs.map((seg) => {
      const pct = seg.value / total;
      const dash = pct * circ;
      const gap = circ - dash;
      const result: ComputedSegment = {
        color: seg.color,
        dashArray: `${dash} ${gap}`,
        dashOffset: `${-offset}`,
      };
      offset += dash;
      return result;
    });
  });
}
