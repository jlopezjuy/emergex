import { Component, input, computed } from '@angular/core';
import { StatusBadgeComponent, BadgeVariant } from '../../status-badge/status-badge.component';

@Component({
  selector: 'emx-emergency-priority-badge',
  standalone: true,
  imports: [StatusBadgeComponent],
  template: `
    <emx-status-badge [variant]="badgeVariant()" [pulse]="priority() === 'CRITICA'">
      {{ label() }}
    </emx-status-badge>
  `,
})
export class EmergencyPriorityBadgeComponent {
  priority = input<'CRITICA' | 'URGENTE' | 'NORMAL' | undefined | null>(null);

  badgeVariant = computed((): BadgeVariant => {
    switch (this.priority()) {
      case 'CRITICA': return 'critical';
      case 'URGENTE': return 'urgent';
      case 'NORMAL': return 'stable';
      default: return 'info';
    }
  });

  label = computed(() => {
    switch (this.priority()) {
      case 'CRITICA': return 'CRÍTICA';
      case 'URGENTE': return 'URGENTE';
      case 'NORMAL': return 'NORMAL';
      default: return '—';
    }
  });
}
