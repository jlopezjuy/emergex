import { Component, signal, computed, HostListener, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { StaffApiService, SubespecialidadCatalogItem } from '../../data-access/api/staff.api';
import { ProfesionalSaludDTO } from '../../data-access/dto/staff.dto';

// ─── Catalogs ─────────────────────────────────────────────────────────────────

type SpecialtyGroup = 'Médica' | 'Enfermería';

interface CatalogItem {
  id: string;
  name: string;
  group: SpecialtyGroup;
}

function toCatalogItem(s: SubespecialidadCatalogItem): CatalogItem {
  return {
    id:    String(s.id),
    name:  s.nombre,
    group: s.nombre.startsWith('Enfermería') ? 'Enfermería' : 'Médica',
  };
}

const SPEC_GROUP_COLOR: Record<SpecialtyGroup, { bg: string; fg: string; border: string }> = {
  'Médica':     { bg: 'rgba(59,130,246,0.16)',  fg: 'var(--accent-blue)',    border: 'rgba(59,130,246,0.30)' },
  'Enfermería': { bg: 'rgba(16,185,129,0.16)',  fg: 'var(--accent-emerald)', border: 'rgba(16,185,129,0.30)' },
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  prefix: string;
  matricula: string;
  phone: string;
  email: string;
  linkedUser: boolean;
  role: string;
  unit: string;
  shift: string;
  exp: number;
  avatar: string;
  specialties: string[];
  domiciliary: boolean;
  emergency: boolean;
  active: boolean;
  photoUrl?: string | null;
  empresaId?: number;
  userId?: number | null;
  createdAt?: string;
}

interface StaffForm {
  prefix: string;
  firstName: string;
  lastName: string;
  matricula: string;
  phone: string;
  email: string;
  linkedUser: boolean;
  specialties: string[];
  domiciliary: boolean;
  emergency: boolean;
  active: boolean;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const STAFF_SEED: StaffMember[] = [
  { id:'P-004', firstName:'Mariana',  lastName:'Soto',      prefix:'Dra.', matricula:'MP 14887', phone:'+54 388 4123-7754', email:'m.soto@emergex.com.ar',      linkedUser:true,  role:'Médico ALS',   unit:'U-04', shift:'06:00–18:00', exp:12, avatar:'MS', specialties:['clinico','emerg','cardio','acls','bls','pals'], domiciliary:true,  emergency:true,  active:true  },
  { id:'P-007', firstName:'Pablo',    lastName:'Lara',      prefix:'Lic.', matricula:'PM 7741',  phone:'+54 388 4221-1100', email:'p.lara@emergex.com.ar',      linkedUser:true,  role:'Paramédico',   unit:'U-07', shift:'06:00–18:00', exp:8,  avatar:'PL', specialties:['paramedico','tecnico','acls','bls'], domiciliary:false, emergency:true,  active:true  },
  { id:'P-009', firstName:'Andrea',   lastName:'Mora',      prefix:'Dra.', matricula:'MP 15992', phone:'+54 388 4554-3200', email:'a.mora@emergex.com.ar',      linkedUser:true,  role:'Médico ALS',   unit:'U-09', shift:'06:00–18:00', exp:14, avatar:'AM', specialties:['clinico','emerg','acls','bls'], domiciliary:true,  emergency:true,  active:true  },
  { id:'P-012', firstName:'Tomás',    lastName:'Ortega',    prefix:'Enf.', matricula:'MN 8821',  phone:'+54 388 4112-9000', email:'t.ortega@emergex.com.ar',    linkedUser:true,  role:'Enfermero',    unit:'U-12', shift:'00:00–12:00', exp:6,  avatar:'TO', specialties:['enfermeria','enf-uti','acls','bls','nrp'], domiciliary:true,  emergency:true,  active:true  },
  { id:'P-014', firstName:'Sofía',    lastName:'Bello',     prefix:'Dra.', matricula:'MP 12110', phone:'+54 388 4998-2200', email:'s.bello@emergex.com.ar',     linkedUser:true,  role:'Médico ALS',   unit:'U-14', shift:'06:00–18:00', exp:19, avatar:'SB', specialties:['clinico','pediatria','trauma','acls','pals','bls','atls'], domiciliary:false, emergency:true, active:true  },
  { id:'P-018', firstName:'Roberto',  lastName:'Téllez',    prefix:'Lic.', matricula:'PM 9012',  phone:'+54 388 4334-8800', email:'r.tellez@emergex.com.ar',    linkedUser:true,  role:'Paramédico',   unit:'U-18', shift:'06:00–18:00', exp:5,  avatar:'RT', specialties:['paramedico','tecnico','acls','bls'], domiciliary:false, emergency:true,  active:true  },
  { id:'P-021', firstName:'Camila',   lastName:'Gil',       prefix:'Enf.', matricula:'MN 9210',  phone:'+54 388 4445-5544', email:'c.gil@emergex.com.ar',       linkedUser:false, role:'Enfermera',    unit:'U-21', shift:'06:00–18:00', exp:3,  avatar:'CG', specialties:['enfermeria','bls'], domiciliary:true,  emergency:false, active:true  },
  { id:'P-022', firstName:'Daniel',   lastName:'Aro',       prefix:'Lic.', matricula:'PM 8430',  phone:'+54 388 4778-1133', email:'d.aro@emergex.com.ar',       linkedUser:true,  role:'Paramédico',   unit:'U-22', shift:'06:00–18:00', exp:7,  avatar:'DA', specialties:['paramedico','acls','bls'], domiciliary:false, emergency:true,  active:true  },
  { id:'P-025', firstName:'Ignacio',  lastName:'Pino',      prefix:'Dr.',  matricula:'MP 13550', phone:'+54 388 4221-7765', email:'i.pino@emergex.com.ar',      linkedUser:true,  role:'Médico ALS',   unit:'U-25', shift:'06:00–18:00', exp:11, avatar:'IP', specialties:['clinico','familiar','acls','bls'], domiciliary:true,  emergency:true,  active:true  },
  { id:'P-031', firstName:'Helena',   lastName:'Rojas',     prefix:'Lic.', matricula:'PM 9985',  phone:'+54 388 4998-7700', email:'h.rojas@emergex.com.ar',     linkedUser:false, role:'Paramédico',   unit:'U-31', shift:'06:00–18:00', exp:9,  avatar:'HR', specialties:['paramedico','tecnico','acls','bls','pals'], domiciliary:false, emergency:true, active:true  },
  { id:'P-033', firstName:'Marco',    lastName:'Ávila',     prefix:'Enf.', matricula:'MN 7234',  phone:'+54 388 4332-9988', email:'m.avila@emergex.com.ar',     linkedUser:true,  role:'Enfermero',    unit:'U-33', shift:'06:00–18:00', exp:4,  avatar:'MA', specialties:['enfermeria','bls'], domiciliary:true,  emergency:false, active:true  },
  { id:'P-040', firstName:'Lorena',   lastName:'Quintero',  prefix:'Dra.', matricula:'MP 11108', phone:'+54 388 4221-3344', email:'l.quintero@emergex.com.ar',  linkedUser:true,  role:'Despachadora', unit:'—',    shift:'06:00–18:00', exp:15, avatar:'LQ', specialties:['despacho','emd','bls'], domiciliary:false, emergency:false, active:true  },
  { id:'P-041', firstName:'Karla',    lastName:'Hernández', prefix:'Op.',  matricula:'OP 4421',  phone:'+54 388 4112-7733', email:'k.hernandez@emergex.com.ar', linkedUser:true,  role:'Despachadora', unit:'—',    shift:'06:00–18:00', exp:6,  avatar:'KH', specialties:['despacho','emd'], domiciliary:false, emergency:false, active:true  },
  { id:'P-050', firstName:'Felipe',   lastName:'Mendoza',   prefix:'Dr.',  matricula:'MP 10220', phone:'+54 388 4332-1100', email:'f.mendoza@emergex.com.ar',   linkedUser:true,  role:'Médico Jefe',  unit:'—',    shift:'—',           exp:22, avatar:'FM', specialties:['clinico','emerg','cardio','acls','pals','bls','atls'], domiciliary:true, emergency:true, active:false },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

const PREFIX_OPTIONS = ['Dr.', 'Dra.', 'Lic.', 'Enf.', 'Tec.', 'Op.'];


// ─── Helpers ──────────────────────────────────────────────────────────────────

function emptyForm(): StaffForm {
  return {
    prefix: 'Dr.',
    firstName: '',
    lastName: '',
    matricula: '',
    phone: '',
    email: '',
    linkedUser: false,
    specialties: [],
    domiciliary: false,
    emergency: false,
    active: true,
  };
}

function specById(catalog: CatalogItem[], id: string): CatalogItem | undefined {
  return catalog.find(s => s.id === id);
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [FormsModule, StatusBadgeComponent],
  template: `
    <div class="screen">

      <!-- ── Header ── -->
      <div class="screen-head">
        <div class="screen-head__title">
          <div class="screen-head__icon" style="background:rgba(34,211,238,0.12);border-color:rgba(34,211,238,0.25)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <h2>Personal Operativo</h2>
            <div class="eyebrow">MÉDICOS · PARAMÉDICOS · ENFERMERÍA · DESPACHO</div>
          </div>
        </div>

        <div class="screen-head__kpis">
          <div class="screen-kpi">
            <div class="eyebrow">Plantilla</div>
            <div class="mono" style="font-size:18px;font-weight:500">{{ counts().total }}</div>
          </div>
          <div class="screen-kpi">
            <div class="eyebrow">Activos</div>
            <div class="mono" style="font-size:18px;font-weight:500;color:var(--accent-emerald)">{{ counts().active }}</div>
          </div>
          <div class="screen-kpi">
            <div class="eyebrow">Domiciliaria</div>
            <div class="mono" style="font-size:18px;font-weight:500;color:var(--accent-blue)">{{ counts().domiciliary }}</div>
          </div>
          <div class="screen-kpi">
            <div class="eyebrow">Emergencias</div>
            <div class="mono" style="font-size:18px;font-weight:500;color:var(--accent-red)">{{ counts().emergency }}</div>
          </div>
        </div>

        <div class="screen-head__actions">
          <button class="btn btn--ghost btn--sm">Reporte de turnos</button>
          <button class="btn btn--primary btn--sm" (click)="openNewForm()">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
            Alta de profesional
          </button>
        </div>
      </div>

      <!-- ── Table card ── -->
      <div class="glass-strong pt-card ml-4 mr-4">

        <!-- Toolbar -->
        <div class="pt-toolbar">
          <div class="pt-search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"><circle cx="6" cy="6" r="4"/><path d="M9.5 9.5l3 3"/></svg>
            <input
              class="pt-search__input"
              placeholder="Buscar por nombre, matrícula o ID (P-xxx)…"
              [(ngModel)]="searchQueryValue"
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
            <span class="eyebrow" style="white-space:nowrap">Habilitación:</span>
            @for (h of habOptions; track h.value) {
              <button
                class="filter-chip"
                [attr.data-on]="habFilter() === h.value"
                (click)="setHab(h.value)"
              >{{ h.label }}</button>
            }
          </div>
        </div>

        <!-- Table -->
        <div class="data-table-wrap scroll-y ml">
          <table class="data-table" style="width:100%;min-width:820px">
            <thead>
              <tr>
                <th>Profesional</th>
                <th>Especialidades / Certificaciones</th>
                <th>Habilitaciones</th>
                <th>Estado</th>
                <th style="width:40px"></th>
              </tr>
            </thead>
            <tbody>
              @if (paged().length === 0) {
                <tr>
                  <td colspan="5" style="padding:40px;text-align:center;color:var(--text-muted);font-size:12px">Sin resultados</td>
                </tr>
              }
              @for (s of paged(); track s.id) {
                <tr (click)="openEditForm(s)" style="cursor:pointer">
                  <!-- Col 1: Profesional -->
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="staff-avatar">{{ s.avatar }}</div>
                      <div>
                        <div style="font-size:13px;font-weight:500">{{ s.prefix }} {{ s.firstName }} {{ s.lastName }}</div>
                        <div class="mono micro" style="color:var(--text-muted)">{{ s.matricula }} · {{ s.id }}</div>
                      </div>
                    </div>
                  </td>

                  <!-- Col 2: Especialidades -->
                  <td (click)="$event.stopPropagation()">
                    <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">
                      @for (specId of s.specialties.slice(0, 5); track specId) {
                        @let spec = getSpec(specId);
                        @if (spec) {
                          <span class="spec-chip"
                            [style.background]="groupColor(spec.group).bg"
                            [style.color]="groupColor(spec.group).fg"
                            [style.border-color]="groupColor(spec.group).border"
                          >{{ spec.name }}</span>
                        }
                      }
                      @if (s.specialties.length > 5) {
                        <span class="spec-chip" style="background:rgba(148,163,184,0.1);color:var(--text-muted);border-color:rgba(148,163,184,0.2)">
                          +{{ s.specialties.length - 5 }} más
                        </span>
                      }
                    </div>
                  </td>

                  <!-- Col 3: Habilitaciones -->
                  <td>
                    <div style="display:flex;gap:6px;align-items:center">
                      <span class="hab-tag" [style.opacity]="s.domiciliary ? '1' : '0.35'">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        Domiciliaria
                      </span>
                      <span class="hab-tag hab-tag--emerg" [style.opacity]="s.emergency ? '1' : '0.35'">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                        Emergencias
                      </span>
                    </div>
                  </td>

                  <!-- Col 4: Estado -->
                  <td>
                    @if (s.active) {
                      <emx-status-badge variant="stable">Activo</emx-status-badge>
                    } @else {
                      <span class="badge-inactive">Inactivo</span>
                    }
                  </td>

                  <!-- Col 5: Acciones -->
                  <td (click)="$event.stopPropagation()" style="position:relative">
                    <button class="action-icon" style="width:28px;height:28px" title="Acciones"
                      (click)="toggleMenu(s.id)">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                    @if (menuOpen() === s.id) {
                      <div class="row-menu" (click)="$event.stopPropagation()">
                        <button class="user-menu__item" (click)="openEditForm(s); menuOpen.set(null)">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          Editar
                        </button>
                        <button class="user-menu__item">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.63 3.41 2 2 0 0 1 3.6 1.25h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.36a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 16z"/></svg>
                          Contactar
                        </button>
                        <div style="height:1px;background:var(--border-hairline);margin:4px 0"></div>
                        @if (s.active) {
                          <button class="user-menu__item user-menu__item--danger" (click)="toggleActive(s.id); menuOpen.set(null)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                            Desactivar
                          </button>
                        } @else {
                          <button class="user-menu__item user-menu__item--danger" (click)="toggleActive(s.id); menuOpen.set(null)">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            Reactivar
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
            <strong style="color:var(--text-primary)">{{ filtered().length }}</strong> profesionales
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
         STAFF FORM MODAL
         ═══════════════════════════════════════════════════════ -->
    @if (formOpen()) {
      <div class="qc-overlay" (click)="closeForm()">
        <div class="qc-modal qc-modal--wide glass-strong" (click)="$event.stopPropagation()">
          <div class="qc-head">
            <div>
              <div class="eyebrow" style="color:var(--accent-cyan)">● {{ editingStaff() ? 'EDITAR PROFESIONAL' : 'ALTA DE PROFESIONAL' }}</div>
              <h2 style="margin:4px 0 0;font-size:20px;font-weight:600;letter-spacing:-0.01em">
                {{ editingStaff() ? (form().prefix + ' ' + form().firstName + ' ' + form().lastName) : 'Nuevo profesional' }}
              </h2>
            </div>
            <button class="qc-close-btn" (click)="closeForm()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
          </div>

          <div class="qc-body scroll-y" style="max-height:60vh;overflow-y:auto;padding:20px">
            <div style="display:flex;flex-direction:column;gap:20px">

              <!-- Sección 1: Datos personales -->
              <div>
                <div class="form-section__head">
                  <div class="form-section__step">1</div>
                  <div>
                    <div style="font-size:13px;font-weight:600;color:var(--text-primary)">Datos personales y contacto</div>
                  </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:12px">
                  <div class="qc-row">
                    <div class="qc-field" style="width:110px;flex-shrink:0">
                      <label class="eyebrow">Prefijo</label>
                      <select class="qc-input" [(ngModel)]="form().prefix" (ngModelChange)="patchForm({ prefix: $event })">
                        @for (p of prefixOptions; track p) {
                          <option [value]="p">{{ p }}</option>
                        }
                      </select>
                    </div>
                    <div class="qc-field" style="flex:1">
                      <label class="eyebrow">Nombre <span style="color:var(--accent-red)">*</span></label>
                      <input class="qc-input" placeholder="Ej. Mariana" [(ngModel)]="form().firstName" (ngModelChange)="patchForm({ firstName: $event })" autofocus/>
                    </div>
                    <div class="qc-field" style="flex:1">
                      <label class="eyebrow">Apellido <span style="color:var(--accent-red)">*</span></label>
                      <input class="qc-input" placeholder="Ej. Soto" [(ngModel)]="form().lastName" (ngModelChange)="patchForm({ lastName: $event })"/>
                    </div>
                    <div class="qc-field" style="width:140px;flex-shrink:0">
                      <label class="eyebrow">Matrícula <span style="color:var(--accent-red)">*</span></label>
                      <input class="qc-input mono" placeholder="MP 14887" [(ngModel)]="form().matricula" (ngModelChange)="patchForm({ matricula: $event })"/>
                    </div>
                  </div>

                  <div class="qc-row">
                    <div class="qc-field" style="flex:1">
                      <label class="eyebrow">Teléfono</label>
                      <input class="qc-input" placeholder="+54 388 4123-7754" [(ngModel)]="form().phone" (ngModelChange)="patchForm({ phone: $event })"/>
                    </div>
                    <div class="qc-field" style="flex:2">
                      <label class="eyebrow">Email</label>
                      <input class="qc-input" type="email" placeholder="apellido@emergex.com.ar" [(ngModel)]="form().email" (ngModelChange)="patchForm({ email: $event })"/>
                    </div>
                  </div>

                  <!-- Link user card -->
                  <div class="link-user-card" [class.link-user-card--on]="form().linkedUser" (click)="patchForm({ linkedUser: !form().linkedUser })">
                    <div class="link-user-card__check" [class.link-user-card__check--on]="form().linkedUser">
                      @if (form().linkedUser) {
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" stroke-width="2" stroke-linecap="round"><polyline points="1.5 5 4 7.5 8.5 2"/></svg>
                      }
                    </div>
                    <div style="flex:1">
                      <div style="font-size:12.5px;font-weight:500;color:var(--text-primary)">Vincular con usuario del sistema</div>
                      <div class="mono micro" style="color:var(--text-muted);margin-top:2px">El profesional podrá acceder a la plataforma con sus credenciales</div>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;opacity:0.7"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                </div>
              </div>

              <!-- Sección 2: Perfil médico -->
              <div>
                <div class="form-section__head">
                  <div class="form-section__step">2</div>
                  <div>
                    <div style="font-size:13px;font-weight:600;color:var(--text-primary)">Perfil médico y operativo</div>
                  </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:12px">

                  <!-- Multiselect especialidades -->
                  <div class="qc-field">
                    <label class="eyebrow">Especialidades y certificaciones</label>
                    <div class="spec-multiselect">
                      <!-- chips seleccionados -->
                      @if (form().specialties.length > 0) {
                        <div style="display:flex;flex-wrap:wrap;gap:4px;padding:8px 10px 4px">
                          @for (sid of form().specialties; track sid) {
                            @let sp = getSpec(sid);
                            @if (sp) {
                              <span class="spec-chip"
                                [style.background]="groupColor(sp.group).bg"
                                [style.color]="groupColor(sp.group).fg"
                                [style.border-color]="groupColor(sp.group).border"
                              >
                                {{ sp.name }}
                                <button class="spec-chip__remove" (click)="removeSpecialty(sid); $event.stopPropagation()">
                                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="7" y2="7"/><line x1="7" y1="1" x2="1" y2="7"/></svg>
                                </button>
                              </span>
                            }
                          }
                        </div>
                      }
                      <!-- input búsqueda -->
                      <div style="position:relative">
                        <input
                          class="qc-input spec-search-input"
                          placeholder="Buscar especialidad…"
                          [(ngModel)]="specQuery"
                          (focus)="specDropOpen.set(true)"
                          (click)="$event.stopPropagation()"
                        />
                        @if (specDropOpen() && filteredSpecs().length > 0) {
                          <div class="spec-dropdown" (click)="$event.stopPropagation()">
                            @for (grp of specGroups; track grp) {
                              @let items = filteredSpecsByGroup(grp);
                              @if (items.length > 0) {
                                <div class="spec-drop__group-label">{{ grp }}</div>
                                @for (sp of items; track sp.id) {
                                  <button class="spec-drop__item" [class.spec-drop__item--selected]="form().specialties.includes(sp.id)" (click)="toggleSpecialty(sp.id)">
                                    <span class="spec-chip" style="pointer-events:none"
                                      [style.background]="groupColor(sp.group).bg"
                                      [style.color]="groupColor(sp.group).fg"
                                      [style.border-color]="groupColor(sp.group).border"
                                    >{{ sp.name }}</span>
                                    @if (form().specialties.includes(sp.id)) {
                                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="var(--accent-emerald)" stroke-width="2" stroke-linecap="round" style="margin-left:auto"><polyline points="1.5 5.5 4.5 8.5 9.5 2"/></svg>
                                    }
                                  </button>
                                }
                              }
                            }
                          </div>
                        }
                      </div>
                    </div>
                    <div class="mono micro" style="color:var(--text-muted);margin-top:4px">{{ form().specialties.length }} especialidades seleccionadas</div>
                  </div>

                  <!-- Hab cards -->
                  <div>
                    <label class="eyebrow" style="display:block;margin-bottom:8px">Habilitaciones</label>
                    <div class="hab-grid">
                      <button type="button" class="hab-card"
                        [attr.data-on]="form().domiciliary"
                        [style.border-color]="form().domiciliary ? 'rgba(59,130,246,0.5)' : 'var(--border-glass)'"
                        [style.background]="form().domiciliary ? 'rgba(59,130,246,0.08)' : 'transparent'"
                        (click)="patchForm({ domiciliary: !form().domiciliary })">
                        <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0"
                          [style.background]="form().domiciliary ? 'rgba(59,130,246,0.15)' : 'rgba(148,163,184,0.08)'">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            [attr.stroke]="form().domiciliary ? 'var(--accent-blue)' : 'var(--text-muted)'"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            <polyline points="9 22 9 12 15 12 15 22"/>
                          </svg>
                        </div>
                        <div style="text-align:left">
                          <div style="font-size:13px;font-weight:500"
                            [style.color]="form().domiciliary ? 'var(--accent-blue)' : 'var(--text-secondary)'">Atención domiciliaria</div>
                          <div class="mono micro" style="color:var(--text-muted);margin-top:2px">Visitas a domicilio</div>
                        </div>
                      </button>
                      <button type="button" class="hab-card"
                        [attr.data-on]="form().emergency"
                        [style.border-color]="form().emergency ? 'rgba(239,68,68,0.5)' : 'var(--border-glass)'"
                        [style.background]="form().emergency ? 'rgba(239,68,68,0.08)' : 'transparent'"
                        (click)="patchForm({ emergency: !form().emergency })">
                        <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0"
                          [style.background]="form().emergency ? 'rgba(239,68,68,0.15)' : 'rgba(148,163,184,0.08)'">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            [attr.stroke]="form().emergency ? 'var(--accent-red)' : 'var(--text-muted)'"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="1" y="3" width="15" height="13" rx="2"/>
                            <path d="M16 8h4l3 3v5h-7V8z"/>
                            <circle cx="5.5" cy="18.5" r="2.5"/>
                            <circle cx="18.5" cy="18.5" r="2.5"/>
                          </svg>
                        </div>
                        <div style="text-align:left">
                          <div style="font-size:13px;font-weight:500"
                            [style.color]="form().emergency ? 'var(--accent-red)' : 'var(--text-secondary)'">Atención de emergencias</div>
                          <div class="mono micro" style="color:var(--text-muted);margin-top:2px">Ambulancia y urgencias</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <!-- Active strip -->
                  <div class="active-strip"
                    [style.border-color]="form().active ? 'rgba(16,185,129,0.3)' : 'var(--border-glass)'"
                    [style.background]="form().active ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)'">
                    <div style="display:flex;align-items:center;gap:10px">
                      <div style="width:8px;height:8px;border-radius:50%;flex-shrink:0"
                        [style.background]="form().active ? 'var(--accent-emerald)' : 'var(--text-dim)'"></div>
                      <div>
                        <div style="font-size:13px;font-weight:500"
                          [style.color]="form().active ? 'var(--accent-emerald)' : 'var(--text-secondary)'">
                          {{ form().active ? 'Profesional activo' : 'Profesional inactivo' }}
                        </div>
                        <div class="mono micro" style="color:var(--text-muted);margin-top:1px">
                          {{ form().active ? 'Aparece en asignaciones y búsquedas' : 'No disponible para asignaciones' }}
                        </div>
                      </div>
                    </div>
                    <button type="button" class="toggle-sw" [class.toggle-sw--on]="form().active" (click)="patchForm({ active: !form().active })">
                      <span class="toggle-sw__track" [class.toggle-sw__track--on]="form().active">
                        <span class="toggle-sw__thumb" [class.toggle-sw__thumb--on]="form().active"></span>
                      </span>
                    </button>
                  </div>

                </div>
              </div>

            </div>
          </div>

          <div class="qc-foot">
            <div class="qc-hint">
              <span class="kbd">Esc</span> cerrar
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn btn--ghost" (click)="closeForm()">Cancelar</button>
              <button class="btn btn--primary" [disabled]="!canSubmit()" [style.opacity]="canSubmit() ? '1' : '0.5'" (click)="saveForm()">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Guardar profesional
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
    .pt-card .data-table thead th:first-child,
    .pt-card .data-table tbody td:first-child {
      padding-left: 16px;
    }
    .pt-card .data-table thead th:last-child,
    .pt-card .data-table tbody td:last-child {
      padding-right: 16px;
    }

    :host-context([data-theme="light"]) .pt-card .data-table thead th {
      color: rgba(15, 23, 42, 0.78);
      background: rgba(148, 163, 184, 0.52);
    }

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

    /* ── Staff avatar ── */
    .staff-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: rgba(59,130,246,0.15);
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      color: var(--accent-blue);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* ── Spec chip ── */
    .spec-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 5px;
      border: 1px solid;
      font-size: 11px;
      font-weight: 500;
      white-space: nowrap;
    }
    .spec-chip__remove {
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 1px;
      opacity: 0.6;
      color: inherit;
      transition: opacity 0.12s;
    }
    .spec-chip__remove:hover { opacity: 1; }

    /* ── Hab tag ── */
    .hab-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 500;
      background: rgba(59,130,246,0.1);
      color: var(--accent-blue);
      border: 1px solid rgba(59,130,246,0.25);
      white-space: nowrap;
      transition: opacity 0.15s;
    }
    .hab-tag--emerg {
      background: rgba(239,68,68,0.1);
      color: var(--accent-red);
      border-color: rgba(239,68,68,0.25);
    }

    /* ── Badge inactive ── */
    .badge-inactive {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 500;
      background: rgba(148,163,184,0.1);
      color: var(--text-muted);
      border: 1px solid rgba(148,163,184,0.2);
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
    .qc-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 20px 20px 0;
      flex-shrink: 0;
    }
    .qc-body { flex: 1; overflow-y: auto; }
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

    /* ── Form section head ── */
    .form-section__head {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .form-section__step {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--accent-blue);
      color: white;
      font-size: 12px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* ── Link user card ── */
    .link-user-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid var(--border-glass);
      cursor: pointer;
      transition: all 0.15s;
    }
    .link-user-card:hover { background: rgba(255,255,255,0.03); }
    .link-user-card--on { background: rgba(59,130,246,0.06); border-color: rgba(59,130,246,0.3); }
    .link-user-card__check {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid var(--border-glass);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.15s;
    }
    .link-user-card__check--on {
      background: var(--accent-blue);
      border-color: var(--accent-blue);
    }

    /* ── Hab grid & card ── */
    .hab-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .hab-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid;
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
      background: transparent;
    }
    .hab-card:hover { background: rgba(255,255,255,0.03); }

    /* ── Active strip & toggle ── */
    .active-strip {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid;
      background: rgba(255,255,255,0.03);
      transition: all 0.15s;
    }
    .toggle-sw {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
    }
    .toggle-sw__track {
      display: flex;
      align-items: center;
      width: 36px;
      height: 20px;
      border-radius: 10px;
      background: rgba(148,163,184,0.25);
      padding: 2px;
      transition: background 0.2s;
    }
    .toggle-sw__track--on { background: var(--accent-emerald); }
    .toggle-sw__thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: white;
      transition: transform 0.2s;
      transform: translateX(0);
    }
    .toggle-sw__thumb--on { transform: translateX(16px); }

    /* ── Spec multiselect ── */
    .spec-multiselect {
      border: 1px solid var(--border-glass);
      border-radius: var(--r-btn);
      background: rgba(255,255,255,0.03);
      overflow: visible;
      position: relative;
    }
    .spec-search-input {
      border: none !important;
      background: transparent !important;
      border-radius: 0 !important;
      border-top: 1px solid var(--border-hairline) !important;
    }
    .spec-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 50;
      max-height: 240px;
      overflow-y: auto;
      border-radius: 10px;
      background: var(--bg-elevated);
      border: 1px solid var(--border-glass);
      box-shadow: 0 8px 32px rgba(0,0,0,0.45);
      padding: 4px;
    }
    .spec-drop__group-label {
      padding: 6px 10px 3px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--text-dim);
    }
    .spec-drop__item {
      display: flex;
      align-items: center;
      gap: 6px;
      width: 100%;
      padding: 5px 8px;
      border-radius: 6px;
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      transition: background 0.12s;
    }
    .spec-drop__item:hover { background: rgba(255,255,255,0.05); }
    .spec-drop__item--selected { background: rgba(59,130,246,0.05); }

    :host-context([data-theme="light"]) .qc-modal .qc-input,
    :host-context([data-theme="light"]) .qc-modal .spec-multiselect,
    :host-context([data-theme="light"]) .qc-modal .spec-search-input {
      background: #f8fafc !important;
      border-color: rgba(148, 163, 184, 0.35) !important;
      color: #0f172a !important;
    }
    :host-context([data-theme="light"]) .qc-modal .qc-input::placeholder,
    :host-context([data-theme="light"]) .qc-modal .spec-search-input::placeholder {
      color: #64748b !important;
    }
  `],
})
export class StaffComponent implements OnInit {
  private staffApi = inject(StaffApiService);

  ngOnInit(): void {
    forkJoin({
      catalog: this.staffApi.getSubespecialidadesCatalog(),
      staff:   this.staffApi.getProfesionales(),
    }).subscribe(({ catalog, staff }) => {
      this.catalog.set(catalog.map(toCatalogItem));
      this.staff.set(staff.map(this.mapToMember));
    });
  }

  private loadStaff(): void {
    this.staffApi.getProfesionales().subscribe((list: ProfesionalSaludDTO[]) => {
      this.staff.set(list.map(this.mapToMember));
    });
  }

  private mapToMember = (b: ProfesionalSaludDTO): StaffMember => {
    const specialties: string[] = (b.subespecialidads ?? []).map(s => String(s.id));
    const firstName = specialties[0]
      ? this.catalog().find(c => c.id === specialties[0])?.name ?? ''
      : '';
    const prefix = firstName.startsWith('Enf') ? 'Enf.'
      : firstName.startsWith('Lic') ? 'Lic.'
      : firstName.startsWith('Téc') || firstName.startsWith('Tec') ? 'Tec.'
      : firstName.startsWith('Op') ? 'Op.'
      : 'Dr.';

    return {
      id:          String(b.id),
      firstName:   b.nombre,
      lastName:    b.apellido,
      prefix,
      matricula:   b.matricula ?? '',
      phone:       b.telefono ?? '',
      email:       b.email ?? '',
      photoUrl:    b.foto ?? null,
      domiciliary: b.atencionDomiciliaria,
      emergency:   b.atencionEmergencia,
      active:      b.activo,
      linkedUser:  b.user != null,
      specialties,
      role:        'Profesional',
      unit:        '-',
      shift:       '-',
      exp:         0,
      avatar:      (b.nombre[0] ?? '') + (b.apellido[0] ?? ''),
      empresaId:   b.empresa?.id ?? 0,
      userId:      b.user?.id ?? null,
      createdAt:   b.createdAt,
    };
  };

  // ── Constants exposed to template ──
  readonly prefixOptions = PREFIX_OPTIONS;
  readonly statusOptions = [
    { value: 'all',      label: 'Todos' },
    { value: 'active',   label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
  ];
  readonly habOptions = [
    { value: 'all',         label: 'Todas' },
    { value: 'domiciliary', label: 'Domiciliaria' },
    { value: 'emergency',   label: 'Emergencias' },
  ];
  readonly specGroups: SpecialtyGroup[] = ['Médica', 'Enfermería'];

  // ── State ──
  readonly catalog = signal<CatalogItem[]>([]);
  readonly staff = signal<StaffMember[]>(STAFF_SEED);
  readonly searchQuery = signal('');
  readonly statusFilter = signal('all');
  readonly habFilter = signal('all');
  readonly page = signal(0);
  readonly formOpen = signal(false);
  readonly editingStaff = signal<StaffMember | null>(null);
  readonly menuOpen = signal<string | null>(null);
  readonly form = signal<StaffForm>(emptyForm());
  readonly specDropOpen = signal(false);
  readonly saving = signal(false);

  specQuery = '';

  // ── Two-way ngModel bridge ──
  get searchQueryValue(): string { return this.searchQuery(); }
  set searchQueryValue(v: string) { this.searchQuery.set(v); this.page.set(0); }

  // ── Computed ──
  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const s = this.statusFilter();
    const h = this.habFilter();
    return this.staff().filter(m =>
      (s === 'all' || (s === 'active' ? m.active : !m.active)) &&
      (h === 'all' || (h === 'domiciliary' ? m.domiciliary : m.emergency)) &&
      (!q ||
        m.firstName.toLowerCase().includes(q) ||
        m.lastName.toLowerCase().includes(q) ||
        m.matricula.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q))
    );
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));

  readonly paged = computed(() => {
    const pg = Math.min(this.page(), this.totalPages() - 1);
    return this.filtered().slice(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE);
  });

  readonly pageRange = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i));

  readonly counts = computed(() => {
    const list = this.staff();
    return {
      total:       list.length,
      active:      list.filter(m => m.active).length,
      domiciliary: list.filter(m => m.domiciliary && m.active).length,
      emergency:   list.filter(m => m.emergency && m.active).length,
    };
  });

  readonly canSubmit = computed(() => {
    const f = this.form();
    return !this.saving() &&
      f.firstName.trim().length > 0 &&
      f.lastName.trim().length > 0 &&
      f.matricula.trim().length > 0;
  });

  readonly filteredSpecs = computed(() => {
    const q = this.specQuery.toLowerCase();
    return this.catalog().filter(s =>
      !this.form().specialties.includes(s.id) &&
      (!q || s.name.toLowerCase().includes(q) || s.group.toLowerCase().includes(q))
    );
  });

  // ── Helpers ──
  getSpec(id: string): CatalogItem | undefined {
    return specById(this.catalog(), id);
  }

  groupColor(group: string): { bg: string; fg: string; border: string } {
    return SPEC_GROUP_COLOR[group as SpecialtyGroup] ?? { bg: 'rgba(148,163,184,0.1)', fg: 'var(--text-muted)', border: 'rgba(148,163,184,0.2)' };
  }

  filteredSpecsByGroup(group: SpecialtyGroup): CatalogItem[] {
    return this.filteredSpecs().filter(s => s.group === group);
  }

  // ── Filters ──
  setStatus(v: string): void {
    this.statusFilter.set(v);
    this.page.set(0);
  }

  setHab(v: string): void {
    this.habFilter.set(v);
    this.page.set(0);
  }

  // ── Table menu ──
  toggleMenu(id: string): void {
    this.menuOpen.set(this.menuOpen() === id ? null : id);
  }

  toggleActive(id: string): void {
    const member = this.staff().find(m => m.id === id);
    if (!member) return;
    const numId = Number(id);
    this.staffApi.patch(numId, { id: numId, activo: !member.active }).subscribe({
      next: () => this.loadStaff(),
      error: () => {},
    });
  }

  @HostListener('document:click')
  closeMenuOnOutsideClick(): void {
    this.menuOpen.set(null);
    this.specDropOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.specDropOpen()) { this.specDropOpen.set(false); return; }
    if (this.formOpen()) { this.closeForm(); return; }
  }

  // ── Specialty management ──
  toggleSpecialty(id: string): void {
    const current = this.form().specialties;
    if (current.includes(id)) {
      this.patchForm({ specialties: current.filter(s => s !== id) });
    } else {
      this.patchForm({ specialties: [...current, id] });
    }
  }

  removeSpecialty(id: string): void {
    this.patchForm({ specialties: this.form().specialties.filter(s => s !== id) });
  }

  // ── Form actions ──
  openNewForm(): void {
    this.editingStaff.set(null);
    this.form.set(emptyForm());
    this.specQuery = '';
    this.specDropOpen.set(false);
    this.formOpen.set(true);
  }

  openEditForm(m: StaffMember): void {
    this.editingStaff.set(m);
    this.form.set({
      prefix:      m.prefix,
      firstName:   m.firstName,
      lastName:    m.lastName,
      matricula:   m.matricula,
      phone:       m.phone,
      email:       m.email,
      linkedUser:  m.linkedUser,
      specialties: [...m.specialties],
      domiciliary: m.domiciliary,
      emergency:   m.emergency,
      active:      m.active,
    });
    this.specQuery = '';
    this.specDropOpen.set(false);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingStaff.set(null);
    this.specDropOpen.set(false);
  }

  patchForm(patch: Partial<StaffForm>): void {
    this.form.set({ ...this.form(), ...patch });
  }

  saveForm(): void {
    if (!this.canSubmit()) return;
    const f = this.form();
    const editing = this.editingStaff();
    const subespecialidads = f.specialties.map(id => ({ id: Number(id) }));
    this.saving.set(true);

    if (editing) {
      const numId = Number(editing.id);
      this.staffApi.put(numId, {
        id:                   numId,
        nombre:               f.firstName.trim(),
        apellido:             f.lastName.trim(),
        createdAt:            editing.createdAt ?? new Date().toISOString(),
        matricula:            f.matricula.trim() || undefined,
        telefono:             f.phone.trim() || undefined,
        email:                f.email.trim() || undefined,
        atencionDomiciliaria: f.domiciliary,
        atencionEmergencia:   f.emergency,
        activo:               f.active,
        empresa:              { id: editing.empresaId ?? 0 },
        user:                 editing.userId != null ? { id: editing.userId! } : undefined,
        subespecialidads,
      }).subscribe({
        next: () => { this.loadStaff(); this.closeForm(); this.saving.set(false); },
        error: () => this.saving.set(false),
      });
    } else {
      this.staffApi.create({
        nombre:               f.firstName.trim(),
        apellido:             f.lastName.trim(),
        activo:               f.active,
        atencionDomiciliaria: f.domiciliary,
        atencionEmergencia:   f.emergency,
        matricula:            f.matricula.trim() || undefined,
        telefono:             f.phone.trim() || undefined,
        email:                f.email.trim() || undefined,
        subespecialidads,
      }).subscribe({
        next: () => { this.loadStaff(); this.closeForm(); this.saving.set(false); },
        error: () => this.saving.set(false),
      });
    }
  }
}
