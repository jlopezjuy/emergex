import { Component, input, output, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PlanComercialDTO } from '../../../data-access/dto/plan-comercial.dto';

@Component({
  selector: 'emx-plan-card',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div
      class="plan-card"
      [class.selected]="selected()"
      [class.tier-premium]="plan().tier === 'premium'"
      [class.tier-medio]="plan().tier === 'medio'"
      [class.tier-basico]="plan().tier === 'basico'"
      (click)="selectPlan.emit(plan())"
      role="button"
      [attr.aria-selected]="selected()"
      tabindex="0"
      (keydown.enter)="selectPlan.emit(plan())"
      (keydown.space)="selectPlan.emit(plan())"
    >
      <div class="plan-header">
        <span class="plan-tier-badge">{{ tierLabel() }}</span>
        <div class="plan-name">{{ plan().name }}</div>
        <div class="plan-price">
          <span class="price-amount">&#36;{{ plan().pricing.monthly | number:'1.0-0' }}</span>
          <span class="price-label">/mes</span>
        </div>
        @if (plan().pricing.perDependent > 0) {
          <div class="plan-dep-price">+ &#36;{{ plan().pricing.perDependent | number:'1.0-0' }} por dependiente</div>
        }
      </div>

      <div class="plan-features">
        @for (feat of features(); track feat.label) {
          <div class="feature-item" [class.included]="feat.included">
            <span class="feature-icon">{{ feat.included ? '✓' : '·' }}</span>
            <span class="feature-label">{{ feat.label }}</span>
          </div>
        }
      </div>

      @if (plan().limits.monthlyCap > 0) {
        <div class="plan-cap">Hasta {{ plan().limits.monthlyCap }} atenciones/mes</div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .plan-card {
      border: 2px solid var(--border-glass);
      border-radius: 12px;
      padding: 14px;
      cursor: pointer;
      transition: all 0.18s ease;
      background: var(--surface-glass);
      display: flex;
      flex-direction: column;
      gap: 10px;
      user-select: none;
    }
    .plan-card:hover { border-color: var(--accent-blue); background: var(--bg-elevated); }
    .plan-card.selected {
      border-color: var(--accent-blue);
      background: rgba(59,130,246,0.07);
      box-shadow: 0 0 0 3px rgba(59,130,246,0.16);
    }
    .plan-tier-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      padding: 2px 8px;
      border-radius: 999px;
      margin-bottom: 2px;
    }
    .tier-premium .plan-tier-badge { background: rgba(16,185,129,0.14); color: #10b981; }
    .tier-medio .plan-tier-badge { background: rgba(59,130,246,0.14); color: #3b82f6; }
    .tier-basico .plan-tier-badge { background: rgba(148,163,184,0.14); color: #94a3b8; }
    .plan-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .plan-price { display: flex; align-items: baseline; gap: 2px; }
    .price-amount { font-size: 20px; font-weight: 700; color: var(--text-primary); }
    .price-label { font-size: 12px; color: var(--text-muted); }
    .plan-dep-price { font-size: 11px; color: var(--text-muted); }
    .plan-features { display: flex; flex-direction: column; gap: 3px; }
    .feature-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
    .feature-item.included { color: var(--text-primary); }
    .feature-icon { font-size: 11px; width: 14px; flex-shrink: 0; }
    .feature-item.included .feature-icon { color: #10b981; }
    .plan-cap {
      font-size: 11px; color: var(--text-muted);
      border-top: 1px solid var(--border-glass);
      padding-top: 8px; margin-top: 2px;
    }
  `],
})
export class PlanCardComponent {
  readonly plan = input.required<PlanComercialDTO>();
  readonly selected = input(false);
  readonly selectPlan = output<PlanComercialDTO>();

  readonly tierLabel = computed(() => {
    const t = this.plan().tier;
    if (t === 'premium') return 'Premium';
    if (t === 'medio') return 'Estándar';
    return 'Básico';
  });

  readonly features = computed(() => {
    const c = this.plan().coverages;
    if (!c) return [];
    return [
      { label: 'Emergencias 24h', included: c.emergency },
      { label: 'Visita domiciliaria', included: c.homeVisit },
      { label: 'Orientación telefónica', included: c.phoneOrientation },
      { label: 'Enfermería domiciliaria', included: c.homeNursing },
      { label: 'Control médico mensual', included: c.monthlyControl },
      { label: 'Traslados programados', included: c.scheduledTransport },
      { label: 'Traslado interurbano', included: c.interurbanTransport },
    ];
  });
}
