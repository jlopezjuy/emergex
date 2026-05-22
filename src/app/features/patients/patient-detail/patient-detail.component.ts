import { Component, signal, computed, HostListener, inject, OnInit, Pipe, PipeTransform, DestroyRef } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { PatientApiService } from '../../../data-access/api/patient.api';
import { PlansApiService } from '../../../data-access/api/plans.api';
import { FacturacionApiService, GenerarResponseDTO } from '../../../data-access/api/facturacion.api';
import { AuthService } from '../../../core/auth/auth.service';
import {
  PacienteDTO, FichaAfiliadoDTO, FacturaDTO,
  CreatePacienteRequest, CrearCoberturaRequest, RegistrarPagoRequest,
} from '../../../data-access/dto/patient.dto';
import { PlanDTO } from '../../../data-access/dto/plan.dto';
import { localDateYmd } from '../../../shared/utils/date-local.util';
import { DateUtils } from '../../../core/utils/date.utils';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'resumen' | 'facturas' | 'plan' | 'grupo';

interface NewDepForm {
  nombre: string; apellido: string; dni: string;
  birth: string; gender: 'M' | 'F' | 'X'; parentesco: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PARENTESCOS = ['Cónyuge', 'Hijo/a', 'Padre/Madre', 'Hermano/a', 'Otro'];

const METODOS_PAGO = [
  { value: 'EFECTIVO',        label: 'Efectivo' },
  { value: 'TRANSFERENCIA',   label: 'Transferencia bancaria' },
  { value: 'TARJETA_DEBITO',  label: 'Tarjeta débito' },
  { value: 'TARJETA_CREDITO', label: 'Tarjeta crédito' },
  { value: 'MERCADOPAGO',     label: 'MercadoPago' },
  { value: 'CHEQUE',          label: 'Cheque' },
  { value: 'OBRA_SOCIAL',     label: 'Obra social' },
  { value: 'OTRO',            label: 'Otro' },
];

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const TIER_COLORS: Record<string, string> = {
  premium: 'var(--accent-emerald)',
  medio:   'var(--accent-blue)',
  basico:  'var(--text-muted)',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 });
}

function fmtDate(s?: string): string {
  if (!s) return '—';
  const [y, m, d] = s.split('T')[0].split('-');
  return `${d} ${MESES[parseInt(m) - 1].slice(0, 3)} ${y}`;
}

function fmtPeriodo(desde?: string, hasta?: string): string {
  if (!desde) return '—';
  const d = DateUtils.fromISO(desde);
  const h = hasta ? DateUtils.fromISO(hasta) : null;
  if (d.month === 1 && d.day === 1 && h?.month === 12 && h?.day === 31) {
    return `Anual ${d.year}`;
  }
  return `${MESES[d.month - 1]} ${d.year}`;
}

function todayISO(): string {
  return localDateYmd();
}

function sexoFromGender(g: 'M' | 'F' | 'X'): 'MASCULINO' | 'FEMENINO' | 'OTRO' {
  return g === 'M' ? 'MASCULINO' : g === 'F' ? 'FEMENINO' : 'OTRO';
}

function parentescoToRol(p: string): 'CO_TITULAR' | 'DEPENDIENTE' {
  return p === 'Cónyuge' ? 'CO_TITULAR' : 'DEPENDIENTE';
}

function estadoFacturaColor(estado?: string): string {
  if (estado === 'PAGADA')  return 'var(--accent-emerald)';
  if (estado === 'VENCIDA') return 'var(--accent-red)';
  if (estado === 'ANULADA') return 'var(--text-dim)';
  return 'var(--accent-amber)';
}

function emptyDep(): NewDepForm {
  return { nombre: '', apellido: '', dni: '', birth: '', gender: 'M', parentesco: 'Hijo/a' };
}

