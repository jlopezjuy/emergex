import { Component, OnInit, signal, computed, HostListener, inject, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { InstitutionsApiService } from '../../data-access/api/institutions.api';
import { environment } from '../../../environments/environment';
import { DateUtils } from '../../core/utils/date.utils';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface InstitutionContract {
  code: string;
  plan: string;
  from: string;
  to: string;
  status: 'active' | 'suspended' | 'ended' | 'draft';
  monthlyPrice: number;
  monthlyCap: number;
  kpiMinutes: number;
  conditions: string;
}

interface Institution {
  id: string;
  name: string;
  razonSocial: string;
  cuit: string;
  type: string;
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
  members: number;
  sinceMonth: string;
  contract: InstitutionContract;
}

interface InstitutionForm {
  name: string;
  razonSocial: string;
  cuit: string;
  type: string;
  plan: string;
  status: 'activa' | 'inactiva';
  email: string;
  phone: string;
  adminContact: string;
  opsContact: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
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

const COMMERCIAL_PLANS = [
  { id: 'corp-basico',   name: 'Corporativo Básico',   color: 'var(--text-muted)',     monthlyBase: 45000  },
  { id: 'corp-medio',    name: 'Corporativo Medio',    color: 'var(--accent-blue)',    monthlyBase: 89000  },
  { id: 'corp-premium',  name: 'Corporativo Premium',  color: 'var(--accent-emerald)', monthlyBase: 145000 },
  { id: 'edu-basico',    name: 'Educativo Básico',     color: 'var(--accent-cyan)',    monthlyBase: 35000  },
  { id: 'edu-premium',   name: 'Educativo Premium',    color: 'var(--accent-amber)',   monthlyBase: 72000  },
  { id: 'salud-partner', name: 'Salud Partner',        color: 'var(--accent-red)',     monthlyBase: 120000 },
];

const INSTITUTIONS_SEED: Institution[] = environment.production ? [] : [
  {
    id: 'INST-001', name: 'Colegio Santa Ana', razonSocial: 'Asociación Civil Educativa Santa Ana', cuit: '30-58741236-9',
    type: 'colegio', status: 'activa', plan: 'edu-premium',
    email: 'administracion@santaana.edu.ar', phone: '+54 388 4221-1001', adminContact: 'Marta Pereyra', opsContact: 'Gustavo Flores',
    address: 'Av. Sarmiento 1250', city: 'San Salvador de Jujuy', lat: 45, lng: 35, members: 320, sinceMonth: 'Marzo 2021',
    contract: { code: 'CTR-2021-001', plan: 'edu-premium', from: '2025-01-01', to: '2025-12-31', status: 'active', monthlyPrice: 72000, monthlyCap: 60, kpiMinutes: 12, conditions: 'Cobertura en horario escolar 7:30 a 17:00 hs. Incluye eventos deportivos intra-escolares.' },
  },
  {
    id: 'INST-002', name: 'Minera Puna S.A.', razonSocial: 'Minera Puna Sociedad Anónima', cuit: '30-71234589-4',
    type: 'empresa', status: 'activa', plan: 'corp-premium',
    email: 'rrhh@minerapuna.com.ar', phone: '+54 388 4778-4400', adminContact: 'Roberto Salas', opsContact: 'Claudia Mamani',
    address: 'Ruta Provincial 1 Km 34', city: 'Abra Pampa', lat: 28, lng: 60, members: 180, sinceMonth: 'Enero 2020',
    contract: { code: 'CTR-2020-002', plan: 'corp-premium', from: '2025-01-01', to: '2025-12-31', status: 'active', monthlyPrice: 145000, monthlyCap: 40, kpiMinutes: 8, conditions: 'Cobertura 24/7 en planta y campamentos. SLA extendido para emergencias graves.' },
  },
  {
    id: 'INST-003', name: 'Universidad Nacional de Jujuy', razonSocial: 'Universidad Nacional de Jujuy', cuit: '30-54128963-7',
    type: 'universidad', status: 'activa', plan: 'edu-basico',
    email: 'secretaria@unju.edu.ar', phone: '+54 388 4221-5000', adminContact: 'Dr. Marcos Villafuerte', opsContact: 'Lic. Paula Aguirre',
    address: 'Av. Bolivia 7300', city: 'San Salvador de Jujuy', lat: 38, lng: 52, members: 850, sinceMonth: 'Agosto 2019',
    contract: { code: 'CTR-2019-003', plan: 'edu-basico', from: '2025-03-01', to: '2025-12-15', status: 'active', monthlyPrice: 35000, monthlyCap: 80, kpiMinutes: 15, conditions: 'Cobertura para personal docente y no docente. Estudiantes no incluidos. Ciclo lectivo solamente.' },
  },
  {
    id: 'INST-004', name: 'Clínica de la Quebrada', razonSocial: 'Sanatorio Quebrada S.R.L.', cuit: '30-68941237-1',
    type: 'hospital', status: 'activa', plan: 'salud-partner',
    email: 'gerencia@clinicaquebrada.com.ar', phone: '+54 3885 4-1200', adminContact: 'Dr. Hernán Cáceres', opsContact: 'Enf. Jefe Ana Quispe',
    address: 'Calle Lavalle 820', city: 'Humahuaca', lat: 20, lng: 40, members: 95, sinceMonth: 'Noviembre 2022',
    contract: { code: 'CTR-2022-004', plan: 'salud-partner', from: '2025-01-01', to: '2025-12-31', status: 'active', monthlyPrice: 120000, monthlyCap: 30, kpiMinutes: 6, conditions: 'Servicio de traslado asistido inter-hospitalario. Prioridad absoluta en despacho.' },
  },
  {
    id: 'INST-005', name: 'Club Atlético Talleres', razonSocial: 'Club Atlético Talleres de Jujuy', cuit: '30-34781254-5',
    type: 'club', status: 'activa', plan: 'corp-basico',
    email: 'secretaria@talleresjujuy.com.ar', phone: '+54 388 4332-7780', adminContact: 'Carlos Rivas', opsContact: 'Pablo Condori',
    address: 'Av. Fascio 1500', city: 'San Salvador de Jujuy', lat: 55, lng: 42, members: 210, sinceMonth: 'Febrero 2023',
    contract: { code: 'CTR-2023-005', plan: 'corp-basico', from: '2025-01-01', to: '2025-12-31', status: 'active', monthlyPrice: 45000, monthlyCap: 25, kpiMinutes: 12, conditions: 'Cobertura activa en partidos locales y torneos. Fines de semana y feriados incluidos.' },
  },
  {
    id: 'INST-006', name: 'Municipalidad de Tilcara', razonSocial: 'Municipalidad de Tilcara', cuit: '30-52147896-3',
    type: 'gobierno', status: 'activa', plan: 'corp-medio',
    email: 'intendencia@tilcara.gob.ar', phone: '+54 3885 5-5100', adminContact: 'Lic. Rodrigo Heredia', opsContact: 'Sra. Mirta Colque',
    address: 'Belgrano 590', city: 'Tilcara', lat: 65, lng: 30, members: 142, sinceMonth: 'Mayo 2022',
    contract: { code: 'CTR-2022-006', plan: 'corp-medio', from: '2025-01-01', to: '2025-12-31', status: 'active', monthlyPrice: 89000, monthlyCap: 35, kpiMinutes: 10, conditions: 'Personal municipal y eventos turísticos de temporada alta incluidos.' },
  },
  {
    id: 'INST-007', name: 'Fundación Warmi', razonSocial: 'Fundación Warmi por la Salud Comunitaria', cuit: '30-71589412-8',
    type: 'ong', status: 'activa', plan: 'edu-basico',
    email: 'contacto@warmi.org.ar', phone: '+54 388 4115-2233', adminContact: 'Fernanda Yapura', opsContact: 'Diego Mamani',
    address: 'Av. Senador Pérez 450', city: 'San Salvador de Jujuy', lat: 48, lng: 58, members: 68, sinceMonth: 'Septiembre 2023',
    contract: { code: 'CTR-2023-007', plan: 'edu-basico', from: '2025-04-01', to: '2025-03-31', status: 'active', monthlyPrice: 35000, monthlyCap: 20, kpiMinutes: 15, conditions: 'Tarifa social. Cobertura para personal y beneficiarios directos en actividades de campo.' },
  },
  {
    id: 'INST-008', name: 'Ingenio La Esperanza', razonSocial: 'Ingenio La Esperanza S.A.', cuit: '30-50012478-6',
    type: 'empresa', status: 'inactiva', plan: 'corp-medio',
    email: 'administracion@ingeniolaesperanza.com.ar', phone: '+54 3886 4-2200', adminContact: 'Ing. Luis Saravia', opsContact: 'Jefa HSE Lorena Paz',
    address: 'Ruta Nacional 34 Km 1220', city: 'San Pedro de Jujuy', lat: 72, lng: 78, members: 0, sinceMonth: 'Junio 2020',
    contract: { code: 'CTR-2020-008', plan: 'corp-medio', from: '2024-01-01', to: '2024-12-31', status: 'ended', monthlyPrice: 89000, monthlyCap: 50, kpiMinutes: 10, conditions: 'Contrato finalizado. Renovación pendiente de presupuesto anual.' },
  },
  {
    id: 'INST-009', name: 'Colegio Nuestra Señora del Rosario', razonSocial: 'Fundación Educativa del Rosario', cuit: '30-61478523-2',
    type: 'colegio', status: 'activa', plan: 'edu-premium',
    email: 'direccion@rosariojujuy.edu.ar', phone: '+54 388 4558-9900', adminContact: 'Hna. Cecilia Vargas', opsContact: 'Víctor Llanos',
    address: 'Calle Independencia 230', city: 'San Salvador de Jujuy', lat: 40, lng: 44, members: 280, sinceMonth: 'Marzo 2018',
    contract: { code: 'CTR-2018-009', plan: 'edu-premium', from: '2025-03-01', to: '2025-12-20', status: 'active', monthlyPrice: 72000, monthlyCap: 55, kpiMinutes: 12, conditions: 'Cobertura extendida para viajes educativos dentro de la provincia.' },
  },
  {
    id: 'INST-010', name: 'Aeropuerto Internacional Dr. H. Guzmán', razonSocial: 'Dirección Nacional de Aviación Civil — Jujuy', cuit: '30-51245879-0',
    type: 'gobierno', status: 'activa', plan: 'corp-premium',
    email: 'jefe.aeropuerto@jujuy.gob.ar', phone: '+54 388 4910-0200', adminContact: 'Cdte. Federico Torres', opsContact: 'Sra. Valeria Nieva',
    address: 'Acceso Aeropuerto s/n', city: 'Palpala', lat: 62, lng: 65, members: 120, sinceMonth: 'Julio 2021',
    contract: { code: 'CTR-2021-010', plan: 'corp-premium', from: '2025-01-01', to: '2025-12-31', status: 'active', monthlyPrice: 145000, monthlyCap: 30, kpiMinutes: 6, conditions: 'Cobertura ALS para pista y terminal. Coordinación con SAME y emergencias aeronáuticas.' },
  },
  {
    id: 'INST-011', name: 'Constructora Andina S.A.', razonSocial: 'Constructora Andina Sociedad Anónima', cuit: '30-69873412-4',
    type: 'empresa', status: 'inactiva', plan: 'corp-basico',
    email: 'rrhh@constructoraandina.com.ar', phone: '+54 388 4223-6610', adminContact: 'Arq. Santiago Morales', opsContact: 'Técnico Raúl Sipán',
    address: 'Parque Industrial Mza. 14', city: 'Palpala', lat: 68, lng: 72, members: 0, sinceMonth: 'Octubre 2022',
    contract: { code: 'CTR-2022-011', plan: 'corp-basico', from: '2024-06-01', to: '2024-11-30', status: 'suspended', monthlyPrice: 45000, monthlyCap: 20, kpiMinutes: 12, conditions: 'Suspendido por mora en pagos. Requiere regularización.' },
  },
  {
    id: 'INST-012', name: 'Instituto Técnico Superior de Jujuy', razonSocial: 'Instituto Técnico Superior Provincial N° 1', cuit: '30-54896321-5',
    type: 'universidad', status: 'activa', plan: 'edu-basico',
    email: 'rectoria@itsjujuy.edu.ar', phone: '+54 388 4445-8800', adminContact: 'Rector Juan Pablo Velez', opsContact: 'Bedel Sergio Cruz',
    address: 'Av. 19 de Abril 850', city: 'San Salvador de Jujuy', lat: 42, lng: 38, members: 195, sinceMonth: 'Agosto 2024',
    contract: { code: 'CTR-2024-012', plan: 'edu-basico', from: '2025-03-01', to: '2025-12-15', status: 'draft', monthlyPrice: 35000, monthlyCap: 40, kpiMinutes: 15, conditions: 'Contrato en revisión. Pendiente firma del Ministerio de Educación.' },
  },
];

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
    lat: 50, lng: 50,
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
  imports: [FormsModule, StatusBadgeComponent],
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
          <button class="btn btn--primary btn--sm" (click)="openNewForm()">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
            Nueva institución
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
                <tr (click)="openContract(inst)" style="cursor:pointer">
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
                  <td (click)="$event.stopPropagation()" style="position:relative">
                    <button class="action-icon" style="width:28px;height:28px" title="Acciones"
                      (click)="toggleMenu(inst.id)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                    @if (menuOpen() === inst.id) {
                      <div class="row-menu" (click)="$event.stopPropagation()">
                        <button class="user-menu__item" (click)="openEditForm(inst); menuOpen.set(null)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Editar
                        </button>
                        <button class="user-menu__item" (click)="openContract(inst); menuOpen.set(null)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          Ver contrato
                        </button>
                        <button class="user-menu__item" (click)="openContract(inst); menuOpen.set(null)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.25"/></svg>
                          Renovar contrato
                        </button>
                        <div style="height:1px;background:var(--border-hairline);margin:4px 0"></div>
                        <button class="user-menu__item user-menu__item--danger">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
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
         CONTRACT MODAL
         ═══════════════════════════════════════════════════════ -->
    @if (contractInst()) {
      @let ci = contractInst()!;
      @let ctr = contractDraft();
      <div class="qc-overlay" (click)="contractInst.set(null)">
        <div class="qc-modal qc-modal--contract glass-strong" (click)="$event.stopPropagation()">
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
              <button class="btn btn--primary" (click)="saveContract()">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Guardar contrato
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
      <div class="qc-overlay" (click)="closeForm()">
        <div class="qc-modal qc-modal--wide glass-strong" (click)="$event.stopPropagation()">
          <div class="qc-head">
            <div>
              <div class="eyebrow" style="color:var(--accent-blue)">● {{ editingInst() ? 'EDITAR INSTITUCIÓN' : 'ALTA DE INSTITUCIÓN' }}</div>
              <h2 style="margin:4px 0 0;font-size:20px;font-weight:600;letter-spacing:-0.01em">
                {{ editingInst() ? form().name : 'Nueva institución corporativa' }}
              </h2>
            </div>
            <button class="qc-close-btn" (click)="closeForm()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
          </div>

          <!-- Tabs -->
          <div class="us-tabs">
            <button class="us-tab" [attr.data-active]="formTab() === 'general'" (click)="formTab.set('general')">
              <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="14" height="12" rx="1"/><line x1="6" y1="7" x2="12" y2="7"/><line x1="6" y1="10" x2="10" y2="10"/></svg>
              Datos generales
            </button>
            <button class="us-tab" [attr.data-active]="formTab() === 'contacto'" (click)="formTab.set('contacto')">
              <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="9" cy="7" r="3"/><path d="M3 16c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg>
              Contacto y ubicación
            </button>
          </div>

          <div class="qc-body" style="max-height:60vh;overflow-y:auto;padding:16px 20px">
            @if (formTab() === 'general') {
              <div style="display:flex;flex-direction:column;gap:14px">

                <div class="qc-row">
                  <div class="qc-field" style="flex:2">
                    <label class="eyebrow">Nombre de fantasía <span style="color:var(--accent-red)">*</span></label>
                    <input class="qc-input" placeholder="Ej. Colegio Santa Ana" [(ngModel)]="form().name" (ngModelChange)="patchForm({ name: $event })" autofocus/>
                  </div>
                  <div class="qc-field" style="flex:1">
                    <label class="eyebrow">CUIT <span style="color:var(--accent-red)">*</span></label>
                    <input class="qc-input" placeholder="30-58741236-9" [(ngModel)]="form().cuit" (ngModelChange)="patchForm({ cuit: $event })"/>
                  </div>
                </div>

                <div class="qc-field">
                  <label class="eyebrow">Razón social <span style="color:var(--accent-red)">*</span></label>
                  <input class="qc-input" placeholder="Ej. Asociación Civil Educativa Santa Ana" [(ngModel)]="form().razonSocial" (ngModelChange)="patchForm({ razonSocial: $event })"/>
                </div>

                <div class="qc-field">
                  <label class="eyebrow">Tipo de institución</label>
                  <div class="type-grid">
                    @for (t of institutionTypes; track t.id) {
                      <button type="button" class="type-pill"
                        [attr.data-active]="form().type === t.id"
                        (click)="patchForm({ type: t.id })">
                        {{ t.icon }} {{ t.label }}
                      </button>
                    }
                  </div>
                </div>

                <div class="qc-field">
                  <label class="eyebrow">Plan comercial</label>
                  <select class="qc-input" [(ngModel)]="form().plan" (ngModelChange)="patchForm({ plan: $event })">
                    @for (p of commercialPlans; track p.id) {
                      <option [value]="p.id">{{ p.name }}</option>
                    }
                  </select>
                  @let selPlan = getPlan(form().plan);
                  @if (selPlan) {
                    <div class="mono micro" style="color:var(--text-muted);margin-top:3px">Tarifa base: {{ fmtCurrency(selPlan.monthlyBase) }}/mes</div>
                  }
                </div>

                <div class="qc-field">
                  <label class="eyebrow">Estado</label>
                  <div style="display:flex;align-items:center;gap:10px">
                    <button type="button" class="toggle-sw"
                      [attr.data-on]="form().status === 'activa'"
                      (click)="patchForm({ status: form().status === 'activa' ? 'inactiva' : 'activa' })">
                      <div class="toggle-sw__track"
                        [style.background]="form().status === 'activa' ? 'rgba(16,185,129,0.25)' : 'rgba(148,163,184,0.32)'"
                        [style.border-color]="form().status === 'activa' ? 'rgba(16,185,129,0.55)' : 'rgba(148,163,184,0.32)'"
                        [style.box-shadow]="form().status === 'activa' ? '0 0 8px rgba(16,185,129,0.35)' : 'none'"
                      >
                        <div class="toggle-sw__thumb"
                          [style.transform]="form().status === 'activa' ? 'translateX(18px)' : 'translateX(0)'"
                          [style.background]="form().status === 'activa' ? 'var(--accent-emerald)' : 'white'"
                        ></div>
                      </div>
                    </button>
                    <span style="font-size:12.5px" [style.color]="form().status === 'activa' ? 'var(--accent-emerald)' : 'var(--text-muted)'">
                      {{ form().status === 'activa' ? 'Activa' : 'Inactiva' }}
                    </span>
                  </div>
                </div>
              </div>
            }

            @if (formTab() === 'contacto') {
              <div class="contact-grid">
                <!-- Izquierda -->
                <div style="display:flex;flex-direction:column;gap:12px">
                  <div class="qc-row">
                    <div class="qc-field" style="flex:1">
                      <label class="eyebrow">Email</label>
                      <input class="qc-input" type="email" placeholder="admin@institucion.com.ar" [(ngModel)]="form().email" (ngModelChange)="patchForm({ email: $event })"/>
                    </div>
                    <div class="qc-field" style="flex:1">
                      <label class="eyebrow">Teléfono</label>
                      <input class="qc-input" placeholder="+54 388 4221-0000" [(ngModel)]="form().phone" (ngModelChange)="patchForm({ phone: $event })"/>
                    </div>
                  </div>
                  <div class="qc-field">
                    <label class="eyebrow">Contacto administrativo</label>
                    <input class="qc-input" placeholder="Nombre del referente admin" [(ngModel)]="form().adminContact" (ngModelChange)="patchForm({ adminContact: $event })"/>
                  </div>
                  <div class="qc-field">
                    <label class="eyebrow">Contacto operativo</label>
                    <input class="qc-input" placeholder="Nombre del referente operativo" [(ngModel)]="form().opsContact" (ngModelChange)="patchForm({ opsContact: $event })"/>
                  </div>
                  <div class="qc-field">
                    <label class="eyebrow">Dirección</label>
                    <input class="qc-input" placeholder="Calle y número" [(ngModel)]="form().address" (ngModelChange)="patchForm({ address: $event })"/>
                  </div>
                  <div class="qc-row">
                    <div class="qc-field" style="flex:1">
                      <label class="eyebrow">Latitud</label>
                      <input class="qc-input mono" type="number" step="0.0001" [value]="form().lat" (input)="patchForm({ lat: +$any($event.target).value })"/>
                    </div>
                    <div class="qc-field" style="flex:1">
                      <label class="eyebrow">Longitud</label>
                      <input class="qc-input mono" type="number" step="0.0001" [value]="form().lng" (input)="patchForm({ lng: +$any($event.target).value })"/>
                    </div>
                  </div>
                </div>

                <!-- Derecha: Mini-map -->
                <div style="display:flex;flex-direction:column;gap:8px">
                  <div class="eyebrow">Georreferenciación</div>
                  <div class="mini-map">
                    <svg viewBox="0 0 100 100" (click)="onMapClick($event)">
                      <!-- Background -->
                      <rect width="100" height="100" fill="rgba(2,6,23,0.90)"/>
                      <!-- Parques -->
                      <rect x="5" y="60" width="12" height="8" rx="1" fill="rgba(16,185,129,0.18)"/>
                      <rect x="78" y="10" width="10" height="10" rx="1" fill="rgba(16,185,129,0.15)"/>
                      <rect x="60" y="75" width="14" height="9" rx="1" fill="rgba(16,185,129,0.18)"/>
                      <!-- Bloques urbanos -->
                      <rect x="18" y="8" width="16" height="10" rx="1" fill="rgba(100,116,139,0.25)"/>
                      <rect x="38" y="8" width="14" height="10" rx="1" fill="rgba(100,116,139,0.22)"/>
                      <rect x="55" y="8" width="18" height="10" rx="1" fill="rgba(100,116,139,0.22)"/>
                      <rect x="8" y="22" width="20" height="10" rx="1" fill="rgba(100,116,139,0.20)"/>
                      <rect x="32" y="22" width="24" height="10" rx="1" fill="rgba(100,116,139,0.22)"/>
                      <rect x="60" y="22" width="18" height="10" rx="1" fill="rgba(100,116,139,0.20)"/>
                      <rect x="20" y="36" width="16" height="10" rx="1" fill="rgba(100,116,139,0.22)"/>
                      <rect x="40" y="36" width="20" height="10" rx="1" fill="rgba(100,116,139,0.22)"/>
                      <rect x="64" y="36" width="14" height="10" rx="1" fill="rgba(100,116,139,0.20)"/>
                      <rect x="8" y="50" width="18" height="10" rx="1" fill="rgba(100,116,139,0.18)"/>
                      <rect x="30" y="50" width="22" height="10" rx="1" fill="rgba(100,116,139,0.22)"/>
                      <rect x="56" y="50" width="16" height="10" rx="1" fill="rgba(100,116,139,0.20)"/>
                      <rect x="20" y="64" width="18" height="10" rx="1" fill="rgba(100,116,139,0.18)"/>
                      <rect x="42" y="64" width="14" height="10" rx="1" fill="rgba(100,116,139,0.20)"/>
                      <rect x="8" y="78" width="14" height="10" rx="1" fill="rgba(100,116,139,0.18)"/>
                      <rect x="26" y="78" width="20" height="10" rx="1" fill="rgba(100,116,139,0.20)"/>
                      <rect x="50" y="78" width="16" height="10" rx="1" fill="rgba(100,116,139,0.18)"/>
                      <!-- Río -->
                      <path d="M0 88 Q20 82 35 90 Q50 98 70 88 Q85 80 100 85" fill="none" stroke="rgba(34,211,238,0.30)" stroke-width="5"/>
                      <!-- Avenida principal -->
                      <line x1="0" y1="32" x2="100" y2="32" stroke="rgba(59,130,246,0.45)" stroke-width="1.5" stroke-dasharray="4 2"/>
                      <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(59,130,246,0.30)" stroke-width="1" stroke-dasharray="3 3"/>
                      <!-- Marcador -->
                      <circle [attr.cx]="form().lat" [attr.cy]="form().lng" r="6" fill="rgba(239,68,68,0.35)"/>
                      <circle [attr.cx]="form().lat" [attr.cy]="form().lng" r="3" fill="rgba(239,68,68,0.9)" stroke="white" stroke-width="1"/>
                    </svg>
                    <div class="mini-map__hint">toca para fijar</div>
                    <div class="mini-map__overlay">
                      <div style="color:var(--accent-cyan);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:2px">POSICIÓN GEOREFERENCIADA</div>
                      <div class="mono" style="color:white;font-size:10px">{{ form().lat.toFixed(2) }}, {{ form().lng.toFixed(2) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          <div class="qc-foot">
            <div class="qc-hint">
              <span class="kbd">Esc</span> cerrar &nbsp;·&nbsp;
              Tab: <strong [style.color]="formTab() === 'general' ? 'var(--accent-blue)' : 'var(--text-muted)'">General</strong>
              · <strong [style.color]="formTab() === 'contacto' ? 'var(--accent-blue)' : 'var(--text-muted)'">Contacto</strong>
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn--ghost" (click)="closeForm()">Cancelar</button>
              <button class="btn btn--primary" [disabled]="!canSubmit()" [style.opacity]="canSubmit() ? '1' : '0.5'" (click)="saveForm()">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Guardar institución
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    /* ── Table card ── */
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
  // ── Constants exposed to template ──
  readonly institutionTypes = INSTITUTION_TYPES;
  readonly commercialPlans = COMMERCIAL_PLANS;
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
              lat:          dto.lat ?? 50,
              lng:          dto.lng ?? 50,
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

  // Contract modal
  readonly contractInst = signal<Institution | null>(null);
  readonly contractDraft = signal<InstitutionContract>({ code: '', plan: '', from: '', to: '', status: 'active', monthlyPrice: 0, monthlyCap: 0, kpiMinutes: 0, conditions: '' });

  // Form modal
  readonly formOpen = signal(false);
  readonly editingInst = signal<Institution | null>(null);
  readonly formTab = signal<'general' | 'contacto'>('general');
  readonly form = signal<InstitutionForm>(emptyForm());

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

  readonly canSubmit = computed(() => {
    const f = this.form();
    return f.name.trim().length > 0 && f.cuit.trim().length > 0 && f.razonSocial.trim().length > 0;
  });

  // ── Helpers exposed to template ──
  readonly fmtCurrency = fmtCurrency;
  readonly avatarOf = avatarOf;
  readonly Math = Math;

  planColor(planId: string): string {
    return COMMERCIAL_PLANS.find(p => p.id === planId)?.color ?? 'var(--text-muted)';
  }
  planName(planId: string): string {
    return COMMERCIAL_PLANS.find(p => p.id === planId)?.name ?? planId;
  }
  planBase(planId: string): number {
    return COMMERCIAL_PLANS.find(p => p.id === planId)?.monthlyBase ?? 0;
  }
  getPlan(planId: string): typeof COMMERCIAL_PLANS[number] | undefined {
    return COMMERCIAL_PLANS.find(p => p.id === planId);
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
  }

  // ── Filter ──
  setStatus(v: string): void {
    this.statusFilter.set(v);
    this.page.set(0);
  }

  // ── Contract modal ──
  openContract(inst: Institution): void {
    this.contractInst.set(inst);
    this.contractDraft.set({ ...inst.contract });
  }

  patchContract(patch: Partial<InstitutionContract>): void {
    this.contractDraft.set({ ...this.contractDraft(), ...patch });
  }

  saveContract(): void {
    const inst = this.contractInst();
    if (!inst) return;
    const draft = this.contractDraft();
    this.institutions.update(list =>
      list.map(i => i.id === inst.id ? { ...i, plan: draft.plan, contract: { ...draft } } : i)
    );
    this.contractInst.set(null);
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
    });
    this.formTab.set('general');
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingInst.set(null);
  }

  patchForm(patch: Partial<InstitutionForm>): void {
    this.form.set({ ...this.form(), ...patch });
  }

  saveForm(): void {
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
    };

    const op$ = editing ? this.api.update(dto) : this.api.create(dto);
    op$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.closeForm();
            this.loadInstitutions();
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
}
