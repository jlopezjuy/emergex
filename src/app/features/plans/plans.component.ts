import { Component, OnInit, inject, signal, computed, HostListener, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Observable } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { PlanComercialApiService } from '../../data-access/api/plan-comercial.api';
import { PlanComercialDTO, PlanCoverages, PlanPrestacionDTO, TipoCargo } from '../../data-access/dto/plan-comercial.dto';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ZonesApiService, ZonaCoberturaDTO, TarifaPrestacionZonaDTO, PrestacionMedicaDTO } from '../../data-access/api/zones.api';

// ─── Interfaces ───────────────────────────────────────────────────────────────

type Plan = PlanComercialDTO;

interface PlanForm {
  name: string;
  tier: 'basico' | 'medio' | 'premium';
  description: string;
  modality: 'individual' | 'familiar' | 'institucional';
  audience: 'particulares' | 'corporativos';
  monthly: number;
  quarterly: number;
  annual: number;
  perDependent: number;
  discountPct: number;
  monthlyCap: number;
  freeIncluded: number;
  carencyDays: number;
  coverages: PlanCoverages;
}

interface PlanPrestacionRow {
  prestacionId: number;
  nombre: string;
  codigo: string;
  tipoAsistencia: string;
  included: boolean;
  tipoCargo: TipoCargo;
  limiteMensual: number | null;
  requiereOrdenMedica: boolean;
  cargoMinimo: number | null;
  existingId?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_COLOR: Record<string, string> = {
  basico:  'var(--text-muted)',
  medio:   'var(--accent-blue)',
  premium: 'var(--accent-emerald)',
};

const COVERAGE_META: { key: keyof PlanCoverages; name: string; sub: string }[] = [
  { key: 'emergency',           name: 'Emergencias ALS/BLS',    sub: 'Despacho inmediato 24/7'   },
  { key: 'homeVisit',           name: 'Visita domiciliaria',     sub: 'Consultas en el hogar'     },
  { key: 'phoneOrientation',    name: 'Orientación telefónica',  sub: 'Línea médica 24hs'         },
  { key: 'homeNursing',         name: 'Enfermería domiciliaria', sub: 'Cuidados y curaciones'     },
  { key: 'monthlyControl',      name: 'Control mensual',         sub: 'Chequeo preventivo'        },
  { key: 'scheduledTransport',  name: 'Traslado programado',     sub: 'Turnos y estudios'         },
  { key: 'interurbanTransport', name: 'Traslado interurbano',    sub: 'Larga distancia cubierta'  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtN(n: number): string {
  return n.toLocaleString('es-AR', { minimumFractionDigits: 0 });
}

function fmtCurrency(n: number): string {
  return '$' + fmtN(n);
}

function emptyForm(): PlanForm {
  return {
    name: '', tier: 'basico', description: '', modality: 'individual', audience: 'particulares',
    monthly: 0, quarterly: 0, annual: 0, perDependent: 0, discountPct: 0,
    monthlyCap: 0, freeIncluded: 0, carencyDays: 0,
    coverages: { emergency: false, homeVisit: false, phoneOrientation: false, homeNursing: false, monthlyControl: false, scheduledTransport: false, interurbanTransport: false },
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="screen">

      <!-- ── Header ── -->
      <div class="screen-head">
        <div class="screen-head__title">
          <div class="screen-head__icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
              <line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <div>
            <h2>Planes Comerciales</h2>
            <div class="eyebrow">B2C · B2B · COBERTURAS Y PRECIOS</div>
          </div>
        </div>

        <div class="screen-head__kpis">
          <div class="screen-kpi">
            <div class="eyebrow">Particulares</div>
            <div class="mono" style="font-size:18px;font-weight:500;color:var(--accent-blue)">{{ countByAudience('particulares') }}</div>
          </div>
          <div class="screen-kpi">
            <div class="eyebrow">Corporativos</div>
            <div class="mono" style="font-size:18px;font-weight:500;color:var(--accent-cyan)">{{ countByAudience('corporativos') }}</div>
          </div>
          <div class="screen-kpi">
            <div class="eyebrow">Activos</div>
            <div class="mono" style="font-size:18px;font-weight:500;color:var(--accent-emerald)">{{ countActive() }}</div>
          </div>
          <div class="screen-kpi">
            <div class="eyebrow">Pausados</div>
            <div class="mono" style="font-size:18px;font-weight:500;color:var(--text-muted)">{{ countPaused() }}</div>
          </div>
        </div>

        <div class="screen-head__actions">
          <button class="btn btn--ghost btn--sm">Exportar</button>
          <button class="btn btn--primary btn--sm" (click)="openNewForm()">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
            Nuevo plan
          </button>
        </div>
      </div>

      <!-- ── Big tabs ── -->
      <div class="plans-tabs">
        <button class="plans-tab" [attr.data-active]="tab() === 'particulares'" (click)="tab.set('particulares')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <div>
            <div style="font-size:14px;font-weight:600">Planes Particulares</div>
            <div class="eyebrow">INDIVIDUAL · FAMILIAR — {{ countByAudience('particulares') }} PLANES</div>
          </div>
        </button>
        <button class="plans-tab" [attr.data-active]="tab() === 'corporativos'" (click)="tab.set('corporativos')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          <div>
            <div style="font-size:14px;font-weight:600">Planes Corporativos</div>
            <div class="eyebrow">INSTITUCIONES · EMPRESAS — {{ countByAudience('corporativos') }} PLANES</div>
          </div>
        </button>
        <button class="plans-tab" [attr.data-active]="tab() === 'zonas'" (click)="tab.set('zonas')">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <div>
            <div style="font-size:14px;font-weight:600">Zonas y Tarifas</div>
            <div class="eyebrow">ZONAS GEOGRÁFICAS · MATRIZ DE COSTOS</div>
          </div>
        </button>
      </div>

      <!-- ── Plans grid ── -->
      @if (tab() !== 'zonas') {
        <div class="plans-grid">

          @for (plan of filteredPlans(); track plan.id) {
            <div class="pricing-card" [class.pricing-card--off]="!plan.active">

              <!-- Ribbon recomendado -->
              @if (plan.tier === 'premium' && plan.active) {
                <div style="position:absolute;top:12px;right:-8px;padding:4px 12px;background:var(--accent-emerald);color:white;font-size:9px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;border-radius:4px;box-shadow:0 2px 8px rgba(16,185,129,0.35)">
                  RECOMENDADO
                </div>
              }

              <!-- Card header: tier badge + toggle -->
              <div style="display:flex;align-items:center;justify-content:space-between">
                <span class="tier-badge" [style.background]="tierColor(plan.tier) + '18'" [style.color]="tierColor(plan.tier)" [style.border]="'1px solid ' + tierColor(plan.tier) + '44'">
                  <span style="width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 6px currentColor;display:inline-block"></span>
                  {{ tierLabel(plan.tier) }}
                </span>
                <button class="toggle-sw" [class.is-on]="plan.active" (click)="toggleActive(plan.id)" title="{{ plan.active ? 'Pausar plan' : 'Activar plan' }}">
                  <div class="toggle-sw__track">
                    <div class="toggle-sw__thumb"></div>
                  </div>
                </button>
              </div>

              <!-- Nombre + id + modalidad -->
              <div>
                <h3 style="font-size:17px;font-weight:700;margin:0 0 2px;letter-spacing:-0.01em">{{ plan.name }}</h3>
                <div class="mono micro" style="color:var(--text-muted)">{{ plan.id }}</div>
                <div class="eyebrow" style="margin-top:4px">{{ modalityLabel(plan.modality) }}</div>
              </div>

              <!-- Precio -->
              <div>
                <div style="display:flex;align-items:baseline;gap:3px">
                  <span style="font-size:13px;color:var(--text-secondary);font-family:var(--font-mono)">$</span>
                  <span class="mono" style="font-size:26px;font-weight:700;letter-spacing:-0.02em">{{ fmtN(plan.pricing.monthly) }}</span>
                  <span style="font-size:12px;color:var(--text-muted)">/ mes</span>
                </div>
                @if (plan.pricing.discountPct > 0) {
                  <div style="font-size:12px;color:var(--accent-emerald);margin-top:3px;font-family:var(--font-mono)">
                    {{ fmtCurrency(plan.pricing.annual) }} anual · ahorrás {{ plan.pricing.discountPct }}%
                  </div>
                }
              </div>

              <!-- Descripción -->
              <p style="font-size:12px;color:var(--text-secondary);margin:0;line-height:1.5">{{ plan.description }}</p>

              <!-- Coberturas activas -->
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                @for (cov of activeCoverages(plan); track cov.key) {
                  <div class="cov-icon-btn" [title]="cov.name + ' · ' + cov.sub"
                    [style.border-color]="tierColor(plan.tier) + '55'"
                    [style.background]="tierColor(plan.tier) + '14'"
                    [style.color]="tierColor(plan.tier)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                }
              </div>

              <!-- Footer: límites + configurar -->
              <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:auto;padding-top:4px;border-top:1px solid var(--border-hairline)">
                <div style="font-size:11px">
                  @if (plan.limits.monthlyCap === 0) {
                    <div style="color:var(--accent-emerald);font-family:var(--font-mono);font-weight:600">Ilimitado</div>
                  } @else {
                    <div class="mono" style="color:var(--text-secondary)">{{ plan.limits.monthlyCap }} atenciones/mes</div>
                    @if (plan.limits.freeIncluded > 0) {
                      <div class="mono micro" style="color:var(--text-muted)">{{ plan.limits.freeIncluded }} sin cargo</div>
                    }
                  }
                  @if (plan.limits.carencyDays === 0) {
                    <div style="color:var(--accent-emerald);font-size:10.5px;margin-top:2px">Desde día 1</div>
                  } @else {
                    <div style="color:var(--text-muted);font-size:10.5px;margin-top:2px">{{ plan.limits.carencyDays }} días carencia</div>
                  }
                </div>
                <button class="btn btn--ghost btn--sm" (click)="openEditForm(plan)" style="pointer-events:all">Configurar</button>
              </div>
            </div>
          }

          <!-- Card vacía: crear nuevo plan -->
          <button class="pricing-card pricing-card--empty" (click)="openNewForm()">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" style="margin-bottom:8px">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span style="font-size:13px;font-weight:500">Crear nuevo plan</span>
          </button>

        </div>
      }

      @if (tab() === 'zonas') {
        <div style="display:grid;grid-template-columns:300px 1fr;gap:20px;width:100%;align-items:start">
          
          <!-- COLUMNA 1: Zonas de Cobertura -->
          <div class="glass rounded-panel p-5 flex flex-col gap-4">
            <div style="display:flex;align-items:center;gap:8px">
              <h3 style="font-size:15px;font-weight:700;margin:0;color:var(--text-primary)">Zonas Geográficas</h3>
              <span class="mono micro" style="margin-left:auto;color:var(--accent-blue)">{{ zones().length }} ZONAS</span>
            </div>
            <p style="font-size:11.5px;color:var(--text-muted);margin:0;line-height:1.4">Mapeá localidades con códigos postales para calcular costos mínimos de traslados y visitas.</p>
            
            <!-- Inline Form Zonas -->
            <div style="display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:10px;border:1px solid var(--border-glass);background:rgba(255,255,255,0.02)">
              <div class="qc-field">
                <label class="eyebrow" style="font-size:9.5px">Nombre Zona</label>
                <input class="qc-input" placeholder="Ej. Zona CABA Centro" [ngModel]="newZoneName()" (ngModelChange)="newZoneName.set($event)"/>
              </div>
              <div class="qc-field" style="margin-top:6px">
                <label class="eyebrow" style="font-size:9.5px">Código Postal</label>
                <input class="qc-input" placeholder="Ej. 1425" [ngModel]="newZoneCp()" (ngModelChange)="newZoneCp.set($event)"/>
              </div>
              <button class="btn btn--primary btn--sm" style="margin-top:10px;width:100%" [disabled]="!newZoneName() || !newZoneCp()" (click)="createZone()">
                + Agregar Zona
              </button>
            </div>

            <!-- Lista de Zonas -->
            <div style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;padding-right:4px">
              @for (z of zones(); track z.id) {
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;border-radius:8px;border:1px solid var(--border-glass);background:rgba(255,255,255,0.03)">
                  <div>
                    <div style="font-size:12.5px;font-weight:600;color:var(--text-primary)">{{ z.nombre }}</div>
                    <div class="mono micro" style="color:var(--text-muted)">CP: {{ z.codigoPostal }}</div>
                  </div>
                  <button class="btn btn--ghost btn--sm" style="margin-left:auto;color:var(--accent-red);padding:4px 8px" (click)="deleteZone(z.id)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              }
            </div>
          </div>

          <!-- COLUMNA 2: Tarifas de Prestaciones -->
          <div class="glass rounded-panel p-5 flex flex-col gap-4">
            <div style="display:flex;align-items:center;gap:8px">
              <h3 style="font-size:15px;font-weight:700;margin:0;color:var(--text-primary)">Matriz de Tarifas por Zona</h3>
              <span class="mono micro" style="margin-left:auto;color:var(--accent-emerald)">{{ tariffs().length }} TARIFAS</span>
            </div>
            <p style="font-size:11.5px;color:var(--text-muted);margin:0;line-height:1.4">Definí los costos base y de espera fraccionada para cada tipo de prestación médica según la zona geográfica.</p>

            <!-- Inline Form Tarifas -->
            <div style="display:grid;grid-template-columns:repeat(4, 1fr) auto;gap:10px;align-items:end;padding:14px;border-radius:10px;border:1px solid var(--border-glass);background:rgba(255,255,255,0.02)">
              <div class="qc-field">
                <label class="eyebrow" style="font-size:9.5px">Prestación Médica</label>
                <select class="qc-input" style="height:32px" [ngModel]="selectedPrestacionId()" (ngModelChange)="selectedPrestacionId.set(+$event)">
                  <option [value]="null">Seleccionar...</option>
                  @for (p of prestaciones(); track p.id) {
                    <option [value]="p.id">{{ p.nombre }}</option>
                  }
                </select>
              </div>
              <div class="qc-field">
                <label class="eyebrow" style="font-size:9.5px">Zona Geográfica</label>
                <select class="qc-input" style="height:32px" [ngModel]="selectedZoneId()" (ngModelChange)="selectedZoneId.set(+$event)">
                  <option [value]="null">Seleccionar...</option>
                  @for (z of zones(); track z.id) {
                    <option [value]="z.id">{{ z.nombre }} (CP {{ z.codigoPostal }})</option>
                  }
                </select>
              </div>
              <div class="qc-field">
                <label class="eyebrow" style="font-size:9.5px">Cargo Base ($)</label>
                <input class="qc-input" type="number" style="height:32px" [ngModel]="newTariffMin()" (ngModelChange)="newTariffMin.set(+$event)"/>
              </div>
              <div class="qc-field">
                <label class="eyebrow" style="font-size:9.5px">Espera 30 min ($)</label>
                <input class="qc-input" type="number" style="height:32px" [ngModel]="newTariffWait()" (ngModelChange)="newTariffWait.set(+$event)"/>
              </div>
              <button class="btn btn--primary" style="height:32px;white-space:nowrap;padding:0 14px;font-size:12px" [disabled]="!selectedPrestacionId() || !selectedZoneId()" (click)="createTariff()">
                + Agregar Tarifa
              </button>
            </div>

            <!-- Matriz / Tabla de Tarifas -->
            <div style="overflow-x:auto;border-radius:10px;border:1px solid var(--border-glass);background:rgba(0,0,0,0.15)">
              <table style="width:100%;border-collapse:collapse;text-align:left;font-size:12.5px">
                <thead>
                  <tr style="border-bottom:1px solid var(--border-glass);background:rgba(255,255,255,0.02)">
                    <th style="padding:10px 14px;font-weight:600;color:var(--text-secondary)">Prestación</th>
                    <th style="padding:10px 14px;font-weight:600;color:var(--text-secondary)">Zona / CP</th>
                    <th style="padding:10px 14px;font-weight:600;color:var(--text-secondary);text-align:right">Cargo Base</th>
                    <th style="padding:10px 14px;font-weight:600;color:var(--text-secondary);text-align:right">Espera 30 Min</th>
                    <th style="padding:10px 14px;font-weight:600;color:var(--text-secondary);text-align:center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of tariffs(); track t.id) {
                    <tr style="border-bottom:1px solid var(--border-hairline)">
                      <td style="padding:10px 14px;font-weight:500;color:var(--text-primary)">
                        {{ t.prestacion.nombre }} 
                        <span class="mono micro" style="color:var(--text-muted);margin-left:4px">[{{ t.prestacion.codigo }}]</span>
                      </td>
                      <td style="padding:10px 14px;color:var(--text-secondary)">
                        {{ t.zona.nombre }} 
                        <span class="mono micro" style="color:var(--text-muted)">({{ t.zona.codigoPostal }})</span>
                      </td>
                      <td class="mono" style="padding:10px 14px;text-align:right;color:var(--accent-emerald);font-weight:600">
                        {{ fmtCurrency(t.cargoMinimo) }}
                      </td>
                      <td class="mono" style="padding:10px 14px;text-align:right;color:var(--accent-blue)">
                        {{ fmtCurrency(t.costoEspera30Min) }}
                      </td>
                      <td style="padding:10px 14px;text-align:center">
                        <button class="btn btn--ghost btn--sm" style="color:var(--accent-red);padding:4px 8px" (click)="deleteTariff(t.id)">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" style="padding:20px;text-align:center;color:var(--text-muted)">
                        No hay tarifas configuradas en la matriz de cobertura.
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

          </div>
        </div>
      }
    </div>

    <!-- ═══════════════════════════════════════════════════════
         PLAN FORM MODAL
         ═══════════════════════════════════════════════════════ -->
    @if (formOpen()) {
      <div class="qc-overlay" (click)="closeForm()">
        <div class="qc-modal qc-modal--wide glass-strong" (click)="$event.stopPropagation()">

          <!-- Header modal -->
          <div class="qc-head">
            <div>
              <div class="eyebrow" style="color:var(--accent-blue)">● {{ editingPlan() ? 'EDITAR PLAN' : 'NUEVO PLAN' }}</div>
              <h2 style="margin:4px 0 0;font-size:20px;font-weight:600;letter-spacing:-0.01em">
                {{ editingPlan() ? form().name : 'Nuevo plan comercial' }}
              </h2>
            </div>
            <button class="qc-close-btn" (click)="closeForm()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
          </div>

          <div class="qc-body">

            <!-- ── Bloque 1: Información general ── -->
            <div class="form-section__head">
              <div class="form-section__step" [style.background]="tierColor(form().tier)">1</div>
              <div style="font-size:13px;font-weight:600;color:var(--text-primary)">Información general</div>
            </div>

            <div class="qc-field">
              <label class="eyebrow">Nombre del plan <span style="color:var(--accent-red)">*</span></label>
              <input class="qc-input" placeholder="Ej. Plan Familiar Premium" [(ngModel)]="formName" autofocus/>
            </div>

            <div class="qc-field" style="margin-top:12px">
              <label class="eyebrow">Nivel</label>
              <div class="tier-segment">
                <button type="button" class="tier-btn"
                  [style.background]="form().tier === 'basico' ? 'var(--text-muted)18' : 'rgba(255,255,255,0.03)'"
                  [style.border-color]="form().tier === 'basico' ? 'var(--text-muted)' : 'var(--border-glass)'"
                  [style.color]="form().tier === 'basico' ? 'var(--text-secondary)' : 'var(--text-muted)'"
                  (click)="patchForm({ tier: 'basico' })">Básico</button>
                <button type="button" class="tier-btn"
                  [style.background]="form().tier === 'medio' ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.03)'"
                  [style.border-color]="form().tier === 'medio' ? 'var(--accent-blue)' : 'var(--border-glass)'"
                  [style.color]="form().tier === 'medio' ? 'var(--accent-blue)' : 'var(--text-muted)'"
                  (click)="patchForm({ tier: 'medio' })">Medio</button>
                <button type="button" class="tier-btn"
                  [style.background]="form().tier === 'premium' ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.03)'"
                  [style.border-color]="form().tier === 'premium' ? 'var(--accent-emerald)' : 'var(--border-glass)'"
                  [style.color]="form().tier === 'premium' ? 'var(--accent-emerald)' : 'var(--text-muted)'"
                  (click)="patchForm({ tier: 'premium' })">Premium</button>
              </div>
            </div>

            <div class="qc-field" style="margin-top:12px">
              <label class="eyebrow">Descripción</label>
              <textarea class="qc-input" rows="3" placeholder="Descripción breve del plan y su propuesta de valor..." [(ngModel)]="formDescription" style="resize:vertical;min-height:70px"></textarea>
            </div>

            <div class="qc-field" style="margin-top:12px">
              <label class="eyebrow">Modalidad</label>
              <div class="modality-grid">
                <button type="button" class="modality-card" [attr.data-active]="form().modality === 'individual'" (click)="patchForm({ modality: 'individual' })">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span style="font-size:12px;font-weight:500">Individual</span>
                </button>
                <button type="button" class="modality-card" [attr.data-active]="form().modality === 'familiar'" (click)="patchForm({ modality: 'familiar' })">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  <span style="font-size:12px;font-weight:500">Familiar</span>
                </button>
                <button type="button" class="modality-card" [attr.data-active]="form().modality === 'institucional'" (click)="patchForm({ modality: 'institucional' })">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <span style="font-size:12px;font-weight:500">Institucional</span>
                </button>
              </div>
            </div>

            <div class="form-section__divider"></div>

            <!-- ── Bloque 2: Precios ── -->
            <div class="form-section__head">
              <div class="form-section__step" style="background:var(--accent-emerald)">2</div>
              <div style="font-size:13px;font-weight:600;color:var(--text-primary)">Configuración de precios</div>
            </div>

            <!-- Precio mensual destacado -->
            <div class="pricing-featured">
              <label class="eyebrow" style="display:block;margin-bottom:6px">Precio mensual <span style="color:var(--accent-red)">*</span></label>
              <div style="display:flex;align-items:center;gap:8px">
                <span class="mono" style="font-size:16px;color:var(--text-muted)">$</span>
                <input class="qc-input" type="number" placeholder="0" [(ngModel)]="formMonthly" style="font-size:18px;font-weight:600;font-family:var(--font-mono)"/>
              </div>
            </div>

            <!-- Grid: trimestral / anual / descuento -->
            <div class="pricing-grid">
              <div class="qc-field">
                <label class="eyebrow">Trimestral</label>
                <div style="display:flex;align-items:center;gap:6px">
                  <span class="mono micro" style="color:var(--text-muted)">$</span>
                  <input class="qc-input" type="number" placeholder="0" [(ngModel)]="formQuarterly"/>
                </div>
                @if (form().quarterly > 0 && form().monthly > 0) {
                  @let savings3 = form().monthly * 3 - form().quarterly;
                  @if (savings3 > 0) {
                    <div style="font-size:10.5px;color:var(--accent-emerald);margin-top:3px;font-family:var(--font-mono)">ahorro vs mensual: {{ fmtCurrency(savings3) }}</div>
                  }
                }
              </div>
              <div class="qc-field">
                <label class="eyebrow">Anual</label>
                <div style="display:flex;align-items:center;gap:6px">
                  <span class="mono micro" style="color:var(--text-muted)">$</span>
                  <input class="qc-input" type="number" placeholder="0" [(ngModel)]="formAnnual"/>
                </div>
                @if (form().annual > 0 && form().monthly > 0) {
                  @let savings12 = form().monthly * 12 - form().annual;
                  @if (savings12 > 0) {
                    <div style="font-size:10.5px;color:var(--accent-emerald);margin-top:3px;font-family:var(--font-mono)">ahorro vs mensual: {{ fmtCurrency(savings12) }}</div>
                  }
                }
              </div>
              <div class="qc-field">
                <label class="eyebrow">Descuento %</label>
                <input class="qc-input" type="number" placeholder="0" [(ngModel)]="formDiscountPct" min="0" max="100"/>
              </div>
            </div>

            @if (form().modality === 'familiar') {
              <div class="qc-field" style="margin-top:12px;padding:10px 14px;border-radius:10px;border:1px solid var(--border-glass);background:rgba(255,255,255,0.02)">
                <label class="eyebrow">Precio por dependiente adicional</label>
                <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
                  <span class="mono" style="color:var(--text-muted)">$</span>
                  <input class="qc-input" type="number" placeholder="0" [(ngModel)]="formPerDependent"/>
                </div>
              </div>
            }

            <div class="form-section__divider"></div>

            <!-- ── Bloque 3: Límites y carencias ── -->
            <div class="form-section__head">
              <div class="form-section__step" style="background:var(--accent-amber)">3</div>
              <div style="font-size:13px;font-weight:600;color:var(--text-primary)">Límites y carencias</div>
            </div>

            <div class="pricing-grid">
              <div class="qc-field">
                <label class="eyebrow">Tope mensual <span style="color:var(--text-muted)">(0=ilimitado)</span></label>
                <input class="qc-input" type="number" placeholder="0" [(ngModel)]="formMonthlyCap" min="0"/>
                <div class="mono micro" style="color:var(--text-muted);margin-top:3px">0 = sin límite de atenciones</div>
              </div>
              <div class="qc-field">
                <label class="eyebrow">Atenciones sin cargo</label>
                <input class="qc-input" type="number" placeholder="0" [(ngModel)]="formFreeIncluded" min="0"/>
                <div class="mono micro" style="color:var(--text-muted);margin-top:3px">incluidas sin costo adicional</div>
                @if (form().freeIncluded > form().monthlyCap && form().monthlyCap > 0) {
                  <div style="font-size:11px;color:var(--accent-red);margin-top:4px">Las gratuitas no pueden superar el tope</div>
                }
              </div>
              <div class="qc-field">
                <label class="eyebrow">Días de carencia</label>
                <input class="qc-input" type="number" placeholder="0" [(ngModel)]="formCarencyDays" min="0"/>
                <div class="mono micro" style="color:var(--text-muted);margin-top:3px">0 = cobertura inmediata</div>
              </div>
            </div>

            <div class="form-section__divider"></div>

            <!-- ── Bloque 4: Prestaciones N:M ── -->
            <div class="form-section__head">
              <div class="form-section__step" style="background:var(--accent-blue)">4</div>
              <div style="font-size:13px;font-weight:600;color:var(--text-primary)">Prestaciones incluidas</div>
              <span class="mono micro" style="margin-left:auto;color:var(--accent-blue)">{{ includedPrestacionCount() }}/{{ planPrestacionRows().length }} INCLUIDAS</span>
            </div>

            @if (loadingPlanPrestaciones()) {
              <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12px">Cargando prestaciones...</div>
            } @else if (planPrestacionRows().length === 0) {
              <div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12px">No hay prestaciones médicas configuradas.</div>
            } @else {
              <div class="pp-table">
                <div class="pp-table__header">
                  <span>Prestación</span>
                  <span>Tipo cargo</span>
                  <span style="text-align:center">Límite/mes</span>
                  <span style="text-align:center">Req. orden</span>
                  <span style="text-align:center">Activa</span>
                </div>
                @for (row of planPrestacionRows(); track row.prestacionId) {
                  <div class="pp-row" [attr.data-included]="row.included">
                    <div>
                      <div style="font-size:12px;font-weight:500;color:var(--text-primary)">{{ row.nombre }}</div>
                      <div class="mono micro" style="color:var(--text-muted)">{{ row.codigo }}</div>
                    </div>
                    <div>
                      @if (row.included) {
                        <div style="display:flex;flex-direction:column;gap:4px">
                          <select class="qc-input" style="height:26px;font-size:11px;padding:0 6px"
                            [ngModel]="row.tipoCargo"
                            (ngModelChange)="patchPpRow(row.prestacionId, { tipoCargo: $event })">
                            <option value="SIN_CARGO">Sin cargo</option>
                            <option value="CARGO_MINIMO">Cargo mínimo</option>
                            <option value="CON_PRESUPUESTO">Con presupuesto</option>
                            <option value="SEGUN_ZONA">Según zona</option>
                          </select>
                          @if (row.tipoCargo === 'CARGO_MINIMO') {
                            <input class="qc-input" type="number" placeholder="$0" style="height:22px;font-size:11px;padding:0 6px"
                              [ngModel]="row.cargoMinimo"
                              (ngModelChange)="patchPpRow(row.prestacionId, { cargoMinimo: $event ? +$event : null })"/>
                          }
                        </div>
                      } @else {
                        <span class="mono micro" style="color:var(--text-muted)">—</span>
                      }
                    </div>
                    <div style="text-align:center">
                      @if (row.included) {
                        <input class="qc-input" type="number" placeholder="∞" style="height:26px;font-size:11px;width:56px;text-align:center;padding:0 4px"
                          [ngModel]="row.limiteMensual"
                          (ngModelChange)="patchPpRow(row.prestacionId, { limiteMensual: $event ? +$event : null })"/>
                      } @else {
                        <span class="mono micro" style="color:var(--text-muted)">—</span>
                      }
                    </div>
                    <div style="display:flex;justify-content:center">
                      @if (row.included) {
                        <button type="button" class="toggle-sw" [class.is-on]="row.requiereOrdenMedica"
                          (click)="patchPpRow(row.prestacionId, { requiereOrdenMedica: !row.requiereOrdenMedica })">
                          <div class="toggle-sw__track"><div class="toggle-sw__thumb"></div></div>
                        </button>
                      } @else {
                        <span class="mono micro" style="color:var(--text-muted)">—</span>
                      }
                    </div>
                    <div style="display:flex;justify-content:center">
                      <button type="button" class="toggle-sw" [class.is-on]="row.included"
                        (click)="togglePpRow(row.prestacionId)">
                        <div class="toggle-sw__track"><div class="toggle-sw__thumb"></div></div>
                      </button>
                    </div>
                  </div>
                }
              </div>
            }

          @if (consistencyWarnings().length > 0) {
            <div style="margin-top:12px;padding:10px 14px;border-radius:8px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3)">
              <div class="eyebrow" style="color:var(--accent-amber);margin-bottom:6px">⚠ Inconsistencias detectadas</div>
              @for (w of consistencyWarnings(); track $index) {
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:3px">• {{ w }}</div>
              }
              <div style="font-size:11px;color:var(--text-muted);margin-top:6px">
                Revisá los flags del plan vs las Prestaciones configuradas.
              </div>
            </div>
          }

          </div><!-- /qc-body -->

          <div class="qc-foot">
            <div class="qc-hint">
              <span class="kbd">Esc</span> cerrar &nbsp;·&nbsp;
              {{ includedPrestacionCount() }} prestaciones activas
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn--ghost" (click)="closeForm()">Cancelar</button>
              <button class="btn btn--primary"
                [disabled]="!canSubmit() || loadingSave()"
                [style.opacity]="!canSubmit() || loadingSave() ? '0.5' : '1'"
                (click)="saveForm()">
                @if (loadingSave()) {
                  <span style="width:12px;height:12px;border:1.5px solid currentColor;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin 0.65s linear infinite"></span>
                } @else {
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                }
                {{ loadingSave() ? 'Guardando…' : 'Guardar plan' }}
              </button>
            </div>
          </div>

        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; height: 100%; overflow-y: auto; }

    /* ── Plans tabs ── */
    .plans-tabs {
      display: flex;
      gap: 8px;
      padding: 0 0 16px;
      flex-shrink: 0;
    }
    .plans-tab {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      padding: 14px 18px;
      border-radius: 12px;
      border: 1px solid var(--border-glass);
      background: rgba(255,255,255,0.02);
      color: var(--text-secondary);
      cursor: pointer;
      text-align: left;
      transition: all 0.15s;
    }
    .plans-tab:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
    .plans-tab[data-active="true"] {
      background: rgba(59,130,246,0.08);
      border-color: rgba(59,130,246,0.35);
      color: var(--accent-blue);
      box-shadow: -3px 0 0 var(--accent-blue) inset;
    }

    /* ── Plans grid ── */
    .plans-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      padding: 0;
      align-content: start;
    }

    /* ── Pricing card ── */
    .pricing-card {
      position: relative;
      border-radius: 14px;
      border: 1px solid var(--border-glass);
      background: var(--bg-elevated);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: all 0.15s;
    }
    .pricing-card:hover { border-color: var(--border-strong); box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
    .pricing-card--off { opacity: 0.45; }
    .pricing-card--empty {
      border-style: dashed;
      cursor: pointer;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      color: var(--text-muted);
      background: transparent;
    }
    .pricing-card--empty:hover { background: rgba(255,255,255,0.03); color: var(--text-secondary); }

    /* ── Tier badge ── */
    .tier-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 5px;
      font-size: 10.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    /* ── Coverage icon btn ── */
    .cov-icon-btn {
      width: 28px; height: 28px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid;
      flex-shrink: 0;
    }

    /* ── Toggle switch ── */
    .toggle-sw {
      display: inline-flex;
      align-items: center;
      gap: 0;
      padding: 0;
      background: transparent;
      border: none;
      cursor: pointer;
    }
    .toggle-sw__track {
      width: 34px; height: 18px;
      border-radius: 999px;
      background: rgba(148,163,184,0.32);
      position: relative;
      transition: all 0.16s;
      border: 1px solid rgba(148,163,184,0.32);
    }
    .toggle-sw__thumb {
      position: absolute;
      top: 1px; left: 1px;
      width: 14px; height: 14px;
      border-radius: 99px;
      background: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.25);
      transition: all 0.16s;
    }
    .toggle-sw.is-on .toggle-sw__track {
      background: var(--accent-emerald);
      border-color: var(--accent-emerald);
    }
    .toggle-sw.is-on .toggle-sw__thumb { left: 17px; }

    /* ── Form sections ── */
    .form-section__head {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .form-section__step {
      width: 22px; height: 22px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700;
      color: white;
      flex-shrink: 0;
    }
    .form-section__divider {
      height: 1px;
      background: var(--border-hairline);
      margin: 20px 0;
    }

    /* ── Modality grid ── */
    .modality-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .modality-card {
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--border-glass);
      background: transparent;
      cursor: pointer;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      color: var(--text-secondary);
      transition: all 0.15s;
    }
    .modality-card:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); }
    .modality-card[data-active="true"] {
      background: rgba(59,130,246,0.1);
      border-color: rgba(59,130,246,0.4);
      color: var(--accent-blue);
    }

    /* ── Pricing inputs ── */
    .pricing-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }
    .pricing-featured {
      padding: 14px 16px;
      border-radius: 10px;
      border: 1px solid rgba(59,130,246,0.35);
      background: rgba(59,130,246,0.06);
      margin-bottom: 10px;
    }

    /* ── Coverage cards ── */
    .coverage-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--border-glass);
      cursor: pointer;
      transition: all 0.15s;
    }
    .coverage-card:hover { background: rgba(255,255,255,0.03); }
    .coverage-card[data-active="true"] {
      background: rgba(59,130,246,0.08);
      border-color: rgba(59,130,246,0.35);
    }
    .coverages-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .cov-mini-toggle { margin-left: auto; }