@Pipe({ name: 'safeHtml', standalone: true })
export class SafeHtmlPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);
  transform(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-patient-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, SafeHtmlPipe],
  template: `
    <div class="screen">

      <!-- ── Back + Header ── -->
      <div class="pd-header glass-strong">
        <div class="pd-header__left">
          <a routerLink="/patients" class="btn btn--ghost btn--sm pd-back">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 2L3 6.5 8 11"/></svg>
            Afiliados
          </a>

          @if (loading()) {
            <div class="avatar avatar--lg" style="background:rgba(255,255,255,0.08)"></div>
            <div>
              <div style="height:18px;width:180px;border-radius:4px;background:rgba(255,255,255,0.06)"></div>
              <div style="height:12px;width:100px;border-radius:4px;background:rgba(255,255,255,0.04);margin-top:6px"></div>
            </div>
          } @else if (patient()) {
            <div class="avatar avatar--lg"
              [style.background]="'linear-gradient(135deg,' + planColor() + ',rgba(15,23,42,0.7))'">
              {{ initials(patient()!) }}
            </div>
            <div>
              <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
                <span style="font-size:20px;font-weight:600;letter-spacing:-0.01em">
                  {{ patient()!.nombre }} {{ patient()!.apellido }}
                </span>
                <span class="type-tag">
                  {{ ficha()?.numeroCuentaGrupo ? 'Titular' : 'Afiliado' }}
                </span>
                @if (patient()!.activo === false) {
                  <span class="type-tag" style="background:rgba(239,68,68,0.1);color:var(--accent-red)">INACTIVO</span>
                }
              </div>
              <div class="mono micro" style="color:var(--text-muted);margin-top:4px">
                DNI {{ patient()!.dni }}
                @if (patient()!.numeroAfiliado) { · Afiliado {{ patient()!.numeroAfiliado }} }
                @if (ficha()?.numeroCuentaGrupo) { · Grupo {{ ficha()!.numeroCuentaGrupo }} }
              </div>
            </div>
          }
        </div>

        <div class="pd-header__actions">
          @if (!loading()) {
            <button class="btn btn--ghost btn--sm" (click)="openEditModal()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Editar
            </button>
            <button class="btn btn--ghost btn--sm" (click)="abrirGenerarModal()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/><path d="M14 14l1.5 1.5L18 12"/></svg>
              Generar factura
            </button>
            <button class="btn btn--primary btn--sm" (click)="registrarPagoRapido()">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6.5" y1="1" x2="6.5" y2="12"/><line x1="1" y1="6.5" x2="12" y2="6.5"/></svg>
              Registrar pago
            </button>
          }
        </div>
      </div>

      <!-- ── KPI strip ── -->
      @if (!loading() && patient()) {
        <div class="pd-kpis glass-strong">
          <div class="pd-kpi">
            <div class="eyebrow">Plan activo</div>
            <div style="font-size:14px;font-weight:600;margin-top:2px" [style.color]="planColor()">
              {{ ficha()?.cobertura?.nombre ?? '—' }}
            </div>
          </div>
          <div class="pd-kpi">
            <div class="eyebrow">Estado cuenta</div>
            <div style="font-size:14px;font-weight:600;margin-top:2px"
              [style.color]="pendingFacturas().length > 0 ? 'var(--accent-red)' : 'var(--accent-emerald)'">
              {{ pendingFacturas().length > 0 ? 'En deuda (' + pendingFacturas().length + ')' : 'Al día' }}
            </div>
          </div>
          <div class="pd-kpi">
            <div class="eyebrow">Próximo vencimiento</div>
            <div class="mono" style="font-size:14px;font-weight:600;margin-top:2px;color:var(--accent-amber)">
              {{ nextFactura() ? fmtCurrency(nextFactura()!.importeTotal ?? 0) : '—' }}
            </div>
            @if (nextFactura()) {
              <div class="mono micro" style="color:var(--text-muted);margin-top:1px">
                {{ fmtPeriodo(nextFactura()!.periodoDesde, nextFactura()!.periodoHasta) }}
              </div>
            }
          </div>
          <div class="pd-kpi">
            <div class="eyebrow">Grupo familiar</div>
            <div style="font-size:14px;font-weight:600;margin-top:2px">
              {{ activeMembers().length }} integrante{{ activeMembers().length !== 1 ? 's' : '' }}
            </div>
          </div>
          <div class="pd-kpi">
            <div class="eyebrow">Atenciones este mes</div>
            <div style="font-size:14px;font-weight:600;margin-top:2px">
              {{ ficha()?.atencionesMes ?? 0 }}
            </div>
          </div>
        </div>
      }

      <!-- ── Tabs ── -->
      @if (!loading()) {
        <div class="pd-tabs glass-strong">
          @for (t of tabs; track t.id) {
            <button class="pd-tab" [attr.data-active]="tab() === t.id" (click)="tab.set(t.id)">
              <span [innerHTML]="t.icon | safeHtml"></span>
              {{ t.label }}
              @if (t.id === 'facturas' && pendingFacturas().length > 0) {
                <span class="tab-badge">{{ pendingFacturas().length }}</span>
              }
              @if (t.id === 'grupo') {
                <span class="tab-badge tab-badge--neutral">{{ activeMembers().length }}</span>
              }
            </button>
          }
        </div>
      }

      <!-- ══════════════════════════════════════════════════
           TAB: RESUMEN
           ══════════════════════════════════════════════════ -->
      @if (tab() === 'resumen' && !loading()) {
        <div class="pd-grid">

          <!-- Datos personales -->
          <div class="glass-strong pd-card">
            <div class="pd-card__title">Datos personales</div>
            @if (patient()) {
              <div class="info-grid">
                <div class="info-row"><span class="eyebrow">Nombre completo</span><span>{{ patient()!.nombre }} {{ patient()!.apellido }}</span></div>
                <div class="info-row"><span class="eyebrow">DNI</span><span class="mono">{{ patient()!.dni }}</span></div>
                <div class="info-row"><span class="eyebrow">Fecha de nac.</span><span>{{ fmtDate(patient()!.fechaNacimiento) }}</span></div>
                <div class="info-row"><span class="eyebrow">Sexo</span><span>{{ patient()!.sexo ?? '—' }}</span></div>
                <div class="info-row"><span class="eyebrow">Teléfono</span><span>{{ patient()!.telefono ?? '—' }}</span></div>
                <div class="info-row"><span class="eyebrow">Email</span><span>{{ patient()!.email ?? '—' }}</span></div>
                <div class="info-row"><span class="eyebrow">Dirección</span><span>{{ patient()!.direccion ?? '—' }}{{ patient()!.ciudad ? ' · ' + patient()!.ciudad : '' }}</span></div>
              </div>
            }
          </div>

          <!-- Datos médicos -->
          <div class="glass-strong pd-card">
            <div class="pd-card__title">Información médica y emergencia</div>
            @if (patient()) {
              <div class="info-grid">
                <div class="info-row">
                  <span class="eyebrow">Alergias</span>
                  <span [style.color]="patient()!.alergia ? 'var(--accent-amber)' : 'var(--text-muted)'">
                    {{ patient()!.alergia ?? 'Sin alergias registradas' }}
                  </span>
                </div>
                <div class="info-row">
                  <span class="eyebrow">Nota médica</span>
                  <span>{{ patient()!.notaMedica ?? 'Sin observaciones' }}</span>
                </div>
                <div class="info-row">
                  <span class="eyebrow">Contacto emergencia</span>
                  <span>{{ patient()!.contactoEmergenciaNombre ?? '—' }}</span>
                </div>
                @if (patient()!.contactoEmergenciaTelefono) {
                  <div class="info-row">
                    <span class="eyebrow">Tel. emergencia</span>
                    <span class="mono">{{ patient()!.contactoEmergenciaTelefono }}</span>
                  </div>
                }
              </div>
            }

            <!-- Alertas de ficha -->
            @if ((ficha()?.alertas ?? []).length > 0) {
              <div style="margin-top:12px;display:flex;flex-direction:column;gap:6px">
                @for (a of ficha()!.alertas!; track $index) {
                  <div class="alerta-chip" [attr.data-sev]="a.severidad">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span>{{ a.descripcion }}</span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Cobertura resumen -->
          @if (ficha()?.cobertura) {
            <div class="glass-strong pd-card">
              <div class="pd-card__title">Cobertura activa</div>
              <div class="plan-hero" [style.border-color]="planColor() + '44'">
                <div class="plan-hero__dot" [style.background]="planColor()" [style.box-shadow]="'0 0 12px ' + planColor()"></div>
                <div>
                  <div style="font-size:15px;font-weight:600" [style.color]="planColor()">{{ ficha()!.cobertura!.nombre }}</div>
                  <div class="mono micro" style="color:var(--text-muted);margin-top:2px">Nivel {{ ficha()!.cobertura!.nivel ?? '—' }} · Copago {{ ficha()!.cobertura!.copago ?? '—' }}</div>
                </div>
              </div>
              @if ((ficha()!.cobertura!.prestaciones ?? []).length > 0) {
                <div style="display:flex;flex-direction:column;gap:5px;margin-top:10px">
                  @for (p of ficha()!.cobertura!.prestaciones!; track p) {
                    <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text-secondary)">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {{ p }}
                    </div>
                  }
                </div>
              }
              <button class="btn btn--ghost btn--sm" style="margin-top:12px" (click)="tab.set('plan')">Cambiar plan →</button>
            </div>
          }

        </div>
      }

      <!-- ══════════════════════════════════════════════════
           TAB: FACTURAS
           ══════════════════════════════════════════════════ -->
      @if (tab() === 'facturas' && !loading()) {
        <div class="glass-strong pd-card--full">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--border-hairline)">
            <div class="pd-card__title" style="margin:0">Historial de facturas</div>
            <div style="display:flex;gap:6px">
              @for (s of facturaFiltros; track s.v) {
                <button class="filter-chip" [attr.data-on]="facturaFilter() === s.v" (click)="facturaFilter.set(s.v)">{{ s.l }}</button>
              }
            </div>
          </div>

          @if (loadingFacturas()) {
            <div style="padding:32px;text-align:center;color:var(--text-muted);font-size:12px">Cargando facturas…</div>
          } @else if (filteredFacturas().length === 0) {
            <div style="padding:48px;text-align:center">
              <div style="font-size:13px;color:var(--text-muted)">Sin facturas para mostrar.</div>
            </div>
          } @else {
            <table class="data-table">
              <thead>
                <tr>
                  <th>N° Factura</th>
                  <th>Período</th>
                  <th style="text-align:right">Importe</th>
                  <th>Estado</th>
                  <th>Emisión</th>
                  <th style="width:100px"></th>
                </tr>
              </thead>
              <tbody>
                @for (f of filteredFacturas(); track f.id) {
                  <tr [class.row-pending]="f.estado !== 'PAGADA' && f.estado !== 'ANULADA'">
                    <td class="mono" style="font-size:11.5px;color:var(--accent-blue)">{{ f.numeroFactura ?? 'FAC-' + f.id }}</td>
                    <td>{{ fmtPeriodo(f.periodoDesde, f.periodoHasta) }}</td>
                    <td class="mono" style="text-align:right;font-weight:600">{{ fmtCurrency(f.importeTotal ?? 0) }}</td>
                    <td>
                      <span class="mono micro" style="text-transform:uppercase;letter-spacing:0.1em;font-weight:600"
                        [style.color]="estadoFacturaColor(f.estado)">
                        ● {{ f.estado ?? '—' }}
                      </span>
                    </td>
                    <td class="mono micro" style="color:var(--text-muted)">{{ fmtDate(f.fechaEmision) }}</td>
                    <td>
                      @if (f.estado !== 'PAGADA' && f.estado !== 'ANULADA') {
                        <button class="btn btn--primary btn--sm" style="font-size:11px;height:26px;padding:0 10px" (click)="openPayModal(f)">
                          Cobrar
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }

      <!-- ══════════════════════════════════════════════════
           TAB: PLAN
           ══════════════════════════════════════════════════ -->
      @if (tab() === 'plan' && !loading()) {
        <div class="glass-strong pd-card--full" style="padding:20px">

          <div class="pd-card__title" style="margin-bottom:16px">Actualizar plan</div>

          @if (loadingPlans()) {
            <div style="font-size:12px;color:var(--text-muted);padding:16px 0">Cargando planes…</div>
          } @else {
            <div class="plan-grid">
              @for (p of plans(); track p.id) {
                <button type="button" class="plan-card"
                  [attr.data-active]="newPlanId() === p.id"
                  [style.border-color]="newPlanId() === p.id ? tierColor(p.tier) : 'var(--border-glass)'"
                  [style.background]="newPlanId() === p.id ? tierColor(p.tier) + '12' : 'transparent'"
                  (click)="newPlanId.set(p.id)">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                    <span class="plan-dot" [style.background]="tierColor(p.tier)" [style.box-shadow]="'0 0 10px ' + tierColor(p.tier)"></span>
                    <span style="font-size:13px;font-weight:600" [style.color]="newPlanId() === p.id ? tierColor(p.tier) : 'var(--text-primary)'">{{ p.name }}</span>
                  </div>
                  <div class="mono" style="font-size:13px;font-weight:600;color:var(--text-secondary)">
                    {{ fmtCurrency(p.pricing.monthly) }}<span style="font-size:11px;color:var(--text-muted);margin-left:4px">/ mes</span>
                  </div>
                  @if (p.pricing.annual) {
                    <div class="mono micro" style="color:var(--accent-emerald);margin-top:2px">
                      {{ fmtCurrency(p.pricing.annual) }} / anual
                    </div>
                  }
                  <div style="margin-top:8px;display:flex;flex-direction:column;gap:3px">
                    @if (p.coverages.emergency) { <div class="cover-item">✓ Emergencias</div> }
                    @if (p.coverages.homeVisit)  { <div class="cover-item">✓ Visita domiciliaria</div> }
                    @if (p.coverages.homeNursing){ <div class="cover-item">✓ Enfermería dom.</div> }
                  </div>
                </button>
              }
            </div>

            @if (planError()) {
              <div style="margin-top:12px;padding:8px 12px;border-radius:8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);font-size:12px;color:var(--accent-red)">
                {{ planError() }}
              </div>
            }

            <div style="display:flex;gap:8px;margin-top:16px">
              <button class="btn btn--ghost" (click)="newPlanId.set(null)">Limpiar</button>
              <button class="btn btn--primary" [disabled]="!newPlanId() || savingPlan()" [style.opacity]="newPlanId() && !savingPlan() ? '1':'0.5'" (click)="confirmarCambioPlan()">
                {{ savingPlan() ? 'Actualizando…' : 'Confirmar cambio de plan' }}
              </button>
            </div>
          }
        </div>
      }

      <!-- ══════════════════════════════════════════════════
           TAB: GRUPO FAMILIAR
           ══════════════════════════════════════════════════ -->
      @if (tab() === 'grupo' && !loading()) {
        <div class="glass-strong pd-card--full" style="padding:20px">

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
            <div class="pd-card__title" style="margin:0">Grupo familiar · {{ activeMembers().length }} integrantes</div>
            <button class="btn btn--ghost btn--sm" (click)="openAddDepModal()">
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5.5" y1="1" x2="5.5" y2="10"/><line x1="1" y1="5.5" x2="10" y2="5.5"/></svg>
              Agregar dependiente
            </button>
          </div>

          @if (activeMembers().length === 0) {
            <div style="text-align:center;padding:32px;background:rgba(148,163,184,0.05);border-radius:10px;border:1px solid var(--border-glass)">
              <div style="font-size:13px;color:var(--text-muted)">Sin dependientes activos en el grupo.</div>
            </div>
          } @else {
            <div style="display:flex;flex-direction:column;gap:8px">
              @for (m of allMembers(); track $index) {
                <div class="member-row" [class.member-row--inactive]="m.estado === 'BAJA' || m.estado === 'INACTIVA'">
                  <div class="avatar avatar--sm">{{ avatarOf(m.nombre ?? '') }}</div>
                  <div style="flex:1;min-width:0">
                    <div style="font-size:13px;font-weight:500">{{ m.nombre ?? '—' }}</div>
                    <div class="mono micro" style="color:var(--text-muted)">
                      {{ m.rol }} · Desde {{ fmtDate(m.fechaIngreso) }}
                      @if (m.estado === 'BAJA' || m.estado === 'INACTIVA') {
                        · <span style="color:var(--accent-red)">Baja {{ fmtDate(m.fechaBaja) }}</span>
                      }
                    </div>
                  </div>
                  <span class="member-estado" [attr.data-estado]="m.estado">{{ m.estado ?? 'ACTIVA' }}</span>
                </div>
              }
            </div>
          }
        </div>
      }

    </div>

    <!-- ═══════════════════════════════════════════════════════
         PAGO MODAL
         ═══════════════════════════════════════════════════════ -->
    @if (showPayModal()) {
      <div class="qc-overlay" (click)="closePayModal()">
        <div class="qc-modal glass-strong" (click)="$event.stopPropagation()" style="max-width:480px">
          <div class="qc-head">
            <div>
              <div class="eyebrow" style="color:var(--accent-emerald)">● REGISTRAR PAGO</div>
              <h2 style="margin:4px 0 0;font-size:18px;font-weight:600">{{ payFactura()?.numeroFactura ?? 'Factura' }}</h2>
              <div class="mono micro" style="color:var(--text-muted);margin-top:4px">
                {{ fmtPeriodo(payFactura()?.periodoDesde, payFactura()?.periodoHasta) }}
                · {{ fmtCurrency(payFactura()?.importeTotal ?? 0) }}
              </div>
            </div>
            <button class="qc-close-btn" (click)="closePayModal()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
          </div>
          <div class="qc-body" style="padding:20px;display:flex;flex-direction:column;gap:14px">

            <div class="qc-row">
              <div class="qc-field" style="flex:1">
                <label class="eyebrow">Monto <span style="color:var(--accent-red)">*</span></label>
                <input class="qc-input" type="number" min="0" [(ngModel)]="payMonto"/>
              </div>
              <div class="qc-field" style="flex:1">
                <label class="eyebrow">Fecha <span style="color:var(--accent-red)">*</span></label>
                <input class="qc-input" type="date" [(ngModel)]="payFecha"/>
              </div>
            </div>

            <div class="qc-field">
              <label class="eyebrow">Método de pago <span style="color:var(--accent-red)">*</span></label>
              <select class="qc-input" [(ngModel)]="payMetodo">
                <option value="">— Seleccioná —</option>
                @for (m of metodosPago; track m.value) {
                  <option [value]="m.value">{{ m.label }}</option>
                }
              </select>
            </div>

            <div class="qc-field">
              <label class="eyebrow">N° de referencia / comprobante</label>
              <input class="qc-input" placeholder="Nro. de transferencia, recibo…" [(ngModel)]="payReferencia"/>
            </div>

            <div class="qc-field">
              <label class="eyebrow">Nota interna</label>
              <textarea class="qc-input" rows="2" [(ngModel)]="payNota"></textarea>
            </div>

            @if (payError()) {
              <div style="padding:8px 12px;border-radius:8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);font-size:12px;color:var(--accent-red)">{{ payError() }}</div>
            }
          </div>
          <div class="qc-foot">
            <div></div>
            <div style="display:flex;gap:8px">
              <button class="btn btn--ghost" (click)="closePayModal()">Cancelar</button>
              <button class="btn btn--primary" [disabled]="!canPay() || savingPay()" [style.opacity]="canPay() && !savingPay() ? '1':'0.5'" (click)="confirmarPago()">
                {{ savingPay() ? 'Registrando…' : 'Confirmar pago' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }

    <!-- ═══════════════════════════════════════════════════════
         AGREGAR DEPENDIENTE MODAL
         ═══════════════════════════════════════════════════════ -->
    <!-- ═══════════════════════════════════════════════════════
         GENERAR FACTURA MODAL
         ═══════════════════════════════════════════════════════ -->
    @if (showGenerarModal()) {
      <div class="qc-overlay" (click)="cerrarGenerarModal()">
        <div class="qc-modal glass-strong" (click)="$event.stopPropagation()" style="max-width:460px">
          <div class="qc-head">
            <div>
              <div class="eyebrow" style="color:var(--accent-blue)">● GENERAR FACTURA</div>
              <h2 style="margin:4px 0 0;font-size:18px;font-weight:600">{{ patient()?.nombre }} {{ patient()?.apellido }}</h2>
            </div>
            <button class="qc-close-btn" (click)="cerrarGenerarModal()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
          </div>

          @if (!generarResult()) {
            <div class="qc-body" style="padding:20px;display:flex;flex-direction:column;gap:16px">

              <!-- Tipo -->
              <div class="qc-field">
                <label class="eyebrow">Tipo de factura</label>
                <div style="display:flex;gap:8px;margin-top:4px">
                  <button type="button" class="generar-tipo-btn"
                    [attr.data-active]="generarTipo() === 'MENSUAL'"
                    (click)="generarTipo.set('MENSUAL')">
                    <div style="font-size:13px;font-weight:600">Mensual</div>
                    <div class="mono micro" style="margin-top:2px">Por período de un mes</div>
                  </button>
                  <button type="button" class="generar-tipo-btn"
                    [attr.data-active]="generarTipo() === 'ANUAL'"
                    (click)="generarTipo.set('ANUAL')">
                    <div style="font-size:13px;font-weight:600">Anual</div>
                    <div class="mono micro" style="margin-top:2px">Ene–Dic, precio anual</div>
                  </button>
                </div>
              </div>

              <!-- Período -->
              <div class="qc-row">
                @if (generarTipo() === 'MENSUAL') {
                  <div class="qc-field" style="flex:1">
                    <label class="eyebrow">Mes</label>
                    <select class="qc-input" [(ngModel)]="generarMes">
                      @for (m of meses; track $index) {
                        <option [value]="$index + 1">{{ m }}</option>
                      }
                    </select>
                  </div>
                }
                <div class="qc-field" style="flex:1">
                  <label class="eyebrow">Año</label>
                  <input class="qc-input" type="number" min="2020" max="2099" [(ngModel)]="generarAnio"/>
                </div>
              </div>

              @if (!ficha()?.grupoFamiliarId) {
                <div style="padding:10px 12px;border-radius:8px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.25);font-size:12px;color:var(--accent-blue)">
                  ℹ Sin grupo familiar asignado — se creará uno automáticamente al generar.
                </div>
              }

              @if (generarError()) {
                <div style="padding:8px 12px;border-radius:8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);font-size:12px;color:var(--accent-red)">{{ generarError() }}</div>
              }
            </div>

            <div class="qc-foot">
              <div></div>
              <div style="display:flex;gap:8px">
                <button class="btn btn--ghost" (click)="cerrarGenerarModal()">Cancelar</button>
                <button class="btn btn--primary" [disabled]="savingGenerar()" [style.opacity]="savingGenerar() ? '0.5':'1'" (click)="confirmarGenerar()">
                  {{ savingGenerar() ? 'Generando…' : 'Generar factura' }}
                </button>
              </div>
            </div>

          } @else {
            <!-- Resultado -->
            <div class="qc-body" style="padding:24px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center">
              @if (generarResult()!.totalGeneradas > 0) {
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.3);display:flex;align-items:center;justify-content:center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div style="font-size:15px;font-weight:600;color:var(--accent-emerald)">Factura generada</div>
                <div class="mono" style="font-size:13px;color:var(--text-secondary)">
                  {{ generarResult()!.facturasGeneradas[0]?.numeroFactura }}
                  · {{ fmtCurrency(generarResult()!.facturasGeneradas[0]?.importeTotal ?? 0) }}
                </div>
              } @else {
                <div style="width:48px;height:48px;border-radius:50%;background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.3);display:flex;align-items:center;justify-content:center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div style="font-size:15px;font-weight:600;color:var(--accent-amber)">No se generó</div>
                <div style="font-size:12px;color:var(--text-muted)">Ya existe una factura para ese período, o el importe es $0.</div>
              }
            </div>
            <div class="qc-foot">
              <div></div>
              <button class="btn btn--primary" (click)="cerrarGenerarModal()">Cerrar</button>
            </div>
          }
        </div>
      </div>
    }

    @if (showAddDepModal()) {
      <div class="qc-overlay" (click)="closeAddDepModal()">
        <div class="qc-modal qc-modal--wide glass-strong" (click)="$event.stopPropagation()">
          <div class="qc-head">
            <div>
              <div class="eyebrow" style="color:var(--accent-blue)">● GRUPO FAMILIAR</div>
              <h2 style="margin:4px 0 0;font-size:18px;font-weight:600">Agregar dependiente</h2>
            </div>
            <button class="qc-close-btn" (click)="closeAddDepModal()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
            </button>
          </div>
          <div class="qc-body" style="padding:20px;display:flex;flex-direction:column;gap:14px">

            <div class="qc-row">
              <div class="qc-field" style="flex:1">
                <label class="eyebrow">Nombre <span style="color:var(--accent-red)">*</span></label>
                <input class="qc-input" placeholder="Ej. Lucía" [(ngModel)]="newDep.nombre" autofocus/>
              </div>
              <div class="qc-field" style="flex:1">
                <label class="eyebrow">Apellido <span style="color:var(--accent-red)">*</span></label>
                <input class="qc-input" placeholder="Ej. Vázquez" [(ngModel)]="newDep.apellido"/>
              </div>
              <div class="qc-field" style="flex:1">
                <label class="eyebrow">DNI <span style="color:var(--accent-red)">*</span></label>
                <input class="qc-input" placeholder="42554789" [(ngModel)]="newDep.dni"/>
              </div>
            </div>

            <div class="qc-row">
              <div class="qc-field" style="flex:1">
                <label class="eyebrow">Fecha de nacimiento</label>
                <input class="qc-input" type="date" [(ngModel)]="newDep.birth"/>
              </div>
              <div class="qc-field" style="flex:1">
                <label class="eyebrow">Sexo</label>
                <div style="display:flex;gap:4px">
                  @for (g of genderOpts; track g.v) {
                    <button type="button" class="gender-btn" [attr.data-active]="newDep.gender === g.v" (click)="newDep.gender = g.v">{{ g.l }}</button>
                  }
                </div>
              </div>
              <div class="qc-field" style="flex:1">
                <label class="eyebrow">Parentesco</label>
                <select class="qc-input" [(ngModel)]="newDep.parentesco">
                  @for (p of parentescos; track p) {
                    <option [value]="p">{{ p }}</option>
                  }
                </select>
              </div>
            </div>

            @if (!ficha()?.grupoFamiliarId) {
              <div style="padding:10px 12px;border-radius:8px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);font-size:12px;color:var(--accent-amber)">
                ⚠ Este afiliado no tiene grupo familiar asignado. El dependiente no podrá ser agregado hasta que exista un grupo.
              </div>
            }

            @if (addDepError()) {
              <div style="padding:8px 12px;border-radius:8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);font-size:12px;color:var(--accent-red)">{{ addDepError() }}</div>
            }

          </div>
          <div class="qc-foot">
            <div></div>
            <div style="display:flex;gap:8px">
              <button class="btn btn--ghost" (click)="closeAddDepModal()">Cancelar</button>
              <button class="btn btn--primary"
                [disabled]="!canAddDep() || savingDep() || !ficha()?.grupoFamiliarId"
                [style.opacity]="canAddDep() && !savingDep() && !!ficha()?.grupoFamiliarId ? '1':'0.5'"
                (click)="confirmarAddDep()">
                {{ savingDep() ? 'Agregando…' : 'Agregar al grupo' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    /* Header */
    .pd-header {
      border-radius: var(--r-card);
      padding: 14px 20px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; flex-wrap: wrap; margin-bottom: 10px;
    }
    .pd-header__left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }
    .pd-header__actions { display: flex; gap: 8px; flex-shrink: 0; }
    .pd-back {
      display: flex; align-items: center; gap: 6px;
      flex-shrink: 0; text-decoration: none;
    }

    /* KPI strip */
    .pd-kpis {
      display: flex; align-items: center; gap: 0;
      border-radius: var(--r-card); overflow: hidden;
      margin-bottom: 10px;
    }
    .pd-kpi {
      flex: 1; padding: 12px 16px;
      border-right: 1px solid var(--border-hairline);
    }
    .pd-kpi:last-child { border-right: none; }

    /* Tabs */
    .pd-tabs {
      display: flex; gap: 2px; padding: 8px 12px;
      border-radius: var(--r-card); margin-bottom: 10px;
    }
    .pd-tab {
      display: flex; align-items: center; gap: 7px;
      padding: 8px 14px; border-radius: 8px;
      border: none; background: transparent;
      color: var(--text-muted); font-size: 12.5px; font-family: var(--font-sans);
      cursor: pointer; transition: all 0.15s; white-space: nowrap;
    }
    .pd-tab:hover { color: var(--text-primary); background: rgba(255,255,255,0.04); }
    .pd-tab[data-active="true"] { background: rgba(59,130,246,0.12); color: var(--accent-blue); }
    .tab-badge {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 18px; height: 18px; padding: 0 4px;
      border-radius: 9px; font-size: 10px; font-family: var(--font-mono); font-weight: 600;
      background: rgba(239,68,68,0.2); color: var(--accent-red);
    }
    .tab-badge--neutral { background: rgba(148,163,184,0.12); color: var(--text-muted); }

    /* Content layout */
    .pd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    @media (max-width: 900px) { .pd-grid { grid-template-columns: 1fr; } }
    .pd-card { border-radius: var(--r-card); padding: 16px 20px; }
    .pd-card--full { border-radius: var(--r-card); }
    .pd-card__title { font-size: 11px; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.12em; color: var(--text-muted); margin-bottom: 12px; }

    /* Info grid */
    .info-grid { display: flex; flex-direction: column; gap: 8px; }
    .info-row { display: flex; gap: 8px; font-size: 12.5px; }
    .info-row .eyebrow { min-width: 120px; flex-shrink: 0; padding-top: 1px; }
    .info-row span:last-child { color: var(--text-secondary); }

    /* Plan card */
    .plan-hero {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px; border-radius: 10px;
      border: 1px solid; background: rgba(255,255,255,0.03);
    }
    .plan-hero__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

    /* Avatars */
    .avatar { display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 700; color: #fff; flex-shrink: 0; font-family: var(--font-mono); }
    .avatar--sm { width: 36px; height: 36px; font-size: 13px; background: linear-gradient(135deg,#3b82f6,#1e40af); }
    .avatar--lg { width: 48px; height: 48px; font-size: 17px; background: linear-gradient(135deg,#3b82f6,#1e40af); }

    /* Type tags */
    .type-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10.5px; font-family: var(--font-mono); font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; background: rgba(59,130,246,0.1); color: var(--accent-blue); }

    /* Alerta */
    .alerta-chip { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 7px; font-size: 12px; background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25); color: var(--accent-amber); }
    .alerta-chip[data-sev="ALTA"] { background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.25); color: var(--accent-red); }

    /* Plan grid */
    .plan-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
    .plan-card { padding: 12px 14px; border-radius: 10px; border: 1px solid; background: transparent; cursor: pointer; text-align: left; transition: all 0.15s; }
    .plan-card:hover { background: rgba(255,255,255,0.03); }
    .plan-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
    .cover-item { font-size: 11px; color: var(--text-muted); }

    /* Filters */
    .filter-chip { height: 26px; padding: 0 10px; border-radius: 20px; border: 1px solid var(--border-glass); background: transparent; color: var(--text-muted); font-size: 11px; font-family: var(--font-sans); cursor: pointer; transition: all 0.15s; }
    .filter-chip:hover { color: var(--text-primary); }
    .filter-chip[data-on="true"] { background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.4); color: var(--accent-blue); }

    /* Data table */
    .data-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
    .data-table th { padding: 10px 14px; text-align: left; font-size: 10.5px; font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); border-bottom: 1px solid var(--border-hairline); background: rgba(255,255,255,0.02); white-space: nowrap; }
    .data-table td { padding: 11px 14px; border-bottom: 1px solid var(--border-hairline); color: var(--text-secondary); vertical-align: middle; }
    .data-table tr:last-child td { border-bottom: none; }
    .row-pending td { background: rgba(245,158,11,0.03); }
    .data-table tr:hover td { background: rgba(255,255,255,0.025); }

    /* Members */
    .member-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.02); }
    .member-row--inactive { opacity: 0.45; }
    .member-estado { font-size: 10.5px; font-family: var(--font-mono); font-weight: 600; text-transform: uppercase; padding: 2px 8px; border-radius: 4px; background: rgba(16,185,129,0.1); color: var(--accent-emerald); flex-shrink: 0; }
    .member-estado[data-estado="BAJA"], .member-estado[data-estado="INACTIVA"] { background: rgba(239,68,68,0.08); color: var(--accent-red); }

    /* Gender buttons */
    .gender-btn { flex: 1; height: 36px; border-radius: var(--r-btn); border: 1px solid var(--border-glass); background: rgba(255,255,255,0.03); color: var(--text-muted); font-size: 12px; font-family: var(--font-sans); cursor: pointer; transition: all 0.15s; }
    .gender-btn[data-active="true"] { background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.4); color: var(--accent-blue); }

    /* Generar tipo btn */
    .generar-tipo-btn {
      flex: 1; padding: 10px 14px; border-radius: 10px;
      border: 1px solid var(--border-glass); background: transparent;
      color: var(--text-muted); text-align: left; cursor: pointer; transition: all 0.15s;
    }
    .generar-tipo-btn:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); }
    .generar-tipo-btn[data-active="true"] { background: rgba(59,130,246,0.12); border-color: rgba(59,130,246,0.4); color: var(--accent-blue); }

    /* Modals */
    .qc-overlay { position: fixed; inset: 0; z-index: 60; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); }
    .qc-modal { width: 100%; max-width: 560px; border-radius: 16px; display: flex; flex-direction: column; animation: modal-in 0.18s ease-out; }
    .qc-modal--wide { max-width: 720px; }
    @keyframes modal-in { from { transform: scale(0.96) translateY(8px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
    .qc-head { display: flex; align-items: flex-start; justify-content: space-between; padding: 20px 20px 14px; border-bottom: 1px solid var(--border-hairline); }
    .qc-body { padding: 16px 20px; }
    .qc-foot { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; border-top: 1px solid var(--border-hairline); gap: 8px; }
    .qc-close-btn { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-glass); background: rgba(255,255,255,0.04); color: var(--text-muted); cursor: pointer; }
    .qc-close-btn:hover { background: rgba(255,255,255,0.09); color: var(--text-primary); }
    .qc-row { display: flex; gap: 12px; }
    .qc-field { display: flex; flex-direction: column; gap: 5px; }
    .qc-input { height: 36px; border-radius: var(--r-btn); border: 1px solid var(--border-glass); background: rgba(255,255,255,0.04); color: var(--text-primary); font-size: 12.5px; font-family: var(--font-sans); padding: 0 10px; outline: none; width: 100%; box-sizing: border-box; transition: border-color 0.15s; }
    .qc-input:focus { border-color: rgba(59,130,246,0.5); }
    textarea.qc-input { height: auto; padding: 8px 10px; resize: vertical; }
  `],
})
export class PatientDetailComponent implements OnInit {
    private destroyRef = inject(DestroyRef);
  private route         = inject(ActivatedRoute);
  private router        = inject(Router);
  private patientApi    = inject(PatientApiService);
  private plansApi      = inject(PlansApiService);
  private facturacionApi = inject(FacturacionApiService);
  private auth          = inject(AuthService);

