import { Component, signal, computed, HostListener, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { PatientApiService } from '../../data-access/api/patient.api';
import { PlansApiService } from '../../data-access/api/plans.api';
import { AuthService } from '../../core/auth/auth.service';
import { PacienteDTO } from '../../data-access/dto/patient.dto';
import { PlanDTO } from '../../data-access/dto/plan.dto';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Dependent {
  id: string;
  miembroId?: number;
  pacienteId?: number;
  name: string;
  apellido: string;
  dni: string;
  parentesco: string;
  birth?: string;
  gender?: 'M' | 'F' | 'X';
}

interface PatientRow {
  pacienteId: number;
  id: string;
  name: string;
  dni: string;
  type: 'titular' | 'dependiente';
  status: 'al-dia' | 'deuda';
  sinceMonth: string;
  planNombre: string;
  planColor: string;
  depCount: number;
  _raw: PacienteDTO;
}

interface PatientForm {
  nombre: string;
  apellido: string;
  dni: string;
  birth: string;
  gender: 'M' | 'F' | 'X';
  phone: string;
  email: string;
  addr: string;
  planId: string;
  deps: Dependent[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PARENTESCOS = ['Cónyuge', 'Hijo/a', 'Padre/Madre', 'Hermano/a', 'Otro'];

const TIER_COLORS: Record<string, string> = {
  premium: 'var(--accent-emerald)',
  medio:   'var(--accent-blue)',
  basico:  'var(--text-muted)',
};

const METODOS_PAGO = [
  { value: 'EFECTIVO',        label: 'Efectivo' },
  { value: 'TRANSFERENCIA',   label: 'Transferencia bancaria' },
  { value: 'TARJETA_DEBITO',  label: 'Tarjeta débito' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta crédito' },
  { value: 'MERCADOPAGO',     label: 'MercadoPago' },
  { value: 'CHEQUE',          label: 'Cheque' },
  { value: 'DEBITO_AUTOMATICO', label: 'Débito automático' },
  { value: 'OTRO',            label: 'Otro' },
];

const PAGE_SIZE = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 });
}

function fmtDate(s: string | undefined): string {
  if (!s) return '—';
  const parts = s.split('T')[0].split('-');
  if (parts.length < 3) return s;
  const [y, m, d] = parts;
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
}

function fmtPeriodo(desde?: string, hasta?: string): string {
  if (!desde) return '—';
  const d = new Date(desde + 'T00:00:00');
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function avatarOf(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

function emptyForm(): PatientForm {
  return { nombre: '', apellido: '', dni: '', birth: '', gender: 'M', phone: '', email: '', addr: '', planId: '', deps: [] };
}

function sinceMonthFromISO(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function parentescoToRol(p: string): 'CO_TITULAR' | 'DEPENDIENTE' {
  return p === 'Cónyuge' ? 'CO_TITULAR' : 'DEPENDIENTE';
}

function sexoFromGender(g: 'M' | 'F' | 'X'): 'MASCULINO' | 'FEMENINO' | 'OTRO' {
  return g === 'M' ? 'MASCULINO' : g === 'F' ? 'FEMENINO' : 'OTRO';
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-patients',
  standalone: true,
  imports: [FormsModule, StatusBadgeComponent],
  template: `
    <div class="screen">

      <!-- ── Header ── -->
      <div class="screen-head">
        <div class="screen-head__title">
          <div class="screen-head__icon">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--accent-blue)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="7" cy="5" r="3"/>
              <path d="M1 15c0-3.31 2.69-5 6-5"/>
              <circle cx="13" cy="10" r="2.5"/>
              <path d="M10.5 14c0-1.93 1.12-3 3.5-3s3.5 1.07 3.5 3"/>
            </svg>
          </div>
          <div>
            <h2>Pacientes / Afiliados</h2>
            <div class="eyebrow">PADRÓN DE AFILIADOS · GRUPO FAMILIAR · PLANES</div>
          </div>
        </div>

        <div class="screen-head__kpis">
          <div class="screen-kpi">
            <div class="eyebrow">Afiliados</div>
            <div class="mono" style="font-size:18px; font-weight:500">{{ counts().total }}</div>
          </div>
          <div class="screen-kpi">
            <div class="eyebrow">Titulares</div>
            <div class="mono" style="font-size:18px; font-weight:500; color:var(--accent-blue)">{{ counts().titulares }}</div>
          </div>
          <div class="screen-kpi">
            <div class="eyebrow">Al día</div>
            <div class="mono" style="font-size:18px; font-weight:500; color:var(--accent-emerald)">{{ counts().alDia }}</div>
          </div>
          <div class="screen-kpi">
            <div class="eyebrow">En deuda</div>
            <div class="mono" style="font-size:18px; font-weight:500; color:var(--accent-red)">{{ counts().deuda }}</div>
          </div>
        </div>

        <div class="screen-head__actions">
          <button class="btn btn--ghost btn--sm">Exportar CSV</button>
          <button class="btn btn--primary btn--sm" (click)="openNewForm()">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
            Nuevo afiliado
          </button>
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
              placeholder="Buscar por nombre, DNI o ID de afiliado…"
              [value]="searchQuery()"
              (input)="searchQuery.set($any($event.target).value); page.set(0)"
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
        </div>

        <!-- Table -->
        <div class="data-table-wrap scroll-y">
          @if (loading()) {
            <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:12px">Cargando afiliados…</div>
          } @else {
            <table class="data-table" style="width:100%;min-width:700px">
              <thead>
                <tr>
                  <th>Afiliado</th>
                  <th>DNI</th>
                  <th>Tipo</th>
                  <th>Plan activo</th>
                  <th>Estado</th>
                  <th>Grupo familiar</th>
                  <th style="width:40px"></th>
                </tr>
              </thead>
              <tbody>
                @if (paged().length === 0) {
                  <tr>
                    <td colspan="7" style="padding:40px;text-align:center;color:var(--text-muted);font-size:12px">Sin resultados</td>
                  </tr>
                }
                @for (p of paged(); track p.pacienteId) {
                  <tr (click)="goToDetail(p)" style="cursor:pointer">
                    <td>
                      <div style="display:flex;align-items:center;gap:10px">
                        <div class="avatar avatar--sm">{{ avatarOf(p.name) }}</div>
                        <div>
                          <div style="font-size:13px;font-weight:500">{{ p.name }}</div>
                          <div class="mono micro" style="color:var(--text-muted)">{{ p.id }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="mono">{{ p.dni }}</td>
                    <td>
                      <span class="type-tag" [attr.data-type]="p.type">
                        {{ p.type === 'titular' ? 'Titular' : 'Dependiente' }}
                      </span>
                    </td>
                    <td>
                      <span class="plan-badge"
                        [style.background]="p.planColor + '18'"
                        [style.color]="p.planColor"
                        [style.border-color]="p.planColor + '55'"
                      >
                        <span class="plan-badge__dot" [style.background]="p.planColor"></span>
                        {{ p.planNombre || '—' }}
                      </span>
                    </td>
                    <td>
                      @if (p.status === 'al-dia') {
                        <emx-status-badge variant="stable">Al día</emx-status-badge>
                      } @else {
                        <emx-status-badge variant="critical" [pulse]="true">En deuda</emx-status-badge>
                      }
                    </td>
                    <td>
                      @if (p.depCount === 0) {
                        <span class="mono micro" style="color:var(--text-muted)">—</span>
                      } @else {
                        <span class="dep-count mono">
                          <svg width="11" height="11" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="5" r="3"/><path d="M1 15c0-3.31 2.69-5 6-5"/><circle cx="13" cy="10" r="2.5"/><path d="M10.5 14c0-1.93 1.12-3 3.5-3s3.5 1.07 3.5 3"/></svg>
                          {{ p.depCount }}
                        </span>
                      }
                    </td>
                    <td (click)="$event.stopPropagation()" style="position:relative">
                      <button class="action-icon" style="width:28px;height:28px" title="Acciones" (click)="toggleMenu(p.id)">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                      </button>
                      @if (menuOpen() === p.id) {
                        <div class="row-menu" (click)="$event.stopPropagation()">
                          <button class="user-menu__item" (click)="goToDetail(p); menuOpen.set(null)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            Ver perfil
                          </button>
                          <button class="user-menu__item" (click)="openEditForm(p); menuOpen.set(null)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            Editar
                          </button>
                          <button class="user-menu__item" (click)="goToDetail(p); menuOpen.set(null)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                            Registrar pago
                          </button>
                        </div>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        <!-- Pagination -->
        <div class="pt-pagination">
          <div class="mono micro" style="color:var(--text-muted)">
            Mostrando <strong style="color:var(--text-primary)">{{ paged().length }}</strong> de
            <strong style="color:var(--text-primary)">{{ filtered().length }}</strong> afiliados
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
         PATIENT FORM MODAL
         ═══════════════════════════════════════════════════════ -->
    @if (formOpen()) {
      <div class="qc-overlay" (click)="closeForm()">
        <div class="qc-modal qc-modal--wide glass-strong" (click)="$event.stopPropagation()">
          <div class="qc-head">
            <div>
              <div class="eyebrow" style="color:var(--accent-blue)">● {{ editingRow() ? 'EDITAR AFILIADO' : 'ALTA DE AFILIADO' }}</div>
              <h2 style="margin:4px 0 0;font-size:20px;font-weight:600;letter-spacing:-0.01em">
                {{ editingRow() ? (form().nombre + ' ' + form().apellido) : 'Nuevo afiliado titular' }}
              </h2>
            </div>
            <button class="qc-close-btn" (click)="closeForm()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
          </div>

          <div class="us-tabs">
            <button class="us-tab" [attr.data-active]="formTab() === 'titular'" (click)="formTab.set('titular')">
              <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="9" cy="6" r="3"/><path d="M3 15c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg>
              Datos del titular
            </button>
            <button class="us-tab" [attr.data-active]="formTab() === 'group'" (click)="formTab.set('group')">
              <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="5" r="3"/><path d="M1 15c0-3.31 2.69-5 6-5"/><circle cx="13" cy="10" r="2.5"/><path d="M10.5 14c0-1.93 1.12-3 3.5-3s3.5 1.07 3.5 3"/></svg>
              Grupo familiar
              <span class="mono" style="margin-left:4px;padding:1px 6px;border-radius:4px;font-size:10px;background:rgba(255,255,255,0.07)"
                [style.color]="form().deps.length > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)'">
                {{ form().deps.length }}
              </span>
            </button>
          </div>

          <div class="qc-body" style="max-height:60vh;overflow-y:auto;padding:16px 20px">
            @if (formTab() === 'titular') {
              <div style="display:flex;flex-direction:column;gap:14px">

                <div class="qc-row">
                  <div class="qc-field" style="flex:1">
                    <label class="eyebrow">Nombre <span style="color:var(--accent-red)">*</span></label>
                    <input class="qc-input" placeholder="Ej. Antonio" [value]="form().nombre" (input)="patchForm({ nombre: $any($event.target).value })" autofocus/>
                  </div>
                  <div class="qc-field" style="flex:1">
                    <label class="eyebrow">Apellido <span style="color:var(--accent-red)">*</span></label>
                    <input class="qc-input" placeholder="Ej. Vázquez" [value]="form().apellido" (input)="patchForm({ apellido: $any($event.target).value })"/>
                  </div>
                  <div class="qc-field" style="flex:1">
                    <label class="eyebrow">DNI <span style="color:var(--accent-red)">*</span></label>
                    <input class="qc-input" placeholder="18345672" [value]="form().dni" (input)="patchForm({ dni: $any($event.target).value })"/>
                  </div>
                </div>

                <div class="qc-row">
                  <div class="qc-field" style="flex:1">
                    <label class="eyebrow">Fecha de nacimiento <span style="color:var(--accent-red)">*</span></label>
                    <input class="qc-input" type="date" [value]="form().birth" (input)="patchForm({ birth: $any($event.target).value })"/>
                  </div>
                  <div class="qc-field" style="flex:1">
                    <label class="eyebrow">Género</label>
                    <div style="display:flex;gap:4px">
                      @for (g of genderOptions; track g.v) {
                        <button type="button" class="gender-btn" [attr.data-active]="form().gender === g.v" (click)="patchForm({ gender: g.v })">{{ g.l }}</button>
                      }
                    </div>
                  </div>
                </div>

                <div class="qc-row">
                  <div class="qc-field" style="flex:1">
                    <label class="eyebrow">Teléfono</label>
                    <input class="qc-input" placeholder="+54 388 4123-5678" [value]="form().phone" (input)="patchForm({ phone: $any($event.target).value })"/>
                  </div>
                  <div class="qc-field" style="flex:2">
                    <label class="eyebrow">Email</label>
                    <input class="qc-input" type="email" placeholder="apellido.nombre@gmail.com" [value]="form().email" (input)="patchForm({ email: $any($event.target).value })"/>
                  </div>
                </div>

                <div class="qc-field">
                  <label class="eyebrow">Dirección</label>
                  <input class="qc-input" placeholder="Calle, número · barrio · ciudad" [value]="form().addr" (input)="patchForm({ addr: $any($event.target).value })"/>
                </div>

                @if (!editingRow()) {
                  <div class="qc-field">
                    <label class="eyebrow">Plan contratado <span style="color:var(--accent-red)">*</span></label>
                    @if (loadingPlans()) {
                      <div style="font-size:12px;color:var(--text-muted);padding:8px 0">Cargando planes…</div>
                    } @else {
                      <div class="plan-grid">
                        @for (p of apiPlans(); track p.id) {
                          <button type="button" class="plan-card"
                            [attr.data-active]="form().planId === p.id"
                            [style.border-color]="form().planId === p.id ? planColorFromTier(p.tier) : 'var(--border-glass)'"
                            [style.background]="form().planId === p.id ? planColorFromTier(p.tier) + '14' : 'transparent'"
                            (click)="patchForm({ planId: p.id })">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                              <span class="plan-card__dot" [style.background]="planColorFromTier(p.tier)" [style.box-shadow]="'0 0 10px ' + planColorFromTier(p.tier)"></span>
                              <span style="font-size:13px;font-weight:600" [style.color]="form().planId === p.id ? planColorFromTier(p.tier) : 'var(--text-primary)'">{{ p.name }}</span>
                            </div>
                            <div class="mono" style="font-size:12px;color:var(--text-secondary)">
                              {{ fmtCurrency(p.pricing.monthly) }}<span style="color:var(--text-muted);margin-left:4px">/ mes</span>
                            </div>
                          </button>
                        }
                      </div>
                    }
                  </div>
                }

              </div>
            }

            @if (formTab() === 'group') {
              <div style="display:flex;flex-direction:column;gap:12px">
                <div style="display:flex;align-items:center;justify-content:space-between">
                  <div class="eyebrow">{{ form().deps.length }} dependientes en el grupo</div>
                  <button class="btn btn--ghost btn--sm" (click)="addDep()">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5.5" y1="1" x2="5.5" y2="10"/><line x1="1" y1="5.5" x2="10" y2="5.5"/></svg>
                    Agregar dependiente
                  </button>
                </div>

                @if (form().deps.length === 0) {
                  <div style="background:rgba(148,163,184,0.06);border:1px solid var(--border-glass);border-radius:10px;text-align:center;padding:24px">
                    <svg width="24" height="24" viewBox="0 0 18 18" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round" style="margin-bottom:8px"><circle cx="7" cy="5" r="3"/><path d="M1 15c0-3.31 2.69-5 6-5"/><circle cx="13" cy="10" r="2.5"/><path d="M10.5 14c0-1.93 1.12-3 3.5-3s3.5 1.07 3.5 3"/></svg>
                    <div style="font-size:13px;color:var(--text-secondary)">Aún no agregaste dependientes.</div>
                    <div class="mono micro" style="color:var(--text-muted);margin-top:4px">Cónyuge, hijos/as, padres u otros familiares cubiertos por el plan.</div>
                  </div>
                }

                @for (d of form().deps; track d.id; let i = $index) {
                  <div class="dep-row-form">
                    <div class="dep-row__num mono">{{ (i + 1).toString().padStart(2, '0') }}</div>
                    <div class="qc-field" style="flex:1">
                      <label class="eyebrow">Nombre</label>
                      <input class="qc-input" placeholder="Ej. Lucía" [value]="d.name" (input)="updateDep(d.id, 'name', $any($event.target).value)"/>
                    </div>
                    <div class="qc-field" style="flex:1">
                      <label class="eyebrow">Apellido</label>
                      <input class="qc-input" placeholder="Ej. Vázquez" [value]="d.apellido" (input)="updateDep(d.id, 'apellido', $any($event.target).value)"/>
                    </div>
                    <div class="qc-field" style="flex:1">
                      <label class="eyebrow">DNI</label>
                      <input class="qc-input" placeholder="42554789" [value]="d.dni" (input)="updateDep(d.id, 'dni', $any($event.target).value)"/>
                    </div>
                    <div class="qc-field" style="width:140px">
                      <label class="eyebrow">Parentesco</label>
                      <select class="qc-input" [value]="d.parentesco" (change)="updateDep(d.id, 'parentesco', $any($event.target).value)">
                        @for (p of parentescos; track p) {
                          <option [value]="p">{{ p }}</option>
                        }
                      </select>
                    </div>
                    <div class="qc-field" style="width:110px">
                      <label class="eyebrow">Nacimiento</label>
                      <input class="qc-input" type="date" [value]="d.birth ?? ''" (input)="updateDep(d.id, 'birth', $any($event.target).value)"/>
                    </div>
                    <button class="us-remove" (click)="removeDep(d.id)" style="align-self:flex-end;margin-bottom:2px">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          @if (formError()) {
            <div style="margin:0 20px 0;padding:8px 12px;border-radius:8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);font-size:12px;color:var(--accent-red)">
              {{ formError() }}
            </div>
          }

          <div class="qc-foot">
            <div class="qc-hint">
              <span class="kbd">Esc</span> cerrar &nbsp;·&nbsp;
              Tab: <strong [style.color]="formTab() === 'titular' ? 'var(--accent-blue)' : 'var(--text-muted)'">Titular</strong>
              · <strong [style.color]="formTab() === 'group' ? 'var(--accent-blue)' : 'var(--text-muted)'">Grupo</strong>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn--ghost" (click)="closeForm()">Cancelar</button>
              <button class="btn btn--primary" [disabled]="!canSubmit() || savingForm()" [style.opacity]="canSubmit() && !savingForm() ? '1' : '0.5'" (click)="saveForm()">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                {{ savingForm() ? 'Guardando…' : 'Guardar afiliado' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }

  `,
  styles: [`
    :host { display: block; }

    .pt-card {
      border-radius: var(--r-card);
      padding: 0;
      overflow: hidden;
    }

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
      min-width: 220px;
      height: 34px;
      border-radius: var(--r-btn);
      border: 1px solid var(--border-glass);
      background: rgba(255,255,255,0.03);
      padding: 0 12px;
    }
    .pt-search__input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      font-size: 12.5px;
      font-family: var(--font-sans);
      color: var(--text-primary);
    }
    .pt-search__input::placeholder { color: var(--text-muted); }

    .pt-filters {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .filter-chip {
      height: 28px;
      padding: 0 12px;
      border-radius: 20px;
      border: 1px solid var(--border-glass);
      background: transparent;
      color: var(--text-muted);
      font-size: 11.5px;
      font-family: var(--font-sans);
      cursor: pointer;
      transition: all 0.15s;
    }
    .filter-chip:hover { color: var(--text-primary); border-color: var(--border-glass); background: rgba(255,255,255,0.04); }
    .filter-chip[data-on="true"] {
      background: rgba(59,130,246,0.12);
      border-color: rgba(59,130,246,0.4);
      color: var(--accent-blue);
    }

    .data-table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .data-table th {
      padding: 10px 14px;
      text-align: left;
      font-size: 10.5px;
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-hairline);
      background: rgba(255,255,255,0.02);
      white-space: nowrap;
    }
    .data-table td {
      padding: 11px 14px;
      border-bottom: 1px solid var(--border-hairline);
      color: var(--text-secondary);
      vertical-align: middle;
    }
    .data-table tr:last-child td { border-bottom: none; }
    .data-table tr:hover td { background: rgba(255,255,255,0.025); }

    .type-tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-family: var(--font-mono);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      background: rgba(59,130,246,0.1);
      color: var(--accent-blue);
    }
    .type-tag[data-type="dependiente"] {
      background: rgba(148,163,184,0.08);
      color: var(--text-muted);
    }

    .plan-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px 3px 8px;
      border-radius: 6px;
      border: 1px solid;
      font-size: 11.5px;
      font-weight: 500;
      white-space: nowrap;
    }
    .plan-badge__dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

    .dep-count {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11.5px;
      color: var(--text-secondary);
    }

    .action-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .action-icon:hover { background: rgba(255,255,255,0.06); border-color: var(--border-glass); color: var(--text-primary); }

    .row-menu {
      position: absolute;
      right: 4px;
      top: calc(100% + 4px);
      z-index: 50;
      min-width: 180px;
      border-radius: 10px;
      border: 1px solid var(--border-glass);
      background: var(--bg-elevated);
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      padding: 4px;
    }
    .user-menu__item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 8px 10px;
      border-radius: 6px;
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 12.5px;
      font-family: var(--font-sans);
      cursor: pointer;
      text-align: left;
      transition: background 0.1s, color 0.1s;
    }
    .user-menu__item:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
    .user-menu__item--danger { color: var(--accent-red); }
    .user-menu__item--danger:hover { background: rgba(239,68,68,0.08); }

    .pt-pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-top: 1px solid var(--border-hairline);
    }
    .page-btn {
      width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px;
      border: 1px solid var(--border-glass);
      background: transparent;
      font-size: 12px; font-family: var(--font-mono);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .page-btn:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
    .page-btn[data-active="true"] { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.4); color: var(--accent-blue); }

    .avatar { display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 700; color: #fff; flex-shrink: 0; font-family: var(--font-mono); }
    .avatar--sm { width: 36px; height: 36px; font-size: 13px; background: linear-gradient(135deg, #3b82f6, #1e40af); }

    /* ── Modal ── */
    .qc-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
    .qc-modal { width: 100%; max-width: 580px; border-radius: 16px; display: flex; flex-direction: column; animation: modal-in 0.18s ease-out; }
    .qc-modal--wide { max-width: 760px; }
    @keyframes modal-in { from { transform: scale(0.96) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
    .qc-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 20px 16px; border-bottom: 1px solid var(--border-hairline); }
    .qc-body { padding: 16px 20px; }
    .qc-foot { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-top: 1px solid var(--border-hairline); gap: 8px; }
    .qc-hint { font-size: 11px; color: var(--text-dim); }
    .qc-close-btn {
      width: 28px; height: 28px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      border: 1px solid var(--border-glass); background: rgba(255,255,255,0.04);
      color: var(--text-muted); cursor: pointer; flex-shrink: 0;
    }
    .qc-close-btn:hover { background: rgba(255,255,255,0.09); color: var(--text-primary); }
    .qc-row { display: flex; gap: 12px; }
    .qc-field { display: flex; flex-direction: column; gap: 5px; }
    .qc-input {
      height: 36px; border-radius: var(--r-btn); border: 1px solid var(--border-glass);
      background: rgba(255,255,255,0.04); color: var(--text-primary);
      font-size: 12.5px; font-family: var(--font-sans);
      padding: 0 10px; outline: none; width: 100%; box-sizing: border-box;
      transition: border-color 0.15s;
    }
    .qc-input:focus { border-color: rgba(59,130,246,0.5); }
    textarea.qc-input { height: auto; padding: 8px 10px; resize: vertical; }
    .kbd { display: inline-block; padding: 1px 5px; border-radius: 4px; font-size: 10px; font-family: var(--font-mono); background: rgba(255,255,255,0.06); border: 1px solid var(--border-glass); }

    .us-tabs { display: flex; gap: 2px; padding: 12px 20px 0; border-bottom: 1px solid var(--border-hairline); }
    .us-tab {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px; border-radius: 8px 8px 0 0;
      border: 1px solid transparent; border-bottom: none;
      background: transparent; color: var(--text-muted);
      font-size: 12.5px; font-family: var(--font-sans);
      cursor: pointer; transition: all 0.15s; position: relative; bottom: -1px;
    }
    .us-tab:hover { color: var(--text-primary); background: rgba(255,255,255,0.04); }
    .us-tab[data-active="true"] { color: var(--accent-blue); background: var(--bg-elevated); border-color: var(--border-glass); border-bottom-color: var(--bg-elevated); }
    .us-remove {
      width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
      border-radius: 6px; border: 1px solid var(--border-glass);
      background: rgba(239,68,68,0.06); color: var(--accent-red); cursor: pointer; flex-shrink: 0;
    }
    .us-remove:hover { background: rgba(239,68,68,0.14); }

    .plan-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .plan-card {
      padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-glass);
      background: transparent; cursor: pointer; text-align: left; transition: all 0.15s;
    }
    .plan-card:hover { background: rgba(255,255,255,0.04); }
    .plan-card[data-active="true"] { box-shadow: 0 0 0 1px currentColor; }
    .plan-card__dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }

    .dep-row-form {
      display: flex; align-items: flex-end; gap: 10px;
      padding: 10px 12px; border-radius: 10px;
      background: rgba(255,255,255,0.03); border: 1px solid var(--border-glass);
    }
    .dep-row__num { font-size: 11px; color: var(--text-dim); flex-shrink: 0; margin-bottom: 8px; }

    .gender-btn {
      flex: 1; height: 36px; border-radius: var(--r-btn);
      border: 1px solid var(--border-glass); background: rgba(255,255,255,0.03);
      color: var(--text-muted); font-size: 12px; font-family: var(--font-sans);
      cursor: pointer; transition: all 0.15s;
    }
    .gender-btn:hover { background: rgba(255,255,255,0.07); color: var(--text-primary); }
    .gender-btn[data-active="true"] { background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.4); color: var(--accent-blue); }
  `],
})
export class PatientsComponent implements OnInit {
  private patientApi  = inject(PatientApiService);
  private plansApi    = inject(PlansApiService);
  private authService = inject(AuthService);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);

  // ── Constants exposed to template ──
  readonly parentescos = PARENTESCOS;
  readonly metodosPago = METODOS_PAGO;
  readonly statusOptions = [
    { value: 'all',    label: 'Todos'    },
    { value: 'al-dia', label: 'Al día'   },
    { value: 'deuda',  label: 'En deuda' },
  ];
  readonly genderOptions: { v: 'M' | 'F' | 'X'; l: string }[] = [
    { v: 'M', l: 'Masculino' },
    { v: 'F', l: 'Femenino'  },
    { v: 'X', l: 'Otro'      },
  ];

  // ── State — table ──
  readonly loading      = signal(false);
  readonly patients     = signal<PatientRow[]>([]);
  readonly searchQuery  = signal('');
  readonly statusFilter = signal('all');
  readonly page         = signal(0);
  readonly menuOpen     = signal<string | null>(null);

  // ── State — form modal ──
  readonly formOpen      = signal(false);
  readonly editingRow    = signal<PatientRow | null>(null);
  readonly formTab       = signal<'titular' | 'group'>('titular');
  readonly form          = signal<PatientForm>(emptyForm());
  readonly savingForm    = signal(false);
  readonly formError     = signal<string | null>(null);

  // ── State — plans (for new afiliado form) ──
  readonly apiPlans    = signal<PlanDTO[]>([]);
  readonly loadingPlans = signal(false);

  // ── Computed ──
  readonly filtered = computed(() => {
    const q  = this.searchQuery().toLowerCase();
    const s  = this.statusFilter();
    return this.patients().filter(p =>
      (s === 'all' || p.status === s) &&
      (!q || p.name.toLowerCase().includes(q) || p.dni.includes(q) || p.id.toLowerCase().includes(q))
    );
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  readonly paged = computed(() => {
    const pg = Math.min(this.page(), this.totalPages() - 1);
    return this.filtered().slice(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE);
  });

  readonly pageRange = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));

  readonly counts = computed(() => {
    const list = this.patients();
    return {
      total:    list.length,
      titulares: list.filter(p => p.type === 'titular').length,
      alDia:    list.filter(p => p.status === 'al-dia').length,
      deuda:    list.filter(p => p.status === 'deuda').length,
    };
  });

  readonly canSubmit = computed(() => {
    const f = this.form();
    const needsPlan = !this.editingRow();
    return (
      f.nombre.trim().length > 0 &&
      f.apellido.trim().length > 0 &&
      f.dni.trim().length > 0 &&
      f.birth.length > 0 &&
      (!needsPlan || f.planId.length > 0)
    );
  });

  // ── Lifecycle ──
  ngOnInit(): void {
    this.loadPatients();
    this.loadPlans();
  }

  private loadPatients(): void {
    const editId = Number(this.route.snapshot.queryParams['edit']) || null;
    this.loading.set(true);
    this.patientApi.getAll().pipe(
      catchError(() => of([] as PacienteDTO[])),
    ).subscribe(dtos => {
      const rows = dtos.map(p => this.mapDTO(p));
      this.patients.set(rows);
      this.loading.set(false);
      if (editId) {
        const row = rows.find(r => r.pacienteId === editId);
        if (row) this.openEditForm(row);
      }
    });
  }

  private loadPlans(): void {
    this.loadingPlans.set(true);
    this.plansApi.getAll().pipe(
      catchError(() => of([] as PlanDTO[])),
    ).subscribe(plans => {
      this.apiPlans.set(plans.filter(p => p.active));
      this.loadingPlans.set(false);
    });
  }

  private mapDTO(p: PacienteDTO): PatientRow {
    const addr = [p.direccion, p.ciudad].filter(Boolean).join(' · ') || '—';
    return {
      pacienteId: p.id,
      id:         p.numeroAfiliado ?? `AF-${p.id}`,
      name:       `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim(),
      dni:        p.dni,
      type:       'titular',
      status:     p.activo !== false ? 'al-dia' : 'deuda',
      sinceMonth: sinceMonthFromISO(p.createdAt),
      planNombre: '',
      planColor:  'var(--text-muted)',
      depCount:   0,
      _raw:       p,
    };
  }

  // ── Plan helpers ──
  planColorFromTier(tier: string): string {
    return TIER_COLORS[tier] ?? 'var(--text-muted)';
  }


  // ── Format helpers ──
  readonly fmtCurrency  = fmtCurrency;
  readonly fmtDate      = fmtDate;
  readonly fmtPeriodo   = fmtPeriodo;
  readonly avatarOf     = avatarOf;

  // ── Table ──
  setStatus(v: string): void {
    this.statusFilter.set(v);
    this.page.set(0);
  }

  toggleMenu(id: string): void {
    this.menuOpen.set(this.menuOpen() === id ? null : id);
  }

  @HostListener('document:click')
  closeMenuOnOutsideClick(): void { this.menuOpen.set(null); }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.formOpen()) { this.closeForm(); return; }
  }

  // ── Navigation ──
  goToDetail(row: PatientRow): void {
    this.router.navigate(['/patients', row.pacienteId]);
  }

  // ── Form modal ──
  openNewForm(): void {
    this.editingRow.set(null);
    this.form.set(emptyForm());
    this.formTab.set('titular');
    this.formError.set(null);
    this.formOpen.set(true);
  }

  openEditForm(row: PatientRow): void {
    const raw = row._raw;
    const deps: Dependent[] = [];

    this.editingRow.set(row);
    this.form.set({
      nombre:   raw.nombre ?? '',
      apellido: raw.apellido ?? '',
      dni:      raw.dni,
      birth:    raw.fechaNacimiento ?? '',
      gender:   raw.sexo === 'FEMENINO' ? 'F' : raw.sexo === 'MASCULINO' ? 'M' : 'X',
      phone:    raw.telefono ?? '',
      email:    raw.email ?? '',
      addr:     raw.direccion ?? '',
      planId:   '',
      deps,
    });
    this.formTab.set('titular');
    this.formError.set(null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingRow.set(null);
    this.formError.set(null);
  }

  patchForm(patch: Partial<PatientForm>): void {
    this.form.set({ ...this.form(), ...patch });
  }

  saveForm(): void {
    if (!this.canSubmit() || this.savingForm()) return;
    const f = this.form();
    const editing = this.editingRow();
    const empresaId = this.authService.currentAccount()?.empresa?.id;
    if (!empresaId) { this.formError.set('No se pudo determinar la empresa actual.'); return; }

    const payload = {
      nombre:    f.nombre.trim(),
      apellido:  f.apellido.trim(),
      dni:       f.dni.trim(),
      tipoDocumento: 'DNI' as const,
      sexo:      sexoFromGender(f.gender),
      fechaNacimiento: f.birth || undefined,
      email:     f.email || undefined,
      telefono:  f.phone || undefined,
      direccion: f.addr || undefined,
      activo:    true,
      empresa:   { id: empresaId },
    };

    this.savingForm.set(true);
    this.formError.set(null);

    const save$ = editing
      ? this.patientApi.update(editing.pacienteId, payload)
      : this.patientApi.create(payload);

    save$.pipe(
      catchError(err => {
        this.formError.set(err?.error?.detail ?? err?.error?.title ?? 'Error al guardar. Revisá los datos.');
        this.savingForm.set(false);
        return of(null);
      }),
    ).subscribe(saved => {
      if (!saved) return;
      this.savingForm.set(false);
      this.loadPatients();

      // Si hay un plan seleccionado (alta nueva), crear cobertura
      if (!editing && f.planId) {
        const planIdNum = Number(f.planId);
        if (!isNaN(planIdNum)) {
          this.patientApi.crearCobertura(saved.id, {
            tipoCobertura: 'PLAN_PROPIO',
            planComercialId: planIdNum,
            vigenciaDesde: todayISO(),
          }).pipe(catchError(() => of(null))).subscribe();
        }
      }

      this.closeForm();
    });
  }

  // ── Dependent management (local form state only) ──
  addDep(): void {
    const dep: Dependent = { id: `d${Date.now()}`, name: '', apellido: '', dni: '', parentesco: 'Hijo/a', gender: 'M' };
    this.form.update(f => ({ ...f, deps: [...f.deps, dep] }));
  }

  updateDep(id: string, field: keyof Dependent, value: string): void {
    this.form.update(f => ({ ...f, deps: f.deps.map(d => d.id === id ? { ...d, [field]: value } : d) }));
  }

  removeDep(id: string): void {
    this.form.update(f => ({ ...f, deps: f.deps.filter(d => d.id !== id) }));
  }
}
