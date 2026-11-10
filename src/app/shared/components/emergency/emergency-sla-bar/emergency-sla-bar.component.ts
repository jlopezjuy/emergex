import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'emx-emergency-sla-bar',
  standalone: true,
  template: `
    <div class="flex items-center gap-2">
      <div
        class="flex-1 h-1 rounded-pill overflow-hidden"
        style="background: rgba(255,255,255,0.08);"
      >
        <div
          class="h-full rounded-pill transition-all duration-500"
          [style.width.%]="clampedPct()"
          [style.background-color]="barColor()"
        ></div>
      </div>
      <span class="font-mono text-xs" [style.color]="barColor()">
        {{ elapsedStr() }}
      </span>
    </div>
  `,
})
export class EmergencySlaBarComponent {
  elapsed = input(0);
  sla = input(600);

  ratio = computed(() => {
    const s = this.sla();
    return s > 0 ? this.elapsed() / s : 0;
  });

  clampedPct = computed(() => Math.min(100, this.ratio() * 100));

  barColor = computed(() => {
    const r = this.ratio();
    if (r >= 0.8) return 'var(--accent-red)';
    if (r >= 0.6) return 'var(--accent-amber)';
    return 'var(--accent-emerald)';
  });

  elapsedStr = computed(() => {
    const s = this.elapsed();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  });
}
