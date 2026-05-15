import { Component, input, computed } from '@angular/core';

let _uidCounter = 0;

@Component({
  selector: 'emx-sparkline',
  standalone: true,
  template: `
    <svg
      [attr.width]="width()"
      [attr.height]="height()"
      [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
      style="overflow: visible;"
    >
      <defs>
        <linearGradient [id]="gradId()" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" [attr.stop-color]="color()" stop-opacity="0.25"/>
          <stop offset="100%" [attr.stop-color]="color()" stop-opacity="0"/>
        </linearGradient>
      </defs>

      @if (points().length > 1) {
        <!-- Area fill -->
        <path
          [attr.d]="areaPath()"
          [attr.fill]="'url(#' + gradId() + ')'"
          stroke="none"
        />
        <!-- Line -->
        <polyline
          [attr.points]="pointsStr()"
          fill="none"
          [attr.stroke]="color()"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <!-- Last point highlight -->
        @if (lastPoint()) {
          <circle
            [attr.cx]="lastPoint()!.x"
            [attr.cy]="lastPoint()!.y"
            r="3"
            [attr.fill]="color()"
          />
        }
      }
    </svg>
  `,
})
export class SparklineComponent {
  values = input<number[]>([]);
  color = input('#22D3EE');
  width = input(120);
  height = input(40);

  private uid = ++_uidCounter;
  gradId = computed(() => `spark-grad-${this.uid}`);

  points = computed(() => {
    const vals = this.values();
    if (vals.length === 0) return [];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const w = this.width();
    const h = this.height();
    const pad = 4;
    return vals.map((v, i) => ({
      x: pad + (i / Math.max(vals.length - 1, 1)) * (w - pad * 2),
      y: h - pad - ((v - min) / range) * (h - pad * 2),
    }));
  });

  pointsStr = computed(() =>
    this.points()
      .map((p) => `${p.x},${p.y}`)
      .join(' '),
  );

  areaPath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    const h = this.height();
    const first = pts[0];
    const last = pts[pts.length - 1];
    const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
    return `M${first.x},${h} L${line.replace(',', ' L').split(' L').join(' L')} L${last.x},${h} Z`.replace('M', 'M').replace('L', 'L');
  });

  lastPoint = computed(() => {
    const pts = this.points();
    return pts.length > 0 ? pts[pts.length - 1] : null;
  });
}
