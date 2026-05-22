import { Component, signal, computed, inject, OnInit, DestroyRef } from '@angular/core';
import { catchError, of } from 'rxjs';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import type { BadgeVariant } from '../../shared/components/status-badge/status-badge.component';
import { EventsApiService } from '../../data-access/api/events.api';
import type { FrontendEvento } from '../../data-access/api/events.api';
import { FleetApiService } from '../../data-access/api/fleet.api';
import { DateUtils } from '../../core/utils/date.utils';
import { DateTime } from 'luxon';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

// ─── Constants ───────────────────────────────────────────────────────────────

const EVENT_TYPES = [
  'Deportivo', 'Cultural', 'Corporativo', 'Educativo',
  'Musical / Concierto', 'Religioso', 'Político', 'Privado / Social',
];

const EVENT_TYPE_COLORS: Record<string, string> = {
  'Deportivo':           'var(--accent-emerald)',
  'Cultural':            'var(--accent-cyan)',
  'Corporativo':         'var(--accent-blue)',
  'Educativo':           'var(--accent-amber)',
  'Musical / Concierto': 'var(--accent-red)',
  'Religioso':           'var(--text-muted)',
  'Político':            'var(--accent-amber)',
  'Privado / Social':    'var(--accent-cyan)',
};

const EVENT_ORGS = [
  'Gimnasia y Esgrima de Jujuy', 'Liga Jujueña de Fútbol',
  'Universidad Nacional de Jujuy', 'UCSE Sede Jujuy',
  'Municipalidad de San Salvador de Jujuy', 'Gobierno de la Provincia de Jujuy',
  'Cámara de Comercio de Jujuy', 'Casino del Sol Producciones',
  'Tabacal Music', 'Cervecería Salón Norte',
];

const EV_MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const DOW_SHORT = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface EventItem {
  id: string;
  name: string;
  type: string;
  org: string;
  responsible: string;
  attendees: number;
  address: string;
  dateFrom: string;
  timeFrom: string;
  dateTo: string;
  timeTo: string;
  units: string[];
  status: 'scheduled' | 'inprogress' | 'closed';
}

interface AmbUnit {
  id: string;
  crew: string;
  type: 'ALS' | 'BLS';
  status: string;
}

interface NewEventForm {
  name: string;
  type: string;
  org: string;
  responsible: string;
  attendees: number | null;
  address: string;
  dateFrom: string;
  timeFrom: string;
  dateTo: string;
  timeTo: string;
  units: string[];
}

// ─── Static data ──────────────────────────────────────────────────────────────

const AMBULANCES: AmbUnit[] = [
  { id: 'U-04', crew: 'Soto · Vega',       type: 'ALS', status: 'available'    },
  { id: 'U-07', crew: 'Lara · Ríos',       type: 'ALS', status: 'enroute'      },
  { id: 'U-09', crew: 'Mora · Cano',       type: 'BLS', status: 'available'    },
  { id: 'U-12', crew: 'Ortega · Paz',      type: 'ALS', status: 'onscene'      },
  { id: 'U-14', crew: 'Bello · Sosa',      type: 'ALS', status: 'available'    },
  { id: 'U-18', crew: 'Téllez · Mar',      type: 'ALS', status: 'transport'    },
  { id: 'U-21', crew: 'Gil · Núñez',       type: 'BLS', status: 'available'    },
  { id: 'U-22', crew: 'Aro · Domínguez',   type: 'BLS', status: 'onscene'      },
  { id: 'U-25', crew: 'Pino · Vidal',      type: 'ALS', status: 'available'    },
  { id: 'U-30', crew: '—',                 type: 'BLS', status: 'maintenance'  },
  { id: 'U-31', crew: 'Rojas · Mena',      type: 'ALS', status: 'available'    },
  { id: 'U-33', crew: 'Ávila · Cruz',      type: 'ALS', status: 'enroute'      },
];

// ─── Constants and helpers ───────────────────────────────────────────────────