    /* ── Tier segment ── */
    .tier-segment {
      display: flex;
      gap: 4px;
    }
    .tier-btn {
      flex: 1;
      height: 34px;
      border-radius: var(--r-btn);
      border: 1px solid var(--border-glass);
      background: rgba(255,255,255,0.03);
      cursor: pointer;
      font-size: 12px;
      font-family: var(--font-sans);
      color: var(--text-muted);
      transition: all 0.15s;
    }
    .tier-btn:hover { background: rgba(255,255,255,0.06); }

    /* ── PlanPrestacion table ── */
    .pp-table {
      border: 1px solid var(--border-glass);
      border-radius: 10px;
      overflow: hidden;
      background: rgba(0,0,0,0.1);
    }
    .pp-table__header {
      display: grid;
      grid-template-columns: 1fr 130px 70px 80px 60px;
      padding: 7px 12px;
      background: rgba(255,255,255,0.03);
      border-bottom: 1px solid var(--border-glass);
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      gap: 8px;
      align-items: center;
    }
    .pp-row {
      display: grid;
      grid-template-columns: 1fr 130px 70px 80px 60px;
      padding: 9px 12px;
      border-bottom: 1px solid var(--border-hairline);
      align-items: center;
      gap: 8px;
      transition: background 0.12s;
    }
    .pp-row:last-child { border-bottom: none; }
    .pp-row:hover { background: rgba(255,255,255,0.02); }
    .pp-row[data-included="true"] { background: rgba(59,130,246,0.04); }

