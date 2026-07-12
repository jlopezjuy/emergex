import { Component, OnInit, signal, computed, HostListener, inject, DestroyRef } from '@angular/core';
import { SessionStore } from '../../core/stores/session.store';
import { FormsModule } from '@angular/forms';
import { catchError, map, of } from 'rxjs';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { InstitutionsApiService } from '../../data-access/api/institutions.api';
import { PlanComercialApiService } from '../../data-access/api/plan-comercial.api';
import { environment } from '../../../environments/environment';
import { DateUtils } from '../../core/utils/date.utils';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { InstitutionDetailDrawerComponent, DrawerInstitution } from './components/institution-detail-drawer/institution-detail-drawer.component';
import { InstitutionFormModalComponent, InstitutionForm } from './components/institution-form-modal/institution-form-modal.component';
import { EstadoInstitucion, FacturacionContratoDTO, InstitutionType } from '../../data-access/dto/institution.dto';
import { InstitutionContractModalComponent } from './components/institution-contract-modal/institution-contract-modal.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

interface CommercialPlanItem {
  id: string;
  numericId: number;
  name: string;
  color: string;
  monthlyBase: number;
  tier: string;
}

export interface InstitutionContract {
  id?: number;
  code: string;
  plan: string;
  from: string;
  to: string;
  status: 'active' | 'suspended' | 'ended' | 'draft';
  monthlyPrice: number;
  eventPrice?: number;
  monthlyCap: number;
  kpiMinutes: number;
  conditions: string;
  polygonPoints?: { x: number; y: number }[];
}

export interface Institution {
  id: string;
  name: string;
  razonSocial: string;
  cuit: string;
  type: InstitutionType;
  status: EstadoInstitucion;
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
    name: '', razonSocial: '', cuit: '', type: 'EMPRESA', plan: 'Plan Empresa Básico', status: 'ACTIVA',
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

function buildDefaultCircle(lat?: number, lng?: number): { x: number; y: number }[] {
  const cx = lat ?? 50;
  const cy = lng ?? 50;
  const points: { x: number; y: number }[] = [];
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
  return points;
}

const PAGE_SIZE = 10;

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-institutions',
  standalone: true,
  imports: [FormsModule, StatusBadgeComponent, InstitutionDetailDrawerComponent, InstitutionFormModalComponent, InstitutionContractModalComponent, EmptyStateComponent],
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