  // ── Constants ──
  readonly parentescos = PARENTESCOS;
  readonly metodosPago = METODOS_PAGO;
  readonly genderOpts  = [{ v: 'M' as const, l: 'Masculino' }, { v: 'F' as const, l: 'Femenino' }, { v: 'X' as const, l: 'Otro' }];
  readonly tabs = [
    { id: 'resumen'  as Tab, label: 'Resumen',         icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/></svg>' },
    { id: 'facturas' as Tab, label: 'Facturas y pagos', icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>' },
    { id: 'plan'     as Tab, label: 'Plan',             icon: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>' },
    { id: 'grupo'    as Tab, label: 'Grupo familiar',   icon: '<svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="7" cy="5" r="3"/><path d="M1 15c0-3.31 2.69-5 6-5"/><circle cx="13" cy="10" r="2.5"/><path d="M10.5 14c0-1.93 1.12-3 3.5-3s3.5 1.07 3.5 3"/></svg>' },
  ];
  readonly facturaFiltros = [
    { v: 'all' as const,     l: 'Todas' },
    { v: 'EMITIDA' as const, l: 'Pendientes' },
    { v: 'PAGADA' as const,  l: 'Pagadas' },
    { v: 'VENCIDA' as const, l: 'Vencidas' },
  ];

  // ── Core state ──
  readonly loading         = signal(true);
  readonly tab             = signal<Tab>('resumen');
  readonly pacienteId      = signal(0);
  readonly patient         = signal<PacienteDTO | null>(null);
  readonly ficha           = signal<FichaAfiliadoDTO | null>(null);
  readonly facturas        = signal<FacturaDTO[]>([]);
  readonly loadingFacturas = signal(false);
  readonly plans           = signal<PlanDTO[]>([]);
  readonly loadingPlans    = signal(false);

  // ── Plan tab ──
  readonly newPlanId  = signal<string | null>(null);
  readonly savingPlan = signal(false);
  readonly planError  = signal<string | null>(null);

  // ── Pago modal ──
  readonly showPayModal = signal(false);
  readonly payFactura   = signal<FacturaDTO | null>(null);
  payMonto = ''; payFecha = todayISO(); payMetodo = ''; payReferencia = ''; payNota = '';
  readonly savingPay = signal(false);
  readonly payError  = signal<string | null>(null);

  // ── Generar modal ──
  readonly showGenerarModal = signal(false);
  readonly generarTipo     = signal<'MENSUAL' | 'ANUAL'>('MENSUAL');
  generarMes  = DateUtils.now().month;
  generarAnio = DateUtils.now().year;
  readonly savingGenerar = signal(false);
  readonly generarError  = signal<string | null>(null);
  readonly generarResult = signal<GenerarResponseDTO | null>(null);
  readonly meses = MESES;

  // ── Add dep modal ──
  readonly showAddDepModal = signal(false);
  newDep: NewDepForm = emptyDep();
  readonly savingDep   = signal(false);
  readonly addDepError = signal<string | null>(null);

  // ── Factura filter ──
  readonly facturaFilter = signal<'all' | 'EMITIDA' | 'PAGADA' | 'VENCIDA'>('all');

  // ── Computed ──
  readonly pendingFacturas = computed(() => this.facturas().filter(f => f.estado !== 'PAGADA' && f.estado !== 'ANULADA'));
  readonly nextFactura     = computed(() => this.pendingFacturas()[0] ?? null);
  readonly allMembers      = computed(() => this.ficha()?.miembrosGrupo ?? []);
  readonly activeMembers   = computed(() => this.allMembers().filter(m => m.estado !== 'BAJA' && m.estado !== 'INACTIVA'));
  readonly filteredFacturas = computed(() => {
    const f = this.facturaFilter();
    if (f === 'all') return this.facturas();
    return this.facturas().filter(fa => fa.estado === f);
  });

  readonly planColor = computed(() => {
    const nivel = (this.ficha()?.cobertura?.nivel ?? '').toLowerCase();
    return TIER_COLORS[nivel] ?? 'var(--text-muted)';
  });

  // ── Lifecycle ──
  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.pacienteId.set(id);
    this.loadAll(id);
    this.loadPlans();
  }

  private loadAll(id: number): void {
    this.loading.set(true);
    forkJoin({
            patient:  this.patientApi.getById(id).pipe(catchError(() => of(null))),
            ficha:    this.patientApi.getFicha(id).pipe(catchError(() => of(null))),
            facturas: this.patientApi.getFacturasAfiliado(id).pipe(catchError(() => of([] as FacturaDTO[]))),
          }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ patient, ficha, facturas }) => {
            this.patient.set(patient);
            this.ficha.set(ficha);
            this.facturas.set(facturas ?? []);
            this.loading.set(false);
          });
  }

