import { Component, output, signal, computed, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent } from '../../status-badge/status-badge.component';

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Institution {
  id: string;
  name: string;
  type: string;
  area: string;
  address: string;
}

interface Member {
  id: string;
  name: string;
  role: string;
  institution: string;
  doc: string;
}

interface PrioLevel {
  v: string;
  label: string;
  sub: string;
  color: string;
}

interface Channel {
  v: string;
  label: string;
  icon: string;
}

interface TransientForm {
  firstName: string;
  lastName: string;
  dni: string;
  age: string;
}

interface IEForm {
  institutionId: string | null;
  institutionQuery: string;
  specificLocation: string;
  patientType: 'member' | 'transient';
  memberId: string | null;
  memberQuery: string;
  transient: TransientForm;
  prio: string;
  symptoms: string;
  channel: string;
}

export interface InstitutionalEmergencyPayload {
  institutional: true;
  institution: string | undefined;
  institutionType: string | undefined;
  addr: string;
  sector: string | undefined;
  prio: string;
  triage: string;
  slaSec: number;
  patient: string;
  patientType: string;
  memberId: string | null;
  transientDetails: TransientForm | null;
  symptoms: string;
  channel: string;
}

const INSTITUTIONS: Institution[] = [
  { id: 'inst-001', name: 'Universidad Nacional de Jujuy',        type: 'Educativa',   area: 'Alto Padilla', address: 'Av. Bolivia 1685' },
  { id: 'inst-002', name: 'Edificio Tribunales',                  type: 'Corporativo', area: 'Centro',       address: 'Independencia 16' },
  { id: 'inst-003', name: 'Shopping Alto Padilla',                type: 'Comercial',   area: 'Alto Padilla', address: 'Av. Sen. Pérez 1700' },
  { id: 'inst-004', name: 'Estadio 23 de Agosto',                 type: 'Deportivo',   area: 'Centro',       address: 'San Martín esq. Belgrano' },
  { id: 'inst-005', name: 'Hospital Pablo Soria · Administración',type: 'Sanitario',   area: 'Centro',       address: 'Patricias Argentinas 451' },
  { id: 'inst-006', name: 'Colegio Santa Teresita',               type: 'Educativa',   area: 'Cuyaya',       address: 'Calle Lavalle 425' },
  { id: 'inst-007', name: 'Centro Cívico de Jujuy',               type: 'Corporativo', area: 'Centro',       address: 'San Martín 450' },
  { id: 'inst-008', name: 'Plaza Belgrano',                       type: 'Público',     area: 'Centro',       address: 'Belgrano y Gómez' },
  { id: 'inst-009', name: 'UCSE Sede Jujuy',                      type: 'Educativa',   area: 'Centro',       address: 'Lavalle 333' },
  { id: 'inst-010', name: 'Casino del Sol',                       type: 'Cultural',    area: 'Bajo La Viña', address: 'Av. Fascio s/n' },
];

const MEMBERS: Member[] = [
  { id: 'mb-001', name: 'Antonio Vázquez Cárdenas', role: 'Profesor titular',       institution: 'inst-001', doc: 'DNI 18.345.672' },
  { id: 'mb-002', name: 'María González Pérez',      role: 'Estudiante · 3er año',  institution: 'inst-001', doc: 'DNI 42.871.103' },
  { id: 'mb-003', name: 'Carlos Méndez Rivas',       role: 'Recepcionista',          institution: 'inst-002', doc: 'DNI 28.554.789' },
  { id: 'mb-004', name: 'Laura Sánchez Ortiz',       role: 'Secretaria de juzgado', institution: 'inst-002', doc: 'DNI 30.112.045' },
  { id: 'mb-005', name: 'Roberto Téllez Cabrera',    role: 'Seguridad nocturno',     institution: 'inst-003', doc: 'DNI 22.890.661' },
  { id: 'mb-006', name: 'Ana Patricia Núñez',        role: 'Cajera principal',       institution: 'inst-003', doc: 'DNI 35.421.099' },
  { id: 'mb-007', name: 'Diego Vidal Martínez',      role: 'Mantenimiento',          institution: 'inst-004', doc: 'DNI 17.998.234' },
  { id: 'mb-008', name: 'Sofía Ramírez Bello',       role: 'Personal médico',        institution: 'inst-005', doc: 'DNI 26.443.781' },
];