      <div class="glass-strong" style="padding:12px 14px;margin-bottom:12px;border-radius:12px">
        <div class="eyebrow" style="margin-bottom:10px">RESUMEN OPERATIVO 360</div>
        <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px">
          <div class="screen-kpi" style="margin:0">
            <div class="eyebrow">Contratos activos</div>
            <div class="mono" style="font-size:16px;font-weight:600">{{ contracts360().active }}</div>
          </div>
          <div class="screen-kpi" style="margin:0">
            <div class="eyebrow">Contratos a vencer (&lt;30d)</div>
            <div class="mono" style="font-size:16px;font-weight:600;color:var(--accent-amber)">{{ contracts360().expiringSoon }}</div>
          </div>
          <div class="screen-kpi" style="margin:0">
            <div class="eyebrow">Miembros institucionales</div>
            <div class="mono" style="font-size:16px;font-weight:600;color:var(--accent-blue)">{{ counts().members }}</div>
          </div>
          <div class="screen-kpi" style="margin:0">
            <div class="eyebrow">Facturado institucional</div>
            <div class="mono" style="font-size:16px;font-weight:600;color:var(--accent-emerald)">
              @if (loadingEstadoCuenta()) { … } @else { {{ fmtCurrency(totalFacturadoInstitucional()) }} }
            </div>
          </div>
          <div class="screen-kpi" style="margin:0">
            <div class="eyebrow">Deuda institucional</div>
            <div class="mono" style="font-size:16px;font-weight:600;color:var(--accent-red)">
              @if (loadingEstadoCuenta()) { … } @else { {{ fmtCurrency(totalDeudaInstitucional()) }} }
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="btn btn--ghost btn--sm" (click)="statusFilter.set('ACTIVA'); page.set(0)">Ver activas</button>
          <button class="btn btn--ghost btn--sm" (click)="statusFilter.set('SUSPENDIDA'); page.set(0)">Ver suspendidas</button>
          <button class="btn btn--ghost btn--sm" (click)="showInstitucionesConDeuda()">Con deuda</button>
          <button class="btn btn--ghost btn--sm" (click)="statusFilter.set('all'); page.set(0); searchQuery.set('')">Limpiar filtros</button>
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
                  <td colspan="7" style="padding:20px;text-align:center;">
                    <emx-empty-state message="No se encontraron instituciones en base a los criterios de filtrado." />
                  </td>
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
                    @if (inst.status === 'ACTIVA') {
                      <emx-status-badge variant="stable">Activa</emx-status-badge>
                    } @else if (inst.status === 'PENDIENTE_ACTIVACION') {
                      <emx-status-badge variant="info">Pendiente</emx-status-badge>
                    } @else if (inst.status === 'SUSPENDIDA') {
                      <emx-status-badge variant="urgent">Suspendida</emx-status-badge>
                    } @else {
                      <span class="badge-inactive">● Baja</span>
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
                        <button class="user-menu__item" (click)="registrarPagoInstitucional(inst); menuOpen.set(null)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
                          Registrar pago institucional
                        </button>
                        <div style="height:1px;background:var(--border-hairline);margin:4px 0"></div>
                        @if (canAdmin()) {
                          @if (inst.status === 'SUSPENDIDA') {
                            <button class="user-menu__item" (click)="reactivarPorDeuda(inst); menuOpen.set(null)">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.25"/></svg>
                              Reactivar cobertura
                            </button>
                          } @else {
                            <button class="user-menu__item user-menu__item--danger" (click)="suspenderPorDeuda(inst); menuOpen.set(null)">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                              Suspender por deuda
                            </button>
                          }
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

      <div class="glass-strong pt-card" style="margin-top:12px">
        <div class="pt-toolbar">
          <div class="eyebrow">FACTURAS INSTITUCIONALES</div>
        </div>
        <div class="data-table-wrap scroll-y">
          <table class="data-table" style="width:100%;min-width:760px">
            <thead>
              <tr>
                <th>Factura</th>
                <th>Período</th>
                <th>Miembros</th>
                <th>Importe</th>
                <th>Saldo</th>
                <th>Observaciones</th>
                <th style="width:40px"></th>
              </tr>
            </thead>
            <tbody>
              @if (!facturasInstitucionales().length) {
                <tr><td colspan="7" style="padding:18px;text-align:center;color:var(--text-muted)">Sin facturas institucionales.</td></tr>
              }
              @for (f of facturasInstitucionales(); track f.id) {
                <tr>
                  <td class="mono">#{{ f.id }}</td>
                  <td class="mono">{{ f.periodoDesde }} → {{ f.periodoHasta }}</td>
                  <td>{{ f.cantidadMiembrosFacturados }}</td>
                  <td class="mono">{{ fmtCurrency(f.importeTotal ?? 0) }}</td>
                  <td class="mono" [style.color]="(f.saldoPendiente ?? f.importeTotal ?? 0) > 0 ? 'var(--accent-red)' : 'var(--accent-emerald)'">
                    {{ fmtCurrency(f.saldoPendiente ?? f.importeTotal ?? 0) }}
                  </td>
                  <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ f.observaciones || '—' }}</td>
                  <td>
                    <button class="btn btn--ghost btn--sm" (click)="openPaymentFromFactura(f)">Pagar</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
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
        (statusChanged)="onInstitutionStatusChanged($event)"
      />
    }

