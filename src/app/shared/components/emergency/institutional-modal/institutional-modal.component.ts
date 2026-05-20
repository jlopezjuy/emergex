import {
  Component, OnInit, OnDestroy, output, signal, computed, HostListener, inject, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UpperCasePipe } from '@angular/common';
import { StatusBadgeComponent } from '../../status-badge/status-badge.component';
import { InstitutionsApiService } from '../../../../data-access/api/institutions.api';
import { MiembrosInstitucionApiService, MiembroInstitucionDTO } from '../../../../data-access/api/miembros-institucion.api';
import { EmergencyApiService } from '../../../../data-access/api/emergency.api';
import { InstitutionDTO } from '../../../../data-access/dto/institution.dto';
import { CrearTicketRequest, TicketAsistenciaDTO } from '../../../../data-access/dto/ticket.dto';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

// ─── Enum maps ────────────────────────────────────────────────────────────────

type NivelUrgencia = 'ROJO' | 'AMARILLO' | 'VERDE' | 'AZUL';
type CanalAtencion = 'PRESENCIAL' | 'TELEFONICA' | 'VIDEOLLAMADA';
type TipoTraslado  = 'URBANO' | 'CLINICA' | 'INTERURBANO' | 'INTRANOSOCOMIAL' | 'ALTA_MEDICA';

const PRIO_MAP: Record<string, NivelUrgencia> = {
  red: 'ROJO', amber: 'AMARILLO', green: 'VERDE', blue: 'AZUL',
};

const CANAL_MAP: Record<string, CanalAtencion> = {
  phone: 'TELEFONICA', app: 'TELEFONICA', radio: 'TELEFONICA',
  sms:   'TELEFONICA', walk: 'PRESENCIAL', panic: 'PRESENCIAL',
};

// ─── UI types ─────────────────────────────────────────────────────────────────

interface PrioLevel  { v: string; label: string; sub: string; color: string; }
interface Channel    { v: string; label: string; icon: string; }
interface TrasladoOption { v: TipoTraslado; label: string; }

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
  patientType: 'member' | 'transient' | 'unknown';
  memberId: number | null;
  memberQuery: string;
  transient: TransientForm;
  prio: string;
  symptoms: string;
  channel: string;
  requiereTraslado: boolean;
  tipoTraslado: TipoTraslado | '';
}

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

const TRASLADO_OPTIONS: TrasladoOption[] = [
  { v: 'URBANO',         label: 'Urbano (misma ciudad)'     },
  { v: 'INTERURBANO',    label: 'Interurbano'               },
  { v: 'CLINICA',        label: 'Clínica / Sanatorio'       },
  { v: 'INTRANOSOCOMIAL',label: 'Intranosocomial'           },
  { v: 'ALTA_MEDICA',    label: 'Alta médica'               },
];

function emptyForm(): IEForm {
  return {
    institutionId: null, institutionQuery: '', specificLocation: '',
    patientType: 'member', memberId: null, memberQuery: '',
    transient: { firstName: '', lastName: '', dni: '', age: '' },
    prio: 'red', symptoms: '', channel: 'phone',
    requiereTraslado: false, tipoTraslado: '',
  };
}

function avatarOf(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
}

