import { Component, input, output, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Institution, InstitutionContract } from '../../institutions.component';

interface CommercialPlanItem {
  id: string;
  numericId: number;
  name: string;
  color: string;
  monthlyBase: number;
  tier: string;
}

@Component({
  selector: 'app-institution-contract-modal',
  standalone: true,
  imports: [FormsModule],
  styles: [`
    :host { display: block; }
    .qc-overlay {
      position: fixed; inset: 0; z-index: 300;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(3px);
      display: flex; align-items: center; justify-content: center;
    }
    .qc-modal {
      width: 640px; max-width: 95vw; max-height: 90vh;
      border-radius: var(--r-card);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .qc-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 20px 20px 0; flex-shrink: 0;
    }
    .qc-body { overflow-y: auto; }
    .qc-foot {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 20px; border-top: 1px solid var(--border-glass); flex-shrink: 0;
    }
    .qc-close-btn {
      width: 28px; height: 28px; border-radius: 50%; border: 1px solid var(--border-glass);
      background: rgba(255,255,255,0.04); color: var(--text-muted);
      display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;
    }
    .qc-close-btn:hover { background: rgba(255,255,255,0.09); color: var(--text-primary); }
    .qc-field { display: flex; flex-direction: column; gap: 5px; }
    .qc-input {
      background: rgba(255,255,255,0.05); border: 1px solid var(--border-glass);
      border-radius: var(--r-btn); padding: 7px 10px; font-size: 13px;
      color: var(--text-primary); width: 100%; box-sizing: border-box;
    }
    .qc-input:focus { outline: none; border-color: var(--accent-blue); }
    .qc-hint { font-size: 11.5px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
    .contract-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .numeric-input { display: flex; align-items: stretch; }
    .ctr-status-pill {
      padding: 3px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 500;
      cursor: pointer; border: 1px solid transparent; background: rgba(255,255,255,0.04);
    }
    .wiz-summary {
      display: grid; gap: 12px;
      padding: 14px 16px; border-radius: 12px;
      background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass);
    }
    .kbd {
      display: inline-flex; align-items: center; justify-content: center;
      padding: 1px 5px; border-radius: 4px; font-size: 10.5px; font-family: monospace;
      background: rgba(255,255,255,0.07); border: 1px solid var(--border-glass); color: var(--text-muted);
    }
    .institution-avatar {
      border-radius: 10px; display: flex; align-items: center; justify-content: center;
      font-weight: 700; border: 1px solid; flex-shrink: 0;
    }
  `],
  template: `
    <div class="qc-overlay" (click)="onClose()" role="presentation">
      <div class="qc-modal qc-modal--contract glass-strong" style="position:relative" (click)="$event.stopPropagation()">
        @if (loadingContract()) {
          <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,0.55);border-radius:inherit;z-index:20">
            <div style="width:22px;height:22px;border:2px solid var(--accent-blue);border-top-color:transparent;border-radius:50%;animation:spin 0.65s linear infinite"></div>
          </div>
        }
        <div class="qc-head">
          <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
            <div class="institution-avatar"
              [style.background]="planColor(ctr().plan) + '20'"
              [style.color]="planColor(ctr().plan)"
              [style.border-color]="planColor(ctr().plan) + '44'"
              style="width:40px;height:40px;font-size:13px"
            >{{ avatarOf(institution().name) }}</div>
            <div style="min-width:0">
              <div class="eyebrow" style="color:var(--accent-blue)">CONFIGURACIÓN DE CONTRATO Y PLAN</div>
              <h2 style="font-size:16px;font-weight:600;margin:2px 0 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{{ institution().name }}</h2>
              <div class="mono micro" style="color:var(--text-muted);margin-top:2px">
                {{ ctr().code || 'Nuevo contrato' }} · {{ institution().cuit }}
              </div>
            </div>
          </div>
          <button class="qc-close-btn" (click)="onClose()">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
          </button>
        </div>

        <div class="qc-body" style="padding:16px 20px;overflow-y:auto;max-height:62vh">

          <!-- Plan selector card -->
          <div style="padding:14px 16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);margin-bottom:14px">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
              <span style="width:12px;height:12px;border-radius:50%;display:inline-block;flex-shrink:0;box-shadow:0 0 10px currentColor"
                [style.background]="planColor(ctr().plan)"
                [style.color]="planColor(ctr().plan)"
              ></span>
              <div>
                <div style="font-size:14px;font-weight:600" [style.color]="planColor(ctr().plan)">{{ planName(ctr().plan) }}</div>
                <div class="mono micro" style="color:var(--text-muted);margin-top:1px">Tarifa base: {{ fmtCurrency(planBase(ctr().plan)) }}/mes</div>
              </div>
            </div>
            <div class="qc-field">
              <label class="eyebrow">Cambiar plan</label>
              <select class="qc-input" [ngModel]="ctr().plan" (ngModelChange)="onPlanChange($event)">
                @for (p of commercialPlans(); track p.id) {
                  <option [value]="p.id">{{ p.name }} — {{ fmtCurrency(p.monthlyBase) }}/mes</option>
                }
              </select>
            </div>
          </div>

          <!-- Condiciones: fila 1 -->
          <div class="contract-grid" style="margin-bottom:12px">
            <div class="qc-field">
              <label class="eyebrow">Vigencia desde</label>
              <input class="qc-input" type="date" [ngModel]="ctr().from" (ngModelChange)="patchContract({ from: $event })"/>
            </div>
            <div class="qc-field">
              <label class="eyebrow">Vigencia hasta</label>
              <input class="qc-input" type="date" [ngModel]="ctr().to" (ngModelChange)="patchContract({ to: $event })"/>
            </div>
            <div class="qc-field">
              <label class="eyebrow">Estado</label>
              <div style="display:flex;gap:4px;flex-wrap:wrap">
                @for (cs of contractStatuses; track cs.value) {
                  <button type="button" class="ctr-status-pill"
                    [attr.data-active]="ctr().status === cs.value"
                    [style.border-color]="ctr().status === cs.value ? cs.color : 'transparent'"
                    [style.background]="ctr().status === cs.value ? cs.color + '18' : 'rgba(255,255,255,0.04)'"
                    [style.color]="ctr().status === cs.value ? cs.color : 'var(--text-muted)'"
                    (click)="patchContract({ status: cs.value })">
                    {{ cs.label }}
                  </button>
                }
              </div>
            </div>
            <div class="qc-field">
              <label class="eyebrow">Duración</label>
              <div class="qc-input mono" style="background:rgba(255,255,255,0.02);color:var(--accent-cyan);cursor:default">
                {{ calcMonths(ctr().from, ctr().to) }} meses
              </div>
            </div>
          </div>

          <!-- Condiciones: fila 2 -->
          <div class="contract-grid" style="margin-bottom:12px">
            <div class="qc-field">
              <label class="eyebrow">Precio mensual</label>
              <div class="numeric-input">
                <span style="display:flex;align-items:center;padding:0 8px;background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);border-right:none;border-radius:var(--r-btn) 0 0 var(--r-btn);font-size:12px;color:var(--text-muted)">$</span>
                <input class="qc-input" type="number" style="border-radius:0;flex:1;border-left:none"
                  [ngModel]="ctr().monthlyPrice" (ngModelChange)="patchContract({ monthlyPrice: +$event })"/>
                <span style="display:flex;align-items:center;padding:0 8px;background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);border-left:none;border-radius:0 var(--r-btn) var(--r-btn) 0;font-size:11px;color:var(--text-muted);white-space:nowrap">ARS/mes</span>
              </div>
            </div>
            <div class="qc-field">
              <label class="eyebrow">Precio por evento</label>
              <div class="numeric-input">
                <span style="display:flex;align-items:center;padding:0 8px;background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);border-right:none;border-radius:var(--r-btn) 0 0 var(--r-btn);font-size:12px;color:var(--text-muted)">$</span>
                <input class="qc-input" type="number" min="0" style="border-radius:0;flex:1;border-left:none"
                  placeholder="Opcional"
                  [ngModel]="ctr().eventPrice ?? null" (ngModelChange)="patchContract({ eventPrice: $event !== null && $event !== '' ? +$event : undefined })"/>
                <span style="display:flex;align-items:center;padding:0 8px;background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);border-left:none;border-radius:0 var(--r-btn) var(--r-btn) 0;font-size:11px;color:var(--text-muted);white-space:nowrap">ARS/ev.</span>
              </div>
            </div>
            <div class="qc-field">
              <label class="eyebrow">Tope mensual</label>
              <div class="numeric-input">
                <input class="qc-input" type="number" style="flex:1;border-radius:var(--r-btn) 0 0 var(--r-btn);border-right:none"
                  [ngModel]="ctr().monthlyCap" (ngModelChange)="patchContract({ monthlyCap: +$event })"/>
                <span style="display:flex;align-items:center;padding:0 8px;background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);border-left:none;border-radius:0 var(--r-btn) var(--r-btn) 0;font-size:11px;color:var(--text-muted);white-space:nowrap">servicios</span>
              </div>
            </div>
            <div class="qc-field">
              <label class="eyebrow">KPI respuesta</label>
              <div class="numeric-input">
                <input class="qc-input" type="number" style="flex:1;border-radius:var(--r-btn) 0 0 var(--r-btn);border-right:none"
                  [ngModel]="ctr().kpiMinutes" (ngModelChange)="patchContract({ kpiMinutes: +$event })"/>
                <span style="display:flex;align-items:center;padding:0 8px;background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);border-left:none;border-radius:0 var(--r-btn) var(--r-btn) 0;font-size:11px;color:var(--text-muted);white-space:nowrap">min. máx.</span>
              </div>
            </div>
          </div>

          <!-- Condiciones particulares -->
          <div class="qc-field" style="margin-bottom:12px">
            <label class="eyebrow">Condiciones particulares</label>
            <textarea class="qc-input" rows="3" style="resize:vertical"
              [ngModel]="ctr().conditions" (ngModelChange)="patchContract({ conditions: $event })"></textarea>
          </div>

          <!-- Resumen comercial -->
          <div class="wiz-summary" style="grid-template-columns:repeat(5,1fr)">
            <div>
              <div class="eyebrow">Anual estimado</div>
              <div class="mono" style="font-size:15px;font-weight:600;color:var(--accent-emerald);margin-top:4px">{{ fmtCurrency(ctr().monthlyPrice * 12) }}</div>
            </div>
            <div>
              <div class="eyebrow">Precio por evento</div>
              <div class="mono" style="font-size:15px;font-weight:600;color:var(--accent-cyan);margin-top:4px">
                {{ ctr().eventPrice != null ? fmtCurrency(ctr().eventPrice!) : '—' }}
              </div>
            </div>
            <div>
              <div class="eyebrow">Atenciones máx/año</div>
              <div class="mono" style="font-size:15px;font-weight:600;margin-top:4px">{{ ctr().monthlyCap * 12 }}</div>
            </div>
            <div>
              <div class="eyebrow">SLA acordado</div>
              <div class="mono" style="font-size:15px;font-weight:600;color:var(--accent-cyan);margin-top:4px">{{ ctr().kpiMinutes }} min</div>
            </div>
            <div>
              <div class="eyebrow">Vigencia</div>
              <div class="mono" style="font-size:15px;font-weight:600;margin-top:4px">{{ calcDays(ctr().from, ctr().to) }} días</div>
            </div>
          </div>
        </div>

        <div class="qc-foot">
          <div class="qc-hint"><span class="kbd">Esc</span> cerrar sin guardar</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn--ghost" (click)="onClose()">Cancelar</button>
            <button class="btn btn--primary" (click)="onSave()" [disabled]="loadingContract()">
              @if (loadingContract()) {
                <span style="width:12px;height:12px;border:1.5px solid currentColor;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin 0.65s linear infinite"></span>
              } @else {
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              }
              {{ loadingContract() ? 'Guardando…' : 'Guardar contrato' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class InstitutionContractModalComponent implements OnInit {
  readonly institution     = input.required<Institution>();
  readonly commercialPlans = input<CommercialPlanItem[]>([]);
  readonly loadingContract  = input<boolean>(false);
  readonly initialContract  = input.required<InstitutionContract>();

  readonly close = output<void>();
  readonly save  = output<InstitutionContract>();

  readonly ctr = signal<InstitutionContract>(null as any);

  readonly contractStatuses = [
    { value: 'active',    label: 'Activo',     color: 'var(--accent-emerald)' },
    { value: 'suspended', label: 'Suspendido', color: 'var(--accent-amber)' },
    { value: 'ended',     label: 'Finalizado', color: 'var(--text-muted)' },
    { value: 'draft',     label: 'Borrador',   color: 'var(--accent-blue)' },
  ] as const;

  readonly Math = Math;

  ngOnInit(): void {
    this.ctr.set(JSON.parse(JSON.stringify(this.initialContract())));
  }

  onClose(): void {
    this.close.emit();
  }

  onSave(): void {
    this.save.emit(this.ctr());
  }

  patchContract(patch: Partial<InstitutionContract>): void {
    const updated = { ...this.ctr(), ...patch };
    this.ctr.set(updated);
  }

  onPlanChange(planId: string): void {
    const patch: Partial<InstitutionContract> = { plan: planId };
    const plan = this.commercialPlans().find(p => p.id === planId);
    if (plan) {
      patch.monthlyPrice = plan.monthlyBase;
      patch.monthlyCap = plan.tier === 'premium' ? 50 : plan.tier === 'medio' ? 30 : 15;
      patch.kpiMinutes = plan.tier === 'premium' ? 8 : plan.tier === 'medio' ? 12 : 15;
    }
    this.patchContract(patch);
  }

  planColor(planId: string): string {
    return this.commercialPlans().find(p => p.id === planId || p.name === planId)?.color ?? 'var(--text-muted)';
  }

  planName(planId: string): string {
    return this.commercialPlans().find(p => p.id === planId || p.name === planId)?.name ?? planId;
  }

  planBase(planId: string): number {
    return this.commercialPlans().find(p => p.id === planId || p.name === planId)?.monthlyBase ?? 0;
  }

  avatarOf(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
  }

  fmtCurrency(n: number): string {
    return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 });
  }

  calcMonths(from?: string, to?: string): number {
    if (!from || !to) return 0;
    const a = new Date(from);
    const b = new Date(to);
    return Math.max(0, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
  }

  calcDays(from?: string, to?: string): number {
    if (!from || !to) return 0;
    const a = new Date(from);
    const b = new Date(to);
    const diff = b.getTime() - a.getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
  }

}
