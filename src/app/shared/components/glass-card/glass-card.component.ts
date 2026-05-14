import { Component, input } from '@angular/core';

@Component({
  selector: 'emx-glass-card',
  standalone: true,
  template: `
    <div class="glass rounded-card p-4 h-full" [class]="extraClass()">
      <ng-content />
    </div>
  `,
})
export class GlassCardComponent {
  extraClass = input('');
}