const PRIO_LEVELS: PrioLevel[] = [
  { v: 'red',   label: 'Rojo',     sub: 'Crítico · Atención inmediata',     color: 'var(--accent-red)'     },
  { v: 'amber', label: 'Amarillo', sub: 'Urgente · Atención < 30 min',      color: 'var(--accent-amber)'   },
  { v: 'green', label: 'Verde',    sub: 'Estable · Atención programada',    color: 'var(--accent-emerald)' },
  { v: 'blue',  label: 'Azul',     sub: 'No urgente · Consulta / traslado', color: 'var(--accent-blue)'    },
];

const CHANNELS: Channel[] = [
  { v: 'phone', label: 'Llamada telefónica', icon: '☏' },
  { v: 'app',   label: 'App móvil',          icon: '◊' },
  { v: 'panic', label: 'Botón de pánico',    icon: '⚠' },
  { v: 'radio', label: 'Radio operadora',    icon: '⛯' },
  { v: 'sms',   label: 'SMS / WhatsApp',     icon: '✉' },
  { v: 'walk',  label: 'Aviso presencial',   icon: '⚑' },
];

function emptyForm(): IEForm {
  return {
    institutionId: null,
    institutionQuery: '',
    specificLocation: '',
    patientType: 'member',
    memberId: null,
    memberQuery: '',
    transient: { firstName: '', lastName: '', dni: '', age: '' },
    prio: 'red',
    symptoms: '',
    channel: 'phone',
  };
}