function initialForm(): NewEventForm {
  return {
    name: '', type: '', org: '', responsible: '', attendees: null,
    address: '', dateFrom: '', timeFrom: '', dateTo: '', timeTo: '',
    units: [],
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [StatusBadgeComponent],
  template: `
    <div class="h-full flex flex-col overflow-hidden">

      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <div class="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
        <div class="flex items-center gap-3">
          <div style="width:36px;height:36px;border-radius:10px;background:rgba(59,130,246,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--accent-blue)" stroke-width="1.5">
              <rect x="2" y="3" width="14" height="13" rx="1.5"/>
              <path d="M2 7h14"/>
              <path d="M6 1v4M12 1v4"/>
            </svg>
          </div>
          <div>
            <h1 class="font-semibold text-lg" style="color:var(--text-primary);">Coberturas de Eventos</h1>
            <p class="text-xs mt-0.5 font-mono" style="color:var(--text-muted);">AGENDA DE EVENTOS PROGRAMADOS · COBERTURA SANITARIA</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- KPI chips -->
          <div class="flex items-center gap-4 px-4 py-2 rounded-lg" style="background:var(--surface-glass);border:1px solid var(--border-glass);">
            @for (kpi of headerKpis(); track kpi.label) {
              <div class="text-center">
                <div class="font-mono text-xs uppercase tracking-wider mb-0.5" style="color:var(--text-muted);">{{ kpi.label }}</div>
                <div class="font-mono font-bold text-lg leading-none" [style.color]="kpi.color">{{ kpi.value }}</div>
              </div>
            }
          </div>

          <!-- View toggle -->
          <div class="flex rounded-lg overflow-hidden" style="border:1px solid var(--border-glass);">
            <button type="button"
              style="padding:6px 12px;font-size:12px;border:none;cursor:pointer;transition:all 0.15s;"
              [style.background]="view() === 'list' ? 'rgba(59,130,246,0.2)' : 'var(--surface-glass)'"
              [style.color]="view() === 'list' ? 'var(--accent-blue)' : 'var(--text-muted)'"
              (click)="view.set('list')">Lista</button>
            <button type="button"
              style="padding:6px 12px;font-size:12px;border:none;border-left:1px solid var(--border-glass);cursor:pointer;transition:all 0.15s;"
              [style.background]="view() === 'calendar' ? 'rgba(59,130,246,0.2)' : 'var(--surface-glass)'"
              [style.color]="view() === 'calendar' ? 'var(--accent-blue)' : 'var(--text-muted)'"
              (click)="view.set('calendar')">Calendario</button>
          </div>

          <button type="button" class="btn btn--primary btn--sm" (click)="openNewEvent()">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 1v10M1 6h10"/></svg>
            Nuevo evento
          </button>
        </div>
      </div>

      <!-- ── Body ────────────────────────────────────────────────────────── -->
      <div class="flex-1 overflow-hidden px-4 pb-4 min-h-0">

        @if (view() === 'list') {
          <!-- ── LIST VIEW ───────────────────────────────────────────────── -->
          <div class="h-full flex flex-col rounded-xl overflow-hidden" style="background:var(--surface-glass);border:1px solid var(--border-glass);backdrop-filter:blur(12px);">

            <!-- Toolbar -->
            <div class="flex items-center gap-3 px-4 py-3 flex-shrink-0" style="border-bottom:1px solid var(--border-glass);">
              <!-- Search -->
              <div class="relative" style="flex:1;max-width:260px;">
                <svg class="absolute" style="left:9px;top:50%;transform:translateY(-50%);" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
                  <circle cx="5.5" cy="5.5" r="4"/><path d="M9 9l3 3"/>
                </svg>
                <input type="text" placeholder="Buscar evento..."
                  [value]="searchQuery()"
                  (input)="searchQuery.set($any($event.target).value)"
                  style="width:100%;padding:6px 10px 6px 28px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:12px;outline:none;" />
              </div>

              <!-- Status chips -->
              <div class="flex items-center gap-1">
                @for (f of statusFilters; track f.value) {
                  <button type="button"
                    style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:500;border:1px solid;cursor:pointer;transition:all 0.15s;"
                    [style.background]="statusFilter() === f.value ? 'rgba(59,130,246,0.15)' : 'transparent'"
                    [style.border-color]="statusFilter() === f.value ? 'var(--accent-blue)' : 'var(--border-glass)'"
                    [style.color]="statusFilter() === f.value ? 'var(--accent-blue)' : 'var(--text-muted)'"
                    (click)="statusFilter.set(f.value)">{{ f.label }}</button>
                }
              </div>

              <!-- Type dropdown -->
              <select
                [value]="typeFilter()"
                (change)="typeFilter.set($any($event.target).value)"
                style="padding:5px 8px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-secondary);font-size:12px;outline:none;cursor:pointer;">
                <option value="all">Todos los tipos</option>
                @for (t of eventTypes; track t) {
                  <option [value]="t">{{ t }}</option>
                }
              </select>
            </div>

            <!-- List body (scrollable) -->
            <div class="flex-1 overflow-y-auto">
              @for (group of groupedEvents(); track group.key) {
                <!-- Month group header -->
                <div class="px-4 py-2 flex items-center gap-2 sticky top-0" style="background:var(--bg-elevated);border-bottom:1px solid var(--border-hairline);z-index:1;">
                  <span class="font-mono text-xs font-semibold uppercase tracking-wider" style="color:var(--text-muted);">{{ group.label }} · {{ group.events.length }} evento{{ group.events.length !== 1 ? 's' : '' }}</span>
                </div>

                @for (ev of group.events; track ev.id) {
                  <button type="button"
                    class="w-full text-left flex items-center gap-3 px-4 py-3 transition-colors"
                    style="border-bottom:1px solid var(--border-hairline);background:transparent;border-left:none;border-right:none;border-top:none;cursor:pointer;"
                    [style.background]="selectedEvent()?.id === ev.id ? 'rgba(59,130,246,0.06)' : 'transparent'"
                    (click)="selectedEvent.set(ev)"
                    (mouseenter)="$any($event.currentTarget).style.background='rgba(255,255,255,0.03)'"
                    (mouseleave)="$any($event.currentTarget).style.background=selectedEvent()?.id === ev.id ? 'rgba(59,130,246,0.06)' : 'transparent'">

                    <!-- Date column -->
                    <div class="text-center flex-shrink-0" style="width:36px;">
                      <div class="font-mono font-bold" style="font-size:22px;line-height:1;color:var(--text-primary);">{{ ev.dateFrom.slice(8) }}</div>
                      <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-top:2px;">{{ dayOfWeek(ev.dateFrom) }}</div>
                    </div>

                    <!-- Color bar -->
                    <div class="flex-shrink-0 self-stretch" style="width:3px;border-radius:2px;" [style.background]="typeColor(ev.type)"></div>

                    <!-- Center info -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-semibold truncate" style="font-size:13.5px;color:var(--text-primary);">{{ ev.name }}</span>
                        <span class="font-mono flex-shrink-0" style="font-size:11px;color:var(--text-muted);">{{ ev.id }}</span>
                      </div>
                      <div class="flex items-center gap-2 mt-0.5">
                        <span style="font-size:12px;color:var(--text-secondary);">{{ ev.timeFrom }} → {{ ev.timeTo }}</span>
                        <span style="font-size:11px;color:var(--text-muted);">· {{ ev.address }}</span>
                      </div>
                    </div>

                    <!-- Right meta -->
                    <div class="flex items-center gap-3 flex-shrink-0">
                      <!-- Type chip -->
                      <span style="padding:2px 8px;border-radius:5px;font-size:12px;font-weight:500;"
                        [style.background]="typeColor(ev.type) + '22'"
                        [style.color]="typeColor(ev.type)">{{ ev.type }}</span>

                      <!-- Attendees -->
                      <span class="font-mono" style="font-size:11px;color:var(--text-muted);">{{ ev.attendees.toLocaleString() }} asist.</span>

                      <!-- Units -->
                      <div class="flex items-center gap-1">
                        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="var(--accent-emerald)" stroke-width="1.5">
                          <rect x="1" y="4" width="11" height="6" rx="1.5"/>
                          <path d="M3 4V3a1.5 1.5 0 011.5-1.5h4A1.5 1.5 0 0110 3v1"/>
                          <circle cx="3" cy="10" r="1"/><circle cx="10" cy="10" r="1"/>
                        </svg>
                        <span class="font-mono font-semibold" style="font-size:11px;color:var(--accent-emerald);">{{ ev.units.length }}</span>
                      </div>

                      <!-- Status badge -->
                      <emx-status-badge [variant]="statusMeta(ev.status).variant" [pulse]="ev.status === 'inprogress'">
                        {{ statusMeta(ev.status).label }}
                      </emx-status-badge>
                    </div>
                  </button>
                }
              }

              @if (filteredEvents().length === 0) {
                <div class="flex flex-col items-center justify-center py-16" style="color:var(--text-muted);">
                  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" stroke-width="1.2" style="margin-bottom:10px;opacity:0.4;">
                    <rect x="4" y="6" width="28" height="26" rx="3"/>
                    <path d="M4 14h28"/><path d="M12 2v8M24 2v8"/>
                  </svg>
                  <span style="font-size:13px;">No se encontraron eventos</span>
                </div>
              }
            </div>
          </div>
        }

        @if (view() === 'calendar') {
          <!-- ── CALENDAR VIEW ───────────────────────────────────────────── -->
          <div class="h-full flex flex-col rounded-xl overflow-hidden" style="background:var(--surface-glass);border:1px solid var(--border-glass);backdrop-filter:blur(12px);">

            <!-- Cal header -->
            <div class="flex items-center justify-between px-4 py-3 flex-shrink-0" style="border-bottom:1px solid var(--border-glass);">
              <button type="button" class="btn btn--ghost btn--sm" (click)="prevMonth()">‹</button>
              <div class="text-center">
                <div class="font-semibold" style="color:var(--text-primary);">{{ monthName(calMonth()) }} {{ calYear() }}</div>
                <div class="font-mono text-xs mt-0.5" style="color:var(--text-muted);">COBERTURA SANITARIA · {{ calMonthEventCount() }} EVENTOS</div>
              </div>
              <div class="flex items-center gap-2">
                <button type="button" class="btn btn--ghost btn--sm" style="font-size:11px;" (click)="goToday()">Hoy</button>
                <button type="button" class="btn btn--ghost btn--sm" (click)="nextMonth()">›</button>
              </div>
            </div>

            <!-- DOW row -->
            <div style="display:grid;grid-template-columns:repeat(7,1fr);border-bottom:1px solid var(--border-glass);flex-shrink:0;">
              @for (d of dowLabels; track d) {
                <div class="text-center py-2 font-mono uppercase" style="font-size:10px;color:var(--text-muted);">{{ d }}</div>
              }
            </div>

            <!-- Grid -->
            <div class="flex-1 overflow-y-auto" style="display:grid;grid-template-columns:repeat(7,1fr);grid-auto-rows:minmax(80px,1fr);align-content:start;">
              @for (cell of calCells(); track $index) {
                @if (cell === null) {
                  <div style="border-right:1px solid var(--border-hairline);border-bottom:1px solid var(--border-hairline);background:rgba(0,0,0,0.02);"></div>
                } @else {
                  <div
                    style="border-right:1px solid var(--border-hairline);border-bottom:1px solid var(--border-hairline);padding:6px;display:flex;flex-direction:column;gap:2px;cursor:default;"
                    [style.border]="isToday(cell) ? '2px solid var(--accent-blue)' : ''">
                    <span class="font-mono" style="font-size:12px;font-weight:600;" [style.color]="isToday(cell) ? 'var(--accent-blue)' : 'var(--text-muted)'">{{ cell }}</span>
                    @for (ev of calEventsForDay(cell).slice(0, 3); track ev.id) {
                      <button type="button"
                        style="width:100%;text-align:left;padding:1px 4px;border-radius:3px;border:none;cursor:pointer;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;"
                        [style.background]="typeColor(ev.type) + '33'"
                        [style.color]="typeColor(ev.type)"
                        (click)="selectedEvent.set(ev)">
                        <span class="font-mono" style="font-size:9px;">{{ ev.timeFrom }}</span>
                        <span style="font-size:10px;margin-left:3px;">{{ ev.name }}</span>
                      </button>
                    }
                    @if (calEventsForDay(cell).length > 3) {
                      <button type="button"
                        style="font-size:9px;color:var(--text-muted);background:transparent;border:none;cursor:pointer;text-align:left;padding:0 4px;">
                        + {{ calEventsForDay(cell).length - 3 }} más
                      </button>
                    }
                  </div>
                }
              }
            </div>

            <!-- Legend -->
            <div class="px-4 py-3 flex-shrink-0" style="border-top:1px solid var(--border-glass);">
              <div style="display:flex;flex-wrap:wrap;gap:10px 18px;">
                @for (t of eventTypes; track t) {
                  <div class="flex items-center gap-1.5">
                    <div style="width:10px;height:10px;border-radius:2px;" [style.background]="typeColor(t)"></div>
                    <span style="font-size:11px;color:var(--text-secondary);">{{ t }}</span>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>

      <!-- ── EventDetailPopover ───────────────────────────────────────────── -->
      @if (selectedEvent(); as ev) {
        <div
          style="position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000;"
          (click)="selectedEvent.set(null)">
          <div
            style="width:min(560px,92vw);background:var(--surface-glass);border:1px solid var(--border-glass);border-radius:16px;backdrop-filter:blur(20px);display:flex;flex-direction:column;overflow:hidden;"
            (click)="$event.stopPropagation()">

            <!-- Modal head -->
            <div style="padding:18px 20px 14px;border-bottom:1px solid var(--border-glass);">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-mono uppercase tracking-wider mb-1" style="font-size:10px;" [style.color]="typeColor(ev.type)">{{ ev.type }}</div>
                  <h2 style="font-size:17px;font-weight:700;color:var(--text-primary);margin:0 0 2px;">{{ ev.name }}</h2>
                  <div style="font-size:12px;color:var(--text-muted);">{{ ev.id }} · {{ ev.org }}</div>
                </div>
                <button type="button"
                  style="width:28px;height:28px;border-radius:6px;border:1px solid var(--border-glass);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted);flex-shrink:0;"
                  (click)="selectedEvent.set(null)">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l10 10M11 1L1 11"/></svg>
                </button>
              </div>
              <div class="flex items-center gap-3 mt-3">
                <emx-status-badge [variant]="statusMeta(ev.status).variant" [pulse]="ev.status === 'inprogress'">
                  {{ statusMeta(ev.status).label }}
                </emx-status-badge>
                <span class="font-mono" style="font-size:12px;color:var(--text-muted);">{{ ev.attendees.toLocaleString() }} asistentes estimados</span>
              </div>
            </div>

            <!-- 2×2 detail grid -->
            <div style="padding:16px 20px;display:grid;grid-template-columns:1fr 1fr;gap:12px;border-bottom:1px solid var(--border-glass);">
              <div>
                <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">Inicio</div>
                <div style="font-size:13px;color:var(--text-primary);">{{ fmtDateLong(ev.dateFrom) }} · {{ ev.timeFrom }}</div>
              </div>
              <div>
                <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">Fin</div>
                <div style="font-size:13px;color:var(--text-primary);">{{ fmtDateLong(ev.dateTo) }} · {{ ev.timeTo }}</div>
              </div>
              <div>
                <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">Responsable</div>
                <div style="font-size:13px;color:var(--text-primary);">{{ ev.responsible }}</div>
              </div>
              <div>
                <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-bottom:4px;">Móviles</div>
                <div class="font-mono font-bold" style="font-size:13px;color:var(--accent-emerald);">{{ ev.units.length }} unidades</div>
              </div>
            </div>

            <!-- Address -->
            <div style="padding:12px 20px;border-bottom:1px solid var(--border-glass);display:flex;align-items:center;gap:8px;">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--accent-blue)" stroke-width="1.5" style="flex-shrink:0;">
                <path d="M7 1.5a4 4 0 014 4c0 3-4 7-4 7S3 8.5 3 5.5a4 4 0 014-4z"/>
                <circle cx="7" cy="5.5" r="1.5"/>
              </svg>
              <span style="font-size:13px;color:var(--text-secondary);">{{ ev.address }}</span>
            </div>

            <!-- Units list -->
            <div style="padding:12px 20px 16px;max-height:160px;overflow-y:auto;">
              <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-bottom:8px;letter-spacing:0.08em;">Móviles asignados</div>
              @for (uid of ev.units; track uid) {
                <div style="display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:8px;background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.15);margin-bottom:5px;">
                  <span class="font-mono font-bold" style="font-size:12px;color:var(--accent-emerald);">{{ uid }}</span>
                  <span style="font-size:12px;color:var(--text-secondary);">{{ getUnitCrew(uid) }}</span>
                  <span class="font-mono" style="font-size:10px;color:var(--text-muted);">· {{ getUnitType(uid) }}</span>
                </div>
              }
            </div>

            <!-- Footer -->
            <div style="padding:12px 20px;border-top:1px solid var(--border-glass);display:flex;align-items:center;justify-content:space-between;background:var(--bg-elevated);">
              <span class="font-mono" style="font-size:10px;color:var(--text-muted);">ESC para cerrar</span>
              <div class="flex gap-2">
                <button type="button" class="btn btn--ghost btn--sm">Editar</button>
                <button type="button" class="btn btn--ghost btn--sm">Generar parte</button>
                <button type="button" class="btn btn--primary btn--sm" (click)="selectedEvent.set(null)">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ── NewEventModal (3-step wizard) ───────────────────────────────── -->
      @if (newEventOpen()) {
        <div
          style="position:fixed;inset:0;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;z-index:1000;"
          (click)="newEventOpen.set(false)">
          <div
            style="width:min(640px,94vw);background:var(--surface-glass);border:1px solid var(--border-glass);border-radius:16px;backdrop-filter:blur(20px);display:flex;flex-direction:column;overflow:hidden;"
            (click)="$event.stopPropagation()">

            <!-- Modal head -->
            <div style="padding:18px 20px 14px;border-bottom:1px solid var(--border-glass);">
              <div class="flex items-start justify-between">
                <div>
                  <div class="font-mono uppercase tracking-wider mb-1" style="font-size:10px;color:var(--accent-blue);">● ALTA DE COBERTURA</div>
                  <h2 style="font-size:18px;font-weight:700;color:var(--text-primary);margin:0;">Nuevo evento</h2>
                </div>
                <button type="button"
                  style="width:28px;height:28px;border-radius:6px;border:1px solid var(--border-glass);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted);"
                  (click)="newEventOpen.set(false)">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l10 10M11 1L1 11"/></svg>
                </button>
              </div>

              <!-- Step indicator -->
              <div class="flex items-center gap-0 mt-4">
                @for (step of wizardSteps; track step.index) {
                  <button type="button"
                    style="display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:6px;border:none;background:transparent;cursor:pointer;transition:all 0.15s;"
                    [style.color]="formStep() === step.index ? 'var(--accent-blue)' : formStep() > step.index ? 'var(--accent-emerald)' : 'var(--text-muted)'"
                    (click)="formStep() > step.index ? formStep.set(step.index) : null">
                    @if (formStep() > step.index) {
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 7l3.5 3.5L12 3"/></svg>
                    } @else {
                      <span class="font-mono font-bold" style="font-size:11px;width:16px;height:16px;border-radius:50%;border:1.5px solid currentColor;display:flex;align-items:center;justify-content:center;">{{ step.index + 1 }}</span>
                    }
                    <span style="font-size:12px;font-weight:500;">{{ step.label }}</span>
                  </button>
                  @if (step.index < 2) {
                    <div style="flex:1;height:1px;background:var(--border-glass);margin:0 4px;min-width:20px;"></div>
                  }
                }
              </div>
            </div>

            <!-- Step body -->
            <div style="padding:20px;overflow-y:auto;max-height:58vh;min-height:340px;">

              <!-- Step 0: General data -->
              @if (formStep() === 0) {
                <div style="display:flex;flex-direction:column;gap:14px;">
                  <div style="display:flex;gap:12px;">
                    <div style="flex:2;">
                      <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.04em;">Nombre del evento *</label>
                      <input type="text" placeholder="Ej: Maratón Ciudad 2026"
                        [value]="form().name"
                        (input)="updateForm('name', $any($event.target).value)"
                        style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:13px;outline:none;box-sizing:border-box;" />
                    </div>
                    <div style="flex:1;">
                      <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.04em;">Tipo *</label>
                      <select
                        [value]="form().type"
                        (change)="updateForm('type', $any($event.target).value)"
                        style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:13px;outline:none;cursor:pointer;box-sizing:border-box;">
                        <option value="">Seleccionar...</option>
                        @for (t of eventTypes; track t) {
                          <option [value]="t">{{ t }}</option>
                        }
                      </select>
                    </div>
                  </div>

                  <div style="position:relative;">
                    <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.04em;">Organización</label>
                    <input type="text" placeholder="Buscar organización..."
                      [value]="form().org"
                      (input)="updateFormOrg($any($event.target).value)"
                      style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:13px;outline:none;box-sizing:border-box;" />
                    @if (orgResults().length > 0 && form().org.length > 0) {
                      <div style="position:absolute;top:100%;left:0;right:0;background:var(--bg-elevated);border:1px solid var(--border-glass);border-radius:8px;margin-top:3px;z-index:10;overflow:hidden;max-height:160px;overflow-y:auto;">
                        @for (o of orgResults(); track o) {
                          <button type="button"
                            style="width:100%;text-align:left;padding:8px 12px;border:none;background:transparent;color:var(--text-primary);font-size:13px;cursor:pointer;"
                            (click)="selectOrg(o)">{{ o }}</button>
                        }
                      </div>
                    }
                  </div>

                  <div style="display:flex;gap:12px;">
                    <div style="flex:1;">
                      <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.04em;">Responsable</label>
                      <input type="text" placeholder="Nombre del responsable"
                        [value]="form().responsible"
                        (input)="updateForm('responsible', $any($event.target).value)"
                        style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:13px;outline:none;box-sizing:border-box;" />
                    </div>
                    <div style="flex:1;">
                      <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.04em;">Asistentes estimados</label>
                      <input type="number" placeholder="0" min="0"
                        [value]="form().attendees ?? ''"
                        (input)="updateForm('attendees', +$any($event.target).value || null)"
                        style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:13px;outline:none;box-sizing:border-box;" />
                    </div>
                  </div>
                </div>
              }

              <!-- Step 1: Location and schedule -->
              @if (formStep() === 1) {
                <div style="display:flex;flex-direction:column;gap:14px;">
                  <div style="position:relative;">
                    <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.04em;">
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.5" style="display:inline;margin-right:3px;vertical-align:middle;">
                        <path d="M5.5 1a3 3 0 013 3c0 2.3-3 5.5-3 5.5S2.5 6.3 2.5 4a3 3 0 013-3z"/>
                        <circle cx="5.5" cy="4" r="1"/>
                      </svg>
                      Dirección *
                    </label>
                    <input type="text" placeholder="Dirección completa del evento"
                      [value]="form().address"
                      (input)="updateForm('address', $any($event.target).value)"
                      style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:13px;outline:none;box-sizing:border-box;" />
                  </div>

                  <div style="display:flex;gap:12px;">
                    <div style="flex:1;">
                      <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.04em;">Inicio *</label>
                      <div style="display:flex;gap:6px;">
                        <input type="date"
                          [value]="form().dateFrom"
                          (input)="updateForm('dateFrom', $any($event.target).value)"
                          style="flex:1;padding:8px 6px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:12px;outline:none;" />
                        <input type="time"
                          [value]="form().timeFrom"
                          (input)="updateForm('timeFrom', $any($event.target).value)"
                          style="width:90px;padding:8px 6px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:12px;outline:none;" />
                      </div>
                    </div>
                    <div style="flex:1;">
                      <label style="display:block;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.04em;">Fin *</label>
                      <div style="display:flex;gap:6px;">
                        <input type="date"
                          [value]="form().dateTo"
                          (input)="updateForm('dateTo', $any($event.target).value)"
                          style="flex:1;padding:8px 6px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:12px;outline:none;" />
                        <input type="time"
                          [value]="form().timeTo"
                          (input)="updateForm('timeTo', $any($event.target).value)"
                          style="width:90px;padding:8px 6px;border-radius:8px;border:1px solid var(--border-glass);background:var(--bg-elevated);color:var(--text-primary);font-size:12px;outline:none;" />
                      </div>
                    </div>
                  </div>

                  @if (duration()) {
                    <div style="display:flex;align-items:center;gap:8px;">
                      <span style="font-size:12px;color:var(--text-muted);">Duración calculada:</span>
                      <span style="padding:3px 10px;border-radius:20px;background:rgba(59,130,246,0.12);color:var(--accent-blue);font-size:12px;font-weight:600;font-family:var(--font-mono);">{{ duration() }}</span>
                    </div>
                  }
                </div>
              }

              <!-- Step 2: Unit assignment -->
              @if (formStep() === 2) {
                <div style="display:flex;flex-direction:column;gap:14px;">
                  <!-- Coverage summary -->
                  <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border-glass);">
                    <div style="font-size:13px;color:var(--text-secondary);">
                      <span class="font-mono font-bold" style="font-size:16px;color:var(--text-primary);">{{ form().units.length }}</span>
                      <span style="font-size:12px;"> de </span>
                      <span class="font-mono font-bold" style="font-size:16px;color:var(--text-primary);">{{ recommendedUnits() }}</span>
                      <span style="font-size:12px;"> recomendados</span>
                    </div>
                    @if (form().units.length < recommendedUnits()) {
                      <span style="padding:3px 8px;border-radius:5px;background:rgba(245,158,11,0.15);color:var(--accent-amber);font-size:11px;font-weight:600;">FALTAN {{ recommendedUnits() - form().units.length }}</span>
                    } @else {
                      <span style="padding:3px 8px;border-radius:5px;background:rgba(52,211,153,0.15);color:var(--accent-emerald);font-size:11px;font-weight:600;">COBERTURA OK</span>
                    }
                  </div>

                  <!-- Assigned units -->
                  @if (form().units.length > 0) {
                    <div>
                      <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);margin-bottom:6px;letter-spacing:0.08em;">Asignados</div>
                      <div style="display:flex;flex-wrap:wrap;gap:6px;">
                        @for (uid of form().units; track uid) {
                          <div style="display:flex;align-items:center;gap:6px;padding:4px 8px 4px 10px;border-radius:20px;background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.25);">
                            <span class="font-mono font-bold" style="font-size:12px;color:var(--accent-emerald);">{{ uid }}</span>
                            <span style="font-size:11px;color:var(--text-secondary);">{{ getUnitCrew(uid) }}</span>
                            <button type="button"
                              style="width:14px;height:14px;border-radius:50%;border:1px solid rgba(52,211,153,0.4);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--accent-emerald);padding:0;"
                              (click)="removeUnit(uid)">
                              <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 1l6 6M7 1L1 7"/></svg>
                            </button>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <!-- Available pool -->
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <div class="font-mono uppercase" style="font-size:9px;color:var(--text-muted);letter-spacing:0.08em;">Disponibles para asignar</div>
                      <div class="flex items-center gap-1">
                        @for (f of unitTypeFilters; track f.value) {
                          <button type="button"
                            style="padding:2px 8px;border-radius:5px;font-size:10px;border:1px solid;cursor:pointer;"
                            [style.background]="unitTypeFilter() === f.value ? 'rgba(59,130,246,0.15)' : 'transparent'"
                            [style.border-color]="unitTypeFilter() === f.value ? 'var(--accent-blue)' : 'var(--border-glass)'"
                            [style.color]="unitTypeFilter() === f.value ? 'var(--accent-blue)' : 'var(--text-muted)'"
                            (click)="unitTypeFilter.set(f.value)">{{ f.label }}</button>
                        }
                      </div>
                    </div>
                    <div style="max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:4px;">
                      @for (amb of filteredAvailable(); track amb.id) {
                        <div style="display:flex;align-items:center;padding:7px 10px;border-radius:8px;background:var(--bg-elevated);border:1px solid var(--border-glass);">
                          <span class="font-mono font-bold" style="font-size:12px;color:var(--accent-emerald);width:44px;flex-shrink:0;">{{ amb.id }}</span>
                          <span style="font-size:12px;color:var(--text-secondary);flex:1;">{{ amb.crew }}</span>
                          <span style="padding:1px 5px;border-radius:4px;font-size:10px;font-weight:600;margin-right:8px;"
                            [style.background]="amb.type === 'ALS' ? 'rgba(59,130,246,0.12)' : 'rgba(52,211,153,0.12)'"
                            [style.color]="amb.type === 'ALS' ? 'var(--accent-blue)' : 'var(--accent-emerald)'">{{ amb.type }}</span>
                          <button type="button" class="btn btn--ghost btn--sm" style="font-size:11px;padding:3px 8px;" (click)="addUnit(amb.id)">+ Asignar</button>
                        </div>
                      }
                      @if (filteredAvailable().length === 0) {
                        <div style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px;">No hay unidades disponibles</div>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Modal footer -->
            <div style="padding:12px 20px;border-top:1px solid var(--border-glass);display:flex;align-items:center;justify-content:space-between;background:var(--bg-elevated);">
              <div class="flex items-center gap-3">
                <span class="font-mono" style="font-size:10px;color:var(--text-muted);">ESC para cancelar</span>
                <span style="font-size:11px;color:var(--text-muted);">Paso {{ formStep() + 1 }} de 3</span>
              </div>
              <div class="flex gap-2">
                @if (formStep() > 0) {
                  <button type="button" class="btn btn--ghost btn--sm" (click)="formStep.update(s => s - 1)">‹ Anterior</button>
                }
                <button type="button" class="btn btn--ghost btn--sm" (click)="newEventOpen.set(false)">Cancelar</button>
                @if (formStep() < 2) {
                  <button type="button" class="btn btn--primary btn--sm"
                    [disabled]="!canAdvance()"
                    [style.opacity]="canAdvance() ? '1' : '0.5'"
                    (click)="canAdvance() ? formStep.update(s => s + 1) : null">
                    Siguiente ›
                  </button>
                } @else {
                  <button type="button" class="btn btn--primary btn--sm"
                    [disabled]="form().units.length === 0"
                    [style.opacity]="form().units.length > 0 ? '1' : '0.5'"
                    (click)="form().units.length > 0 ? submitNewEvent() : null">
                    Registrar evento
                  </button>
                }
              </div>
            </div>
          </div>
        </div>
      }

    </div>
  `,
})
export class EventsComponent implements OnInit {
    private destroyRef = inject(DestroyRef);
  private eventsApi = inject(EventsApiService);
  private fleetApi = inject(FleetApiService);

