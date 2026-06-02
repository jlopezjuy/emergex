import { Component, input, computed } from '@angular/core';

export type BadgeVariant = 'critical' | 'urgent' | 'stable' | 'info' | 'cyan';
export type ClinicalStatus = 'confirmed' | 'collision' | 'alert' | 'debt' | 'pending' | 'in-session';

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
  variant = input<BadgeVariant | ClinicalStatus>('info');
  pulse = input(false);

  private readonly statusMap: Record<ClinicalStatus, BadgeVariant> = {
    confirmed: 'stable',
    collision: 'critical',
    alert: 'urgent',
    debt: 'critical',
    pending: 'info',
    'in-session': 'cyan'
  };

  badgeClass = computed(() => {
    const val = this.variant();
    const mapped = this.statusMap[val as ClinicalStatus] || val;
    return `badge--${mapped}${this.pulse() ? ' badge--pulse' : ''}`;
  });
}

