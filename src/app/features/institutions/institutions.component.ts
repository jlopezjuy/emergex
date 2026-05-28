import { Component, OnInit, signal, computed, HostListener, inject, DestroyRef } from '@angular/core';
import { SessionStore } from '../../core/stores/session.store';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { InstitutionsApiService } from '../../data-access/api/institutions.api';
import { PlanComercialApiService } from '../../data-access/api/plan-comercial.api';
import { environment } from '../../../environments/environment';
import { DateUtils } from '../../core/utils/date.utils';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { InstitutionDetailDrawerComponent, DrawerInstitution } from './components/institution-detail-drawer/institution-detail-drawer.component';
import { InstitutionFormModalComponent, InstitutionForm } from './components/institution-form-modal/institution-form-modal.component';
import { InstitutionType } from '../../data-access/dto/institution.dto';

interface CommercialPlanItem {
  id: string;
  numericId: number;
  name: string;
  color: string;
  monthlyBase: number;
  tier: string;
}

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface InstitutionContract {
  id?: number;
  code: string;
  plan: string;
  from: string;
  to: string;
  status: 'active' | 'suspended' | 'ended' | 'draft';
  monthlyPrice: number;
  monthlyCap: number;
  kpiMinutes: number;
  conditions: string;
  polygonPoints?: { x: number; y: number }[];
}

interface Institution {
  id: string;
  name: string;
  razonSocial: string;
  cuit: string;
  type: InstitutionType;
  status: 'activa' | 'inactiva';
  plan: string;
  email: string;
  phone: string;
  adminContact: string;
  opsContact: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  polygon?: [number, number][];
  members: number;
  sinceMonth: string;
  contract: InstitutionContract;
}


// ─── Constants ────────────────────────────────────────────────────────────────

const INSTITUTION_TYPES = [
  { id: 'colegio',     label: 'Colegio / Escuela',      icon: '🎓' },
  { id: 'universidad', label: 'Universidad',             icon: '🏛️' },
  { id: 'empresa',     label: 'Empresa / Industria',     icon: '🏭' },
  { id: 'club',        label: 'Club / Deporte',          icon: '⚽' },
  { id: 'hospital',    label: 'Hospital / Clínica',      icon: '🏥' },
  { id: 'gobierno',    label: 'Gobierno / Municipio',    icon: '🏛️' },
  { id: 'ong',         label: 'ONG / Fundación',         icon: '🤝' },
  { id: 'otro',        label: 'Otro',                    icon: '📍' },
];

function planTierColor(tier: string): string {
  if (tier === 'premium') return 'var(--accent-emerald)';
  if (tier === 'medio')   return 'var(--accent-blue)';
  return 'var(--text-muted)';
}

const INSTITUTIONS_SEED: Institution[] = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 });
}