  // ── Ambulances signal (populated from backend on init) ────────────────────
  readonly ambulances = signal<AmbUnit[]>([]);

  // ── State ──────────────────────────────────────────────────────────────────
  readonly view = signal<'list' | 'calendar'>('list');
  readonly events = signal<EventItem[]>([]);
  readonly selectedEvent = signal<EventItem | null>(null);
  readonly newEventOpen = signal(false);

  // List filters
  readonly searchQuery = signal('');
  readonly statusFilter = signal<string>('all');
  readonly typeFilter = signal<string>('all');

  // Calendar state
  readonly calMonth = signal<DateTime>(DateUtils.now().startOf('month'));
  readonly calYear = computed(() => this.calMonth().year);

  // New event form
  readonly form = signal<NewEventForm>(initialForm());
  readonly formStep = signal(0);
  readonly orgQuery = signal('');
  readonly unitTypeFilter = signal<'all' | 'ALS' | 'BLS'>('all');

  // ── Static lookups ─────────────────────────────────────────────────────────
  readonly eventTypes = EVENT_TYPES;
  readonly dowLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  readonly statusFilters = [
    { value: 'all',        label: 'Todos'      },
    { value: 'scheduled',  label: 'Programado' },
    { value: 'inprogress', label: 'En curso'   },
    { value: 'closed',     label: 'Cerrado'    },
  ];
  readonly wizardSteps = [
    { index: 0, label: 'Datos generales'       },
    { index: 1, label: 'Ubicación y horarios'  },
    { index: 2, label: 'Asignación de móviles' },
  ];
  readonly unitTypeFilters = [
    { value: 'all' as const, label: 'Todos' },
    { value: 'ALS' as const, label: 'ALS'   },
    { value: 'BLS' as const, label: 'BLS'   },
  ];