  private loadPlans(): void {
    this.loadingPlans.set(true);
    this.plansApi.getAll().pipe(catchError(() => of([] as PlanDTO[])), takeUntilDestroyed(this.destroyRef)).subscribe(p => {
      this.plans.set(p.filter(x => x.active));
      this.loadingPlans.set(false);
    });
  }

  private reloadFacturas(): void {
    this.loadingFacturas.set(true);
    this.patientApi.getFacturasAfiliado(this.pacienteId()).pipe(
      catchError(() => of([] as FacturaDTO[])), takeUntilDestroyed(this.destroyRef)
    ).subscribe(f => { this.facturas.set(f); this.loadingFacturas.set(false); });
  }

  // ── Helpers ──
  readonly fmtCurrency       = fmtCurrency;
  readonly fmtDate           = fmtDate;
  readonly fmtPeriodo        = fmtPeriodo;
  readonly estadoFacturaColor = estadoFacturaColor;

  initials(p: PacienteDTO): string {
    return ((p.nombre?.[0] ?? '') + (p.apellido?.[0] ?? '')).toUpperCase();
  }

  avatarOf(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(x => x[0]?.toUpperCase() ?? '').join('');
  }

  tierColor(tier: string): string { return TIER_COLORS[tier] ?? 'var(--text-muted)'; }

