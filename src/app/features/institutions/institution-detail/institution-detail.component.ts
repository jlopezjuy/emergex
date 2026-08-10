import { Component, signal, inject, OnInit, computed, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InstitutionsApiService } from '../../../data-access/api/institutions.api';
import {
  InstitutionDTO,
  ContractDTO,
  InstitucionEstadoCuentaDTO,
  InstitucionMiembroItem,
  FacturacionContratoDTO
} from '../../../data-access/dto/institution.dto';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { DocumentosAdjuntosComponent } from '../../../shared/components/documentos-adjuntos/documentos-adjuntos.component';
import { ExcepcionDeudaModalComponent } from '../components/excepcion-deuda-modal/excepcion-deuda-modal.component';

export type InstitutionDetailTab =
  | 'contrato'
  | 'personas-cubiertas'
  | 'facturacion-capita'
  | 'pagos-deuda'
  | 'documentacion'
  | 'historial';

function fmtCurrency(n?: number): string {
  return '$' + (n ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

@Component({
  selector: 'emx-institution-detail',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    StatusBadgeComponent,
    KpiCardComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    DocumentosAdjuntosComponent,
    ExcepcionDeudaModalComponent
  ],
  template: `
    <div class="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <!-- Breadcrumb -->
      <div class="flex items-center justify-between">
        <a routerLink="/institutions" class="text-xs font-medium flex items-center gap-1 hover:underline" style="color: var(--accent-blue);">
          ← Volver al catálogo de instituciones / convenios
        </a>
      </div>

      @if (loading()) {
        <emx-loading-state />
      } @else if (!institucionId()) {
        <emx-error-state message="Institución no encontrada. El ID en la URL no es válido." />
      } @else if (mainError()) {
        <emx-error-state [message]="mainError()!" (retry)="cargarInstitucion()" />
      } @else {
        <!-- Encabezado Ficha de Convenio -->
        <div class="glass rounded-panel p-5 flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b pb-4" style="border-color: var(--border-glass);">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-3">
                <h1 class="text-xl font-bold" style="color: var(--text-primary);">
                  {{ institucion()?.name }}
                </h1>
                <emx-status-badge [variant]="institucion()?.status === 'ACTIVA' ? 'stable' : 'critical'">
                  {{ institucion()?.status || 'INACTIVA' }}
                </emx-status-badge>
              </div>
              <span class="text-xs font-mono" style="color: var(--text-muted);">
                Razón Social: <strong style="color: var(--text-secondary);">{{ institucion()?.razonSocial || '—' }}</strong> · CUIT: <strong style="color: var(--text-secondary);">{{ institucion()?.cuit || '—' }}</strong> · Tipo: <strong style="color: var(--text-secondary);">{{ institucion()?.type || '—' }}</strong>
              </span>
            </div>

            <!-- Acciones de cabecera -->
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border"
                style="background-color: var(--bg-panel); color: var(--text-primary); border-color: var(--border-glass);"
                (click)="mostrarModalExcepcion.set(true)"
              >
                Gestionar Excepción Deuda
              </button>
            </div>
          </div>

          <!-- KPIs institucionales -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <emx-kpi-card label="Plan / Cobertura" [value]="institucion()?.plan || 'Convenio B2B'" accentColor="blue" />
            <emx-kpi-card label="Saldo Pendiente" [value]="fmtCurrency(estadoCuenta()?.saldoPendiente)" [accentColor]="(estadoCuenta()?.saldoPendiente ?? 0) > 0 ? 'red' : 'emerald'" />
            <emx-kpi-card label="Facturas Vencidas" [value]="(estadoCuenta()?.cantidadVencidas ?? 0).toString()" [accentColor]="(estadoCuenta()?.cantidadVencidas ?? 0) > 0 ? 'amber' : 'emerald'" />
            <emx-kpi-card label="Personas Cubiertas" [value]="(miembros().length || institucion()?.members || 0).toString()" accentColor="cyan" />
          </div>
        </div>

        <!-- Solapas / Navigation Tabs -->
        <div class="flex items-center gap-1 border-b overflow-x-auto pb-1" style="border-color: var(--border-glass);">
          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2"
            [class.border-blue-500]="activeTab() === 'contrato'"
            [style.color]="activeTab() === 'contrato' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('contrato')"
          >
            Contrato y Vigencia
          </button>

          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2"
            [class.border-blue-500]="activeTab() === 'personas-cubiertas'"
            [style.color]="activeTab() === 'personas-cubiertas' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('personas-cubiertas')"
          >
            Personas Cubiertas ({{ miembros().length }})
          </button>

          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 border-transparent"
            [class.border-blue-500]="activeTab() === 'facturacion-capita'"
            [style.color]="activeTab() === 'facturacion-capita' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('facturacion-capita')"
          >
            Facturación de Cápita
          </button>

          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 border-transparent"
            [class.border-blue-500]="activeTab() === 'pagos-deuda'"
            [style.color]="activeTab() === 'pagos-deuda' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('pagos-deuda')"
          >
            Pagos y Estado de Deuda
          </button>

          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 border-transparent"
            [class.border-blue-500]="activeTab() === 'documentacion'"
            [style.color]="activeTab() === 'documentacion' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('documentacion')"
          >
            Documentación
          </button>

          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 border-transparent"
            [class.border-blue-500]="activeTab() === 'historial'"
            [style.color]="activeTab() === 'historial' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('historial')"
          >
            Historial de Suspensiones
          </button>
        </div>

        <!-- Tab Content -->
        @switch (activeTab()) {
          @case ('contrato') {
            <div class="glass rounded-panel p-5 flex flex-col gap-4">
              <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--text-primary);">
                Contrato de Cobertura Vigente
              </h3>

              @if (contratos().length === 0) {
                <emx-empty-state message="No hay contratos activos registrados para este convenio." />
              } @else {
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  @for (c of contratos(); track c.id || c.code) {
                    <div class="p-4 rounded-lg border flex flex-col gap-2" style="background-color: var(--bg-card); border-color: var(--border-glass);">
                      <div class="flex items-center justify-between">
                        <span class="font-bold font-mono text-sm" style="color: var(--text-primary);">{{ c.code }}</span>
                        <emx-status-badge [variant]="c.status === 'active' ? 'stable' : 'critical'">
                          {{ c.status.toUpperCase() }}
                        </emx-status-badge>
                      </div>
                      <div><span style="color: var(--text-muted);">Vigencia:</span> <strong style="color: var(--text-primary);">{{ c.from }} al {{ c.to }}</strong></div>
                      <div><span style="color: var(--text-muted);">Canon Mensual:</span> <strong style="color: var(--text-primary);">{{ fmtCurrency(c.monthlyPrice) }}</strong></div>
                      <div><span style="color: var(--text-muted);">Capacidad / Tope:</span> <strong style="color: var(--text-primary);">{{ c.monthlyCap }} atenciones/mes</strong></div>
                      <div><span style="color: var(--text-muted);">KPI Respuesta:</span> <strong style="color: var(--text-primary);">{{ c.kpiMinutes }} minutos</strong></div>
                    </div>
                  }
                </div>
              }
            </div>
          }

          @case ('personas-cubiertas') {
            <div class="glass rounded-panel p-5 flex flex-col gap-4">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--text-primary);">
                  Padrón de Beneficiarios / Personas Cubiertas
                </h3>
                <input
                  type="text"
                  [ngModel]="busquedaMiembro()"
                  (ngModelChange)="filtrarMiembros($event)"
                  placeholder="Buscar por DNI o Nombre..."
                  class="px-3 py-1.5 text-xs border rounded-lg max-w-xs"
                  style="background-color: var(--bg-card); color: var(--text-primary); border-color: var(--border-glass);"
                />
              </div>

              @if (miembrosFiltrados().length === 0) {
                <emx-empty-state message="Sin beneficiarios registrados en el padrón de este convenio." />
              } @else {
                <div class="overflow-x-auto">
                  <table class="w-full text-xs text-left" style="color: var(--text-primary);">
                    <thead>
                      <tr class="border-b" style="border-color: var(--border-glass); color: var(--text-muted);">
                        <th class="py-2 px-3 font-semibold">Nombre Completo</th>
                        <th class="py-2 px-3 font-semibold">DNI</th>
                        <th class="py-2 px-3 font-semibold">Rol / Relación</th>
                        <th class="py-2 px-3 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (m of miembrosFiltrados(); track m.id || m.dni) {
                        <tr class="border-b transition-colors hover:bg-white/5" style="border-color: var(--border-glass);">
                          <td class="py-2 px-3 font-medium">{{ m.apellido }}, {{ m.nombre }}</td>
                          <td class="py-2 px-3 font-mono">{{ m.dni || '—' }}</td>
                          <td class="py-2 px-3">{{ m.rol || 'TITULAR' }}</td>
                          <td class="py-2 px-3">
                            <emx-status-badge [variant]="m.activo ? 'stable' : 'critical'">
                              {{ m.activo ? 'VIGENTE' : 'INACTIVO' }}
                            </emx-status-badge>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }

          @case ('facturacion-capita') {
            <div class="glass rounded-panel p-5 flex flex-col gap-4">
              <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--text-primary);">
                Facturación de Cápita Institucional
              </h3>

              @if (facturasContrato().length === 0) {
                <emx-empty-state message="No hay periodos de facturación generados para este contrato." />
              } @else {
                <div class="overflow-x-auto">
                  <table class="w-full text-xs text-left" style="color: var(--text-primary);">
                    <thead>
                      <tr class="border-b" style="border-color: var(--border-glass); color: var(--text-muted);">
                        <th class="py-2 px-3 font-semibold">Factura N°</th>
                        <th class="py-2 px-3 font-semibold">Período</th>
                        <th class="py-2 px-3 font-semibold">Monto Total</th>
                        <th class="py-2 px-3 font-semibold">Saldo Pendiente</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (f of facturasContrato(); track f.id) {
                        <tr class="border-b transition-colors hover:bg-white/5" style="border-color: var(--border-glass);">
                          <td class="py-2 px-3 font-mono font-medium">{{ 'FAC-INST-' + f.id }}</td>
                          <td class="py-2 px-3" style="color: var(--text-muted);">{{ f.periodoDesde }} al {{ f.periodoHasta }}</td>
                          <td class="py-2 px-3 font-mono font-semibold">{{ fmtCurrency(f.importeTotal) }}</td>
                          <td class="py-2 px-3 font-mono font-semibold" [style.color]="(f.saldoPendiente ?? 0) > 0 ? 'var(--accent-red, #ef4444)' : 'var(--text-primary)'">
                            {{ fmtCurrency(f.saldoPendiente) }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </div>
          }

          @case ('pagos-deuda') {
            <div class="glass rounded-panel p-5 flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--text-primary);">
                  Estado de Cuenta y Deuda Corporativa
                </h3>
                <emx-status-badge [variant]="(estadoCuenta()?.saldoPendiente ?? 0) > 0 ? 'critical' : 'stable'">
                  {{ (estadoCuenta()?.saldoPendiente ?? 0) > 0 ? 'EN MORA' : 'CONVENIO AL DÍA' }}
                </emx-status-badge>
              </div>

              <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div class="p-4 rounded-lg border" style="background-color: var(--bg-card); border-color: var(--border-glass);">
                  <span style="color: var(--text-muted);">Total Cobrado Histórico:</span>
                  <div class="text-lg font-bold font-mono mt-1" style="color: var(--accent-emerald);">
                    {{ fmtCurrency(estadoCuenta()?.totalPagado) }}
                  </div>
                </div>
                <div class="p-4 rounded-lg border" style="background-color: var(--bg-card); border-color: var(--border-glass);">
                  <span style="color: var(--text-muted);">Saldo Pendiente:</span>
                  <div class="text-lg font-bold font-mono mt-1" style="color: var(--accent-red);">
                    {{ fmtCurrency(estadoCuenta()?.saldoPendiente) }}
                  </div>
                </div>
                <div class="p-4 rounded-lg border" style="background-color: var(--bg-card); border-color: var(--border-glass);">
                  <span style="color: var(--text-muted);">Facturas Vencidas:</span>
                  <div class="text-lg font-bold font-mono mt-1" style="color: var(--accent-amber);">
                    {{ estadoCuenta()?.cantidadVencidas ?? 0 }}
                  </div>
                </div>
              </div>
            </div>
          }

          @case ('documentacion') {
            <emx-documentos-adjuntos [entidadTipo]="'INSTITUCION'" [entidadId]="institucionId()!" />
          }

          @case ('historial') {
            <div class="glass rounded-panel p-5 flex flex-col gap-4">
              <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--text-primary);">
                Historial de Suspensiones y Excepciones
              </h3>
              <emx-empty-state message="Sin registro de suspensiones por mora recientes." />
            </div>
          }
        }
      }

      <!-- Modal Excepción Deuda -->
      @if (mostrarModalExcepcion() && institucionId()) {
        <app-excepcion-deuda-modal
          [institutionId]="institucionId()!"
          [institutionName]="institucion()?.name || ''"
          [accion]="'suspender'"
          (closed)="mostrarModalExcepcion.set(false)"
          (confirmed)="cargarInstitucion()"
        />
      }
    </div>
  `,
})
export class InstitutionDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(InstitutionsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly institucionId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly mainError = signal<string | null>(null);

  readonly activeTab = signal<InstitutionDetailTab>('contrato');

  readonly institucion = signal<InstitutionDTO | null>(null);
  readonly contratos = signal<ContractDTO[]>([]);
  readonly miembros = signal<InstitucionMiembroItem[]>([]);
  readonly facturasContrato = signal<FacturacionContratoDTO[]>([]);
  readonly estadoCuenta = signal<InstitucionEstadoCuentaDTO | null>(null);

  readonly busquedaMiembro = signal('');
  readonly mostrarModalExcepcion = signal(false);

  readonly miembrosFiltrados = computed(() => {
    const q = this.busquedaMiembro().toLowerCase().trim();
    if (!q) return this.miembros();
    return this.miembros().filter(
      (m) =>
        m.nombre.toLowerCase().includes(q) ||
        m.apellido.toLowerCase().includes(q) ||
        (m.dni && m.dni.includes(q))
    );
  });

  readonly fmtCurrency = fmtCurrency;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (isNaN(id) || id <= 0) {
      this.institucionId.set(null);
      this.loading.set(false);
      return;
    }
    this.institucionId.set(id);

    const tabParam = this.route.snapshot.queryParamMap.get('tab') as InstitutionDetailTab;
    if (
      tabParam &&
      [
        'contrato',
        'personas-cubiertas',
        'facturacion-capita',
        'pagos-deuda',
        'documentacion',
        'historial'
      ].includes(tabParam)
    ) {
      this.activeTab.set(tabParam);
    }

    this.cargarInstitucion();
  }

  selectTab(tab: InstitutionDetailTab): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  cargarInstitucion(): void {
    const id = this.institucionId();
    if (!id) return;

    this.loading.set(true);
    this.mainError.set(null);

    this.api
      .getById(id)
      .pipe(
        catchError(() => {
          this.mainError.set('No se pudo cargar la institución solicitada.');
          this.loading.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((inst: InstitutionDTO | null) => {
        if (!inst) return;
        this.institucion.set(inst);
        this.cargarBloques(id);
      });
  }

  cargarBloques(id: number): void {
    this.api
      .getContratosByInstitucion(id)
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((c: ContractDTO[]) => this.contratos.set(c || []));

    this.api
      .getMiembros(id)
      .pipe(
        catchError(() => of([])),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((m: InstitucionMiembroItem[]) => this.miembros.set(m || []));

    this.api
      .getEstadoCuentaInstitucion(id)
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((e: InstitucionEstadoCuentaDTO | null) => this.estadoCuenta.set(e));

    this.loading.set(false);
  }

  filtrarMiembros(q: string): void {
    this.busquedaMiembro.set(q);
  }
}