  // ── Computed ───────────────────────────────────────────────────────────────
  readonly headerKpis = computed(() => {
    const all = this.events();
    const today = DateUtils.todayYmd();
    const thisMonth = today.slice(0, 7);
    const hoy   = all.filter(e => e.dateFrom === today).length;
    const mes   = all.filter(e => e.dateFrom.startsWith(thisMonth)).length;
    const enCurso = all.filter(e => e.status === 'inprogress').length;
    const movilesSet = new Set(all.filter(e => e.status !== 'closed').flatMap(e => e.units));
    return [
      { label: 'Hoy',              value: hoy,              color: 'var(--text-primary)'   },
      { label: 'Este mes',         value: mes,              color: 'var(--text-primary)'   },
      { label: 'En curso',         value: enCurso,          color: 'var(--accent-amber)'   },
      { label: 'Móviles afectados', value: movilesSet.size, color: 'var(--accent-emerald)' },
    ];
  });

  readonly filteredEvents = computed(() => {
    const q    = this.searchQuery().toLowerCase();
    const st   = this.statusFilter();
    const type = this.typeFilter();
    return this.events()
      .filter(e => {
        if (st !== 'all' && e.status !== st) return false;
        if (type !== 'all' && e.type !== type) return false;
        if (q && !e.name.toLowerCase().includes(q) && !e.id.toLowerCase().includes(q) && !e.org.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.dateFrom.localeCompare(b.dateFrom));
  });

  readonly groupedEvents = computed(() => {
    const map = new Map<string, { label: string; events: EventItem[] }>();
    for (const ev of this.filteredEvents()) {
      const d = DateUtils.fromISO(ev.dateFrom);
      const key = d.toFormat('yyyy-MM');
      if (!map.has(key)) {
        map.set(key, { label: `${EV_MONTH_NAMES[d.month - 1]} ${d.year}`, events: [] });
      }
      map.get(key)!.events.push(ev);
    }
    return Array.from(map.entries()).map(([key, val]) => ({ key, ...val }));
  });

  readonly calCells = computed((): (number | null)[] => {
    const m = this.calMonth();
    const first = m.startOf('month');
    const startDay = first.weekday - 1; // Lunes = 0 en indexación de 0 a 6
    const daysInMonth = m.daysInMonth ?? 30;
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  });

  readonly calEventsByDate = computed(() => {
    const m = new Map<string, EventItem[]>();
    const cm = this.calMonth();
    const yr = cm.year;
    const mo = cm.month;
    for (const ev of this.events()) {
      const d = DateUtils.fromISO(ev.dateFrom);
      if (d.year === yr && d.month === mo) {
        const key = String(d.day);
        if (!m.has(key)) m.set(key, []);
        m.get(key)!.push(ev);
      }
    }
    return m;
  });

  readonly calMonthEventCount = computed(() => {
    const cm = this.calMonth();
    const yr = cm.year;
    const mo = cm.month;
    return this.events().filter(e => {
      const d = DateUtils.fromISO(e.dateFrom);
      return d.year === yr && d.month === mo;
    }).length;
  });

  readonly orgResults = computed(() => {
    const q = this.orgQuery().toLowerCase();
    if (!q) return [];
    return EVENT_ORGS.filter(o => o.toLowerCase().includes(q));
  });

  readonly availableForEvents = computed(() => {
    const assignedIds = new Set(this.form().units);
    return this.ambulances().filter(a => a.status !== 'maintenance' && !assignedIds.has(a.id));
  });

  readonly filteredAvailable = computed(() => {
    const tf = this.unitTypeFilter();
    return this.availableForEvents().filter(a => tf === 'all' || a.type === tf);
  });

  readonly duration = computed(() => {
    const f = this.form();
    if (!f.dateFrom || !f.timeFrom || !f.dateTo || !f.timeTo) return '';
    const from = DateUtils.fromISO(`${f.dateFrom}T${f.timeFrom}`);
    const to   = DateUtils.fromISO(`${f.dateTo}T${f.timeTo}`);
    if (!from.isValid || !to.isValid) return '';
    const diff = to.diff(from, ['hours', 'minutes']);
    const hrs = Math.floor(diff.hours);
    const mins = Math.floor(diff.minutes);
    if (hrs < 0 || (hrs === 0 && mins <= 0)) return '';
    return mins > 0 ? `${hrs}h ${mins}min` : `${hrs}h`;
  });

  readonly recommendedUnits = computed(() => {
    const att = this.form().attendees ?? 0;
    return Math.max(1, Math.ceil(att / 5000));
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.loadEvents();
    this.fleetApi.ambulancias().pipe(
      catchError(() => of([])), takeUntilDestroyed(this.destroyRef)
    ).subscribe(units => {
      this.ambulances.set(units.map(u => ({
        id:     u.identificador ?? String(u.id),
        crew:   u.tripulacion ?? '—',
        type:   (u.tipo === 'ALS' ? 'ALS' : 'BLS') as 'ALS' | 'BLS',
        status: u.estado?.toLowerCase() ?? 'available',
      })));
    });
  }

  private loadEvents(): void {
    this.eventsApi.getAll().pipe(
      catchError(() => of([])), takeUntilDestroyed(this.destroyRef)
    ).subscribe(data => this.events.set(data));
  }

  // ── Methods ────────────────────────────────────────────────────────────────

  submitNewEvent(): void {
    const f = this.form();
    const payload: FrontendEvento = {
      id:          '',
      name:        f.name,
      type:        f.type as FrontendEvento['type'],
      org:         f.org || '',
      responsible: f.responsible || '',
      attendees:   f.attendees ?? 0,
      address:     f.address,
      dateFrom:    f.dateFrom,
      timeFrom:    f.timeFrom,
      dateTo:      f.dateTo,
      timeTo:      f.timeTo,
      units:       [...f.units],
      status:      'scheduled',
    };
    this.eventsApi.create(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.loadEvents();
            this.newEventOpen.set(false);
            this.form.set(initialForm());
            this.formStep.set(0);
          });
  }

  openNewEvent(): void {
    this.form.set(initialForm());
    this.formStep.set(0);
    this.orgQuery.set('');
    this.newEventOpen.set(true);
  }

  updateForm(key: keyof NewEventForm, value: string | number | null | string[]): void {
    this.form.update(f => ({ ...f, [key]: value }));
  }

  updateFormOrg(value: string): void {
    this.orgQuery.set(value);
    this.form.update(f => ({ ...f, org: value }));
  }

  selectOrg(org: string): void {
    this.form.update(f => ({ ...f, org }));
    this.orgQuery.set('');
  }

  addUnit(id: string): void {
    this.form.update(f => ({ ...f, units: [...f.units, id] }));
  }

  removeUnit(id: string): void {
    this.form.update(f => ({ ...f, units: f.units.filter(u => u !== id) }));
  }

  canAdvance(): boolean {
    const f = this.form();
    if (this.formStep() === 0) return !!(f.name && f.type);
    if (this.formStep() === 1) return !!(f.address && f.dateFrom && f.timeFrom && f.dateTo && f.timeTo);
    return f.units.length > 0;
  }

  prevMonth(): void {
    this.calMonth.update(m => m.minus({ months: 1 }));
  }

  nextMonth(): void {
    this.calMonth.update(m => m.plus({ months: 1 }));
  }

  goToday(): void {
    this.calMonth.set(DateUtils.now().startOf('month'));
  }

  isToday(day: number): boolean {
    const today = DateUtils.now();
    const current = this.calMonth();
    return today.year === current.year && today.month === current.month && today.day === day;
  }

  calEventsForDay(day: number): EventItem[] {
    return this.calEventsByDate().get(String(day)) ?? [];
  }

  dayOfWeek(dateStr: string): string {
    const d = DateUtils.fromISO(dateStr);
    return DOW_SHORT[d.weekday - 1];
  }

  monthName(dt: DateTime): string {
    return EV_MONTH_NAMES[dt.month - 1] ?? '';
  }

  fmtDateLong(s: string): string {
    const d = DateUtils.fromISO(s);
    return `${d.day} ${EV_MONTH_NAMES[d.month - 1]} ${d.year}`;
  }

  typeColor(type: string): string {
    return EVENT_TYPE_COLORS[type] ?? 'var(--text-muted)';
  }

  statusMeta(status: string): { label: string; variant: BadgeVariant } {
    switch (status) {
      case 'scheduled':  return { label: 'Programado', variant: 'stable'   };
      case 'inprogress': return { label: 'En curso',   variant: 'urgent'   };
      case 'closed':     return { label: 'Cerrado',    variant: 'info'     };
      default:           return { label: status,       variant: 'info'     };
    }
  }

  getUnitCrew(id: string): string {
    return this.ambulances().find(a => a.id === id)?.crew ?? '—';
  }

  getUnitType(id: string): string {
    return this.ambulances().find(a => a.id === id)?.type ?? '—';
  }
}