function avatarOf(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'emx-institutional-modal',
  standalone: true,
  imports: [FormsModule, StatusBadgeComponent],
  template: `
    <div class="qc-overlay" (click)="closed.emit()">
      <div class="qc-modal qc-modal--wide glass-strong" (click)="$event.stopPropagation()">

        <!-- Head -->
        <div class="qc-head">
          <div>
            <div class="eyebrow" style="color:var(--accent-red)">● ALTA INSTITUCIONAL</div>
            <h2 style="margin:4px 0 0;font-size:20px;font-weight:600;letter-spacing:-0.01em">
              Registrar emergencia · Institución / Área protegida
            </h2>
          </div>
          <button class="qc-close-btn" (click)="closed.emit()">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
          </button>
        </div>

        <!-- Wizard step indicator -->
        <div class="wiz-steps">
          @for (s of steps; track s.id; let i = $index) {
            @if (i > 0) {
              <span class="wiz-bar" [class.wiz-bar--done]="i <= step()"></span>
            }
            <button type="button" class="wiz-step"
              [attr.data-active]="step() === i"
              [attr.data-done]="s.valid() && step() > i"
              (click)="step.set(i)">
              <span class="wiz-step__circle">
                @if (s.valid() && step() > i) {
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                } @else {
                  <span class="mono" style="font-size:11px;font-weight:600">{{ i + 1 }}</span>
                }
              </span>
              <div style="text-align:left">
                <div class="eyebrow">Paso {{ i + 1 }}</div>
                <div style="font-size:13px;font-weight:500;color:var(--text-primary)">{{ s.label }}</div>
              </div>
            </button>
          }
        </div>

        <!-- Body -->
        <div class="qc-body" style="max-height:58vh;min-height:360px;overflow-y:auto;padding:16px 20px">

          <!-- ═══ STEP 1: UBICACIÓN ═══ -->
          @if (step() === 0) {
            <div style="display:flex;flex-direction:column;gap:14px">
              <div class="qc-field">
                <label class="eyebrow">Institución / Área protegida</label>
                <div class="ac-wrap">
                  <div class="ac-input-row">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"><circle cx="6" cy="6" r="4"/><path d="M9.5 9.5l3 3"/></svg>
                    <input class="ac-input" autofocus placeholder="Escribe el nombre, zona o tipo de institución…"
                      [value]="institution() ? institution()!.name : form().institutionQuery"
                      (input)="patchForm({ institutionQuery: $any($event.target).value, institutionId: null })" />
                    @if (institution()) {
                      <button type="button" class="ac-clear" (click)="patchForm({ institutionId: null, institutionQuery: '' })">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>
                      </button>
                    }
                  </div>
                  @if (!institution()) {
                    <div class="ac-list">
                      @if (institutionResults().length === 0) {
                        <div class="ac-empty">Sin resultados</div>
                      }
                      @for (r of institutionResults(); track r.id) {
                        <button type="button" class="ac-row" (click)="patchForm({ institutionId: r.id, institutionQuery: '' })">
                          <div class="ac-row__icon">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                          </div>
                          <div style="flex:1;text-align:left;min-width:0">
                            <div style="font-size:13px;font-weight:500;color:var(--text-primary)">{{ r.name }}</div>
                            <div class="mono micro" style="color:var(--text-muted)">{{ r.type }} · {{ r.area }} · {{ r.address }}</div>
                          </div>
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>

              @if (institution()) {
                <div class="inst-card">
                  <div class="inst-card__icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:14px;font-weight:600">{{ institution()!.name }}</div>
                    <div class="mono micro" style="color:var(--text-muted);margin-top:2px">{{ institution()!.type.toUpperCase() }} · {{ institution()!.area }}</div>
                    <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;display:flex;align-items:center;gap:5px">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                      {{ institution()!.address }}
                    </div>
                  </div>
                  <emx-status-badge variant="stable">CONVENIO ACTIVO</emx-status-badge>
                </div>
              }

              <div class="qc-field">
                <label class="eyebrow">Lugar específico dentro de la institución</label>
                <input class="qc-input" placeholder="Ej. Piso 7 · Sector administrativo · Aula 304 · Estacionamiento B…"
                  [value]="form().specificLocation"
                  (input)="patchForm({ specificLocation: $any($event.target).value })" />
                <div class="mono micro" style="color:var(--text-muted);margin-top:4px">
                  Opcional · ayuda a la tripulación a ubicar al paciente más rápido.
                </div>
              </div>
            </div>
          }

          <!-- ═══ STEP 2: PACIENTE ═══ -->
          @if (step() === 1) {
            <div style="display:flex;flex-direction:column;gap:14px">
              <div class="qc-field">
                <label class="eyebrow">Tipo de paciente</label>
                <div class="patient-tabs">
                  <button type="button" class="patient-tab" [attr.data-active]="form().patientType === 'member'" (click)="patchForm({ patientType: 'member' })">
                    <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="9" cy="6" r="3"/><path d="M3 15c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg>
                    <div style="text-align:left">
                      <div style="font-size:13px;font-weight:600">Miembro registrado</div>
                      <div class="eyebrow" style="margin-top:2px">Empleado / alumno / personal</div>
                    </div>
                  </button>
                  <button type="button" class="patient-tab" [attr.data-active]="form().patientType === 'transient'" (click)="patchForm({ patientType: 'transient' })">
                    <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="5" r="3"/><path d="M1 15c0-3.31 2.69-5 6-5"/><circle cx="13" cy="10" r="2.5"/><path d="M10.5 14c0-1.93 1.12-3 3.5-3s3.5 1.07 3.5 3"/></svg>
                    <div style="text-align:left">
                      <div style="font-size:13px;font-weight:600">Persona transitoria</div>
                      <div class="eyebrow" style="margin-top:2px">Visitante / cliente / externo</div>
                    </div>
                  </button>
                </div>
              </div>

              @if (form().patientType === 'member') {
                <div class="qc-field">
                  <label class="eyebrow">Seleccionar miembro @if (institution()) { de {{ institution()!.name }} }</label>
                  <div class="ac-wrap">
                    <div class="ac-input-row">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"><circle cx="6" cy="6" r="4"/><path d="M9.5 9.5l3 3"/></svg>
                      <input class="ac-input" placeholder="Buscar por nombre, rol o identificación…"
                        [value]="member() ? member()!.name : form().memberQuery"
                        (input)="patchForm({ memberQuery: $any($event.target).value, memberId: null })" />
                      @if (member()) {
                        <button type="button" class="ac-clear" (click)="patchForm({ memberId: null, memberQuery: '' })">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>
                        </button>
                      }
                    </div>
                    @if (!member()) {
                      <div class="ac-list">
                        @if (memberResults().length === 0) {
                          <div class="ac-empty">Sin resultados. Cambiá a "Persona transitoria" si no está registrado.</div>
                        }
                        @for (r of memberResults(); track r.id) {
                          <button type="button" class="ac-row" (click)="patchForm({ memberId: r.id, memberQuery: '' })">
                            <div class="avatar avatar--sm">{{ avatarOf(r.name) }}</div>
                            <div style="flex:1;text-align:left;min-width:0">
                              <div style="font-size:13px;font-weight:500;color:var(--text-primary)">{{ r.name }}</div>
                              <div class="mono micro" style="color:var(--text-muted)">{{ r.role }} · {{ r.doc }}</div>
                            </div>
                          </button>
                        }
                      </div>
                    }
                  </div>

                  @if (member()) {
                    <div class="inst-card" style="margin-top:10px">
                      <div class="avatar avatar--lg">{{ avatarOf(member()!.name) }}</div>
                      <div style="flex:1;min-width:0">
                        <div style="font-size:14px;font-weight:600">{{ member()!.name }}</div>
                        <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">{{ member()!.role }}</div>
                        <div class="mono micro" style="color:var(--text-muted);margin-top:2px">{{ member()!.doc }}</div>
                      </div>
                      <emx-status-badge variant="info">EXPEDIENTE</emx-status-badge>
                    </div>
                  }
                </div>
              }

              @if (form().patientType === 'transient') {
                <div style="display:flex;flex-direction:column;gap:10px">
                  <div class="qc-row">
                    <div class="qc-field" style="flex:1">
                      <label class="eyebrow">Nombre</label>
                      <input class="qc-input" placeholder="Ej. Juan"
                        [value]="form().transient.firstName"
                        (input)="patchTransient({ firstName: $any($event.target).value })" />
                    </div>
                    <div class="qc-field" style="flex:1">
                      <label class="eyebrow">Apellido(s)</label>
                      <input class="qc-input" placeholder="Ej. Pérez García"
                        [value]="form().transient.lastName"
                        (input)="patchTransient({ lastName: $any($event.target).value })" />
                    </div>
                  </div>
                  <div class="qc-row">
                    <div class="qc-field" style="flex:2">
                      <label class="eyebrow">DNI / Identificación</label>
                      <input class="qc-input" placeholder="Ej. 28.554.789"
                        [value]="form().transient.dni"
                        (input)="patchTransient({ dni: $any($event.target).value })" />
                    </div>
                    <div class="qc-field" style="flex:1">
                      <label class="eyebrow">Edad estimada</label>
                      <input class="qc-input" type="number" min="0" max="120" placeholder="Ej. 58"
                        [value]="form().transient.age"
                        (input)="patchTransient({ age: $any($event.target).value })" />
                    </div>
                  </div>
                  <div class="alert-block">
                    <div class="eyebrow" style="color:var(--accent-amber)">⚠ PACIENTE NO REGISTRADO</div>
                    <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;line-height:1.5">
                      Sin expediente clínico previo. La tripulación deberá registrar antecedentes, alergias y consentimiento en sitio.
                    </div>
                  </div>
                </div>
              }
            </div>
          }

          <!-- ═══ STEP 3: TRIAJE ═══ -->
          @if (step() === 2) {
            <div style="display:flex;flex-direction:column;gap:14px">
              <div class="qc-field">
                <label class="eyebrow">Nivel de urgencia · Triaje</label>
                <div class="prio-grid">
                  @for (p of prioLevels; track p.v) {
                    <button type="button" class="prio-card"
                      [attr.data-active]="form().prio === p.v"
                      [style.border-color]="form().prio === p.v ? p.color : 'var(--border-glass)'"
                      [style.background]="form().prio === p.v ? p.color + '1e' : 'transparent'"
                      (click)="patchForm({ prio: p.v })">
                      <span class="prio-card__dot" [style.background]="p.color" [style.box-shadow]="'0 0 14px ' + p.color"></span>
                      <div style="text-align:left;flex:1">
                        <div style="font-size:15px;font-weight:600" [style.color]="form().prio === p.v ? p.color : 'var(--text-primary)'">{{ p.label }}</div>
                        <div class="eyebrow" style="margin-top:2px">{{ p.sub }}</div>
                      </div>
                      @if (form().prio === p.v) {
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" [attr.stroke]="p.color" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      }
                    </button>
                  }
                </div>
              </div>

              <div class="qc-field">
                <label class="eyebrow">Síntomas / Motivo del llamado</label>
                <textarea class="qc-input" style="min-height:96px;padding:10px 12px;resize:vertical;font-family:var(--font-sans)"
                  placeholder="Describe lo que reporta el solicitante con la mayor precisión posible…"
                  [value]="form().symptoms"
                  (input)="patchForm({ symptoms: $any($event.target).value })"></textarea>
                <div class="mono micro" style="color:var(--text-muted);margin-top:4px;display:flex;justify-content:space-between">
                  <span>Mínimo 5 caracteres</span>
                  <span>{{ form().symptoms.length }} caracteres</span>
                </div>
              </div>

              <div class="qc-field">
                <label class="eyebrow">Canal de entrada</label>
                <select class="qc-input" [value]="form().channel" (change)="patchForm({ channel: $any($event.target).value })">
                  @for (c of channels; track c.v) {
                    <option [value]="c.v">{{ c.icon }} · {{ c.label }}</option>
                  }
                </select>
              </div>

              <!-- Summary -->
              <div class="wiz-summary">
                <div class="eyebrow" style="margin-bottom:8px">Resumen del registro</div>
                <div class="wiz-summary__grid">
                  <div>
                    <div class="eyebrow">Institución</div>
                    <div class="wiz-v">{{ institution()?.name ?? '—' }}</div>
                  </div>
                  <div>
                    <div class="eyebrow">Lugar específico</div>
                    <div class="wiz-v">{{ form().specificLocation || institution()?.area || '—' }}</div>
                  </div>
                  <div>
                    <div class="eyebrow">Paciente</div>
                    <div class="wiz-v">
                      {{ form().patientType === 'member'
                        ? (member()?.name ?? '—')
                        : (form().transient.firstName + ' ' + form().transient.lastName) || '—' }}
                    </div>
                  </div>
                  <div>
                    <div class="eyebrow">Triaje</div>
                    <div class="wiz-v mono" [style.color]="prioColor(form().prio)">
                      CÓDIGO {{ prioLabel(form().prio).toUpperCase() }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="qc-foot">
          <div class="qc-hint">
            <span class="kbd">Esc</span> cerrar &nbsp;·&nbsp; Paso {{ step() + 1 }} de {{ steps.length }}
          </div>
          <div style="display:flex;gap:8px">
            @if (step() > 0) {
              <button class="btn btn--ghost" (click)="step.set(step() - 1)">‹ Anterior</button>
            }
            <button class="btn btn--ghost" (click)="closed.emit()">Cancelar</button>
            @if (step() < steps.length - 1) {
              <button class="btn btn--primary"
                [disabled]="!steps[step()].valid()"
                [style.opacity]="steps[step()].valid() ? '1' : '0.5'"
                (click)="step.set(step() + 1)">
                Siguiente ›
              </button>
            } @else {
              <button class="btn btn--danger"
                [disabled]="!allValid()"
                [style.opacity]="allValid() ? '1' : '0.5'"
                (click)="submit()">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Registrar y despachar
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Overlay + Modal ── */
    .qc-overlay {
      position: fixed; inset: 0; z-index: 300;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(3px);
      display: flex; align-items: center; justify-content: center;
    }
    .qc-modal {
      width: 580px;
      max-width: 96vw;
      max-height: 92vh;
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
    .qc-foot {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 20px;
      border-top: 1px solid var(--border-hairline);
      flex-shrink: 0;
    }
    .qc-hint { font-size: 11.5px; color: var(--text-muted); }
    .qc-row { display: flex; gap: 12px; }
    .qc-field { display: flex; flex-direction: column; gap: 5px; }
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

    /* ── Wizard step bar ── */
    .wiz-steps {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 16px 20px 0;
      flex-shrink: 0;
    }
    .wiz-bar {
      flex: 1;
      height: 2px;
      background: var(--border-glass);
      border-radius: 1px;
      transition: background 0.25s;
    }
    .wiz-bar--done { background: var(--accent-blue); }
    .wiz-step {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 10px;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      transition: all 0.15s;
      color: var(--text-muted);
      white-space: nowrap;
    }
    .wiz-step:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); }
    .wiz-step[data-active="true"] {
      background: rgba(59,130,246,0.1);
      border-color: rgba(59,130,246,0.3);
      color: var(--accent-blue);
    }
    .wiz-step[data-done="true"] {
      color: var(--accent-emerald);
    }
    .wiz-step__circle {
      width: 26px; height: 26px;
      border-radius: 50%;
      border: 1.5px solid currentColor;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    /* ── Autocomplete ── */
    .ac-wrap {
      border: 1px solid var(--border-glass);
      border-radius: var(--r-btn);
      background: rgba(2,6,23,0.5);
      overflow: hidden;
    }
    .ac-input-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 10px;
      height: 38px;
    }
    .ac-input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 13px;
    }
    .ac-input::placeholder { color: var(--text-dim); }
    .ac-clear {
      width: 20px; height: 20px;
      border-radius: 4px;
      border: none;
      background: rgba(255,255,255,0.08);
      color: var(--text-muted);
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .ac-list {
      border-top: 1px solid var(--border-hairline);
      max-height: 200px;
      overflow-y: auto;
    }
    .ac-row {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 9px 12px;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--border-hairline);
      cursor: pointer;
      transition: background 0.1s;
    }
    .ac-row:last-child { border-bottom: none; }
    .ac-row:hover { background: rgba(255,255,255,0.04); }
    .ac-row__icon {
      width: 28px; height: 28px;
      border-radius: 8px;
      background: rgba(59,130,246,0.1);
      color: var(--accent-blue);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .ac-empty {
      padding: 14px 12px;
      font-size: 12px;
      color: var(--text-muted);
      text-align: center;
    }

    /* ── Institution card ── */
    .inst-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 10px;
      background: rgba(16,185,129,0.06);
      border: 1px solid rgba(16,185,129,0.2);
    }
    .inst-card__icon {
      width: 36px; height: 36px;
      border-radius: 10px;
      background: rgba(59,130,246,0.12);
      color: var(--accent-blue);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }

    /* ── Patient type tabs ── */
    .patient-tabs {
      display: flex;
      gap: 8px;
    }
    .patient-tab {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border-radius: 10px;
      border: 1px solid var(--border-glass);
      background: rgba(255,255,255,0.03);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
      text-align: left;
    }
    .patient-tab:hover { background: rgba(255,255,255,0.06); color: var(--text-primary); }
    .patient-tab[data-active="true"] {
      background: rgba(59,130,246,0.1);
      border-color: rgba(59,130,246,0.35);
      color: var(--accent-blue);
    }

    /* ── Alert block ── */
    .alert-block {
      padding: 12px 14px;
      border-radius: 10px;
      background: rgba(245,158,11,0.08);
      border: 1px solid rgba(245,158,11,0.3);
    }

    /* ── Priority grid ── */
    .prio-grid {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .prio-card {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px 16px;
      border-radius: 10px;
      border: 1px solid var(--border-glass);
      background: transparent;
      cursor: pointer;
      transition: all 0.15s;
      width: 100%;
    }
    .prio-card:hover { background: rgba(255,255,255,0.04); }
    .prio-card[data-active="true"] { box-shadow: 0 0 0 1px currentColor; }
    .prio-card__dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* ── Summary ── */
    .wiz-summary {
      padding: 14px 16px;
      border-radius: 10px;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--border-glass);
    }
    .wiz-summary__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 20px;
    }
    .wiz-v {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
      margin-top: 2px;
    }

    /* ── btn--danger ── */
    .btn--danger {
      background: linear-gradient(135deg, #DC2626, #B91C1C);
      color: white;
      border-color: transparent;
      box-shadow: 0 0 14px rgba(239,68,68,0.25);
    }
    .btn--danger:hover:not(:disabled) {
      background: linear-gradient(135deg, #EF4444, #DC2626);
    }
  `],
})
export class InstitutionalModalComponent {
  readonly closed = output<void>();
  readonly submitted = output<InstitutionalEmergencyPayload>();