function parseApiError(err: any): string {
  return err?.error?.detail
    ?? err?.error?.title
    ?? err?.error?.message
    ?? 'Error al registrar el ticket. Verificá los datos e intentá nuevamente.';
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'emx-institutional-modal',
  standalone: true,
  imports: [FormsModule, UpperCasePipe, StatusBadgeComponent],
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
          <button class="qc-close-btn" (click)="closed.emit()" [disabled]="isSubmitting()">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
          </button>
        </div>

        <!-- Wizard step indicator -->
        <div class="wiz-steps">
          @for (s of steps; track s.id; let i = $index) {
            @if (i > 0) { <span class="wiz-bar" [class.wiz-bar--done]="i <= step()"></span> }
            <button type="button" class="wiz-step"
              [attr.data-active]="step() === i"
              [attr.data-done]="s.valid() && step() > i"
              [disabled]="isSubmitting()"
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
                    <input class="ac-input" autofocus placeholder="Escribe el nombre, tipo o dirección…"
                      [value]="institution() ? institution()!.name : form().institutionQuery"
                      (input)="onInstitutionInput($any($event.target).value)" />
                    @if (isLoadingInstitutions()) { <span class="ac-spinner"></span> }
                    @if (institution()) {
                      <button type="button" class="ac-clear" (click)="clearInstitution()">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>
                      </button>
                    }
                  </div>
                  @if (!institution()) {
                    <div class="ac-list">
                      @if (institutionResults().length === 0 && !isLoadingInstitutions()) {
                        <div class="ac-empty">
                          {{ form().institutionQuery.length < 2 ? 'Escribí al menos 2 caracteres…' : 'Sin resultados' }}
                        </div>
                      }
                      @for (r of institutionResults(); track r.id) {
                        <button type="button" class="ac-row" (click)="selectInstitution(r)">
                          <div class="ac-row__icon">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                          </div>
                          <div style="flex:1;text-align:left;min-width:0">
                            <div style="font-size:13px;font-weight:500;color:var(--text-primary)">{{ r.name }}</div>
                            <div class="mono micro" style="color:var(--text-muted)">{{ r.type | uppercase }} · {{ r.address ?? 'Sin dirección' }}</div>
                          </div>
                          @if (r.status === 'inactiva') {
                            <emx-status-badge variant="urgent">INACTIVA</emx-status-badge>
                          }
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
                    <div class="mono micro" style="color:var(--text-muted);margin-top:2px">{{ institution()!.type | uppercase }}</div>
                    @if (institution()!.address) {
                      <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;display:flex;align-items:center;gap:5px">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {{ institution()!.address }}
                      </div>
                    }
                  </div>
                  <emx-status-badge variant="stable">CONVENIO ACTIVO</emx-status-badge>
                </div>

                @if (!institution()!.address) {
                  <div class="alert-block">
                    <div class="eyebrow" style="color:var(--accent-amber)">⚠ SIN DIRECCIÓN REGISTRADA</div>
                    <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;line-height:1.5">
                      Esta institución no tiene dirección en el sistema. Completá el campo de abajo con la dirección completa para poder continuar.
                    </div>
                  </div>
                }
              }

              <div class="qc-field">
                <label class="eyebrow">
                  {{ !institution()?.address ? 'Dirección completa (obligatoria)' : 'Lugar específico dentro de la institución' }}
                </label>
                <input class="qc-input"
                  [placeholder]="!institution()?.address
                    ? 'Ej. Av. Bolivia 1685, Alto Padilla, Jujuy'
                    : 'Ej. Piso 7 · Sector administrativo · Aula 304 · Estacionamiento B…'"
                  [value]="form().specificLocation"
                  (input)="patchForm({ specificLocation: $any($event.target).value })" />
                @if (institution()?.address) {
                  <div class="mono micro" style="color:var(--text-muted);margin-top:4px">
                    Opcional · ayuda a la tripulación a ubicar al paciente más rápido.
                  </div>
                }
              </div>
            </div>
          }

          <!-- ═══ STEP 2: PACIENTE ═══ -->
          @if (step() === 1) {
            <div style="display:flex;flex-direction:column;gap:14px">
              <div class="qc-field">
                <label class="eyebrow">Tipo de paciente</label>
                <div class="patient-tabs">
                  <button type="button" class="patient-tab"
                    [attr.data-active]="form().patientType === 'member'"
                    (click)="patchForm({ patientType: 'member', memberId: null, memberQuery: '' })">
                    <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="9" cy="6" r="3"/><path d="M3 15c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg>
                    <div style="text-align:left">
                      <div style="font-size:13px;font-weight:600">Miembro registrado</div>
                      <div class="eyebrow" style="margin-top:2px">Empleado / alumno / personal</div>
                    </div>
                  </button>
                  <button type="button" class="patient-tab"
                    [attr.data-active]="form().patientType === 'transient'"
                    (click)="patchForm({ patientType: 'transient', memberId: null, memberQuery: '' })">
                    <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="5" r="3"/><path d="M1 15c0-3.31 2.69-5 6-5"/><circle cx="13" cy="10" r="2.5"/><path d="M10.5 14c0-1.93 1.12-3 3.5-3s3.5 1.07 3.5 3"/></svg>
                    <div style="text-align:left">
                      <div style="font-size:13px;font-weight:600">Persona transitoria</div>
                      <div class="eyebrow" style="margin-top:2px">Visitante / cliente / externo</div>
                    </div>
                  </button>
                  <button type="button" class="patient-tab"
                    [attr.data-active]="form().patientType === 'unknown'"
                    (click)="patchForm({ patientType: 'unknown', memberId: null, memberQuery: '' })">
                    <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="9" cy="7" r="3"/><path d="M9 10v2"/><circle cx="9" cy="14" r="0.5" fill="currentColor"/></svg>
                    <div style="text-align:left">
                      <div style="font-size:13px;font-weight:600">Identificar al llegar</div>
                      <div class="eyebrow" style="margin-top:2px">Desconocido · se registra en sitio</div>
                    </div>
                  </button>
                </div>
              </div>

              @if (form().patientType === 'member') {
                <div class="qc-field">
                  <label class="eyebrow">Seleccionar miembro@if (institution()) { de {{ institution()!.name }}}</label>
                  <div class="ac-wrap">
                    <div class="ac-input-row">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"><circle cx="6" cy="6" r="4"/><path d="M9.5 9.5l3 3"/></svg>
                      <input class="ac-input" placeholder="Buscar por nombre, rol o DNI…"
                        [value]="member() ? (member()!.nombre + ' ' + member()!.apellido) : form().memberQuery"
                        (input)="onMemberInput($any($event.target).value)" />
                      @if (isLoadingMembers()) { <span class="ac-spinner"></span> }
                      @if (member()) {
                        <button type="button" class="ac-clear" (click)="patchForm({ memberId: null, memberQuery: '' }); memberResults.set([])">
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="9" y2="9"/><line x1="9" y1="1" x2="1" y2="9"/></svg>
                        </button>
                      }
                    </div>
                    @if (!member()) {
                      <div class="ac-list">
                        @if (memberResults().length === 0 && !isLoadingMembers()) {
                          <div class="ac-empty">
                            @if (!institution()) { Primero seleccioná una institución en el paso anterior. }
                            @else if (form().memberQuery.length < 2) { Escribí al menos 2 caracteres para buscar… }
                            @else { Sin resultados. Cambiá a "Persona transitoria" si no está en el padrón. }
                          </div>
                        }
                        @for (r of memberResults(); track r.id) {
                          <button type="button" class="ac-row" (click)="patchForm({ memberId: r.id, memberQuery: '' })">
                            <div class="avatar avatar--sm">{{ avatarOf(r.nombre + ' ' + r.apellido) }}</div>
                            <div style="flex:1;text-align:left;min-width:0">
                              <div style="font-size:13px;font-weight:500;color:var(--text-primary)">{{ r.nombre }} {{ r.apellido }}</div>
                              <div class="mono micro" style="color:var(--text-muted)">{{ r.rol ?? '—' }}{{ r.dni ? ' · DNI ' + r.dni : '' }}</div>
                            </div>
                          </button>
                        }
                      </div>
                    }
                  </div>
                  @if (member()) {
                    <div class="inst-card" style="margin-top:10px">
                      <div class="avatar avatar--lg">{{ avatarOf(member()!.nombre + ' ' + member()!.apellido) }}</div>
                      <div style="flex:1;min-width:0">
                        <div style="font-size:14px;font-weight:600">{{ member()!.nombre }} {{ member()!.apellido }}</div>
                        @if (member()!.rol) { <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">{{ member()!.rol }}</div> }
                        @if (member()!.dni) { <div class="mono micro" style="color:var(--text-muted);margin-top:2px">DNI {{ member()!.dni }}</div> }
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

              @if (form().patientType === 'unknown') {
                <div class="alert-block" style="background:rgba(99,102,241,0.08);border-color:rgba(99,102,241,0.3)">
                  <div class="eyebrow" style="color:#6366f1">◌ IDENTIDAD DESCONOCIDA</div>
                  <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;line-height:1.5">
                    El ticket se despachará sin sujeto identificado. La tripulación completará el registro al llegar al sitio.
                    Requiere que la institución tenga un contrato de <strong>Área Protegida</strong> activo.
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
                <textarea class="qc-input" style="min-height:80px;padding:10px 12px;resize:vertical;font-family:var(--font-sans)"
                  placeholder="Describe lo que reporta el solicitante con la mayor precisión posible…"
                  [value]="form().symptoms"
                  (input)="patchForm({ symptoms: $any($event.target).value })"></textarea>
                <div class="mono micro" style="color:var(--text-muted);margin-top:4px;display:flex;justify-content:space-between">
                  <span>Mínimo 5 caracteres</span><span>{{ form().symptoms.length }} caracteres</span>
                </div>
              </div>

              <!-- Traslado preliminar -->
              <div class="traslado-block">
                <div class="traslado-toggle" (click)="toggleTraslado()">
                  <div class="toggle-track" [class.toggle-track--on]="form().requiereTraslado">
                    <div class="toggle-thumb"></div>
                  </div>
                  <div>
                    <div style="font-size:13px;font-weight:600;color:var(--text-primary)">Traslado probable</div>
                    <div class="eyebrow" style="margin-top:2px">La tripulación deberá prepararse para traslado</div>
                  </div>
                </div>
                @if (form().requiereTraslado) {
                  <div class="qc-field" style="margin-top:10px">
                    <label class="eyebrow">Tipo de traslado estimado</label>
                    <select class="qc-input" [value]="form().tipoTraslado"
                      (change)="patchForm({ tipoTraslado: $any($event.target).value })">
                      <option value="">Seleccioná un tipo…</option>
                      @for (t of trasladoOptions; track t.v) {
                        <option [value]="t.v">{{ t.label }}</option>
                      }
                    </select>
                  </div>
                }
              </div>

              <div class="qc-field">
                <label class="eyebrow">Canal de entrada</label>
                <select class="qc-input" [value]="form().channel" (change)="patchForm({ channel: $any($event.target).value })">
                  @for (c of channels; track c.v) {
                    <option [value]="c.v">{{ c.icon }} · {{ c.label }}</option>
                  }
                </select>
              </div>

              <!-- Error de API -->
              @if (submitError()) {
                <div class="alert-block" style="background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.3)">
                  <div class="eyebrow" style="color:var(--accent-red)">✕ ERROR AL REGISTRAR</div>
                  <div style="font-size:12px;color:var(--text-secondary);margin-top:4px;line-height:1.5">{{ submitError() }}</div>
                </div>
              }

              <!-- Resumen -->
              <div class="wiz-summary">
                <div class="eyebrow" style="margin-bottom:8px">Resumen del registro</div>
                <div class="wiz-summary__grid">
                  <div>
                    <div class="eyebrow">Institución</div>
                    <div class="wiz-v">{{ institution()?.name ?? '—' }}</div>
                  </div>
                  <div>
                    <div class="eyebrow">Lugar específico</div>
                    <div class="wiz-v">{{ form().specificLocation || '—' }}</div>
                  </div>
                  <div>
                    <div class="eyebrow">Paciente</div>
                    <div class="wiz-v">
                      @if (form().patientType === 'member') {
                        {{ member() ? (member()!.nombre + ' ' + member()!.apellido) : '—' }}
                      } @else if (form().patientType === 'transient') {
                        {{ (form().transient.firstName + ' ' + form().transient.lastName).trim() || '—' }}
                      } @else {
                        <span style="color:var(--text-muted);font-style:italic">Identificar al llegar</span>
                      }
                    </div>
                  </div>
                  <div>
                    <div class="eyebrow">Triaje</div>
                    <div class="wiz-v mono" [style.color]="prioColor(form().prio)">
                      CÓDIGO {{ prioLabel(form().prio).toUpperCase() }}
                    </div>
                  </div>
                  @if (form().requiereTraslado) {
                    <div style="grid-column:span 2">
                      <div class="eyebrow">Traslado probable</div>
                      <div class="wiz-v" style="color:var(--accent-amber)">
                        {{ form().tipoTraslado ? trasladoLabel(form().tipoTraslado) : 'Tipo por definir' }}
                      </div>
                    </div>
                  }
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
              <button class="btn btn--ghost" [disabled]="isSubmitting()" (click)="step.set(step() - 1)">‹ Anterior</button>
            }
            <button class="btn btn--ghost" [disabled]="isSubmitting()" (click)="closed.emit()">Cancelar</button>
            @if (step() < steps.length - 1) {
              <button class="btn btn--primary"
                [disabled]="!steps[step()].valid()"
                [style.opacity]="steps[step()].valid() ? '1' : '0.5'"
                (click)="step.set(step() + 1)">
                Siguiente ›
              </button>
            } @else {
              <button class="btn btn--danger"
                [disabled]="!allValid() || isSubmitting()"
                [style.opacity]="allValid() && !isSubmitting() ? '1' : '0.5'"
                (click)="submit()">
                @if (isSubmitting()) {
                  <span class="ac-spinner ac-spinner--inline"></span> Registrando…
                } @else {
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  Registrar y despachar
                }
              </button>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .qc-overlay {
      position: fixed; inset: 0; z-index: 300;
      background: rgba(15,23,42,0.54);
      backdrop-filter: blur(8px) saturate(120%);
      display: flex; align-items: center; justify-content: center;
    }
    .qc-modal {
      width: 580px; max-width: 96vw; max-height: 92vh;
      border-radius: var(--r-card);
      display: flex; flex-direction: column; overflow: hidden;
      background:
        radial-gradient(520px 320px at 20% 0%, rgba(59,130,246,0.08), transparent 65%),
        rgba(255,255,255,0.98);
      border: 1px solid rgba(148,163,184,0.35);
      box-shadow: 0 24px 70px rgba(15,23,42,0.24);
      color: #0f172a;
    }
    .qc-modal--wide { width: 700px; }
    .qc-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 20px 20px 0; flex-shrink: 0;
    }
    .qc-foot {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px;
      border-top: 1px solid var(--border-hairline); flex-shrink: 0;
    }
    .qc-hint { font-size: 11.5px; color: var(--text-muted); }
    .qc-row { display: flex; gap: 12px; }
    .qc-field { display: flex; flex-direction: column; gap: 5px; }
    .qc-close-btn {
      width: 32px; height: 32px; border-radius: 8px;
      border: 1px solid rgba(148,163,184,0.35);
      background: rgba(255,255,255,0.9); color: #64748b;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; transition: all 0.15s;
    }
    .qc-close-btn:hover:not(:disabled) { background: #fff; color: #0f172a; }
    .qc-close-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ── Wizard ── */
    .wiz-steps {
      display: flex; align-items: center; gap: 4px;
      padding: 16px 20px 0; flex-shrink: 0;
    }
    .wiz-bar { flex: 1; height: 2px; background: var(--border-glass); border-radius: 1px; transition: background 0.25s; }
    .wiz-bar--done { background: var(--accent-blue); }
    .wiz-step {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; border-radius: 10px;
      border: 1px solid transparent; background: transparent;
      cursor: pointer; transition: all 0.15s; color: var(--text-muted); white-space: nowrap;
    }
    .wiz-step:hover:not(:disabled) { background: rgba(59,130,246,0.08); color: var(--text-primary); }
    .wiz-step[data-active="true"] { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.3); color: var(--accent-blue); }
    .wiz-step[data-done="true"]   { color: var(--accent-emerald); }
    .wiz-step:disabled { opacity: 0.5; cursor: not-allowed; }
    .wiz-step__circle {
      width: 26px; height: 26px; border-radius: 50%;
      border: 1.5px solid currentColor;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }

    /* ── Autocomplete ── */
    .ac-wrap {
      border: 1px solid rgba(148,163,184,0.32); border-radius: var(--r-btn);
      background: rgba(248,250,252,0.92); overflow: hidden;
      box-shadow: inset 0 1px 2px rgba(15,23,42,0.03);
    }
    .ac-input-row { display: flex; align-items: center; gap: 8px; padding: 0 10px; height: 38px; }
    .ac-input {
      flex: 1; background: transparent; border: none; outline: none;
      color: var(--text-primary); font-family: var(--font-sans); font-size: 13px;
    }
    .ac-input::placeholder { color: var(--text-dim); }
    .ac-clear {
      width: 20px; height: 20px; border-radius: 4px; border: none;
      background: rgba(15,23,42,0.06); color: var(--text-muted);
      cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .ac-list { border-top: 1px solid var(--border-hairline); max-height: 200px; overflow-y: auto; }
    .ac-row {
      display: flex; align-items: center; gap: 10px;
      width: 100%; padding: 9px 12px;
      background: transparent; border: none; border-bottom: 1px solid var(--border-hairline);
      cursor: pointer; transition: background 0.1s;
    }
    .ac-row:last-child { border-bottom: none; }
    .ac-row:hover { background: rgba(59,130,246,0.08); }
    .ac-row__icon {
      width: 28px; height: 28px; border-radius: 8px;
      background: rgba(59,130,246,0.1); color: var(--accent-blue);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .ac-empty { padding: 14px 12px; font-size: 12px; color: var(--text-muted); text-align: center; }
    .ac-spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(59,130,246,0.25); border-top-color: var(--accent-blue);
      border-radius: 50%; animation: spin 0.6s linear infinite; flex-shrink: 0;
    }
    .ac-spinner--inline {
      width: 13px; height: 13px;
      border-color: rgba(255,255,255,0.35); border-top-color: #fff;
      display: inline-block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Inst card ── */
    .inst-card {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 16px; border-radius: 10px;
      background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.2);
    }
    .inst-card__icon {
      width: 36px; height: 36px; border-radius: 10px;
      background: rgba(59,130,246,0.12); color: var(--accent-blue);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }

    /* ── Patient tabs ── */
    .patient-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
    .patient-tab {
      flex: 1; min-width: 140px;
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 10px;
      border: 1px solid var(--border-glass);
      background: rgba(248,250,252,0.78); color: var(--text-muted);
      cursor: pointer; transition: all 0.15s; text-align: left;
    }
    .patient-tab:hover { background: rgba(59,130,246,0.08); color: var(--text-primary); }
    .patient-tab[data-active="true"] { background: rgba(59,130,246,0.1); border-color: rgba(59,130,246,0.35); color: var(--accent-blue); }

    /* ── Alert block ── */
    .alert-block { padding: 12px 14px; border-radius: 10px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.3); }

    /* ── Priority grid ── */
    .prio-grid { display: flex; flex-direction: column; gap: 7px; }
    .prio-card {
      display: flex; align-items: center; gap: 14px;
      padding: 12px 16px; border-radius: 10px;
      border: 1px solid var(--border-glass); background: transparent;
      cursor: pointer; transition: all 0.15s; width: 100%;
    }
    .prio-card:hover { background: rgba(59,130,246,0.07); }
    .prio-card[data-active="true"] { box-shadow: 0 0 0 1px currentColor; }
    .prio-card__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

    /* ── Traslado ── */
    .traslado-block {
      padding: 12px 14px; border-radius: 10px;
      background: rgba(248,250,252,0.78); border: 1px solid var(--border-glass);
    }
    .traslado-toggle { display: flex; align-items: center; gap: 12px; cursor: pointer; }
    .toggle-track {
      width: 36px; height: 20px; border-radius: 10px;
      background: rgba(148,163,184,0.4); position: relative;
      transition: background 0.2s; flex-shrink: 0;
    }
    .toggle-track--on { background: var(--accent-blue); }
    .toggle-thumb {
      position: absolute; top: 2px; left: 2px;
      width: 16px; height: 16px; border-radius: 50%;
      background: #fff; transition: transform 0.2s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .toggle-track--on .toggle-thumb { transform: translateX(16px); }

    /* ── Summary ── */
    .wiz-summary { padding: 14px 16px; border-radius: 10px; background: rgba(248,250,252,0.78); border: 1px solid var(--border-glass); }
    .wiz-summary__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
    .wiz-v { font-size: 13px; font-weight: 500; color: var(--text-primary); margin-top: 2px; }

    /* ── btn--danger ── */
    .btn--danger {
      background: linear-gradient(135deg,#DC2626,#B91C1C); color: white;
      border-color: transparent; box-shadow: 0 0 14px rgba(239,68,68,0.25);
      display: flex; align-items: center; gap: 6px;
    }
    .btn--danger:hover:not(:disabled) { background: linear-gradient(135deg,#EF4444,#DC2626); }

    /* ── Dark theme ── */
    :host-context([data-theme="dark"]) .qc-overlay { background: rgba(0,0,0,0.62); }
    :host-context([data-theme="dark"]) .qc-modal {
      background: radial-gradient(560px 340px at 18% 0%, rgba(59,130,246,0.11), transparent 65%), rgba(30,41,59,0.96);
      border-color: rgba(148,163,184,0.28); box-shadow: 0 24px 80px rgba(0,0,0,0.52); color: var(--text-primary);
    }
    :host-context([data-theme="dark"]) .qc-close-btn { background: rgba(15,23,42,0.72); border-color: rgba(148,163,184,0.22); color: var(--text-muted); }
    :host-context([data-theme="dark"]) .qc-close-btn:hover:not(:disabled) { background: rgba(30,41,59,0.92); color: var(--text-primary); }
    :host-context([data-theme="dark"]) .ac-wrap,
    :host-context([data-theme="dark"]) .qc-input { background: rgba(15,23,42,0.72); border-color: rgba(148,163,184,0.18); }
    :host-context([data-theme="dark"]) .qc-input:focus { background: rgba(15,23,42,0.9); border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(59,130,246,0.18); }
    :host-context([data-theme="dark"]) .patient-tab,
    :host-context([data-theme="dark"]) .wiz-summary,
    :host-context([data-theme="dark"]) .traslado-block { background: rgba(15,23,42,0.42); }
    :host-context([data-theme="dark"]) .ac-row:hover,
    :host-context([data-theme="dark"]) .patient-tab:hover,
    :host-context([data-theme="dark"]) .prio-card:hover { background: rgba(59,130,246,0.10); }
  `],
})
export class InstitutionalModalComponent implements OnInit, OnDestroy {
    private destroyRef = inject(DestroyRef);
  readonly closed    = output<void>();
  readonly submitted = output<TicketAsistenciaDTO>();

  // ── Services ──
  private readonly instituciones = inject(InstitutionsApiService);
  private readonly miembros      = inject(MiembrosInstitucionApiService);
  private readonly emergencyApi  = inject(EmergencyApiService);

  // ── Constants ──
  readonly prioLevels      = PRIO_LEVELS;
  readonly channels        = CHANNELS;
  readonly trasladoOptions = TRASLADO_OPTIONS;
  readonly avatarOf        = avatarOf;

  // ── State ──
  readonly step = signal(0);
  readonly form = signal<IEForm>(emptyForm());

  // Institution
  private _allInstitutions: InstitutionDTO[] = [];
  readonly institutionResults    = signal<InstitutionDTO[]>([]);
  readonly isLoadingInstitutions = signal(false);

  // Member
  readonly memberResults   = signal<MiembroInstitucionDTO[]>([]);
  readonly isLoadingMembers = signal(false);

  // Submit
  readonly isSubmitting = signal(false);
  readonly submitError  = signal<string | null>(null);

  private _memberTimer?: ReturnType<typeof setTimeout>;

  // ── Derived ──
  readonly institution = computed(() =>
    this._allInstitutions.find(i => i.id === this.form().institutionId) ?? null
  );

  readonly member = computed(() =>
    this.memberResults().find(m => m.id === this.form().memberId) ?? null
  );

  // ── Lifecycle ──
  ngOnInit(): void {
    this.isLoadingInstitutions.set(true);
    this.instituciones.getAll().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: list => {
              this._allInstitutions = list.filter(i => i.status === 'activa');
              this.institutionResults.set(this._allInstitutions.slice(0, 8));
              this.isLoadingInstitutions.set(false);
            },
            error: () => this.isLoadingInstitutions.set(false),
          });
  }

  ngOnDestroy(): void {
    clearTimeout(this._memberTimer);
  }

  // ── Institution search ──
  onInstitutionInput(query: string): void {
    this.patchForm({ institutionId: null, institutionQuery: query });
    if (query.length < 2) {
      this.institutionResults.set(this._allInstitutions.slice(0, 8));
      return;
    }
    const q = query.toLowerCase();
    this.institutionResults.set(
      this._allInstitutions.filter(i =>
        i.name.toLowerCase().includes(q) ||
        (i.type ?? '').toLowerCase().includes(q) ||
        (i.address ?? '').toLowerCase().includes(q)
      ).slice(0, 8)
    );
  }

  selectInstitution(inst: InstitutionDTO): void {
    this.patchForm({ institutionId: inst.id, institutionQuery: '', memberId: null, memberQuery: '' });
    this.memberResults.set([]);
    this.submitError.set(null);
  }

  clearInstitution(): void {
    this.patchForm({ institutionId: null, institutionQuery: '', memberId: null, memberQuery: '' });
    this.institutionResults.set(this._allInstitutions.slice(0, 8));
    this.memberResults.set([]);
  }

  // ── Member search ──
  onMemberInput(query: string): void {
    this.patchForm({ memberId: null, memberQuery: query });
    clearTimeout(this._memberTimer);
    const inst = this.institution();
    if (!inst || query.length < 2) { this.memberResults.set([]); return; }
    this._memberTimer = setTimeout(() => {
      this.isLoadingMembers.set(true);
      this.miembros.search(query, Number(inst.id)).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
                next: list => { this.memberResults.set(list); this.isLoadingMembers.set(false); },
                error: ()   => { this.memberResults.set([]); this.isLoadingMembers.set(false); },
              });
    }, 300);
  }

  // ── Traslado toggle ──
  toggleTraslado(): void {
    const next = !this.form().requiereTraslado;
    this.patchForm({ requiereTraslado: next, tipoTraslado: next ? this.form().tipoTraslado : '' });
  }

  // ── Step validation ──
  readonly step1Valid = computed(() => {
    const f    = this.form();
    const inst = this._allInstitutions.find(i => i.id === f.institutionId);
    if (!inst) return false;
    // Si no tiene dirección, el operador DEBE completar el lugar específico como dirección
    if (!inst.address && !f.specificLocation.trim()) return false;
    return true;
  });

  readonly step2Valid = computed(() => {
    const f = this.form();
    if (f.patientType === 'member')    return !!f.memberId;
    if (f.patientType === 'transient') return (
      f.transient.firstName.trim().length > 0 &&
      f.transient.lastName.trim().length  > 0 &&
      f.transient.dni.trim().length       > 0
    );
    return true; // 'unknown'
  });

  readonly step3Valid = computed(() => {
    const f = this.form();
    if (!f.prio || f.symptoms.trim().length < 5) return false;
    if (f.requiereTraslado && !f.tipoTraslado) return false;
    return true;
  });

  readonly allValid = computed(() =>
    this.step1Valid() && this.step2Valid() && this.step3Valid()
  );

  readonly steps = [
    { id: 0, label: 'Ubicación', valid: this.step1Valid },
    { id: 1, label: 'Paciente',  valid: this.step2Valid },
    { id: 2, label: 'Triaje',    valid: this.step3Valid },
  ];

  // ── Helpers ──
  prioColor(v: string): string  { return PRIO_LEVELS.find(p => p.v === v)?.color ?? 'var(--text-primary)'; }
  prioLabel(v: string): string  { return PRIO_LEVELS.find(p => p.v === v)?.label ?? v; }
  trasladoLabel(v: string): string { return TRASLADO_OPTIONS.find(t => t.v === v)?.label ?? v; }

  patchForm(patch: Partial<IEForm>): void {
    this.form.update(f => ({ ...f, ...patch }));
  }

  patchTransient(patch: Partial<TransientForm>): void {
    this.form.update(f => ({ ...f, transient: { ...f.transient, ...patch } }));
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (!this.isSubmitting()) this.closed.emit();
  }

  // ── Submit ──
  submit(): void {
    if (!this.allValid() || this.isSubmitting()) return;

    const f    = this.form();
    const inst = this.institution();

    const req: CrearTicketRequest = {
      tipoAsistencia:      'EMERGENCIA_DOMICILIARIA',
      nivelUrgencia:       PRIO_MAP[f.prio],
      descripcionSintomas: f.symptoms,
      canal:               CANAL_MAP[f.channel],
      direccion:           inst?.address || f.specificLocation,
      notaDireccion:       inst?.address && f.specificLocation ? f.specificLocation : undefined,
      institucionId:       inst ? Number(inst.id) : undefined,
    };

    if (f.requiereTraslado && f.tipoTraslado) {
      req.tipoTraslado = f.tipoTraslado as TipoTraslado;
    }

    if (f.patientType === 'member' && f.memberId != null) {
      req.miembroInstitucionId = f.memberId;
    } else if (f.patientType === 'transient') {
      req.noAfiliado       = true;
      req.pacienteNombre   = f.transient.firstName;
      req.pacienteApellido = f.transient.lastName;
      req.pacienteDni      = f.transient.dni || undefined;
    }
    // 'unknown': sin sujeto → resolverParaAreaProtegidaAnonima en backend

    this.submitError.set(null);
    this.isSubmitting.set(true);

    this.emergencyApi.crear(req).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: ticket => {
              this.isSubmitting.set(false);
              this.submitted.emit(ticket);
              this.closed.emit();
            },
            error: err => {
              this.isSubmitting.set(false);
              this.submitError.set(parseApiError(err));
            },
          });
  }
}