    <!-- ═══════════════════════════════════════════════════════
         CONTRACT MODAL
         ═══════════════════════════════════════════════════════ -->
    @if (contractInst()) {
      <app-institution-contract-modal
        [institution]="contractInst()!"
        [commercialPlans]="commercialPlans"
        [loadingContract]="loadingContract()"
        [initialContract]="contractDraft()"
        (close)="contractInst.set(null)"
        (save)="saveContractFromModal($event)"
      />
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

    @if (paymentInst()) {
      <div class="qc-modal-overlay" (click)="closePaymentModal()">
        <div class="qc-modal glass-strong" (click)="$event.stopPropagation()" style="max-width:560px;width:min(92vw,560px);padding:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <h3 style="margin:0;font-size:16px">Registrar pago institucional</h3>
            <button class="action-icon" (click)="closePaymentModal()">✕</button>
          </div>
          <div class="eyebrow" style="margin-bottom:10px">{{ paymentInst()!.name }}</div>

          <label class="eyebrow">Factura institucional</label>
          <select class="qc-input" [(ngModel)]="paymentFacturaId" (ngModelChange)="onPaymentFacturaChange()" style="width:100%;margin-bottom:10px">
            @for (f of paymentFacturas(); track f.id) {
              <option [ngValue]="f.id">#{{ f.id }} · {{ f.periodoDesde }} a {{ f.periodoHasta }} · {{ fmtCurrency(f.importeTotal ?? 0) }}</option>
            }
          </select>

          <label class="eyebrow">Monto</label>
          <input class="qc-input" type="number" min="0" step="0.01" [(ngModel)]="paymentMonto" style="width:100%;margin-bottom:10px" />

          <label class="eyebrow">Método</label>
          <select class="qc-input" [(ngModel)]="paymentMetodo" style="width:100%;margin-bottom:10px">
            @for (m of paymentMethods; track m) {
              <option [value]="m">{{ m }}</option>
            }
          </select>

          <label class="eyebrow">Referencia (opcional)</label>
          <input class="qc-input" [(ngModel)]="paymentReferencia" style="width:100%;margin-bottom:10px" />

          <label class="eyebrow">Nota (opcional)</label>
          <input class="qc-input" [(ngModel)]="paymentNota" style="width:100%;margin-bottom:14px" />

          <div style="display:flex;justify-content:flex-end;gap:8px">
            <button class="btn btn--ghost btn--sm" (click)="closePaymentModal()">Cancelar</button>
            <button class="btn btn--primary btn--sm" [disabled]="loadingPayment()" (click)="submitPaymentModal()">Registrar pago</button>
          </div>

          <div style="margin-top:14px;border-top:1px solid var(--border-hairline);padding-top:10px">
            <div class="eyebrow" style="margin-bottom:8px">Pagos de la factura</div>
            <div style="max-height:180px;overflow:auto;border:1px solid var(--border-hairline);border-radius:8px">
              <table class="data-table" style="width:100%">
                <thead>
                  <tr><th>Fecha</th><th>Método</th><th>Monto</th><th>Ref</th></tr>
                </thead>
                <tbody>
                  @if (!pagosFacturaModal().length) {
                    <tr><td colspan="4" style="padding:8px;color:var(--text-muted)">Sin pagos registrados.</td></tr>
                  }
                  @for (p of pagosFacturaModal(); track p.id) {
                    <tr>
                      <td class="mono">{{ p.fechaPago || '—' }}</td>
                      <td>{{ p.metodoPago || '—' }}</td>
                      <td class="mono">{{ fmtCurrency(p.montoTotal ?? 0) }}</td>
                      <td class="mono">{{ p.numeroReferencia || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }
    .qc-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(10,16,24,0.65);
      display: grid;
      place-items: center;
      z-index: 90;
      padding: 20px;
    }

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
    .qc-modal--contract { width: 640px; }
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

    /* ── Responsive adjustments ── */
    @media (max-width: 900px) {
      .screen-head {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 16px !important;
      }
      .screen-head__kpis {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 10px !important;
        width: 100% !important;
      }
      .screen-kpi {
        margin: 0 !important;
        padding: 8px 12px !important;
        background: var(--surface-glass) !important;
        border-radius: var(--r-btn) !important;
        border: 1px solid var(--border-glass) !important;
      }
      .pt-toolbar {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 10px !important;
      }
      .pt-filters {
        width: 100% !important;
        flex-wrap: wrap !important;
      }
      .pt-search {
        width: 100% !important;
      }
      .qc-modal {
        width: 95% !important;
        max-height: 95vh !important;
      }
      .data-table-wrap {
        overflow-x: auto !important;
      }
    }
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
    { value: 'all',                  label: 'Todas'     },
    { value: 'ACTIVA',               label: 'Activas'   },
    { value: 'PENDIENTE_ACTIVACION', label: 'Pendientes' },
    { value: 'SUSPENDIDA',           label: 'Suspendidas' },
    { value: 'BAJA',                 label: 'Baja'      },
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
    this.loadFacturasInstitucionales();
  }

  private loadPlans(): void {
    this.plansApi.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(plans => {
      this._commercialPlans.set(plans.map(p => ({
        id:          p.name,
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

            // Fetch real members counts asynchronously in parallel for each row
            mapped.forEach(inst => {
              const numericId = Number(inst.id);
              if (numericId) {
                this.api.getMiembros(numericId, 0, 1000).pipe(
                  catchError(() => of([]))
                ).subscribe(miembros => {
                  this.institutions.update(list =>
                    list.map(i => i.id === inst.id ? { ...i, members: miembros.length } : i)
                  );
                });
              }
            });
            this.loadEstadoCuentaSummary(mapped);
          });
  }

  private loadEstadoCuentaSummary(insts: Institution[]): void {
    if (!insts.length) {
      this.totalFacturadoInstitucional.set(0);
      this.totalDeudaInstitucional.set(0);
      this.institucionesConDeuda.set([]);
      this.loadingEstadoCuenta.set(false);
      return;
    }
    this.loadingEstadoCuenta.set(true);
    let remaining = insts.length;
    let total = 0;
    let totalDeuda = 0;
    const deudoras: string[] = [];
    insts.forEach((inst) => {
      const id = Number(inst.id);
      if (!id) {
        remaining -= 1;
        if (remaining === 0) {
          this.totalFacturadoInstitucional.set(total);
          this.totalDeudaInstitucional.set(totalDeuda);
          this.institucionesConDeuda.set(deudoras);
          this.loadingEstadoCuenta.set(false);
        }
        return;
      }
      this.api.getEstadoDeudaInstitucion(id).pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe((res) => {
        if (res) {
          total += res.totalFacturado ?? 0;
          totalDeuda += res.saldoPendiente ?? 0;
          if ((res.saldoPendiente ?? 0) > 0) deudoras.push(inst.id);
        }
        remaining -= 1;
        if (remaining === 0) {
          this.totalFacturadoInstitucional.set(total);
          this.totalDeudaInstitucional.set(totalDeuda);
          this.institucionesConDeuda.set(deudoras);
          this.loadingEstadoCuenta.set(false);
        }
      });
    });
  }

  // ── State ──
  readonly institutions = signal<Institution[]>([]);
  readonly totalFacturadoInstitucional = signal(0);
  readonly totalDeudaInstitucional = signal(0);
  readonly institucionesConDeuda = signal<string[]>([]);
  readonly loadingEstadoCuenta = signal(false);
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
  readonly facturasInstitucionales = signal<FacturacionContratoDTO[]>([]);
  readonly paymentInst = signal<Institution | null>(null);
  readonly paymentFacturas = signal<any[]>([]);
  readonly pagosFacturaModal = signal<any[]>([]);
  readonly loadingPayment = signal(false);
  readonly paymentMethods: Array<'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'MERCADOPAGO' | 'CHEQUE' | 'OBRA_SOCIAL' | 'PREPAGA' | 'OTRO'> = [
    'TRANSFERENCIA', 'EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'MERCADOPAGO', 'CHEQUE', 'OBRA_SOCIAL', 'PREPAGA', 'OTRO',
  ];
  paymentFacturaId: number | null = null;
  paymentMonto = 0;
  paymentMetodo: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO' | 'MERCADOPAGO' | 'CHEQUE' | 'OBRA_SOCIAL' | 'PREPAGA' | 'OTRO' = 'TRANSFERENCIA';
  paymentReferencia = '';
  paymentNota = '';

  // ── ngModel bridges ──
  get searchQuery_(): string { return this.searchQuery(); }
  set searchQuery_(v: string) { this.searchQuery.set(v); this.page.set(0); }

  get typeFilterValue(): string { return this.typeFilter(); }
  set typeFilterValue(v: string) { this.typeFilter.set(v); this.page.set(0); }


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
      activas:  list.filter(i => i.status === 'ACTIVA' || i.status === 'PENDIENTE_ACTIVACION').length,
      inactivas: list.filter(i => i.status === 'SUSPENDIDA' || i.status === 'BAJA').length,
      members:  list.filter(i => i.status === 'ACTIVA' || i.status === 'PENDIENTE_ACTIVACION').reduce((s, i) => s + i.members, 0),
    };
  });

  readonly contracts360 = computed(() => {
    const today = DateUtils.now();
    const list = this.institutions();
    return {
      active: list.filter(i => i.contract?.status === 'active').length,
      expiringSoon: list.filter(i => {
        const to = i.contract?.to;
        if (!to) return false;
        const days = DateUtils.fromISO(to).diff(today, 'days').days;
        return days >= 0 && days <= 30;
      }).length,
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
    let mappedId = typeId;
    if (typeId === 'ESCUELA' || typeId === 'JARDIN' || typeId === 'COLEGIO_SECUNDARIO') mappedId = 'colegio';
    else if (typeId === 'UNIVERSIDAD') mappedId = 'universidad';
    else if (typeId === 'SHOPPING' || typeId === 'EMPRESA') mappedId = 'empresa';
    else if (typeId === 'CLUB' || typeId === 'GIMNASIO') mappedId = 'club';
    else if (typeId === 'GERIATRICO') mappedId = 'hospital';
    else if (typeId === 'ORGANISMO_PUBLICO') mappedId = 'gobierno';
    else if (typeId === 'EVENTO' || typeId === 'OTRO') mappedId = 'otro';
    return INSTITUTION_TYPES.find(t => t.id === mappedId.toLowerCase());
  }

  calcMonths(from: string, to: string): number { return diffMonths(from, to); }
  calcDays(from: string, to: string): number    { return diffDays(from, to); }

  // ── Table menu ──
  toggleMenu(id: string): void {
    this.menuOpen.set(this.menuOpen() === id ? null : id);
  }

  showInstitucionesConDeuda(): void {
    const deudoras = new Set(this.institucionesConDeuda());
    this.statusFilter.set('all');
    this.page.set(0);
    this.institutions.update(list => [...list].sort((a, b) => {
      const aDebt = deudoras.has(a.id) ? 1 : 0;
      const bDebt = deudoras.has(b.id) ? 1 : 0;
      return bDebt - aDebt;
    }));
  }

  suspenderPorDeuda(inst: Institution): void {
    const id = Number(inst.id);
    if (!id) return;
    const motivo = prompt(`Motivo de suspensión por deuda para ${inst.name}:`, 'Deuda institucional vencida');
    if (motivo === null || !motivo.trim()) return;
    this.api.suspenderPorDeuda(id, motivo.trim()).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => this.loadInstitutions(),
      error: (err) => alert(err?.error?.detail ?? err?.error?.title ?? 'No se pudo suspender la institución por deuda.'),
    });
  }

  reactivarPorDeuda(inst: Institution): void {
    const id = Number(inst.id);
    if (!id) return;
    const motivo = prompt(`Motivo de reactivación para ${inst.name}:`, 'Pago registrado');
    if (motivo === null || !motivo.trim()) return;
    this.api.reactivarInstitucion(id, motivo.trim()).pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => this.loadInstitutions(),
      error: (err) => {
        const msg = err?.error?.detail ?? err?.error?.title ?? 'La institución mantiene deuda vencida.';
        if (!confirm(`${msg}\n\n¿Registrar excepción de supervisor y reactivar igual?`)) return;
        const autorizadoPor = prompt('Autorizado por (supervisor):', '') ?? '';
        this.api.reactivarInstitucion(id, motivo.trim(), true, autorizadoPor.trim() || undefined).pipe(
          takeUntilDestroyed(this.destroyRef),
        ).subscribe({
          next: () => this.loadInstitutions(),
          error: (err2) => alert(err2?.error?.detail ?? err2?.error?.title ?? 'No se pudo reactivar la institución.'),
        });
      },
    });
  }

