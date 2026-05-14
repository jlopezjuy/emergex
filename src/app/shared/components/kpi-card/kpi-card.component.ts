import { Component, input, computed } from '@angular/core';

@Component({
  selector: 'emx-kpi-card',
  standalone: true,
  template: `
    <div class="glass rounded-panel p-3 flex flex-col gap-1">
      <span
        class="font-mono text-xs uppercase tracking-widest"
        [style.color]="accentColorVar()"
      >{{ label() }}</span>
      <span
        class="font-mono text-2xl font-semibold leading-none"
        style="color: var(--text-primary)"
      >
        {{ value() ?? '—' }}
      </span>
      @if (trend()) {
        <span
          class="font-mono text-xs"
          [style.color]="trend() === '+' ? 'var(--accent-emerald)' : 'var(--accent-red)'"
        >
          {{ trend() === '+' ? '▲' : '▼' }}
        </span>
      }
    </div>
  `,
})
export class KpiCardComponent {
  label = input('');
  value = input<number | string | null | undefined>(null);
  trend = input<'+' | '-' | null>(null);
  accentColor = input<'cyan' | 'red' | 'emerald' | 'amber' | 'blue'>('cyan');

  accentColorVar = computed(() => {
    const map: Record<string, string> = {
      cyan: 'var(--accent-cyan)',
      red: 'var(--accent-red)',
      emerald: 'var(--accent-emerald)',
      amber: 'var(--accent-amber)',
      blue: 'var(--accent-blue)',
    };
    return map[this.accentColor()] ?? 'var(--accent-cyan)';
  });
}
