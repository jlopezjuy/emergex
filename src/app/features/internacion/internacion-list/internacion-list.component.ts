import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { InternacionStore } from '../../../core/stores/internacion.store';
import { InternacionApiService } from '../../../data-access/api/internacion.api';
import { EstadoInternacion, AlertaInternacion, VisitaProgramadaDTO } from '../../../data-access/dto/internacion.dto';

@Component({
  selector: 'emx-internacion-list',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-semibold" style="color: var(--text-primary)">
            Internación Domiciliaria
          </h1>
          <p class="text-sm mt-1" style="color: var(--text-muted)">
            {{ store.countActivas() }} activas · {{ visitasPendientes() }} visitas pendientes hoy
          </p>
        </div>
        <a
          routerLink="/internacion/nueva"
          class="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:scale-105"
          style="background: var(--accent-emerald); color: #fff; box-shadow: 0 0 20px rgba(16,185,129,0.3)"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M8 3v10M3 8h10"/>
          </svg>
          Nueva Internación
        </a>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-4 gap-4 mb-6">
        @for (kpi of kpis(); track kpi.label) {
          <div
            class="rounded-xl px-5 py-4 border transition-all"
            style="background: var(--surface-glass); border-color: var(--border-glass)"
          >
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                [style.background]="kpi.bg"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5"
                  [attr.stroke]="kpi.color">
                  @if (kpi.icon === 'bed') {
                    <path d="M3 5h12v6a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"/><path d="M3 8h12"/>
                  } @else if (kpi.icon === 'clock') {
                    <circle cx="9" cy="9" r="7"/><path d="M9 5v4l3 2"/>
                  } @else if (kpi.icon === 'alert') {
                    <path d="M9 2l7 13H2L9 2z"/><path d="M9 8v2M9 12v1"/>
                  } @else {
                    <circle cx="7" cy="6" r="3"/><path d="M2 15c0-3.31 2.69-6 6-6"/><circle cx="13" cy="9" r="2.5"/><path d="M11 14c0-1.93 1.12-3 3.5-3s3.5 1.07 3.5 3"/>
                  }
                </svg>
              </div>
              <div>
                <div class="text-2xl font-bold" [style.color]="kpi.color">{{ kpi.value }}</div>
                <div class="text-xs font-medium uppercase tracking-wider" style="color: var(--text-muted)">{{ kpi.label }}</div>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Filters -->
      <div class="flex items-center gap-3 mb-6">
        <div class="relative flex-1 max-w-sm">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-muted)" stroke-width="1.5">
            <circle cx="6" cy="6" r="4.5"/><path d="M9.5 9.5L13 13"/>
          </svg>
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Buscar paciente..."
            class="w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary)"
          />
        </div>
        <div class="flex gap-1.5">
          @for (f of statusFilters; track f.value) {
            <button
              (click)="activeFilter.set(f.value)"
              class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
              [style.background]="activeFilter() === f.value ? f.bg : 'transparent'"
              [style.color]="activeFilter() === f.value ? '#fff' : 'var(--text-muted)'"
              [style.borderColor]="activeFilter() === f.value ? f.color : 'var(--border-glass)'"
            >
              {{ f.label }}
            </button>
          }
        </div>
      </div>

      <!-- Content -->
      @if (store.loading()) {
        <div class="rounded-xl p-12 text-center border" style="background: var(--surface-glass); border-color: var(--border-glass)">
          <div class="inline-flex gap-2 mb-3">
            <div class="w-3 h-3 rounded-full animate-pulse" style="background: var(--accent-emerald)"></div>
            <div class="w-3 h-3 rounded-full animate-pulse" style="background: var(--accent-amber); animation-delay: 0.15s"></div>
            <div class="w-3 h-3 rounded-full animate-pulse" style="background: var(--accent-blue); animation-delay: 0.3s"></div>
          </div>
          <p style="color: var(--text-muted)">Cargando internaciones...</p>
        </div>
      } @else if (store.error()) {
        <div class="rounded-xl p-8 text-center border" style="background: rgba(239,68,68,0.05); border-color: rgba(239,68,68,0.2)">
          <svg class="mx-auto mb-3" width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="var(--accent-red)" stroke-width="1.5">
            <circle cx="16" cy="16" r="12"/><path d="M16 10v8M16 22v1"/>
          </svg>
          <p style="color: var(--accent-red)">{{ store.error() }}</p>
          <button (click)="store.cargarActivas()" class="mt-3 px-4 py-1.5 rounded-lg text-xs font-medium"
            style="background: var(--surface-glass); border: 1px solid var(--accent-red); color: var(--accent-red)">
            Reintentar
          </button>
        </div>
      } @else if (filtered().length === 0) {
        <div class="rounded-xl p-12 text-center border border-dashed" style="background: var(--surface-glass); border-color: var(--border-glass)">
          <svg class="mx-auto mb-3" width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="var(--text-muted)" stroke-width="1.2" opacity="0.6">
            <path d="M8 12h24v14a4 4 0 01-4 4H12a4 4 0 01-4-4V12z"/><path d="M8 12V8a8 8 0 018-8h8a8 8 0 018 8v4"/><path d="M14 20h12"/>
          </svg>
          <p class="text-lg font-medium mb-1" style="color: var(--text-primary)">Sin internaciones</p>
          <p class="text-sm mb-4" style="color: var(--text-muted)">No hay internaciones que coincidan con el filtro actual</p>
          <a routerLink="/internacion/nueva"
            class="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style="background: var(--accent-emerald); color: #fff">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3v8M3 7h8"/></svg>
            Nueva Internación
          </a>
        </div>
      } @else {
        <div class="grid grid-cols-2 gap-4">
          @for (i of filtered(); track i.id) {
            <a
              [routerLink]="['/internacion', i.id]"
              class="group rounded-xl p-5 border transition-all hover:scale-[1.01]"
              style="background: var(--surface-glass); border-color: var(--border-glass)"
            >
              <!-- Top row: patient + estado -->
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div
                    class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    [style.background]="avatarBg(i.paciente?.apellido ?? '')"
                    style="color: #fff"
                  >
                    {{ initials(i.paciente?.apellido, i.paciente?.nombre) }}
                  </div>
                  <div>
                    <div class="font-semibold text-sm leading-tight" style="color: var(--text-primary)">
                      {{ i.paciente?.apellido }}, {{ i.paciente?.nombre || '—' }}
                    </div>
                    <div class="text-xs mt-0.5" style="color: var(--text-secondary)">
                      {{ i.paciente?.dni || '—' }} · #{{ i.id }}
                    </div>
                  </div>
                </div>
                <span
                  class="px-2.5 py-1 rounded-full text-xs font-semibold"
                  [style.background]="estadoBg(i.estado)"
                  [style.color]="estadoColor(i.estado)"
                >
                  {{ estadoLabel(i.estado) }}
                </span>
              </div>

              <!-- Divider -->
              <div class="border-t mb-3" style="border-color: var(--border-glass)"></div>

              <!-- Info grid -->
              <div class="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div class="flex items-center gap-1.5" style="color: var(--text-muted)">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="6" r="4.5"/><path d="M6 3.5v3l2 1.5"/></svg>
                  {{ i.fechaInicio | date:'dd/MM/yy' }}
                </div>
                <div class="flex items-center gap-1.5 truncate" style="color: var(--text-muted)">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="5" cy="4" r="2"/><path d="M2 10c0-1.66 1.34-3 3-3"/><circle cx="9" cy="6" r="1.25"/><path d="M7.75 9c0-0.97.56-1.5 1.75-1.5s1.75.53 1.75 1.5"/>
                  </svg>
                  {{ i.equipoTratantes?.length ?? 0 }} profesionales
                </div>
                <div class="flex items-center gap-1.5 truncate col-span-2" style="color: var(--text-muted)">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 6l5-5 5 5v4.5a0.5 0.5 0 01-0.5 0.5h-2.5V7H4v4H1.5a0.5 0.5 0 01-0.5-0.5V6z"/></svg>
                  <span class="truncate">{{ i.direccionInternacion }}</span>
                </div>
              </div>

              <!-- Footer -->
              <div class="flex items-center justify-between mt-3 pt-3 border-t" style="border-color: var(--border-glass)">
                <div class="flex items-center gap-1 text-xs" style="color: var(--text-muted)">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 3L3 9M9 9H3V3"/></svg>
                  {{ i.familiarResponsable }}
                </div>
                <span class="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                  style="color: var(--accent-emerald)">
                  Ver detalle →
                </span>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class InternacionListComponent implements OnInit {
  store = inject(InternacionStore);
  private api = inject(InternacionApiService);

  searchQuery = '';
  activeFilter = signal('TODOS');
  visitasPendientes = signal(0);
  alertasAbiertas = signal(0);

  statusFilters = [
    { value: 'TODOS', label: 'Todos', color: 'var(--text-secondary)', bg: 'var(--surface-glass)' },
    { value: 'ADMITIDA', label: 'Admitida', color: 'var(--accent-amber)', bg: 'var(--accent-amber)' },
    { value: 'EVALUADA', label: 'Evaluada', color: 'var(--accent-blue)', bg: 'var(--accent-blue)' },
    { value: 'ACTIVA', label: 'Activa', color: 'var(--accent-emerald)', bg: 'var(--accent-emerald)' },
    { value: 'SUSPENDIDA_POR_TRASLADO', label: 'Suspendida', color: 'var(--accent-red)', bg: 'var(--accent-red)' },
  ];

  kpis = computed(() => [
    {
      label: 'Activas',
      value: this.store.countActivas(),
      color: 'var(--accent-emerald)',
      bg: 'rgba(16,185,129,0.1)',
      icon: 'bed',
    },
    {
      label: 'Pendientes hoy',
      value: this.visitasPendientes(),
      color: 'var(--accent-amber)',
      bg: 'rgba(245,158,11,0.1)',
      icon: 'clock',
    },
    {
      label: 'Alertas',
      value: this.alertasAbiertas(),
      color: 'var(--accent-red)',
      bg: 'rgba(239,68,68,0.1)',
      icon: 'alert',
    },
    {
      label: 'Equipo total',
      value: this.store.activas().reduce((s, i) => s + (i.equipoTratantes?.length ?? 0), 0),
      color: 'var(--accent-blue)',
      bg: 'rgba(59,130,246,0.1)',
      icon: 'team',
    },
  ]);

  filtered = computed(() => {
    const q = this.searchQuery.toLowerCase();
    const f = this.activeFilter();
    return this.store.activasFiltradas().filter((i) => {
      if (f !== 'TODOS' && i.estado !== f) return false;
      if (!q) return true;
      const name = `${i.paciente?.apellido ?? ''} ${i.paciente?.nombre ?? ''}`.toLowerCase();
      return name.includes(q) || (i.paciente?.dni ?? '').includes(q) || String(i.id).includes(q);
    });
  });

  ngOnInit(): void {
    this.store.cargarActivas();
    this.loadKPIs();
  }

  private loadKPIs(): void {
    this.api.getVisitasPendientes().subscribe({
      next: (data) => this.visitasPendientes.set(data?.length ?? 0),
    });
    this.api.getAlertasAbiertas().subscribe({
      next: (data) => this.alertasAbiertas.set(data?.length ?? 0),
    });
  }

  estadoLabel(estado: EstadoInternacion): string {
    const map: Record<string, string> = {
      ADMITIDA: 'Admitida',
      EVALUADA: 'Evaluada',
      ACTIVA: 'Activa',
      SUSPENDIDA_POR_TRASLADO: 'Suspendida',
      FINALIZADA: 'Finalizada',
      RECHAZADA: 'Rechazada',
    };
    return map[estado] ?? estado;
  }

  estadoColor(estado: EstadoInternacion): string {
    const map: Record<string, string> = {
      ADMITIDA: 'var(--accent-amber)',
      EVALUADA: 'var(--accent-blue)',
      ACTIVA: 'var(--accent-emerald)',
      SUSPENDIDA_POR_TRASLADO: 'var(--accent-red)',
      FINALIZADA: 'var(--text-muted)',
      RECHAZADA: 'var(--accent-red)',
    };
    return map[estado] ?? 'var(--text-muted)';
  }

  estadoBg(estado: EstadoInternacion): string {
    const c = this.estadoColor(estado);
    return c.replace(')', ',0.12)').replace('var(--', 'rgba(').replace('var(--accent-', '').replace('var(--text-', '');
  }

  avatarBg(nombre: string): string {
    const colors = ['var(--accent-blue)', 'var(--accent-emerald)', '#a855f7', 'var(--accent-cyan)', 'var(--accent-amber)', 'var(--accent-red)'];
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  initials(apellido?: string, nombre?: string): string {
    const a = apellido?.charAt(0) ?? '';
    const n = nombre?.charAt(0) ?? '';
    return (a + n).toUpperCase() || '?';
  }
}