  goBack(): void { this.router.navigate(['/patients']); }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.showGenerarModal()) { this.cerrarGenerarModal(); return; }
    if (this.showPayModal())     { this.closePayModal();      return; }
    if (this.showAddDepModal())  { this.closeAddDepModal();   return; }
  }

  // ── Edit ──
  openEditModal(): void {
    this.router.navigate(['/patients'], { queryParams: { edit: this.pacienteId() } });
  }

  // ── Plan ──
  confirmarCambioPlan(): void {
    const planId = this.newPlanId();
    if (!planId || this.savingPlan()) return;
    const planIdNum = Number(planId);
    if (isNaN(planIdNum)) return;

    this.savingPlan.set(true);
    this.planError.set(null);

    this.patientApi.crearCobertura(this.pacienteId(), {
      tipoCobertura: 'PLAN_PROPIO',
      planComercialId: planIdNum,
      vigenciaDesde: todayISO(),
    }).pipe(
      catchError(err => {
        this.planError.set(err?.error?.detail ?? err?.error?.title ?? 'Error al actualizar el plan.');
        this.savingPlan.set(false);
        return of(null);
      }), takeUntilDestroyed(this.destroyRef)
    ).subscribe(res => {
      if (!res) return;
      this.savingPlan.set(false);
      this.newPlanId.set(null);
      this.loadAll(this.pacienteId());
    });
  }

  // ── Pago ──
  openPayModal(f: FacturaDTO): void {
    this.payFactura.set(f);
    this.payMonto = String(f.importeTotal ?? '');
    this.payFecha = todayISO();
    this.payMetodo = ''; this.payReferencia = ''; this.payNota = '';
    this.payError.set(null);
    this.showPayModal.set(true);
    this.tab.set('facturas');
  }

  closePayModal(): void { this.showPayModal.set(false); this.payError.set(null); }

  canPay(): boolean { return Number(this.payMonto) > 0 && !!this.payMetodo; }

  confirmarPago(): void {
    const f = this.payFactura();
    if (!f || !this.canPay() || this.savingPay()) return;

    this.savingPay.set(true);
    this.payError.set(null);

    this.patientApi.registrarPago(f.id, {
      fechaPago:        this.payFecha,
      monto:            Number(this.payMonto),
      metodoPago:       this.payMetodo as any,
      numeroReferencia: this.payReferencia || undefined,
      nota:             this.payNota || undefined,
    }).pipe(
      catchError(err => {
        this.payError.set(err?.error?.detail ?? err?.error?.title ?? 'Error al registrar el pago.');
        this.savingPay.set(false);
        return of(null);
      }), takeUntilDestroyed(this.destroyRef)
    ).subscribe(res => {
      if (!res) return;
      this.savingPay.set(false);
      this.closePayModal();
      this.reloadFacturas();
    });
  }

  // ── Registrar pago rápido ──
  registrarPagoRapido(): void {
    const pending = this.pendingFacturas();
    if (pending.length > 0) {
      this.openPayModal(pending[0]);
    } else {
      this.tab.set('facturas');
    }
  }

  // ── Generar ──
  abrirGenerarModal(): void {
    this.generarTipo.set('MENSUAL');
    this.generarMes  = DateUtils.now().month;
    this.generarAnio = DateUtils.now().year;
    this.generarError.set(null);
    this.generarResult.set(null);
    this.showGenerarModal.set(true);
  }

  cerrarGenerarModal(): void {
    const hadResult = !!this.generarResult();
    this.showGenerarModal.set(false);
    this.generarResult.set(null);
    this.generarError.set(null);
    if (hadResult) {
      this.reloadFacturas();
      this.tab.set('facturas');
    }
  }

  confirmarGenerar(): void {
    if (this.savingGenerar()) return;
    this.savingGenerar.set(true);
    this.generarError.set(null);

    const anual = this.generarTipo() === 'ANUAL';
    this.facturacionApi.generarIndividual(this.pacienteId(), this.generarMes, this.generarAnio, anual).pipe(
      catchError(err => {
        this.generarError.set(err?.error?.detail ?? err?.error?.title ?? 'Error al generar la factura.');
        this.savingGenerar.set(false);
        return of(null);
      }), takeUntilDestroyed(this.destroyRef)
    ).subscribe(res => {
      if (!res) return;
      this.savingGenerar.set(false);
      this.generarResult.set(res);
    });
  }

  // ── Dependiente ──
  openAddDepModal(): void {
    this.newDep = emptyDep();
    this.addDepError.set(null);
    this.showAddDepModal.set(true);
  }

  closeAddDepModal(): void { this.showAddDepModal.set(false); this.addDepError.set(null); }

  canAddDep(): boolean {
    return !!this.newDep.nombre.trim() && !!this.newDep.apellido.trim() && !!this.newDep.dni.trim();
  }

  confirmarAddDep(): void {
    const grupoId = this.ficha()?.grupoFamiliarId;
    const empresaId = this.auth.currentAccount()?.empresa?.id;
    if (!grupoId || !empresaId || !this.canAddDep() || this.savingDep()) return;

    this.savingDep.set(true);
    this.addDepError.set(null);

    const pacienteReq: CreatePacienteRequest = {
      nombre:      this.newDep.nombre.trim(),
      apellido:    this.newDep.apellido.trim(),
      dni:         this.newDep.dni.trim(),
      tipoDocumento: 'DNI',
      sexo:        sexoFromGender(this.newDep.gender),
      fechaNacimiento: this.newDep.birth || undefined,
      activo:      true,
      empresa:     { id: empresaId },
    };

    this.patientApi.create(pacienteReq).pipe(
      switchMap(newPaciente =>
        this.patientApi.addMiembro({
          rolFamiliar:  parentescoToRol(this.newDep.parentesco),
          fechaIngreso: todayISO(),
          estado:       'ACTIVA',
          empresa:      { id: empresaId },
          grupoFamiliar: { id: grupoId },
          paciente:     { id: newPaciente.id },
        })
      ),
      catchError(err => {
        this.addDepError.set(err?.error?.detail ?? err?.error?.title ?? 'Error al agregar el dependiente.');
        this.savingDep.set(false);
        return of(null);
      }), takeUntilDestroyed(this.destroyRef)
    ).subscribe(res => {
      if (!res) return;
      this.savingDep.set(false);
      this.closeAddDepModal();
      this.loadAll(this.pacienteId());
    });
  }
}