  // ── Constants exposed to template ──
  readonly prioLevels = PRIO_LEVELS;
  readonly channels = CHANNELS;
  readonly avatarOf = avatarOf;

  // ── State ──
  readonly step = signal(0);
  readonly form = signal<IEForm>(emptyForm());

  // ── Derived ──
  readonly institution = computed(() =>
    INSTITUTIONS.find(i => i.id === this.form().institutionId) ?? null
  );

  readonly member = computed(() =>
    MEMBERS.find(m => m.id === this.form().memberId) ?? null
  );

  readonly institutionResults = computed(() => {
    const q = this.form().institutionQuery.toLowerCase();
    if (!q) return INSTITUTIONS.slice(0, 6);
    return INSTITUTIONS.filter(i =>
      i.name.toLowerCase().includes(q) ||
      i.area.toLowerCase().includes(q) ||
      i.type.toLowerCase().includes(q)
    ).slice(0, 8);
  });

  readonly memberResults = computed(() => {
    const q = this.form().memberQuery.toLowerCase();
    const institutionId = this.form().institutionId;
    const scoped = institutionId ? MEMBERS.filter(m => m.institution === institutionId) : MEMBERS;
    if (!q) return scoped.slice(0, 6);
    return scoped.filter(m =>
      m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q)
    ).slice(0, 8);
  });

  readonly step1Valid = computed(() => !!this.form().institutionId);
  readonly step2Valid = computed(() => {
    const f = this.form();
    if (f.patientType === 'member') return !!f.memberId;
    return f.transient.firstName.trim().length > 0 &&
           f.transient.lastName.trim().length > 0 &&
           f.transient.dni.trim().length > 0;
  });
  readonly step3Valid = computed(() =>
    !!this.form().prio && this.form().symptoms.trim().length > 4
  );
  readonly allValid = computed(() =>
    this.step1Valid() && this.step2Valid() && this.step3Valid()
  );

  readonly steps = [
    { id: 0, label: 'Ubicación', valid: this.step1Valid },
    { id: 1, label: 'Paciente',  valid: this.step2Valid },
    { id: 2, label: 'Triaje',    valid: this.step3Valid },
  ];

  // ── Helpers ──
  prioColor(v: string): string {
    return PRIO_LEVELS.find(p => p.v === v)?.color ?? 'var(--text-primary)';
  }
  prioLabel(v: string): string {
    return PRIO_LEVELS.find(p => p.v === v)?.label ?? v;
  }

  patchForm(patch: Partial<IEForm>): void {
    this.form.update(f => ({ ...f, ...patch }));
  }

  patchTransient(patch: Partial<TransientForm>): void {
    this.form.update(f => ({ ...f, transient: { ...f.transient, ...patch } }));
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    this.closed.emit();
  }

  submit(): void {
    if (!this.allValid()) return;
    const f = this.form();
    const inst = this.institution();
    const mem = this.member();
    const sla = f.prio === 'red' ? 480 : f.prio === 'amber' ? 900 : f.prio === 'green' ? 1800 : 3600;
    const triage = f.prio === 'red' ? 'CÓDIGO ROJO' : f.prio === 'amber' ? 'CÓDIGO AMARILLO' : f.prio === 'green' ? 'CÓDIGO VERDE' : 'CÓDIGO AZUL';
    const patientLabel = f.patientType === 'member'
      ? (mem?.name ?? '—')
      : `${f.transient.firstName} ${f.transient.lastName} · ${f.transient.age || '—'}a`;

    this.submitted.emit({
      institutional: true,
      institution: inst?.name,
      institutionType: inst?.type,
      addr: `${inst?.address} · ${f.specificLocation || inst?.area}`,
      sector: inst?.area,
      prio: f.prio,
      triage,
      slaSec: sla,
      patient: patientLabel,
      patientType: f.patientType,
      memberId: f.memberId,
      transientDetails: f.patientType === 'transient' ? { ...f.transient } : null,
      symptoms: f.symptoms,
      channel: f.channel,
    });
    this.closed.emit();
  }
}