    /* ── Close button ── */
    .qc-close-btn {
      width: 32px; height: 32px;
      border-radius: 8px;
      border: 1px solid var(--border-glass);
      background: rgba(255,255,255,0.04);
      color: var(--text-muted);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s;
    }
    .qc-close-btn:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }

    /* ── Modal ── */
    .qc-overlay {
      position: fixed; inset: 0; z-index: 300;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(3px);
      display: flex; align-items: center; justify-content: center;
    }
    .qc-modal {
      width: 540px;
      max-width: 95vw;
      max-height: 90vh;
      border-radius: var(--r-card);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .qc-modal--wide { width: 640px; }
    .qc-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 20px 20px 16px;
      flex-shrink: 0;
      border-bottom: 1px solid var(--border-hairline);
    }
    .qc-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
    .qc-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-top: 1px solid var(--border-hairline);
      flex-shrink: 0;
    }
    .qc-hint {
      font-size: 11.5px;
      color: var(--text-muted);
    }
    .qc-row {
      display: flex;
      gap: 12px;
    }
    .qc-field {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
  `],
})
export class PlansComponent implements OnInit {
    private destroyRef = inject(DestroyRef);
  private api = inject(PlanComercialApiService);
  private zonesApi = inject(ZonesApiService);

  readonly coverageMeta = COVERAGE_META;

  // ── State ──
  readonly tab = signal<'particulares' | 'corporativos' | 'zonas'>('particulares');
  readonly consistencyWarnings = signal<string[]>([]);
  readonly planPrestacionRows = signal<PlanPrestacionRow[]>([]);
  readonly loadingPlanPrestaciones = signal(false);
  readonly loadingSave = signal(false);
  readonly plans = signal<Plan[]>([]);
  readonly formOpen = signal(false);
  readonly editingPlan = signal<Plan | null>(null);
  readonly form = signal<PlanForm>(emptyForm());

  // ── Zonas / Tarifas State ──
  readonly zones = signal<ZonaCoberturaDTO[]>([]);
  readonly tariffs = signal<TarifaPrestacionZonaDTO[]>([]);
  readonly prestaciones = signal<PrestacionMedicaDTO[]>([]);

  // Zonas form
  readonly newZoneName = signal('');
  readonly newZoneCp = signal('');

  // Tarifas form
  readonly selectedZoneId = signal<number | null>(null);
  readonly selectedPrestacionId = signal<number | null>(null);
  readonly newTariffMin = signal(1500);
  readonly newTariffWait = signal(500);

  // ── Two-way ngModel bridges (signals + getters/setters) ──
  get formName(): string { return this.form().name; }
  set formName(v: string) { this.patchForm({ name: v }); }

  get formDescription(): string { return this.form().description; }
  set formDescription(v: string) { this.patchForm({ description: v }); }

  get formMonthly(): number { return this.form().monthly; }
  set formMonthly(v: number) { this.patchForm({ monthly: +v }); }

  get formQuarterly(): number { return this.form().quarterly; }
  set formQuarterly(v: number) { this.patchForm({ quarterly: +v }); }

  get formAnnual(): number { return this.form().annual; }
  set formAnnual(v: number) { this.patchForm({ annual: +v }); }

  get formDiscountPct(): number { return this.form().discountPct; }
  set formDiscountPct(v: number) { this.patchForm({ discountPct: +v }); }

  get formPerDependent(): number { return this.form().perDependent; }
  set formPerDependent(v: number) { this.patchForm({ perDependent: +v }); }

  get formMonthlyCap(): number { return this.form().monthlyCap; }
  set formMonthlyCap(v: number) { this.patchForm({ monthlyCap: +v }); }

  get formFreeIncluded(): number { return this.form().freeIncluded; }
  set formFreeIncluded(v: number) { this.patchForm({ freeIncluded: +v }); }

  get formCarencyDays(): number { return this.form().carencyDays; }
  set formCarencyDays(v: number) { this.patchForm({ carencyDays: +v }); }

  // ── Computed ──
  readonly filteredPlans = computed(() =>
    this.plans().filter(p => p.audience === this.tab())
  );

  readonly canSubmit = computed(() => this.form().name.trim().length > 0);

  readonly activeCoverageCount = computed(() => {
    const c = this.form().coverages;
    return (Object.keys(c) as (keyof PlanCoverages)[]).filter(k => c[k]).length;
  });

  readonly includedPrestacionCount = computed(() =>
    this.planPrestacionRows().filter(r => r.included).length
  );

  // ── KPI helpers ──
  countByAudience(audience: 'particulares' | 'corporativos'): number {
    return this.plans().filter(p => p.audience === audience).length;
  }

  countActive(): number {
    return this.plans().filter(p => p.active).length;
  }

  countPaused(): number {
    return this.plans().filter(p => !p.active).length;
  }

  // ── Display helpers ──
  tierColor(tier: string): string {
    return TIER_COLOR[tier] ?? 'var(--text-muted)';
  }

  tierLabel(tier: string): string {
    const labels: Record<string, string> = { basico: 'Básico', medio: 'Medio', premium: 'Premium' };
    return labels[tier] ?? tier;
  }

  modalityLabel(modality: string): string {
    const labels: Record<string, string> = { individual: 'Individual', familiar: 'Familiar', institucional: 'Institucional' };
    return labels[modality] ?? modality;
  }

  activeCoverages(plan: Plan): { key: keyof PlanCoverages; name: string; sub: string }[] {
    return COVERAGE_META.filter(m => plan.coverages[m.key]);
  }

  readonly fmtN = fmtN;
  readonly fmtCurrency = fmtCurrency;

  // ── Lifecycle ──
  ngOnInit(): void {
    this.api.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => this.plans.set(data));
    this.loadZonesAndTariffs();
  }

  private loadPlanPrestaciones(planId?: number): void {
    this.loadingPlanPrestaciones.set(true);
    this.planPrestacionRows.set([]);
    const prestaciones$ = this.zonesApi.getPrestaciones();
    const existing$ = planId
      ? this.api.getPrestacionesByPlan(planId).pipe(catchError(() => of([] as PlanPrestacionDTO[])))
      : of([] as PlanPrestacionDTO[]);

    forkJoin({ prestaciones: prestaciones$, existing: existing$ })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ prestaciones, existing }) => {
        const rows: PlanPrestacionRow[] = prestaciones
          .filter(p => p.activo)
          .map(p => {
            const match = existing.find(e => e.prestacion.id === p.id);
            return {
              prestacionId: p.id,
              nombre: p.nombre,
              codigo: p.codigo,
              tipoAsistencia: p.tipoAsistencia,
              included: !!match,
              tipoCargo: match?.tipoCargo ?? 'SIN_CARGO',
              limiteMensual: match?.limiteMensual ?? null,
              requiereOrdenMedica: match?.requiereOrdenMedica ?? false,
              cargoMinimo: match?.cargoMinimo ?? null,
              existingId: match?.id,
            };
          });
        this.planPrestacionRows.set(rows);
        this.loadingPlanPrestaciones.set(false);
      });
  }

  patchPpRow(prestacionId: number, patch: Partial<PlanPrestacionRow>): void {
    this.planPrestacionRows.update(rows =>
      rows.map(r => r.prestacionId === prestacionId ? { ...r, ...patch } : r)
    );
  }

  togglePpRow(prestacionId: number): void {
    this.planPrestacionRows.update(rows =>
      rows.map(r => r.prestacionId === prestacionId ? { ...r, included: !r.included } : r)
    );
  }

  private syncPlanPrestaciones(planId: number): Observable<void> {
    const rows = this.planPrestacionRows();
    const ops: Observable<unknown>[] = [];

    for (const row of rows) {
      const base: PlanPrestacionDTO = {
        tipoCargo: row.tipoCargo,
        cargoMinimo: row.cargoMinimo,
        limiteMensual: row.limiteMensual,
        requiereOrdenMedica: row.requiereOrdenMedica,
        planComercial: { id: planId },
        prestacion: { id: row.prestacionId },
        empresa: { id: 0 },
      };
      if (row.included && !row.existingId) {
        ops.push(this.api.createPlanPrestacion(base));
      } else if (row.included && row.existingId) {
        ops.push(this.api.updatePlanPrestacion(row.existingId, { ...base, id: row.existingId }));
      } else if (!row.included && row.existingId) {
        ops.push(this.api.deletePlanPrestacion(row.existingId));
      }
    }

    return ops.length === 0 ? of(undefined) : forkJoin(ops).pipe(map(() => undefined));
  }

  loadZonesAndTariffs(): void {
    this.zonesApi.getZones().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => this.zones.set(data));
    this.zonesApi.getTariffs().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => this.tariffs.set(data));
    this.zonesApi.getPrestaciones().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => this.prestaciones.set(data));
  }

  // ── Zones Actions ──
  createZone(): void {
    if (!this.newZoneName().trim() || !this.newZoneCp().trim()) return;
    this.zonesApi.createZone({
      nombre: this.newZoneName(),
      codigoPostal: this.newZoneCp()
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.newZoneName.set('');
      this.newZoneCp.set('');
      this.loadZonesAndTariffs();
    });
  }

  deleteZone(id?: number): void {
    if (!id) return;
    this.zonesApi.deleteZone(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadZonesAndTariffs();
    });
  }

  // ── Tariffs Actions ──
  createTariff(): void {
    const zonaId = this.selectedZoneId();
    const prestacionId = this.selectedPrestacionId();
    if (!zonaId || !prestacionId) return;
    this.zonesApi.createTariff({
      cargoMinimo: this.newTariffMin(),
      costoEspera30Min: this.newTariffWait(),
      prestacion: { id: prestacionId },
      zona: { id: zonaId }
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.selectedZoneId.set(null);
      this.selectedPrestacionId.set(null);
      this.newTariffMin.set(1500);
      this.newTariffWait.set(500);
      this.loadZonesAndTariffs();
    });
  }

  deleteTariff(id?: number): void {
    if (!id) return;
    this.zonesApi.deleteTariff(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadZonesAndTariffs();
    });
  }

  // ── Actions ──
  toggleActive(id: string): void {
    this.plans.update(list =>
      list.map(p => p.id === id ? { ...p, active: !p.active } : p)
    );
  }

  openNewForm(): void {
    this.editingPlan.set(null);
    this.consistencyWarnings.set([]);
    const aud = this.tab() === 'zonas' ? 'particulares' : this.tab() as 'particulares' | 'corporativos';
    this.form.set({ ...emptyForm(), audience: aud });
    this.formOpen.set(true);
    this.loadPlanPrestaciones();
  }

  openEditForm(plan: Plan): void {
    this.consistencyWarnings.set([]);
    this.editingPlan.set(plan);
    this.form.set({
      name: plan.name,
      tier: plan.tier,
      description: plan.description ?? '',
      modality: plan.modality,
      audience: plan.audience,
      monthly: plan.pricing.monthly,
      quarterly: plan.pricing.quarterly,
      annual: plan.pricing.annual,
      perDependent: plan.pricing.perDependent,
      discountPct: plan.pricing.discountPct,
      monthlyCap: plan.limits.monthlyCap,
      freeIncluded: plan.limits.freeIncluded,
      carencyDays: plan.limits.carencyDays,
      coverages: { ...plan.coverages },
    });
    this.formOpen.set(true);
    this.loadPlanPrestaciones(+plan.id);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingPlan.set(null);
    this.planPrestacionRows.set([]);
    this.loadingSave.set(false);
  }

  patchForm(patch: Partial<PlanForm>): void {
    this.form.set({ ...this.form(), ...patch });
  }

  toggleCoverage(key: keyof PlanCoverages): void {
    const coverages = { ...this.form().coverages, [key]: !this.form().coverages[key] };
    this.patchForm({ coverages });
  }

  saveForm(): void {
    if (!this.canSubmit()) return;
    const f = this.form();
    const editing = this.editingPlan();

    const dto: Plan = {
      id: editing?.id ?? '',
      name: f.name,
      description: f.description,
      tier: f.tier,
      modality: f.modality,
      audience: f.audience,
      pricing: {
        monthly: f.monthly,
        quarterly: f.quarterly,
        annual: f.annual,
        perDependent: f.perDependent,
        discountPct: f.discountPct,
      },
      limits: {
        monthlyCap: f.monthlyCap,
        freeIncluded: f.freeIncluded,
        carencyDays: f.carencyDays,
      },
      coverages: { ...f.coverages },
      active: editing?.active ?? true,
    };

    this.loadingSave.set(true);
    const op = editing ? this.api.update(dto) : this.api.create(dto);
    op.pipe(
      switchMap(savedPlan => this.syncPlanPrestaciones(+savedPlan.id).pipe(
        map(() => savedPlan)
      )),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (savedPlan) => {
        this.api.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => this.plans.set(data));
        if (savedPlan.id) {
          this.api.validarConsistenciaPlan(Number(savedPlan.id)).pipe(
            catchError(() => of([] as string[]))
          ).subscribe(warnings => {
            this.consistencyWarnings.set(warnings);
          });
        }
        this.closeForm();
      },
      error: () => { this.loadingSave.set(false); },
    });
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.formOpen()) { this.closeForm(); }
  }
}
