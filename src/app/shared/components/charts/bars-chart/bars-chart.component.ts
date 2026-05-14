import { Component, input, computed } from '@angular/core';

interface Bar {
  value: number;
  label: string;
  height: number;
  isPeak: boolean;
}

@Component({
  selector: 'emx-bars-chart',
  standalone: true,
  template: `
    <svg
      [attr.width]="width()"
      [attr.height]="height()"
      [attr.viewBox]="'0 0 ' + width() + ' ' + height()"
    >
      @for (bar of bars(); track $index; let i = $index) {
        <rect
          [attr.x]="barX(i)"
          [attr.y]="height() - bar.height - 20"
          [attr.width]="barWidth()"
          [attr.height]="bar.height"
          rx="2"
          [attr.fill]="bar.isPeak ? 'var(--accent-red)' : 'var(--accent-cyan)'"
          fill-opacity="0.7"
        />
        <text
          [attr.x]="barX(i) + barWidth() / 2"
          [attr.y]="height() - 4"
          text-anchor="middle"
          font-family="IBM Plex Mono, monospace"
          font-size="9"
          fill="var(--text-muted)"
        >{{ bar.label }}</text>
      }
    </svg>
  `,
})
export class BarsChartComponent {
  values = input<number[]>([]);
  labels = input<string[]>([]);
  width = input(200);
  height = input(80);

  private maxVal = computed(() => Math.max(...this.values(), 1));
  private count = computed(() => this.values().length);

  barWidth = computed(() =>
    this.count() > 0
      ? Math.max(4, (this.width() / this.count()) * 0.6)
      : 8,
  );

  barX = (i: number) => {
    const count = this.count();
    if (count === 0) return 0;
    const slotW = this.width() / count;
    return slotW * i + (slotW - this.barWidth()) / 2;
  };

  bars = computed((): Bar[] => {
    const max = this.maxVal();
    const availH = this.height() - 24;
    return this.values().map((v, i) => ({
      value: v,
      label: this.labels()[i] ?? String(i),
      height: Math.max(2, (v / max) * availH),
      isPeak: v / max > 0.85,
    }));
  });
}
