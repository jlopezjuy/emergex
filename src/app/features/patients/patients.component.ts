import { Component, signal, computed, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Dependent {
  id: string;
  name: string;
  dni: string;
  parentesco: string;
  birth?: string;
}

interface Payment {
  id: string;
  date: string;
  period: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  method: string;
}

interface Patient {
  id: string;
  name: string;
  dni: string;
  type: 'titular' | 'dependiente';
  plan: string;
  status: 'al-dia' | 'deuda';
  birth: string;
  gender: 'M' | 'F' | 'X';
  phone: string;
  email: string;
  addr: string;
  sinceMonth: string;
  deps: Dependent[];
  payments?: Payment[];
  nextDue?: string;
  nextAmount?: number;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  color: string;
  features: string[];
}

interface PatientForm {
  name: string;
  dni: string;
  birth: string;
  gender: 'M' | 'F' | 'X';
  phone: string;
  email: string;
  addr: string;
  plan: string;
  type: 'titular' | 'dependiente';
  deps: Dependent[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANS: Plan[] = [
  { id: 'basico',   name: 'Plan Básico',           price: 18500,  color: 'var(--text-muted)',     features: ['Consultas generales', 'Urgencias básicas', '1 ambulancia/mes'] },
  { id: 'familiar', name: 'Plan Familiar',          price: 32400,  color: 'var(--accent-blue)',    features: ['Hasta 4 dependientes', 'Urgencias 24/7', '3 ambulancias/mes', 'Consultas especialistas'] },
  { id: 'premium',  name: 'Plan Familiar Premium',  price: 54800,  color: 'var(--accent-emerald)', features: ['Hasta 6 dependientes', 'Urgencias premium ALS', 'Ambulancias ilimitadas', 'Internación cubierta', 'Telemedicina 24/7'] },
  { id: 'joven',    name: 'Plan Joven',             price: 12900,  color: 'var(--accent-cyan)',    features: ['Hasta 30 años', 'Urgencias básicas', 'Consultas generales', 'App de salud'] },
  { id: 'empresa',  name: 'Plan Empresarial',       price: 68000,  color: 'var(--accent-amber)',   features: ['Cobertura grupal', 'Médico de empresa', 'Capacitaciones', 'Ambulancias dedicadas'] },
];

const PARENTESCOS = ['Cónyuge', 'Hijo/a', 'Padre/Madre', 'Hermano/a', 'Otro'];

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  paid:    { label: 'Pagado',    color: 'var(--accent-emerald)' },
  pending: { label: 'Pendiente', color: 'var(--accent-amber)'   },
  overdue: { label: 'Vencido',   color: 'var(--accent-red)'     },
};

const PATIENTS_SEED: Patient[] = [
  {
    id: 'AF-1003', name: 'Antonio Vázquez Cárdenas', dni: '18.345.672', type: 'titular', plan: 'premium',
    status: 'al-dia', birth: '1968-03-14', gender: 'M', phone: '+54 388 4123-5678', email: 'a.vazquez@gmail.com',
    addr: 'Av. 19 de Abril 247 · Centro', sinceMonth: 'Marzo 2019',
    deps: [
      { id: 'd1', name: 'María Vázquez Salinas', dni: '20.871.103', parentesco: 'Cónyuge', birth: '1971-09-22' },
      { id: 'd2', name: 'Lucía Vázquez',         dni: '42.554.789', parentesco: 'Hijo/a',  birth: '2001-04-18' },
      { id: 'd3', name: 'Mateo Vázquez',         dni: '44.998.112', parentesco: 'Hijo/a',  birth: '2005-11-30' },
    ],
    payments: [
      { id: 'p1', date: '2026-05-08', period: 'Mayo 2026',     amount: 54800, status: 'paid',  method: 'Débito automático' },
      { id: 'p2', date: '2026-04-08', period: 'Abril 2026',    amount: 54800, status: 'paid',  method: 'Débito automático' },
      { id: 'p3', date: '2026-03-08', period: 'Marzo 2026',    amount: 52300, status: 'paid',  method: 'Débito automático' },
      { id: 'p4', date: '2026-02-08', period: 'Febrero 2026',  amount: 52300, status: 'paid',  method: 'Transferencia'     },
    ],
    nextDue: '2026-06-08', nextAmount: 54800,
  },
  { id: 'AF-1004', name: 'María González Pérez',    dni: '20.871.103', type: 'titular', plan: 'familiar', status: 'al-dia', birth: '1979-09-15', gender: 'F', phone: '+54 388 4221-3344', email: 'm.gonzalez@hotmail.com', addr: 'Calle Belgrano 612 · Centro',         sinceMonth: 'Enero 2021',      deps: [{ id: 'd1', name: 'Joaquín González', dni: '48.221.554', parentesco: 'Hijo/a' }] },
  { id: 'AF-1005', name: 'Carlos Méndez Rivas',     dni: '28.554.789', type: 'titular', plan: 'familiar', status: 'deuda',  birth: '1981-07-23', gender: 'M', phone: '+54 388 4778-2210', email: 'c.mendez@gmail.com',     addr: 'Av. Bolivia 1820 · Ciudad de Nieva', sinceMonth: 'Junio 2022',      deps: [{ id: 'd1', name: 'Camila Méndez', dni: '47.112.099', parentesco: 'Hijo/a' }, { id: 'd2', name: 'Laura Sosa', dni: '29.443.781', parentesco: 'Cónyuge' }] },
  { id: 'AF-1006', name: 'Laura Sánchez Ortiz',     dni: '30.112.045', type: 'titular', plan: 'premium',  status: 'al-dia', birth: '1983-12-04', gender: 'F', phone: '+54 388 4554-8821', email: 'l.sanchez@outlook.com',  addr: 'Av. Sen. Pérez 1700 · Alto Padilla', sinceMonth: 'Septiembre 2018', deps: [{ id: 'd1', name: 'Tomás Ríos', dni: '48.998.234', parentesco: 'Hijo/a' }, { id: 'd2', name: 'Bruno Ríos', dni: '51.443.112', parentesco: 'Hijo/a' }, { id: 'd3', name: 'Andrés Ríos', dni: '27.554.443', parentesco: 'Cónyuge' }] },
  { id: 'AF-1007', name: 'Roberto Téllez Cabrera',  dni: '22.890.661', type: 'titular', plan: 'basico',   status: 'al-dia', birth: '1972-05-19', gender: 'M', phone: '+54 388 4445-7720', email: 'r.tellez@yahoo.com',     addr: 'Calle Lavalle 425 · Cuyaya',         sinceMonth: 'Marzo 2017',      deps: [] },
  { id: 'AF-1008', name: 'Ana Patricia Núñez',      dni: '35.421.099', type: 'titular', plan: 'joven',    status: 'al-dia', birth: '1991-04-29', gender: 'F', phone: '+54 388 4221-9988', email: 'ap.nunez@gmail.com',     addr: 'Calle Güemes 1102 · Centro',         sinceMonth: 'Febrero 2024',    deps: [] },
  { id: 'AF-1009', name: 'Diego Vidal Martínez',    dni: '17.998.234', type: 'titular', plan: 'premium',  status: 'deuda',  birth: '1965-08-17', gender: 'M', phone: '+54 388 4334-2211', email: 'd.vidal@gmail.com',      addr: 'San Martín 450 · Centro',            sinceMonth: 'Mayo 2020',       deps: [{ id: 'd1', name: 'Isabel Vidal', dni: '19.778.554', parentesco: 'Cónyuge' }, { id: 'd2', name: 'Camila Vidal', dni: '42.443.881', parentesco: 'Hijo/a' }, { id: 'd3', name: 'Lucio Vidal', dni: '45.221.009', parentesco: 'Hijo/a' }] },
  { id: 'AF-1010', name: 'Sofía Ramírez Bello',     dni: '26.443.781', type: 'titular', plan: 'familiar', status: 'al-dia', birth: '1984-01-12', gender: 'F', phone: '+54 388 4778-5544', email: 's.ramirez@hotmail.com',  addr: 'Av. Italia 1101 · Cuyaya',           sinceMonth: 'Julio 2019',      deps: [{ id: 'd1', name: 'Bruno Ramírez', dni: '48.331.224', parentesco: 'Hijo/a' }, { id: 'd2', name: 'Pablo Ramírez', dni: '27.998.331', parentesco: 'Cónyuge' }] },
  { id: 'AF-1011', name: 'Joaquín Ríos Quintana',   dni: '24.667.998', type: 'titular', plan: 'empresa',  status: 'al-dia', birth: '1977-11-08', gender: 'M', phone: '+54 388 4112-7733', email: 'j.rios@minera.com.ar',   addr: 'Av. Fascio s/n · Bajo La Viña',     sinceMonth: 'Octubre 2022',    deps: [] },
  { id: 'AF-1012', name: 'Mariana Soto Vega',       dni: '29.881.443', type: 'titular', plan: 'familiar', status: 'deuda',  birth: '1986-06-25', gender: 'F', phone: '+54 388 4998-1100', email: 'm.soto@gmail.com',      addr: 'Calle Independencia 16 · Centro',    sinceMonth: 'Marzo 2023',      deps: [{ id: 'd1', name: 'Renato Soto', dni: '50.221.443', parentesco: 'Hijo/a' }] },
  { id: 'AF-1013', name: 'Pablo Lara Domínguez',    dni: '31.554.221', type: 'titular', plan: 'joven',    status: 'al-dia', birth: '1988-02-14', gender: 'M', phone: '+54 388 4332-8855', email: 'p.lara@gmail.com',      addr: 'Patricias Argentinas 451 · Centro',  sinceMonth: 'Enero 2025',      deps: [] },
  { id: 'AF-1014', name: 'Camila Hernández Bello',  dni: '33.998.112', type: 'titular', plan: 'basico',   status: 'al-dia', birth: '1989-10-22', gender: 'F', phone: '+54 388 4221-3344', email: 'c.hernandez@gmail.com',  addr: 'Av. 19 de Abril 1530 · Centro',      sinceMonth: 'Abril 2023',      deps: [] },
  { id: 'AF-1015', name: 'Tomás Ortega Paz',        dni: '32.112.998', type: 'titular', plan: 'familiar', status: 'al-dia', birth: '1987-03-30', gender: 'M', phone: '+54 388 4332-9988', email: 't.ortega@yahoo.com',    addr: 'Calle Belgrano 250 · Centro',        sinceMonth: 'Agosto 2021',     deps: [{ id: 'd1', name: 'Sofía Ortega', dni: '53.998.221', parentesco: 'Hijo/a' }, { id: 'd2', name: 'Paula Paz', dni: '30.554.881', parentesco: 'Cónyuge' }] },
  { id: 'AF-1016', name: 'Helena Rojas Mena',       dni: '34.665.778', type: 'titular', plan: 'familiar', status: 'deuda',  birth: '1990-07-08', gender: 'F', phone: '+54 388 4998-3322', email: 'h.rojas@hotmail.com',   addr: 'Av. Bolivia 945 · Centro',           sinceMonth: 'Noviembre 2023',  deps: [{ id: 'd1', name: 'Lautaro Rojas', dni: '52.443.998', parentesco: 'Hijo/a' }] },
  { id: 'AF-1017', name: 'Marco Ávila Cruz',        dni: '27.554.881', type: 'titular', plan: 'premium',  status: 'al-dia', birth: '1981-01-09', gender: 'M', phone: '+54 388 4112-9988', email: 'm.avila@gmail.com',     addr: 'Lavalle 333 · Centro',               sinceMonth: 'Diciembre 2018',  deps: [{ id: 'd1', name: 'Florencia Ávila', dni: '29.881.554', parentesco: 'Cónyuge' }, { id: 'd2', name: 'Iván Ávila', dni: '48.221.998', parentesco: 'Hijo/a' }, { id: 'd3', name: 'Mía Ávila', dni: '52.998.112', parentesco: 'Hijo/a' }, { id: 'd4', name: 'León Ávila', dni: '54.665.443', parentesco: 'Hijo/a' }] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 });
}

function fmtDate(s: string | undefined): string {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
}

function avatarOf(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

function emptyForm(): PatientForm {
  return { name: '', dni: '', birth: '', gender: 'M', phone: '', email: '', addr: '', plan: 'familiar', type: 'titular', deps: [] };
}

const PAGE_SIZE = 10;

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
            <div class="mono" style="font-size:18px; font-weight:500">{{ counts().total + counts().dependents }}</div>
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
            <span class="eyebrow" style="white-space:nowrap">Plan:</span>
            <select class="qc-input" style="height:28px;font-size:11.5px;padding:0 8px;width:160px" [(ngModel)]="planFilterValue" (ngModelChange)="page.set(0)">
              <option value="all">Todos los planes</option>
              @for (p of plans; track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Table -->
        <div class="data-table-wrap scroll-y">
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
              @for (p of paged(); track p.id) {
                <tr (click)="selectedPatient.set(p)" style="cursor:pointer">
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
                      [style.background]="planColor(p.plan) + '18'"
                      [style.color]="planColor(p.plan)"
                      [style.border-color]="planColor(p.plan) + '55'"
                    >
                      <span class="plan-badge__dot" [style.background]="planColor(p.plan)"></span>
                      {{ planName(p.plan) }}
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
                    @if (p.deps.length === 0) {
                      <span class="mono micro" style="color:var(--text-muted)">—</span>
                    } @else {
                      <span class="dep-count mono">
                        <svg width="11" height="11" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="5" r="3"/><path d="M1 15c0-3.31 2.69-5 6-5"/><circle cx="13" cy="10" r="2.5"/><path d="M10.5 14c0-1.93 1.12-3 3.5-3s3.5 1.07 3.5 3"/></svg>
                        {{ p.deps.length }}
                      </span>
                    }
                  </td>
                  <td (click)="$event.stopPropagation()" style="position:relative">
                    <button class="action-icon" style="width:28px;height:28px" title="Acciones"
                      (click)="toggleMenu(p.id)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                    @if (menuOpen() === p.id) {
                      <div class="row-menu" (click)="$event.stopPropagation()">
                        <button class="user-menu__item" (click)="selectedPatient.set(p); menuOpen.set(null)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                          Ver detalle
                        </button>
                        <button class="user-menu__item" (click)="openEditForm(p); menuOpen.set(null)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Editar
                        </button>
                        <button class="user-menu__item">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                          Registrar pago
                        </button>
                        <button class="user-menu__item">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Descargar carnet
                        </button>
                        <div style="height:1px;background:var(--border-hairline);margin:4px 0"></div>
                        <button class="user-menu__item user-menu__item--danger">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                          Dar de baja
                        </button>
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
         PATIENT DETAIL SLIDEOVER
         ═══════════════════════════════════════════════════════ -->
    @if (selectedPatient()) {
      <div class="so-overlay" (click)="selectedPatient.set(null)"></div>
      <aside class="slideover glass-strong" (click)="$event.stopPropagation()">
        <div class="so-head">
          <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1">
            <div class="avatar avatar--lg"
              [style.background]="'linear-gradient(135deg, ' + planColor(selectedPatient()!.plan) + ', rgba(15,23,42,0.6))'">
              {{ avatarOf(selectedPatient()!.name) }}
            </div>
            <div style="min-width:0">
              <div style="font-size:16px;font-weight:600;letter-spacing:-0.01em">{{ selectedPatient()!.name }}</div>
              <div class="mono micro" style="color:var(--text-muted);margin-top:2px">{{ selectedPatient()!.id }} · DNI {{ selectedPatient()!.dni }}</div>
              <div style="margin-top:6px">
                <span class="plan-badge"
                  [style.background]="planColor(selectedPatient()!.plan) + '20'"
                  [style.color]="planColor(selectedPatient()!.plan)"
                  [style.border-color]="planColor(selectedPatient()!.plan) + '55'"
                >
                  <span class="plan-badge__dot" [style.background]="planColor(selectedPatient()!.plan)"></span>
                  {{ planName(selectedPatient()!.plan) }}
                </span>
              </div>
            </div>
          </div>
          <button class="qc-close-btn" (click)="selectedPatient.set(null)">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
          </button>
        </div>

        <div class="so-body scroll-y">
          <!-- Status hero -->
          <div class="status-hero" [class.status-hero--debt]="selectedPatient()!.status === 'deuda'" [class.status-hero--ok]="selectedPatient()!.status === 'al-dia'">
            <div style="display:flex;align-items:center;gap:12px">
              <div class="status-hero__icon">
                @if (selectedPatient()!.status === 'deuda') {
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                } @else {
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                }
              </div>
              <div>
                <div style="font-size:11px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:0.14em;opacity:0.8">Estado de cuenta</div>
                <div style="font-size:18px;font-weight:600;letter-spacing:-0.01em">
                  {{ selectedPatient()!.status === 'deuda' ? 'En deuda' : 'Al día' }}
                </div>
              </div>
            </div>
            <div style="text-align:right">
              <div class="eyebrow" style="opacity:0.8">Afiliado desde</div>
              <div class="mono" style="font-size:13px;font-weight:500">{{ selectedPatient()!.sinceMonth }}</div>
            </div>
          </div>

          <!-- Due grid -->
          <div class="due-grid">
            <div class="due-card">
              <div class="eyebrow">Próximo vencimiento</div>
              <div class="mono" style="font-size:20px;font-weight:600;margin-top:4px"
                [style.color]="selectedPatient()!.status === 'deuda' ? 'var(--accent-red)' : 'var(--text-primary)'">
                {{ fmtDate(selectedPatient()!.nextDue ?? '2026-06-08') }}
              </div>
              <div class="mono micro" style="margin-top:2px"
                [style.color]="selectedPatient()!.status === 'deuda' ? 'var(--accent-red)' : 'var(--text-muted)'">
                {{ selectedPatient()!.status === 'deuda' ? '⚠ 12 días vencido' : 'en 24 días' }}
              </div>
            </div>
            <div class="due-card">
              <div class="eyebrow">Monto cuota</div>
              <div class="mono" style="font-size:20px;font-weight:600;margin-top:4px;color:var(--accent-emerald)">
                {{ fmtCurrency(selectedPatient()!.nextAmount ?? planPrice(selectedPatient()!.plan)) }}
              </div>
              <div class="mono micro" style="color:var(--text-muted);margin-top:2px">débito automático</div>
            </div>
          </div>

          <!-- Plan features -->
          <div style="margin-top:16px">
            <div class="eyebrow" style="margin-bottom:8px">Plan activo · Beneficios incluidos</div>
            <div class="plan-features-list">
              @for (f of planFeatures(selectedPatient()!.plan); track f) {
                <div class="plan-feature-row">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" [attr.stroke]="planColor(selectedPatient()!.plan)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>{{ f }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Dependientes -->
          <div style="margin-top:16px">
            <div class="eyebrow" style="margin-bottom:8px">Grupo familiar · {{ selectedPatient()!.deps.length }} dependientes</div>
            @if (!selectedPatient()!.deps || selectedPatient()!.deps.length === 0) {
              <div style="padding:12px;border-radius:10px;background:rgba(148,163,184,0.06);border:1px solid var(--border-glass);font-size:12px;color:var(--text-muted);text-align:center">
                Sin dependientes registrados.
              </div>
            } @else {
              <div style="display:flex;flex-direction:column;gap:6px">
                @for (d of selectedPatient()!.deps; track d.id) {
                  <div class="dep-chip">
                    <div class="avatar avatar--sm">{{ avatarOf(d.name) }}</div>
                    <div style="flex:1;min-width:0">
                      <div style="font-size:12.5px;font-weight:500">{{ d.name }}</div>
                      <div class="mono micro" style="color:var(--text-muted)">DNI {{ d.dni }} · {{ d.parentesco }}</div>
                    </div>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Payment history -->
          <div style="margin-top:16px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <div class="eyebrow">Historial de pagos · últimos 4</div>
              <button class="btn btn--ghost btn--sm">Ver completo</button>
            </div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Período</th>
                  <th style="text-align:right">Monto</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (pay of synthPayments(selectedPatient()!); track pay.id) {
                  <tr>
                    <td class="mono micro" style="color:var(--accent-cyan)">{{ fmtDate(pay.date) }}</td>
                    <td style="font-size:12px">{{ pay.period }}</td>
                    <td class="mono" style="text-align:right;font-weight:500">{{ fmtCurrency(pay.amount) }}</td>
                    <td>
                      <span class="mono micro" style="text-transform:uppercase;letter-spacing:0.1em;font-weight:600"
                        [style.color]="paymentStatusColor(pay.status)">
                        ● {{ paymentStatusLabel(pay.status) }}
                      </span>
                    </td>
                    <td>
                      @if (pay.status === 'paid') {
                        <button class="btn btn--ghost btn--sm" title="Descargar recibo">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Recibo
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="so-foot">
          <button class="btn btn--ghost" (click)="openEditForm(selectedPatient()!); selectedPatient.set(null)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar afiliado
          </button>
          <div style="display:flex;gap:8px">
            <button class="btn btn--ghost">Actualizar plan</button>
            <button class="btn btn--primary">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6.5" y1="1" x2="6.5" y2="12"/><line x1="1" y1="6.5" x2="12" y2="6.5"/></svg>
              Registrar pago
            </button>
          </div>
        </div>
      </aside>
    }

    <!-- ═══════════════════════════════════════════════════════
         PATIENT FORM MODAL
         ═══════════════════════════════════════════════════════ -->
    @if (formOpen()) {
      <div class="qc-overlay" (click)="closeForm()">
        <div class="qc-modal qc-modal--wide glass-strong" (click)="$event.stopPropagation()">
          <div class="qc-head">
            <div>
              <div class="eyebrow" style="color:var(--accent-blue)">● {{ editingPatient() ? 'EDITAR AFILIADO' : 'ALTA DE AFILIADO' }}</div>
              <h2 style="margin:4px 0 0;font-size:20px;font-weight:600;letter-spacing:-0.01em">
                {{ editingPatient() ? form().name : 'Nuevo afiliado titular' }}
              </h2>
            </div>
            <button class="qc-close-btn" (click)="closeForm()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
          </div>

          <!-- Modal tabs -->
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
                  <div class="qc-field" style="flex:2">
                    <label class="eyebrow">Nombre y apellido <span style="color:var(--accent-red)">*</span></label>
                    <input class="qc-input" placeholder="Ej. Antonio Vázquez Cárdenas" [(ngModel)]="form().name" (ngModelChange)="patchForm({ name: $event })" autofocus/>
                  </div>
                  <div class="qc-field" style="flex:1">
                    <label class="eyebrow">DNI <span style="color:var(--accent-red)">*</span></label>
                    <input class="qc-input" placeholder="18.345.672" [(ngModel)]="form().dni" (ngModelChange)="patchForm({ dni: $event })"/>
                  </div>
                </div>

                <div class="qc-row">
                  <div class="qc-field" style="flex:1">
                    <label class="eyebrow">Fecha de nacimiento <span style="color:var(--accent-red)">*</span></label>
                    <input class="qc-input" type="date" [(ngModel)]="form().birth" (ngModelChange)="patchForm({ birth: $event })"/>
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
                    <input class="qc-input" placeholder="+54 388 4123-5678" [(ngModel)]="form().phone" (ngModelChange)="patchForm({ phone: $event })"/>
                  </div>
                  <div class="qc-field" style="flex:2">
                    <label class="eyebrow">Email</label>
                    <input class="qc-input" type="email" placeholder="apellido.nombre@gmail.com" [(ngModel)]="form().email" (ngModelChange)="patchForm({ email: $event })"/>
                  </div>
                </div>

                <div class="qc-field">
                  <label class="eyebrow">Dirección</label>
                  <input class="qc-input" placeholder="Calle, número · barrio · ciudad" [(ngModel)]="form().addr" (ngModelChange)="patchForm({ addr: $event })"/>
                </div>

                <div class="qc-field">
                  <label class="eyebrow">Plan contratado <span style="color:var(--accent-red)">*</span></label>
                  <div class="plan-grid">
                    @for (p of plans; track p.id) {
                      <button type="button" class="plan-card"
                        [attr.data-active]="form().plan === p.id"
                        [style.border-color]="form().plan === p.id ? p.color : 'var(--border-glass)'"
                        [style.background]="form().plan === p.id ? p.color + '14' : 'transparent'"
                        (click)="patchForm({ plan: p.id })">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                          <span class="plan-card__dot" [style.background]="p.color" [style.box-shadow]="'0 0 10px ' + p.color"></span>
                          <span style="font-size:13px;font-weight:600" [style.color]="form().plan === p.id ? p.color : 'var(--text-primary)'">{{ p.name }}</span>
                        </div>
                        <div class="mono" style="font-size:12px;color:var(--text-secondary)">
                          {{ fmtCurrency(p.price) }}<span style="color:var(--text-muted);margin-left:4px">/ mes</span>
                        </div>
                      </button>
                    }
                  </div>
                </div>
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
                    <div class="qc-field" style="flex:2">
                      <label class="eyebrow">Nombre y apellido</label>
                      <input class="qc-input" placeholder="Ej. Lucía Vázquez" [value]="d.name" (input)="updateDep(d.id, 'name', $any($event.target).value)"/>
                    </div>
                    <div class="qc-field" style="flex:1">
                      <label class="eyebrow">DNI</label>
                      <input class="qc-input" placeholder="42.554.789" [value]="d.dni" (input)="updateDep(d.id, 'dni', $any($event.target).value)"/>
                    </div>
                    <div class="qc-field" style="width:160px">
                      <label class="eyebrow">Parentesco</label>
                      <select class="qc-input" [value]="d.parentesco" (change)="updateDep(d.id, 'parentesco', $any($event.target).value)">
                        @for (p of parentescos; track p) {
                          <option [value]="p">{{ p }}</option>
                        }
                      </select>
                    </div>
                    <button class="us-remove" (click)="removeDep(d.id)" style="align-self:flex-end;margin-bottom:2px">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                }
              </div>
            }
          </div>

          <div class="qc-foot">
            <div class="qc-hint">
              <span class="kbd">Esc</span> cerrar &nbsp;·&nbsp;
              Tab: <strong [style.color]="formTab() === 'titular' ? 'var(--accent-blue)' : 'var(--text-muted)'">Titular</strong>
              · <strong [style.color]="formTab() === 'group' ? 'var(--accent-blue)' : 'var(--text-muted)'">Grupo</strong>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn--ghost" (click)="closeForm()">Cancelar</button>
              <button class="btn btn--primary" [disabled]="!canSubmit()" [style.opacity]="canSubmit() ? '1' : '0.5'" (click)="saveForm()">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Guardar afiliado
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    /* ── Table card wrapper ── */
    .pt-card {
      border-radius: var(--r-card);
      padding: 0;
      overflow: hidden;
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
    .scroll-y { overflow-y: auto; }

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

    /* ── Type tag ── */
    .type-tag {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 500;
      background: rgba(148,163,184,0.1);
      color: var(--text-secondary);
    }
    .type-tag[data-type="titular"] {
      background: rgba(59,130,246,0.1);
      color: var(--accent-blue);
    }

    /* ── Dep count ── */
    .dep-count {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11.5px;
      color: var(--text-secondary);
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
      min-width: 160px;
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

    /* ── Slideover ── */
    .so-overlay {
      position: fixed; inset: 0; z-index: 200;
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(2px);
    }
    .slideover {
      position: fixed;
      right: 0; top: 0; bottom: 0;
      width: 420px;
      z-index: 201;
      display: flex;
      flex-direction: column;
      border-left: 1px solid var(--border-glass);
      border-radius: 0;
    }
    .so-head {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 20px;
      border-bottom: 1px solid var(--border-hairline);
      flex-shrink: 0;
    }
    .so-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
    }
    .so-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-top: 1px solid var(--border-hairline);
      flex-shrink: 0;
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

    /* ── Status hero ── */
    .status-hero {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-radius: 10px;
      border: 1px solid;
      margin-bottom: 12px;
    }
    .status-hero--ok {
      background: rgba(16,185,129,0.07);
      border-color: rgba(16,185,129,0.25);
      color: var(--accent-emerald);
    }
    .status-hero--debt {
      background: rgba(239,68,68,0.07);
      border-color: rgba(239,68,68,0.25);
      color: var(--accent-red);
    }
    .status-hero__icon {
      width: 36px; height: 36px;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    /* ── Due grid ── */
    .due-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 4px;
    }
    .due-card {
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border-glass);
    }

    /* ── Plan features ── */
    .plan-features-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border-glass);
    }
    .plan-feature-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--text-secondary);
    }

    /* ── Dep chip ── */
    .dep-chip {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 8px;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border-glass);
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
    .qc-modal--wide { width: 640px; }
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

    /* ── Modal tabs (us-tabs reuse from global styles) ── */
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

    /* ── Plan grid ── */
    .plan-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .plan-card {
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--border-glass);
      background: transparent;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s;
    }
    .plan-card:hover { background: rgba(255,255,255,0.04); }
    .plan-card[data-active="true"] { box-shadow: 0 0 0 1px currentColor; }
    .plan-card__dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }

    /* ── Dep form row ── */
    .dep-row-form {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border-glass);
    }
    .dep-row__num {
      font-size: 11px;
      color: var(--text-dim);
      flex-shrink: 0;
      margin-bottom: 8px;
    }

    /* ── Gender btn ── */
    .gender-btn {
      flex: 1;
      height: 36px;
      border-radius: var(--r-btn);
      border: 1px solid var(--border-glass);
      background: rgba(255,255,255,0.03);
      color: var(--text-muted);
      font-size: 12px;
      font-family: var(--font-sans);
      cursor: pointer;
      transition: all 0.15s;
    }
    .gender-btn:hover { background: rgba(255,255,255,0.07); color: var(--text-primary); }
    .gender-btn[data-active="true"] {
      background: rgba(59,130,246,0.12);
      border-color: rgba(59,130,246,0.4);
      color: var(--accent-blue);
    }
  `],
})
export class PatientsComponent {
  // ── Constants exposed to template ──
  readonly plans = PLANS;
  readonly parentescos = PARENTESCOS;
  readonly statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'al-dia', label: 'Al día' },
    { value: 'deuda', label: 'En deuda' },
  ];
  readonly genderOptions: { v: 'M' | 'F' | 'X'; l: string }[] = [
    { v: 'M', l: 'Masculino' },
    { v: 'F', l: 'Femenino' },
    { v: 'X', l: 'Otro' },
  ];

  // ── State ──
  readonly patients = signal<Patient[]>(PATIENTS_SEED);
  readonly searchQuery = signal('');
  readonly statusFilter = signal('all');
  readonly planFilter = signal('all');
  readonly page = signal(0);
  readonly selectedPatient = signal<Patient | null>(null);
  readonly formOpen = signal(false);
  readonly editingPatient = signal<Patient | null>(null);
  readonly menuOpen = signal<string | null>(null);
  readonly formTab = signal<'titular' | 'group'>('titular');
  readonly form = signal<PatientForm>(emptyForm());

  // ── Two-way ngModel bridge for filters ──
  get searchQuery_(): string { return this.searchQuery(); }
  set searchQuery_(v: string) { this.searchQuery.set(v); this.page.set(0); }

  get planFilterValue(): string { return this.planFilter(); }
  set planFilterValue(v: string) { this.planFilter.set(v); this.page.set(0); }

  // ── Computed ──
  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    const pl = this.planFilter();
    return this.patients().filter(p =>
      (s === 'all' || p.status === s) &&
      (pl === 'all' || p.plan === pl) &&
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
      total: list.length,
      titulares: list.filter(p => p.type === 'titular').length,
      dependents: list.reduce((s, p) => s + (p.deps?.length ?? 0), 0),
      alDia: list.filter(p => p.status === 'al-dia').length,
      deuda: list.filter(p => p.status === 'deuda').length,
    };
  });

  readonly canSubmit = computed(() => {
    const f = this.form();
    return f.name.trim().length > 0 && f.dni.trim().length > 0 && f.birth.length > 0 && f.plan.length > 0;
  });

  // ── Plan helpers ──
  planColor(planId: string): string {
    return PLANS.find(p => p.id === planId)?.color ?? 'var(--text-muted)';
  }
  planName(planId: string): string {
    return PLANS.find(p => p.id === planId)?.name ?? planId;
  }
  planPrice(planId: string): number {
    return PLANS.find(p => p.id === planId)?.price ?? 0;
  }
  planFeatures(planId: string): string[] {
    return PLANS.find(p => p.id === planId)?.features ?? [];
  }

  // ── Format helpers ──
  readonly fmtCurrency = fmtCurrency;
  readonly fmtDate = fmtDate;
  readonly avatarOf = avatarOf;

  paymentStatusColor(status: string): string {
    return PAYMENT_STATUS[status]?.color ?? 'var(--text-muted)';
  }
  paymentStatusLabel(status: string): string {
    return PAYMENT_STATUS[status]?.label ?? status;
  }

  synthPayments(p: Patient): Payment[] {
    if (p.payments && p.payments.length > 0) return p.payments.slice(0, 4);
    const price = this.planPrice(p.plan);
    const inDebt = p.status === 'deuda';
    return [
      { id: 'p1', date: '2026-05-08', period: 'Mayo 2026',     amount: price, status: inDebt ? 'overdue' : 'paid', method: 'Débito automático' },
      { id: 'p2', date: '2026-04-08', period: 'Abril 2026',    amount: price, status: 'paid',    method: 'Débito automático' },
      { id: 'p3', date: '2026-03-08', period: 'Marzo 2026',    amount: price, status: 'paid',    method: 'Débito automático' },
      { id: 'p4', date: '2026-02-08', period: 'Febrero 2026',  amount: price, status: 'paid',    method: 'Transferencia'     },
    ];
  }

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
    if (this.selectedPatient()) { this.selectedPatient.set(null); }
  }

  // ── Form actions ──
  openNewForm(): void {
    this.editingPatient.set(null);
    this.form.set(emptyForm());
    this.formTab.set('titular');
    this.formOpen.set(true);
  }

  openEditForm(p: Patient): void {
    this.editingPatient.set(p);
    this.form.set({ name: p.name, dni: p.dni, birth: p.birth, gender: p.gender, phone: p.phone, email: p.email, addr: p.addr, plan: p.plan, type: p.type, deps: p.deps.map(d => ({ ...d })) });
    this.formTab.set('titular');
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingPatient.set(null);
  }

  patchForm(patch: Partial<PatientForm>): void {
    this.form.set({ ...this.form(), ...patch });
  }

  setStatus(v: string): void {
    this.statusFilter.set(v);
    this.page.set(0);
  }

  saveForm(): void {
    if (!this.canSubmit()) return;
    const f = this.form();
    const editing = this.editingPatient();
    if (editing) {
      this.patients.update(list => list.map(p => p.id === editing.id ? { ...p, ...f } : p));
    } else {
      const id = `AF-${1018 + Math.floor(Math.random() * 100)}`;
      this.patients.update(list => [{ ...f, id, status: 'al-dia', sinceMonth: 'Mayo 2026', deps: f.deps } as Patient, ...list]);
    }
    this.closeForm();
  }

  // ── Dependent management ──
  addDep(): void {
    const dep: Dependent = { id: `d${Date.now()}`, name: '', dni: '', parentesco: 'Hijo/a' };
    this.form.update(f => ({ ...f, deps: [...f.deps, dep] }));
  }

  updateDep(id: string, field: keyof Dependent, value: string): void {
    this.form.update(f => ({ ...f, deps: f.deps.map(d => d.id === id ? { ...d, [field]: value } : d) }));
  }

  removeDep(id: string): void {
    this.form.update(f => ({ ...f, deps: f.deps.filter(d => d.id !== id) }));
  }
}
