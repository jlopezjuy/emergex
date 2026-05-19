import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { InternacionStore } from '../../../core/stores/internacion.store';
import { InternacionApiService } from '../../../data-access/api/internacion.api';
import { InternacionDomiciliariaDTO, EstadoInternacion } from '../../../data-access/dto/internacion.dto';
import { OverviewTabComponent } from './tabs/overview-tab.component';
import { EvaluacionTabComponent } from './tabs/evaluacion-tab.component';
import { PlanTabComponent } from './tabs/plan-tab.component';
import { EquipoTabComponent } from './tabs/equipo-tab.component';
import { VisitasTabComponent } from './tabs/visitas-tab.component';
import { PrescripcionesTabComponent } from './tabs/prescripciones-tab.component';
import { SignosTabComponent } from './tabs/signos-tab.component';
import { InsumosTabComponent } from './tabs/insumos-tab.component';
import { AutorizacionesTabComponent } from './tabs/autorizaciones-tab.component';
import { AdjuntosTabComponent } from './tabs/adjuntos-tab.component';
import { CierreTabComponent } from './tabs/cierre-tab.component';

const TABS = ['general', 'evaluacion', 'plan', 'equipo', 'visitas', 'prescripciones', 'signos', 'insumos', 'autorizaciones', 'adjuntos', 'cierre'] as const;
type TabId = (typeof TABS)[number];

const TAB_LABELS: Record<TabId, string> = {
  general: 'General',
  evaluacion: 'Evaluación',
  plan: 'Plan de Cuidado',
  equipo: 'Equipo',
  visitas: 'Visitas',
  prescripciones: 'Prescripciones',
  signos: 'Signos',
  insumos: 'Insumos',
  autorizaciones: 'Autorizaciones',
  adjuntos: 'Adjuntos',
  cierre: 'Cierre',
};

@Component({
  selector: 'emx-internacion-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, OverviewTabComponent, EvaluacionTabComponent, PlanTabComponent, EquipoTabComponent, VisitasTabComponent,     PrescripcionesTabComponent, SignosTabComponent, InsumosTabComponent,     AutorizacionesTabComponent, AdjuntosTabComponent, CierreTabComponent],
  template: `
    <div class="p-6">
      <!-- Back -->
      <a
        routerLink="/internacion"
        class="text-sm hover:underline mb-4 inline-flex items-center gap-1"
        style="color: var(--text-secondary)"
      >
        ← Volver al listado
      </a>

      @if (internacion(); as i) {
        <!-- Header -->
        <div
          class="rounded-xl p-6 mb-6"
          style="background: var(--surface-glass); border: 1px solid var(--border-glass)"
        >
          <div class="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 class="text-2xl font-semibold" style="color: var(--text-primary)">
                {{ i.paciente?.apellido }}, {{ i.paciente?.nombre }}
              </h1>
              <p class="text-sm mt-1" style="color: var(--text-secondary)">
                {{ i.paciente?.dni }} · Internación #{{ i.id }}
              </p>
            </div>
            <div class="flex items-center gap-4">
              <span
                class="px-3 py-1 rounded-full text-sm font-medium"
                [style.background]="estadoColor(i.estado)"
                style="color: #fff"
              >
                {{ i.estado }}
              </span>
              <span class="text-sm" style="color: var(--text-muted)">
                Desde {{ i.fechaInicio | date:'dd/MM/yy' }}
              </span>
            </div>
          </div>
          <div class="mt-3 flex items-center gap-2 text-sm" style="color: var(--text-muted)">
            <span>{{ i.direccionInternacion }}</span>
            <span>·</span>
            <span>{{ i.familiarResponsable }}</span>
            <span>·</span>
            <span>{{ i.telefonoEmergencia }}</span>
          </div>
        </div>

        <!-- Tab Navigation -->
        <div class="flex gap-1 overflow-x-auto pb-2 mb-6" style="border-bottom: 1px solid var(--border-glass)">
          @for (tab of TABS; track tab) {
            <button
              (click)="activeTab.set(tab)"
              class="px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors"
              [style.background]="activeTab() === tab ? 'var(--surface-glass)' : 'transparent'"
              [style.color]="activeTab() === tab ? 'var(--text-primary)' : 'var(--text-muted)'"
              [style.borderBottom]="activeTab() === tab ? '2px solid var(--accent-emerald)' : '2px solid transparent'"
            >
              {{ TAB_LABELS[tab] }}
            </button>
          }
        </div>

        <!-- Tab Content -->
        @switch (activeTab()) {
          @case ('general') {
            <emx-overview-tab [internacion]="i" />
          }
          @case ('evaluacion') {
            <emx-evaluacion-tab [internacion]="i" />
          }
          @case ('plan') {
            <emx-plan-tab [internacion]="i" />
          }
          @case ('equipo') {
            <emx-equipo-tab [internacion]="i" />
          }
          @case ('visitas') {
            <emx-visitas-tab [internacion]="i" />
          }
          @case ('prescripciones') {
            <emx-prescripciones-tab [internacion]="i" />
          }
          @case ('signos') {
            <emx-signos-tab [internacion]="i" />
          }
          @case ('insumos') {
            <emx-insumos-tab [internacion]="i" />
          }
          @case ('autorizaciones') {
            <emx-autorizaciones-tab [internacion]="i" />
          }
          @case ('adjuntos') {
            <emx-adjuntos-tab [internacion]="i" />
          }
          @case ('cierre') {
            <emx-cierre-tab [internacion]="i" />
          }
          @default {
            <div
              class="rounded-xl p-8 text-center"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass)"
            >
              <p style="color: var(--text-muted)">Próximamente — Chunks F4–F6</p>
            </div>
          }
        }
      } @else {
        <div class="text-center py-12" style="color: var(--text-muted)">Cargando internación...</div>
      }
    </div>
  `,
})
export class InternacionDetailComponent {
  private route = inject(ActivatedRoute);
  private store = inject(InternacionStore);
  private api = inject(InternacionApiService);

  TABS = TABS;
  TAB_LABELS = TAB_LABELS;
  activeTab = signal<TabId>('general');
  internacion = signal<InternacionDomiciliariaDTO | null>(null);

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      // Try store first, fallback to direct load
      const cached = this.store.activas().find((a) => a.id === id);
      if (cached) {
        this.internacion.set(cached);
        this.store.seleccionada.set(cached);
      }
      // Load fresh data for timeline/contactos/etc
      this.store.seleccionarInternacion(id);
      if (!cached) {
        this.internacion.set(this.store.seleccionada());
      }
    }
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
}
