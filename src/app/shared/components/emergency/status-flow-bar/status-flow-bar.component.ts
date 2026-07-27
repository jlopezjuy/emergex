import { Component, input } from '@angular/core';
import { StatusStep } from '../../../../features/operations/emergency-detail/models/status-step.model';
import { GlassCardComponent } from '../../glass-card/glass-card.component';

@Component({
  selector: 'emx-status-flow-bar',
  standalone: true,
  imports: [GlassCardComponent],
  templateUrl: './status-flow-bar.component.html',
  styleUrl: './status-flow-bar.component.scss',
})
export class StatusFlowBarComponent {
  readonly steps = input.required<StatusStep[]>();
  readonly activeIndex = input.required<number>();

  stepDotColor(index: number): string {
    const active = this.activeIndex();
    if (index < active) return 'var(--accent-emerald)';
    if (index === active) return 'var(--accent-red)';
    return 'var(--border-glass)';
  }
}