function avatarOf(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

function emptyForm(): InstitutionForm {
  return {
    name: '', razonSocial: '', cuit: '', type: 'empresa', plan: 'corp-medio', status: 'activa',
    email: '', phone: '', adminContact: '', opsContact: '', address: '', city: 'San Salvador de Jujuy',
    lat: 0, lng: 0,
  };
}

function diffDays(from: string, to: string): number {
  if (!from || !to) return 0;
  const a = DateUtils.fromISO(from);
  const b = DateUtils.fromISO(to);
  return Math.max(0, Math.round(b.diff(a, 'days').days));
}

function diffMonths(from: string, to: string): number {
  if (!from || !to) return 0;
  const a = DateUtils.fromISO(from);
  const b = DateUtils.fromISO(to);
  return Math.max(0, Math.floor(b.diff(a, 'months').months));
}

const PAGE_SIZE = 10;

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-institutions',
  standalone: true,
  imports: [FormsModule, StatusBadgeComponent, InstitutionDetailDrawerComponent, InstitutionFormModalComponent],
  template: `
    <div class="screen">

      <!-- ── Header ── -->
      <div class="screen-head">
        <div class="screen-head__title">
          <div class="screen-head__icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--accent-blue)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="14" height="10" rx="1"/>
              <path d="M6 7V5a3 3 0 0 1 6 0v2"/>
              <line x1="9" y1="11" x2="9" y2="13"/>
              <line x1="7" y1="12" x2="11" y2="12"/>
            </svg>
          </div>
          <div>
            <h2>Instituciones Corporativas</h2>
            <div class="eyebrow">CLIENTES B2B · CONTRATOS · COBERTURAS</div>
          </div>
        </div>

        <div class="screen-head__kpis">
          <div class="screen-kpi">
            <div class="eyebrow">Instituciones</div>
            <div class="mono" style="font-size:18px;font-weight:500">{{ counts().total }}</div>
          </div>
          <div class="screen-kpi">
            <div class="eyebrow">Activas</div>
            <div class="mono" style="font-size:18px;font-weight:500;color:var(--accent-emerald)">{{ counts().activas }}</div>
          </div>
          <div class="screen-kpi">
            <div class="eyebrow">Inactivas</div>
            <div class="mono" style="font-size:18px;font-weight:500;color:var(--text-muted)">{{ counts().inactivas }}</div>
          </div>
          <div class="screen-kpi">
            <div class="eyebrow">Personas cubiertas</div>
            <div class="mono" style="font-size:18px;font-weight:500;color:var(--accent-blue)">{{ counts().members }}</div>
          </div>
        </div>

        <div class="screen-head__actions">
          <button class="btn btn--ghost btn--sm">Exportar</button>
          @if (canEdit()) {
            <button class="btn btn--primary btn--sm" (click)="openNewForm()">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
              Nueva institución
            </button>
          }
        </div>
      </div>

      <!-- ── Table card ── -->
      <div class="glass-strong pt-card">

        <!-- Toolbar -->
        <div class="pt-toolbar">
          <div class="pt-search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"><circle cx="6" cy="6" r="4"/><path d="M9.5 9.5l3 3"/></svg>
            <input
              class="pt-search__input"
              placeholder="Buscar por nombre, razón social o CUIT…"
              [(ngModel)]="searchQuery"
              (ngModelChange)="page.set(0)"
            />
          </div>

          <div class="pt-filters">
            <span class="eyebrow" style="white-space:nowrap">Estado:</span>
            @for (s of statusOptions; track s.value) {
              <button
                class="filter-chip"
                [attr.data-on]="statusFilter() === s.value"
                (click)="setStatus(s.value)"
              >{{ s.label }}</button>
            }
          </div>

          <div class="pt-filters">
            <span class="eyebrow" style="white-space:nowrap">Tipo:</span>
            <select class="qc-input" style="height:28px;font-size:11.5px;padding:0 8px;width:180px" [(ngModel)]="typeFilterValue" (ngModelChange)="page.set(0)">
              <option value="all">Todos los tipos</option>
              @for (t of institutionTypes; track t.id) {
                <option [value]="t.id">{{ t.icon }} {{ t.label }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Table -->
        <div class="data-table-wrap scroll-y">
          <table class="data-table" style="width:100%;min-width:820px">
            <thead>
              <tr>
                <th>Institución</th>
                <th>Razón social</th>
                <th>CUIT</th>
                <th>Tipo</th>
                <th>Estado</th>
                <th>Plan</th>
                <th style="width:40px"></th>
              </tr>
            </thead>
            <tbody>
              @if (paged().length === 0) {
                <tr>
                  <td colspan="7" style="padding:40px;text-align:center;color:var(--text-muted);font-size:12px">Sin resultados</td>
                </tr>
              }
              @for (inst of paged(); track inst.id) {
                <tr (click)="openDrawer(inst)" style="cursor:pointer"
                  [style.z-index]="menuOpen() === inst.id ? 40 : 'auto'"
                  [style.position]="menuOpen() === inst.id ? 'relative' : 'static'">
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="institution-avatar"
                        [style.background]="planColor(inst.plan) + '20'"
                        [style.color]="planColor(inst.plan)"
                        [style.border-color]="planColor(inst.plan) + '44'"
                      >{{ avatarOf(inst.name) }}</div>
                      <div>
                        <div style="font-size:13px;font-weight:500">{{ inst.name }}</div>
                        <div class="mono micro" style="color:var(--text-muted)">{{ inst.id }} · {{ inst.members }} personas</div>
                      </div>
                    </div>
                  </td>
                  <td style="color:var(--text-secondary);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ inst.razonSocial }}</td>
                  <td class="mono" style="font-size:12px">{{ inst.cuit }}</td>
                  <td>
                    @let typeObj = getType(inst.type);
                    <span class="type-pill">
                      {{ typeObj?.icon }} {{ typeObj?.label }}
                    </span>
                  </td>
                  <td>
                    @if (inst.status === 'activa') {
                      <emx-status-badge variant="stable">Activa</emx-status-badge>
                    } @else {
                      <span class="badge-inactive">● Inactiva</span>
                    }
                  </td>
                  <td>
                    <span class="plan-badge"
                      [style.background]="planColor(inst.plan) + '18'"
                      [style.color]="planColor(inst.plan)"
                      [style.border-color]="planColor(inst.plan) + '55'"
                    >
                      <span class="plan-badge__dot" [style.background]="planColor(inst.plan)"></span>
                      {{ planName(inst.plan) }}
                    </span>
                  </td>
                  <td (click)="$event.stopPropagation()" style="position:relative"
                    [style.z-index]="menuOpen() === inst.id ? 50 : 'auto'">
                    <button class="action-icon" style="width:28px;height:28px" title="Acciones"
                      (click)="toggleMenu(inst.id); $event.stopPropagation()">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                    @if (menuOpen() === inst.id) {
                      <div class="row-menu" (click)="$event.stopPropagation()">
                        <button class="user-menu__item" (click)="openEditForm(inst); menuOpen.set(null)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Editar
                        </button>
                        <button class="user-menu__item" (click)="openDrawer(inst); menuOpen.set(null)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          Ver contrato
                        </button>
                        <button class="user-menu__item" (click)="openDrawer(inst); menuOpen.set(null)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.25"/></svg>
                          Renovar contrato
                        </button>
                        <div style="height:1px;background:var(--border-hairline);margin:4px 0"></div>
                        @if (canAdmin()) {
                          <button class="user-menu__item user-menu__item--danger">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            Dar de baja
                          </button>
                        }
                      </div>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="pt-pagination">
          <div class="mono micro" style="color:var(--text-muted)">
            Mostrando <strong style="color:var(--text-primary)">{{ paged().length }}</strong> de
            <strong style="color:var(--text-primary)">{{ filtered().length }}</strong> instituciones
          </div>
          <div style="display:flex;align-items:center;gap:4px">
            <button class="btn btn--ghost btn--sm" [disabled]="page() === 0" [style.opacity]="page() === 0 ? '0.4' : '1'" (click)="page.set(page() - 1)">‹ Anterior</button>
            @for (i of pageRange(); track i) {
              <button class="page-btn" [attr.data-active]="page() === i" (click)="page.set(i)">{{ i + 1 }}</button>
            }
            <button class="btn btn--ghost btn--sm" [disabled]="page() >= totalPages() - 1" [style.opacity]="page() >= totalPages() - 1 ? '0.4' : '1'" (click)="page.set(page() + 1)">Siguiente ›</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════
         INSTITUTION DETAIL DRAWER (360°)
         ═══════════════════════════════════════════════════════ -->
    @if (drawerInst()) {
      <app-institution-detail-drawer
        [institution]="drawerInst()!"
        [planName]="planName(drawerInst()!.plan)"
        [planColor]="planColor(drawerInst()!.plan)"
        (close)="drawerInst.set(null)"
        (edit)="drawerInst.set(null); openEditForm($event)"
        (openContract)="drawerInst.set(null); openContract($event)"
      />
    }

    <!-- ═══════════════════════════════════════════════════════
         CONTRACT MODAL
         ═══════════════════════════════════════════════════════ -->
    @if (contractInst()) {
      @let ci = contractInst()!;
      @let ctr = contractDraft();
      <div class="qc-overlay" (click)="contractInst.set(null)">
        <div class="qc-modal qc-modal--contract glass-strong" style="position:relative" (click)="$event.stopPropagation()">
          @if (loadingContract()) {
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(2,6,23,0.55);border-radius:inherit;z-index:20">
              <div style="width:22px;height:22px;border:2px solid var(--accent-blue);border-top-color:transparent;border-radius:50%;animation:spin 0.65s linear infinite"></div>
            </div>
          }
          <div class="qc-head">
            <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0">
              <div class="institution-avatar"
                [style.background]="planColor(ci.plan) + '20'"
                [style.color]="planColor(ci.plan)"
                [style.border-color]="planColor(ci.plan) + '44'"
                style="width:40px;height:40px;font-size:13px"
              >{{ avatarOf(ci.name) }}</div>
              <div style="min-width:0">
                <div class="eyebrow" style="color:var(--accent-blue)">CONFIGURACIÓN DE CONTRATO Y PLAN</div>
                <div style="font-size:16px;font-weight:600;margin-top:2px">{{ ci.name }}</div>
                <div class="mono micro" style="color:var(--text-muted);margin-top:2px">{{ ci.contract.code }} · {{ ci.cuit }}</div>
              </div>
            </div>
            <button class="qc-close-btn" (click)="contractInst.set(null)">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
          </div>

          <div class="qc-body" style="padding:16px 20px;overflow-y:auto;max-height:62vh">

            <!-- Plan selector card -->
            <div style="padding:14px 16px;border-radius:12px;background:rgba(255,255,255,0.03);border:1px solid var(--border-glass);margin-bottom:14px">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
                <span style="width:12px;height:12px;border-radius:50%;display:inline-block;flex-shrink:0;box-shadow:0 0 10px currentColor"
                  [style.background]="planColor(ctr.plan)"
                  [style.color]="planColor(ctr.plan)"
                ></span>
                <div>
                  <div style="font-size:14px;font-weight:600" [style.color]="planColor(ctr.plan)">{{ planName(ctr.plan) }}</div>
                  <div class="mono micro" style="color:var(--text-muted);margin-top:1px">Tarifa base: {{ fmtCurrency(planBase(ctr.plan)) }}/mes</div>
                </div>
              </div>
              <div class="qc-field">
                <label class="eyebrow">Cambiar plan</label>
                <select class="qc-input" [(ngModel)]="contractDraftPlan" (ngModelChange)="patchContract({ plan: $event })">
                  @for (p of commercialPlans; track p.id) {
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
                    @if (ctr.polygonPoints && ctr.polygonPoints.length > 0) {
                      <polygon 
                        [attr.points]="getPointsString(ctr.polygonPoints)" 
                        fill="rgba(59,130,246,0.22)" 
                        stroke="var(--accent-blue)" 
                        stroke-width="1.5" 
                        stroke-linejoin="round"
                      />
                      @for (pt of ctr.polygonPoints; track pt; let idx = $index) {
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
                    @if (!ctr.polygonPoints || ctr.polygonPoints.length === 0) {
                      <div class="font-sans text-[10.5px]" style="color: var(--text-muted); line-height: 1.3;">
                        Sin cobertura. Usá los botones de abajo o clickeá a la izquierda.
                      </div>
                    } @else {
                      <div style="display: flex; flex-direction: column; gap: 4px;">
                        @for (pt of ctr.polygonPoints; track pt; let idx = $index) {
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
                    <button type="button" class="filter-chip" style="flex: 1; height: 22px; font-size: 10px; text-align: center; justify-content: center; display: inline-flex; align-items: center;" [disabled]="!ctr.polygonPoints || ctr.polygonPoints.length === 0" (click)="clearPolygon()">
                      Reset
                    </button>
                    <button type="button" class="filter-chip" style="flex: 1; height: 22px; font-size: 10px; text-align: center; justify-content: center; display: inline-flex; align-items: center;" [disabled]="!ctr.polygonPoints || ctr.polygonPoints.length < 3" (click)="autoClosePolygon()">
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
                <input class="qc-input" type="date" [(ngModel)]="contractDraftFrom" (ngModelChange)="patchContract({ from: $event })"/>
              </div>
              <div class="qc-field">
                <label class="eyebrow">Vigencia hasta</label>
                <input class="qc-input" type="date" [(ngModel)]="contractDraftTo" (ngModelChange)="patchContract({ to: $event })"/>
              </div>
              <div class="qc-field">
                <label class="eyebrow">Estado</label>
                <div style="display:flex;gap:4px;flex-wrap:wrap">
                  @for (cs of contractStatuses; track cs.value) {
                    <button class="ctr-status-pill"
                      [attr.data-active]="ctr.status === cs.value"
                      [style.border-color]="ctr.status === cs.value ? cs.color : 'transparent'"
                      [style.background]="ctr.status === cs.value ? cs.color + '18' : 'rgba(255,255,255,0.04)'"
                      [style.color]="ctr.status === cs.value ? cs.color : 'var(--text-muted)'"
                      (click)="patchContract({ status: cs.value })">
                      {{ cs.label }}
                    </button>
                  }
                </div>
              </div>
              <div class="qc-field">
                <label class="eyebrow">Duración</label>
                <div class="qc-input mono" style="background:rgba(255,255,255,0.02);color:var(--accent-cyan);cursor:default">
                  {{ calcMonths(ctr.from, ctr.to) }} meses
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
                    [(ngModel)]="contractDraftPrice" (ngModelChange)="patchContract({ monthlyPrice: +$event })"/>
                  <span style="display:flex;align-items:center;padding:0 8px;background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);border-left:none;border-radius:0 var(--r-btn) var(--r-btn) 0;font-size:11px;color:var(--text-muted);white-space:nowrap">ARS/mes</span>
                </div>
              </div>
              <div class="qc-field">
                <label class="eyebrow">Tope mensual</label>
                <div class="numeric-input">
                  <input class="qc-input" type="number" style="flex:1;border-radius:var(--r-btn) 0 0 var(--r-btn);border-right:none"
                    [(ngModel)]="contractDraftCap" (ngModelChange)="patchContract({ monthlyCap: +$event })"/>
                  <span style="display:flex;align-items:center;padding:0 8px;background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);border-left:none;border-radius:0 var(--r-btn) var(--r-btn) 0;font-size:11px;color:var(--text-muted);white-space:nowrap">servicios</span>
                </div>
              </div>
              <div class="qc-field">
                <label class="eyebrow">KPI respuesta</label>
                <div class="numeric-input">
                  <input class="qc-input" type="number" style="flex:1;border-radius:var(--r-btn) 0 0 var(--r-btn);border-right:none"
                    [(ngModel)]="contractDraftKpi" (ngModelChange)="patchContract({ kpiMinutes: +$event })"/>
                  <span style="display:flex;align-items:center;padding:0 8px;background:rgba(255,255,255,0.04);border:1px solid var(--border-glass);border-left:none;border-radius:0 var(--r-btn) var(--r-btn) 0;font-size:11px;color:var(--text-muted);white-space:nowrap">min. máx.</span>
                </div>
              </div>
              <div class="qc-field">
                <label class="eyebrow">Costo unitario</label>
                <div class="qc-input mono" style="background:rgba(255,255,255,0.02);color:var(--accent-cyan);cursor:default">
                  {{ ctr.monthlyCap > 0 ? fmtCurrency(Math.round(ctr.monthlyPrice / ctr.monthlyCap)) : '—' }}
                </div>
              </div>
            </div>

            <!-- Condiciones particulares -->
            <div class="qc-field" style="margin-bottom:12px">
              <label class="eyebrow">Condiciones particulares</label>
              <textarea class="qc-input" rows="3" style="resize:vertical"
                [(ngModel)]="contractDraftConditions" (ngModelChange)="patchContract({ conditions: $event })"></textarea>
            </div>

            <!-- Resumen comercial -->
            <div class="wiz-summary">
              <div>
                <div class="eyebrow">Anual estimado</div>
                <div class="mono" style="font-size:15px;font-weight:600;color:var(--accent-emerald);margin-top:4px">{{ fmtCurrency(ctr.monthlyPrice * 12) }}</div>
              </div>
              <div>
                <div class="eyebrow">Atenciones máx/año</div>
                <div class="mono" style="font-size:15px;font-weight:600;margin-top:4px">{{ ctr.monthlyCap * 12 }}</div>
              </div>
              <div>
                <div class="eyebrow">SLA acordado</div>
                <div class="mono" style="font-size:15px;font-weight:600;color:var(--accent-cyan);margin-top:4px">{{ ctr.kpiMinutes }} min</div>
              </div>
              <div>
                <div class="eyebrow">Vigencia</div>
                <div class="mono" style="font-size:15px;font-weight:600;margin-top:4px">{{ calcDays(ctr.from, ctr.to) }} días</div>
              </div>
            </div>
          </div>

          <div class="qc-foot">
            <div class="qc-hint"><span class="kbd">Esc</span> cerrar sin guardar</div>
            <div style="display:flex;gap:8px">
              <button class="btn btn--ghost" (click)="contractInst.set(null)">Cancelar</button>
              <button class="btn btn--primary" (click)="saveContract()" [disabled]="loadingContract()">
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
    }

    <!-- ═══════════════════════════════════════════════════════
         INSTITUTION FORM MODAL
         ═══════════════════════════════════════════════════════ -->
    @if (formOpen()) {
      <app-institution-form-modal
        [editingInst]="editingInst()"
        [commercialPlans]="commercialPlans"
        [loadingSave]="loadingSave()"
        [initialForm]="form()"
        (close)="closeForm()"
        (save)="saveFormFromModal($event)"
      />
    }
  `,
  styles: [`
    :host { display: block; }

    /* ── Table card ── */
    .pt-card {
      border-radius: var(--r-card);
      padding: 0;
      overflow: visible;
    }

    /* ── Toolbar ── */
    .pt-toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-hairline);
    }
    .pt-search {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 200px;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--border-glass);
      border-radius: var(--r-btn);
      padding: 0 10px;
      height: 32px;
    }
    .pt-search__input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 13px;
    }
    .pt-search__input::placeholder { color: var(--text-dim); }
    .pt-filters {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .filter-chip {
      height: 26px;
      padding: 0 10px;
      border-radius: 6px;
      font-size: 11.5px;
      font-family: var(--font-sans);
      border: 1px solid transparent;
      background: rgba(255,255,255,0.04);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s;
    }
    .filter-chip:hover { background: rgba(255,255,255,0.07); color: var(--text-primary); }
    .filter-chip[data-on="true"] {
      background: rgba(59,130,246,0.12);
      border-color: rgba(59,130,246,0.35);
      color: var(--accent-blue);
    }

    /* ── Table ── */
    .data-table-wrap {
      overflow: visible !important;
      min-height: 225px;
    }
    .scroll-y { overflow-y: visible; }

    /* ── Pagination ── */
    .pt-pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-top: 1px solid var(--border-hairline);
    }
    .page-btn {
      width: 28px; height: 28px;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-secondary);
      font-size: 12px;
      font-family: var(--font-mono);
      cursor: pointer;
      transition: all 0.15s;
    }
    .page-btn:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
    .page-btn[data-active="true"] {
      background: rgba(59,130,246,0.15);
      border-color: rgba(59,130,246,0.4);
      color: var(--accent-blue);
    }

    /* ── Row menu ── */
    .row-menu {
      position: absolute;
      right: 4px;
      top: 100%;
      z-index: 100;
      background: var(--bg-elevated);
      border: 1px solid var(--border-glass);
      border-radius: 10px;
      padding: 4px;
      min-width: 170px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .user-menu__item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 7px 10px;
      border-radius: 6px;
      background: transparent;
      border: none;
      color: var(--text-secondary);
      font-size: 12px;
      font-family: var(--font-sans);
      cursor: pointer;
      text-align: left;
      transition: all 0.12s;
    }
    .user-menu__item:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
    .user-menu__item--danger { color: var(--accent-red); }
    .user-menu__item--danger:hover { background: rgba(239,68,68,0.08); color: var(--accent-red); }

    /* ── Plan badge ── */
    .plan-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 5px;
      border: 1px solid;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
    }
    .plan-badge__dot {
      width: 6px; height: 6px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* ── Institution avatar ── */
    .institution-avatar {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      flex-shrink: 0;
      border: 1px solid;
    }

    /* ── Badge inactive ── */
    .badge-inactive {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 500;
      color: var(--text-muted);
      background: rgba(148,163,184,0.10);
      border: 1px solid rgba(148,163,184,0.22);
    }

    /* ── Type pill ── */
    .type-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid var(--border-glass);
      font-size: 11.5px;
      background: transparent;
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.15s;
      font-family: var(--font-sans);
    }
    .type-pill:hover { background: rgba(255,255,255,0.05); }
    .type-pill[data-active="true"] {
      background: rgba(59,130,246,0.12);
      border-color: rgba(59,130,246,0.35);
      color: var(--accent-blue);
    }

    /* ── Type grid ── */
    .type-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

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
    .qc-modal--wide { width: 680px; }
    .qc-modal--contract { width: 560px; }
    .qc-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 20px 20px 0;
      flex-shrink: 0;
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

    /* ── Modal tabs ── */
    .us-tabs {
      display: flex;
      gap: 2px;
      padding: 12px 20px 0;
      border-bottom: 1px solid var(--border-hairline);
    }
    .us-tab {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 8px 8px 0 0;
      border: 1px solid transparent;
      border-bottom: none;
      background: transparent;
      color: var(--text-muted);
      font-size: 12.5px;
      font-family: var(--font-sans);
      cursor: pointer;
      transition: all 0.15s;
      position: relative;
      bottom: -1px;
    }
    .us-tab:hover { color: var(--text-primary); background: rgba(255,255,255,0.04); }
    .us-tab[data-active="true"] {
      color: var(--accent-blue);
      background: var(--bg-elevated);
      border-color: var(--border-glass);
      border-bottom-color: var(--bg-elevated);
    }

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

    /* ── Mini-map ── */
    .mini-map {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border-glass);
      background: rgba(2,6,23,0.90);
      aspect-ratio: 1 / 1;
      cursor: crosshair;
    }
    .mini-map svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    .mini-map__overlay {
      position: absolute;
      left: 10px;
      bottom: 10px;
      padding: 6px 10px;
      border-radius: 8px;
      background: rgba(2,6,23,0.78);
      border: 1px solid rgba(255,255,255,0.10);
      font-size: 10px;
      pointer-events: none;
    }
    .mini-map__hint {
      position: absolute;
      top: 10px;
      right: 10px;
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(0,0,0,0.55);
      color: white;
      font-size: 9.5px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      pointer-events: none;
    }

    /* ── Toggle switch ── */
    .toggle-sw {
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
    }
    .toggle-sw__track {
      width: 40px;
      height: 22px;
      border-radius: 999px;
      position: relative;
      transition: all 0.16s;
      border: 1px solid;
    }
    .toggle-sw__thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      border-radius: 99px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.25);
      transition: all 0.16s;
    }

    /* ── Contact grid ── */
    .contact-grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: 18px;
      align-items: start;
    }

    /* ── Contract grid ── */
    .contract-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    /* ── Wiz summary ── */
    .wiz-summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--border-hairline);
    }

    /* ── Numeric input ── */
    .numeric-input {
      position: relative;
      display: flex;
    }

    /* ── Contract status pill ── */
    .ctr-status-pill {
      display: inline-flex;
      align-items: center;
      height: 28px;
      padding: 0 10px;
      border-radius: 6px;
      font-size: 11.5px;
      cursor: pointer;
      border: 1px solid transparent;
      font-family: var(--font-sans);
      transition: all 0.15s;
      background: rgba(255,255,255,0.04);
    }
    .ctr-status-pill:hover { background: rgba(255,255,255,0.08); }
  `],
})
export class InstitutionsComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private readonly api = inject(InstitutionsApiService);
  private readonly plansApi = inject(PlanComercialApiService);
  private readonly session = inject(SessionStore);

  readonly canEdit = computed(() =>
    this.session.hasAnyRole(['ROLE_ADMIN','ROLE_PROPIETARIO','ROLE_ADMINISTRADOR','ROLE_DESPACHANTE'])
  );
  readonly canAdmin = computed(() =>
    this.session.hasAnyRole(['ROLE_ADMIN','ROLE_PROPIETARIO','ROLE_ADMINISTRADOR'])
  );

  // ── State ──
  private readonly _commercialPlans = signal<CommercialPlanItem[]>([]);

  // ── Constants exposed to template ──
  readonly institutionTypes = INSTITUTION_TYPES;
  get commercialPlans(): CommercialPlanItem[] { return this._commercialPlans(); }
  readonly statusOptions = [
    { value: 'all',      label: 'Todas'     },
    { value: 'activa',   label: 'Activas'   },
    { value: 'inactiva', label: 'Inactivas' },
  ];
  readonly contractStatuses: { value: 'active' | 'suspended' | 'ended' | 'draft'; label: string; color: string }[] = [
    { value: 'active',    label: 'Activo',     color: 'var(--accent-emerald)' },
    { value: 'suspended', label: 'Suspendido', color: 'var(--accent-amber)'   },
    { value: 'ended',     label: 'Finalizado', color: 'var(--text-muted)'     },
    { value: 'draft',     label: 'Borrador',   color: 'var(--accent-blue)'    },
  ];

  // ── Lifecycle ──
  ngOnInit(): void {
    this.loadInstitutions();
    this.loadPlans();
  }

  private loadPlans(): void {
    this.plansApi.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(plans => {
      this._commercialPlans.set(plans.map(p => ({
        id:          p.id,
        numericId:   Number(p.id),
        name:        p.name,
        color:       planTierColor(p.tier),
        monthlyBase: p.pricing.monthly,
        tier:        p.tier,
      })));
    });
  }

  private loadInstitutions(): void {
    this.api.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(data => {
            const mapped: Institution[] = data.map(dto => ({
              id:           dto.id,
              name:         dto.name,
              razonSocial:  dto.razonSocial ?? '',
              cuit:         dto.cuit ?? '',
              type:         dto.type,
              status:       dto.status,
              plan:         dto.plan,
              email:        dto.email ?? '',
              phone:        dto.phone ?? '',
              adminContact: dto.adminContact ?? '',
              opsContact:   dto.opsContact ?? '',
              address:      dto.address ?? '',
              city:         '',
              lat:          dto.lat ?? 0,
              lng:          dto.lng ?? 0,
              polygon:      dto.polygon,
              members:      0,
              sinceMonth:   '',
              contract: {
                code: '', plan: dto.plan, from: '', to: '',
                status: 'active', monthlyPrice: 0, monthlyCap: 0, kpiMinutes: 0, conditions: '',
              },
            }));
            this.institutions.set(mapped);
          });
  }

  // ── State ──
  readonly institutions = signal<Institution[]>([]);
  readonly searchQuery = signal('');
  readonly statusFilter = signal('all');
  readonly typeFilter = signal('all');
  readonly page = signal(0);
  readonly menuOpen = signal<string | null>(null);

  // Drawer (360° view)
  readonly drawerInst = signal<Institution | null>(null);

  // Contract modal
  readonly contractInst = signal<Institution | null>(null);
  readonly contractDraft = signal<InstitutionContract>({ code: '', plan: '', from: '', to: '', status: 'active', monthlyPrice: 0, monthlyCap: 0, kpiMinutes: 0, conditions: '' });
  readonly loadingContract = signal(false);

  // Form modal
  readonly formOpen = signal(false);
  readonly editingInst = signal<Institution | null>(null);
  readonly formTab = signal<'general' | 'contacto'>('general');
  readonly form = signal<InstitutionForm>(emptyForm());
  readonly formTouched = signal(false);
  readonly loadingSave = signal(false);

  // ── ngModel bridges ──
  get searchQuery_(): string { return this.searchQuery(); }
  set searchQuery_(v: string) { this.searchQuery.set(v); this.page.set(0); }

  get typeFilterValue(): string { return this.typeFilter(); }
  set typeFilterValue(v: string) { this.typeFilter.set(v); this.page.set(0); }

  // Contract draft bridges (ngModel needs writable accessors on primitives)
  get contractDraftPlan(): string { return this.contractDraft().plan; }
  set contractDraftPlan(v: string) { this.patchContract({ plan: v }); }

  get contractDraftFrom(): string { return this.contractDraft().from; }
  set contractDraftFrom(v: string) { this.patchContract({ from: v }); }

  get contractDraftTo(): string { return this.contractDraft().to; }
  set contractDraftTo(v: string) { this.patchContract({ to: v }); }

  get contractDraftPrice(): number { return this.contractDraft().monthlyPrice; }
  set contractDraftPrice(v: number) { this.patchContract({ monthlyPrice: +v }); }

  get contractDraftCap(): number { return this.contractDraft().monthlyCap; }
  set contractDraftCap(v: number) { this.patchContract({ monthlyCap: +v }); }

  get contractDraftKpi(): number { return this.contractDraft().kpiMinutes; }
  set contractDraftKpi(v: number) { this.patchContract({ kpiMinutes: +v }); }

  get contractDraftConditions(): string { return this.contractDraft().conditions; }
  set contractDraftConditions(v: string) { this.patchContract({ conditions: v }); }

  // ── Computed ──
  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    const t = this.typeFilter();
    return this.institutions().filter(i =>
      (s === 'all' || i.status === s) &&
      (t === 'all' || i.type === t) &&
      (!q || i.name.toLowerCase().includes(q) || i.razonSocial.toLowerCase().includes(q) || i.cuit.includes(q))
    );
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  readonly paged = computed(() => {
    const pg = Math.min(this.page(), this.totalPages() - 1);
    return this.filtered().slice(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE);
  });

  readonly pageRange = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));

  readonly counts = computed(() => {
    const list = this.institutions();
    return {
      total:    list.length,
      activas:  list.filter(i => i.status === 'activa').length,
      inactivas: list.filter(i => i.status === 'inactiva').length,
      members:  list.filter(i => i.status === 'activa').reduce((s, i) => s + i.members, 0),
    };
  });

  isValidCuit(cuit: string): boolean {
    const raw = cuit.replace(/\D/g, '');
    if (raw.length !== 11) return false;
    const coefficients = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(raw[i]) * coefficients[i];
    }
    const rem = sum % 11;
    const dv = rem === 0 ? 0 : rem === 1 ? 9 : 11 - rem;
    return parseInt(raw[10]) === dv;
  }

  isValidEmail(email: string): boolean {
    if (!email) return true;
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  }

  isValidPhone(phone: string): boolean {
    if (!phone) return true;
    const raw = phone.replace(/[^\d+]/g, '');
    return raw.length >= 8 && raw.length <= 15;
  }

  readonly canSubmit = computed(() => {
    const f = this.form();
    const hasGeneral = f.name.trim().length > 0 && f.cuit.trim().length > 0 && f.razonSocial.trim().length > 0;
    if (!hasGeneral) return false;
    return this.isValidCuit(f.cuit) && this.isValidEmail(f.email ?? '') && this.isValidPhone(f.phone ?? '');
  });

  // ── Helpers exposed to template ──
  readonly fmtCurrency = fmtCurrency;
  readonly avatarOf = avatarOf;
  readonly Math = Math;

  planColor(planId: string): string {
    return this._commercialPlans().find(p => p.id === planId || p.name === planId)?.color ?? 'var(--text-muted)';
  }
  planName(planId: string): string {
    return this._commercialPlans().find(p => p.id === planId || p.name === planId)?.name ?? planId;
  }
  planBase(planId: string): number {
    return this._commercialPlans().find(p => p.id === planId || p.name === planId)?.monthlyBase ?? 0;
  }
  getPlan(planId: string): CommercialPlanItem | undefined {
    return this._commercialPlans().find(p => p.id === planId || p.name === planId);
  }
  getType(typeId: string): typeof INSTITUTION_TYPES[number] | undefined {
    return INSTITUTION_TYPES.find(t => t.id === typeId);
  }

  calcMonths(from: string, to: string): number { return diffMonths(from, to); }
  calcDays(from: string, to: string): number    { return diffDays(from, to); }

  // ── Table menu ──
  toggleMenu(id: string): void {
    this.menuOpen.set(this.menuOpen() === id ? null : id);
  }

  @HostListener('document:click')
  closeMenuOnOutsideClick(): void {
    this.menuOpen.set(null);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.formOpen()) { this.closeForm(); return; }
    if (this.contractInst()) { this.contractInst.set(null); return; }
    if (this.drawerInst()) { this.drawerInst.set(null); return; }
  }

  // ── Filter ──
  setStatus(v: string): void {
    this.statusFilter.set(v);
    this.page.set(0);
  }

  // ── Detail drawer ──
  openDrawer(inst: Institution): void {
    this.drawerInst.set(inst);
  }

  // ── Contract modal ──
  openContract(inst: Institution): void {
    this.contractInst.set(inst);

    // Pre-populate draft with local data so the modal opens immediately
    const todayStr = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const nextYearStr = nextYear.toISOString().split('T')[0];

    const draft: InstitutionContract = { ...inst.contract };
    if (!draft.from) draft.from = todayStr;
    if (!draft.to) draft.to = nextYearStr;
    if (!draft.plan) draft.plan = inst.plan || '';

    const plan = this._commercialPlans().find(p => p.id === draft.plan);
    if (plan) {
      if (!draft.monthlyPrice) draft.monthlyPrice = plan.monthlyBase;
      if (!draft.monthlyCap)   draft.monthlyCap   = plan.tier === 'premium' ? 50 : plan.tier === 'medio' ? 30 : 15;
      if (!draft.kpiMinutes)   draft.kpiMinutes   = plan.tier === 'premium' ? 8  : plan.tier === 'medio' ? 12 : 15;
    }

    if (!draft.polygonPoints || draft.polygonPoints.length === 0) {
      const cx = inst.lat ?? 50;
      const cy = inst.lng ?? 50;
      const points = [];
      const steps = 12;
      const radius = 8;
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * 2 * Math.PI;
        points.push({
          x: Math.round((cx + radius * Math.cos(angle)) * 10) / 10,
          y: Math.round((cy + radius * Math.sin(angle)) * 10) / 10,
        });
      }
      points.push({ ...points[0] });
      draft.polygonPoints = points;
    }

    this.contractDraft.set(draft);

    // Load real contract from backend (keeps modal open with real data when it arrives)
    const institucionId = Number(inst.id);
    if (!institucionId) return;

    this.loadingContract.set(true);
    this.api.getContratosByInstitucion(institucionId)
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(contratos => {
        this.loadingContract.set(false);
        if (contratos.length === 0) return;

        // Use the most recent contract (first result — backend orders by id desc)
        const c = contratos[0];
        const planName = this._commercialPlans().find(p => p.numericId === Number(c.plan))?.id ?? draft.plan;

        this.contractDraft.update(d => ({
          ...d,
          id:           c.id,
          code:         c.code || d.code,
          plan:         planName,
          from:         c.from || d.from,
          to:           c.to   || d.to,
          status:       c.status,
          monthlyPrice: c.monthlyPrice || d.monthlyPrice,
          monthlyCap:   c.monthlyCap   || d.monthlyCap,
          kpiMinutes:   c.kpiMinutes   || d.kpiMinutes,
          conditions:   c.conditions   ?? d.conditions,
        }));

        // Sync local institution contract so the table row reflects real data
        this.institutions.update(list =>
          list.map(i => i.id === inst.id
            ? { ...i, contract: { ...i.contract, id: c.id, code: c.code, status: c.status } }
            : i,
          ),
        );
      });
  }

  patchContract(patch: Partial<InstitutionContract>): void {
    const draft = { ...this.contractDraft(), ...patch };
    if (patch.plan) {
      const plan = this._commercialPlans().find(p => p.id === patch.plan);
      if (plan) {
        draft.monthlyPrice = plan.monthlyBase;
        draft.monthlyCap = plan.tier === 'premium' ? 50 : plan.tier === 'medio' ? 30 : 15;
        draft.kpiMinutes = plan.tier === 'premium' ? 8 : plan.tier === 'medio' ? 12 : 15;
      }
    }
    this.contractDraft.set(draft);
  }

  generateCircularGeofence(radius: number): void {
    const inst = this.contractInst();
    if (!inst) return;
    const cx = inst.lat ?? 50;
    const cy = inst.lng ?? 50;
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

  saveContract(): void {
    const inst = this.contractInst();
    if (!inst) return;

    const draft    = this.contractDraft();
    const planItem = this._commercialPlans().find(p => p.id === draft.plan);
    const planNumericId = planItem?.numericId ?? 0;
    const institucionId = Number(inst.id);

    this.loadingContract.set(true);

    this.api.saveContrato(
      { ...draft, conditions: draft.conditions ?? '' },
      institucionId,
      planNumericId,
    )
      .pipe(
        catchError(err => {
          console.error('Error saving contract', err);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(saved => {
        this.loadingContract.set(false);
        if (!saved) return;

        const updatedDraft: InstitutionContract = { ...draft, id: saved.id, code: saved.code };

        this.institutions.update(list =>
          list.map(i =>
            i.id === inst.id
              ? { ...i, plan: planItem?.id ?? i.plan, contract: updatedDraft }
              : i,
          ),
        );
        this.contractInst.set(null);
      });
  }

  // ── Form modal ──
  openNewForm(): void {
    this.editingInst.set(null);
    this.form.set(emptyForm());
    this.formTab.set('general');
    this.formOpen.set(true);
  }

  openEditForm(inst: Institution): void {
    this.editingInst.set(inst);
    this.form.set({
      name: inst.name, razonSocial: inst.razonSocial, cuit: inst.cuit,
      type: inst.type, plan: inst.plan, status: inst.status,
      email: inst.email, phone: inst.phone,
      adminContact: inst.adminContact, opsContact: inst.opsContact,
      address: inst.address, city: inst.city,
      lat: inst.lat, lng: inst.lng,
      polygon: inst.polygon,
    });
    this.formTab.set('general');
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingInst.set(null);
    this.formTouched.set(false);
    this.loadingSave.set(false);
  }

  patchForm(patch: Partial<InstitutionForm>): void {
    this.form.set({ ...this.form(), ...patch });
  }

  saveFormFromModal(f: InstitutionForm): void {
    this.form.set(f);
    this.saveForm();
  }

  saveForm(): void {
    this.formTouched.set(true);
    if (!this.canSubmit()) return;

    const f = this.form();
    const editing = this.editingInst();

    const dto = {
      id:           editing?.id ?? '',
      name:         f.name,
      razonSocial:  f.razonSocial,
      cuit:         f.cuit,
      type:         f.type as import('../../data-access/dto/institution.dto').InstitutionType,
      status:       f.status as 'activa' | 'inactiva',
      plan:         f.plan,
      email:        f.email || undefined,
      phone:        f.phone || undefined,
      adminContact: f.adminContact || undefined,
      opsContact:   f.opsContact || undefined,
      address:      f.address || undefined,
      lat:          f.lat,
      lng:          f.lng,
      polygon:      f.polygon?.length ? f.polygon : undefined,
    };

    this.loadingSave.set(true);
    const op$ = editing ? this.api.update(dto) : this.api.create(dto);
    op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.closeForm();
        this.loadInstitutions();
      },
      error: () => {
        this.loadingSave.set(false);
      },
    });
  }

  // ── Mini-map click ──
  onMapClick(event: MouseEvent): void {
    const target = event.currentTarget as SVGElement;
    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.patchForm({ lat: Math.round(x * 100) / 100, lng: Math.round(y * 100) / 100 });
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
    
    const draft = this.contractDraft();
    const currentPoints = draft.polygonPoints ? [...draft.polygonPoints] : [];
    
    currentPoints.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
    this.patchContract({ polygonPoints: currentPoints });
  }

  removeVertex(index: number): void {
    const draft = this.contractDraft();
    const currentPoints = draft.polygonPoints ? [...draft.polygonPoints] : [];
    currentPoints.splice(index, 1);
    this.patchContract({ polygonPoints: currentPoints });
  }

  clearPolygon(): void {
    this.patchContract({ polygonPoints: [] });
  }

  autoClosePolygon(): void {
    const draft = this.contractDraft();
    const pts = draft.polygonPoints ? [...draft.polygonPoints] : [];
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

  formatCuit(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 10) return digits.slice(0, 2) + '-' + digits.slice(2);
    return digits.slice(0, 2) + '-' + digits.slice(2, 10) + '-' + digits.slice(10);
  }
}