  registrarPagoInstitucional(inst: Institution): void {
    const institucionId = Number(inst.id);
    if (!institucionId) return;
    this.paymentInst.set(inst);
    this.paymentFacturas.set([]);
    this.pagosFacturaModal.set([]);
    this.paymentFacturaId = null;
    this.paymentMonto = 0;
    this.paymentMetodo = 'TRANSFERENCIA';
    this.paymentReferencia = '';
    this.paymentNota = `Pago institucional UI (${inst.name})`;
    this.api.getContratosByInstitucion(institucionId).pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((contratos) => {
      const contrato = contratos[0];
      if (!contrato?.id) {
        alert('No hay contrato institucional para registrar pagos.');
        this.closePaymentModal();
        return;
      }
      this.api.getFacturasByContrato(contrato.id).pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef),
      ).subscribe((facturas) => {
        if (!facturas.length) {
          alert('No hay facturas institucionales para este contrato.');
          this.closePaymentModal();
          return;
        }
        this.paymentFacturas.set(facturas);
        this.paymentFacturaId = facturas[0]?.id ?? null;
        this.paymentMonto = facturas[0]?.importeTotal ?? 0;
        this.onPaymentFacturaChange();
      });
    });
  }

  openPaymentFromFactura(factura: FacturacionContratoDTO): void {
    this.paymentInst.set({
      id: '',
      name: 'Factura institucional',
      razonSocial: '',
      cuit: '',
      type: 'EMPRESA',
      status: 'ACTIVA',
      plan: '',
      email: '',
      phone: '',
      adminContact: '',
      opsContact: '',
      address: '',
      city: '',
      lat: 0,
      lng: 0,
      members: 0,
      sinceMonth: '',
      contract: { code: '', plan: '', from: '', to: '', status: 'active', monthlyPrice: 0, monthlyCap: 0, kpiMinutes: 0, conditions: '' },
    });
    this.paymentFacturas.set([factura]);
    this.paymentFacturaId = factura.id;
    this.paymentMonto = factura.saldoPendiente ?? factura.importeTotal ?? 0;
    this.paymentMetodo = 'TRANSFERENCIA';
    this.paymentReferencia = '';
    this.paymentNota = 'Pago institucional desde tabla de facturas';
    this.onPaymentFacturaChange();
  }

  closePaymentModal(): void {
    this.paymentInst.set(null);
    this.paymentFacturas.set([]);
    this.pagosFacturaModal.set([]);
    this.loadingPayment.set(false);
  }

  onPaymentFacturaChange(): void {
    if (!this.paymentFacturaId) {
      this.pagosFacturaModal.set([]);
      return;
    }
    this.api.getPagosFacturaInstitucional(this.paymentFacturaId).pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((pagos) => this.pagosFacturaModal.set(pagos));
  }

  submitPaymentModal(): void {
    if (!this.paymentFacturaId || this.paymentMonto <= 0) return;
    this.loadingPayment.set(true);
    const hoy = new Date().toISOString().slice(0, 10);
    this.api.registrarPagoFacturaInstitucional(this.paymentFacturaId, {
      fechaPago: hoy,
      monto: this.paymentMonto,
      metodoPago: this.paymentMetodo,
      numeroReferencia: this.paymentReferencia.trim() || undefined,
      nota: this.paymentNota.trim() || undefined,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.loadingPayment.set(false);
        this.closePaymentModal();
        this.loadInstitutions();
        this.loadFacturasInstitucionales();
        this.onPaymentFacturaChange();
        alert(`Pago registrado. Saldo pendiente factura: ${this.fmtCurrency(res.saldoPendienteFactura ?? 0)}`);
      },
      error: (err) => {
        this.loadingPayment.set(false);
        alert(err?.error?.detail ?? err?.error?.title ?? 'No se pudo registrar el pago institucional.');
      },
    });
  }

  private loadFacturasInstitucionales(): void {
    this.api.getAllFacturasInstitucionales(0, 50).pipe(
      catchError(() => of([])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((facturas) => {
      this.facturasInstitucionales.set(facturas);
    });
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
      // If institution already has a persisted polygon (from a previous contract save),
      // parse and restore it into the contract modal drawing
      const savedPolygon = inst.polygon;
      if (savedPolygon && savedPolygon.length > 0) {
        // perimetroJson saved from contract modal is {x,y}[] (SVG %). Try to detect format:
        // if elements are plain objects with x/y it came from contract modal, otherwise it's lat/lng pairs
        const firstEl = (savedPolygon as any)[0];
        if (firstEl && typeof firstEl === 'object' && 'x' in firstEl && 'y' in firstEl) {
          draft.polygonPoints = savedPolygon as unknown as { x: number; y: number }[];
        } else {
          // lat/lng pairs from form modal — generate default circle instead
          draft.polygonPoints = buildDefaultCircle(inst.lat, inst.lng);
        }
      } else {
        draft.polygonPoints = buildDefaultCircle(inst.lat, inst.lng);
      }
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
          eventPrice:   c.eventPrice ?? d.eventPrice,
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

  saveContractFromModal(ctr: InstitutionContract): void {
    this.contractDraft.set(ctr);
    this.saveContract();
  }

  saveContract(): void {
    const inst = this.contractInst();
    if (!inst) return;

    const draft    = this.contractDraft();
    const planItem = this._commercialPlans().find(p => p.id === draft.plan);
    const planNumericId = planItem?.numericId ?? 0;
    const institucionId = Number(inst.id);

    this.loadingContract.set(true);

    const contractOp$ = this.api.saveContrato(
      { ...draft, conditions: draft.conditions ?? '', eventPrice: draft.eventPrice },
      institucionId,
      planNumericId,
    ).pipe(
      catchError(err => {
        console.error('Error saving contract', err);
        return of(null);
      }),
    );

    contractOp$.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(saved => {
      if (!saved) {
        this.loadingContract.set(false);
        return;
      }

      const updatedDraft: InstitutionContract = { ...draft, id: saved.id, code: saved.code };

      this.institutions.update(list =>
        list.map(i =>
          i.id === inst.id
            ? { ...i, plan: planItem?.id ?? i.plan, contract: updatedDraft }
            : i,
        ),
      );

      this.loadingContract.set(false);
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
      type:         f.type as InstitutionType,
      status:       f.status as EstadoInstitucion,
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
    const op$ = editing
      ? this.api.update(dto)
      : this.api.altaCompleta({
          institucion: dto,
          contratoInicial: this.buildContratoInicial(f),
        }).pipe(
          map(res => res.institucion),
        );
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

  private buildContratoInicial(f: InstitutionForm): NonNullable<Parameters<InstitutionsApiService['altaCompleta']>[0]['contratoInicial']> {
    const today = new Date();
    const from = today.toISOString().split('T')[0];
    const toDate = new Date(today);
    toDate.setFullYear(toDate.getFullYear() + 1);
    const to = toDate.toISOString().split('T')[0];

    const plan = this._commercialPlans().find(p => p.id === f.plan || p.name === f.plan);
    const defaultCap = plan?.tier === 'premium' ? 50 : plan?.tier === 'medio' ? 30 : 15;
    const defaultKpi = plan?.tier === 'premium' ? 8 : plan?.tier === 'medio' ? 12 : 15;

    return {
      modalidadCobertura: 'AREA_PROTEGIDA',
      vigenciaDesde: from,
      vigenciaHasta: to,
      estadoContrato: 'ACTIVO',
      precioMensualAcordado: plan?.monthlyBase ?? 0,
      topeAtencionesMensuales: defaultCap,
      kpiRespuestaMinutos: defaultKpi,
      planComercialId: plan?.numericId,
    };
  }

  onInstitutionStatusChanged(event: { id: string; nuevoEstado: EstadoInstitucion }): void {
    this.institutions.update(list =>
      list.map(i => i.id === event.id ? { ...i, status: event.nuevoEstado } : i),
    );
    this.drawerInst.update(current =>
      current && current.id === event.id ? { ...current, status: event.nuevoEstado } : current,
    );
  }

  // ── Mini-map click ──
  onMapClick(event: MouseEvent): void {
    const target = event.currentTarget as SVGElement;
    const rect = target.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    this.patchForm({ lat: Math.round(x * 100) / 100, lng: Math.round(y * 100) / 100 });
  }

  formatCuit(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 10) return digits.slice(0, 2) + '-' + digits.slice(2);
    return digits.slice(0, 2) + '-' + digits.slice(2, 10) + '-' + digits.slice(10);
  }
}
