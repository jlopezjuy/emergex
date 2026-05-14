import { Component, input, computed } from '@angular/core';

export type BadgeVariant = 'critical' | 'urgent' | 'stable' | 'info' | 'cyan';

@Component({
  selector: 'emx-status-badge',
  standalone: true,
  template: `
    <span class="badge" [class]="badgeClass()">
      <span class="dot"></span>
      <ng-content />
    </span>
  `,
})
export class StatusBadgeComponent {
  variant = input<BadgeVariant>('info');
  pulse = input(false);

  badgeClass = computed(
    () => `badge--${this.variant()}${this.pulse() ? ' badge--pulse' : ''}`,
  );
}
