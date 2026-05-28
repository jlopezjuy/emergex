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

          <!-- Geocerca (Polígono de Cobertura - Sprint 4 Nuevo) -->
          <div style="padding:14px 16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);margin-bottom:14px">
            <label class="eyebrow" style="color: var(--accent-cyan); display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span>Zona de Cobertura del Plan (Polígono)</span>
              <span class="mono" style="font-size: 9.5px; color: var(--text-muted)">Hacé clicks en el mapa para trazar el perímetro</span>
            </label>
            
            <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 14px;">
              <!-- Interactive Drawing Map (SVG) -->
              <div class="mini-map" style="aspect-ratio: 1 / 1; height: 160px; width: 160px; margin: 0 auto;">
                <svg viewBox="0 0 100 100" (click)="onContractMapClick($event)">
                  <!-- Background -->
                  <rect width="100" height="100" fill="rgba(2,6,23,0.92)"/>
                  
                  <!-- Grid lines for visual quality -->
                  <line x1="25" y1="0" x2="25" y2="100" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>
                  <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>
                  <line x1="75" y1="0" x2="75" y2="100" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>
                  <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>
                  <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>
                  <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.05)" stroke-width="0.5"/>

                  <!-- Drawn Polygon Area -->
                  @if (ctr().polygonPoints && ctr().polygonPoints!.length > 0) {
                    <polygon 
                      [attr.points]="getPointsString(ctr().polygonPoints)" 
                      fill="rgba(59,130,246,0.22)" 
                      stroke="var(--accent-blue)" 
                      stroke-width="1.5" 
                      stroke-linejoin="round"
                    />
                    @for (pt of ctr().polygonPoints!; track pt; let idx = $index) {
                      <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="2.5" fill="var(--accent-cyan)" stroke="white" stroke-width="0.5"/>
                    }
                  }
                </svg>
                <div class="mini-map__hint" style="background: rgba(59,130,246,0.6); font-size: 8px; padding: 2px 4px;">DIBUJAR</div>
              </div>

              <!-- Actions & Vertex List -->
              <div style="display: flex; flex-direction: column; justify-content: space-between; background: rgba(255,255,255,0.02); border: 1px solid var(--border-glass); border-radius: 12px; padding: 10px;">
                <div style="flex: 1; overflow-y: auto; max-height: 90px;">
                  <span class="eyebrow" style="margin-bottom: 4px; display: block;">Perímetro Cobertura</span>
                  @if (!ctr().polygonPoints || ctr().polygonPoints!.length === 0) {
                    <div class="font-sans text-[10.5px]" style="color: var(--text-muted); line-height: 1.3;">
                      Sin cobertura. Usá los botones de abajo o clickeá a la izquierda.
                    </div>
                  } @else {
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                      @for (pt of ctr().polygonPoints!; track pt; let idx = $index) {
                        <div class="font-mono text-[9px] flex items-center justify-between px-2 py-0.5 rounded bg-white/5" style="color: var(--text-secondary)">
                          <span>Vértice {{ idx + 1 }}: ({{ pt.x.toFixed(0) }}%, {{ pt.y.toFixed(0) }}%)</span>
                          <button type="button" class="text-red-400 hover:text-red-300 font-bold" (click)="removeVertex(idx)">✕</button>
                        </div>
                      }
                    </div>
                  }
                </div>
                
                <!-- Circular Presets (Sprint 4) -->
                <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border-glass);">
                  <span class="eyebrow" style="font-size: 8.5px; margin-bottom: 2px;">Autogenerar Radio</span>
                  <div style="display: flex; gap: 3px;">
                    <button type="button" class="filter-chip" style="flex: 1; height: 20px; font-size: 9px; padding: 0; justify-content: center; display: inline-flex; align-items: center;" (click)="generateCircularGeofence(5)">Cercano (5%)</button>
                    <button type="button" class="filter-chip" style="flex: 1; height: 20px; font-size: 9px; padding: 0; justify-content: center; display: inline-flex; align-items: center;" (click)="generateCircularGeofence(12)">Medio (12%)</button>
                    <button type="button" class="filter-chip" style="flex: 1; height: 20px; font-size: 9px; padding: 0; justify-content: center; display: inline-flex; align-items: center;" (click)="generateCircularGeofence(22)">Amplio (22%)</button>
                  </div>
                </div>

                <div style="display: flex; gap: 4px; margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border-glass);">
                  <button type="button" class="filter-chip" style="flex: 1; height: 22px; font-size: 10px; text-align: center; justify-content: center; display: inline-flex; align-items: center;" [disabled]="!ctr().polygonPoints || ctr().polygonPoints!.length === 0" (click)="clearPolygon()">
                    Reset
                  </button>
                  <button type="button" class="filter-chip" style="flex: 1; height: 22px; font-size: 10px; text-align: center; justify-content: center; display: inline-flex; align-items: center;" [disabled]="!ctr().polygonPoints || ctr().polygonPoints!.length < 3" (click)="autoClosePolygon()">
                    Cerrar
                  </button>
                </div>
              </div>
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
            <div class="qc-field">
              <label class="eyebrow">Costo unitario</label>
              <div class="qc-input mono" style="background:rgba(255,255,255,0.02);color:var(--accent-cyan);cursor:default">
                {{ ctr().monthlyCap > 0 ? fmtCurrency(Math.round(ctr().monthlyPrice / ctr().monthlyCap)) : '—' }}
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
          <div class="wiz-summary">
            <div>
              <div class="eyebrow">Anual estimado</div>
              <div class="mono" style="font-size:15px;font-weight:600;color:var(--accent-emerald);margin-top:4px">{{ fmtCurrency(ctr().monthlyPrice * 12) }}</div>
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

  // ── Sprint 4 Contract Polygon Drawing ──
  getPointsString(pts?: { x: number; y: number }[]): string {
    if (!pts) return '';
    return pts.map(p => `${p.x},${p.y}`).join(' ');
  }

  onContractMapClick(event: MouseEvent): void {
    const target = event.currentTarget as SVGElement;
    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    
    const currentPoints = this.ctr().polygonPoints ? [...this.ctr().polygonPoints!] : [];
    currentPoints.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    this.patchContract({ polygonPoints: currentPoints });
  }

  removeVertex(index: number): void {
    const currentPoints = this.ctr().polygonPoints ? [...this.ctr().polygonPoints!] : [];
    currentPoints.splice(index, 1);
    this.patchContract({ polygonPoints: currentPoints });
  }

  clearPolygon(): void {
    this.patchContract({ polygonPoints: [] });
  }

  autoClosePolygon(): void {
    const pts = this.ctr().polygonPoints ? [...this.ctr().polygonPoints!] : [];
    if (pts.length > 2) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      const dist = Math.sqrt(Math.pow(last.x - first.x, 2) + Math.pow(last.y - first.y, 2));
      if (dist > 1) {
        pts.push({ ...first });
        this.patchContract({ polygonPoints: pts });
      }
    }
  }

  generateCircularGeofence(radius: number): void {
    const cx = this.institution().lat ?? 50;
    const cy = this.institution().lng ?? 50;
    const points = [];
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * 2 * Math.PI;
      points.push({
        x: Math.round((cx + radius * Math.cos(angle)) * 10) / 10,
        y: Math.round((cy + radius * Math.sin(angle)) * 10) / 10
      });
    }
    points.push({ ...points[0] });
    this.patchContract({ polygonPoints: points });
  }
}
