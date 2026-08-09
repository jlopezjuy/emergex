import { Component, signal, inject, OnInit, computed, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PatientApiService } from '../../../data-access/api/patient.api';
import {
  PacienteDTO,
  FichaAfiliadoDTO,
  FacturaDTO,
  ConsumoMensualDTO,
  CoberturaVigenteDTO
} from '../../../data-access/dto/patient.dto';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';

export type PatientDetailTab =
  | 'cobertura'
  | 'grupo-familiar'
  | 'facturas'
  | 'cuenta-corriente'
  | 'documentacion'
  | 'historial';

function fmtCurrency(n?: number): string {
  return '$' + (n ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

@Component({
  selector: 'emx-patient-detail',
  standalone: true,
  imports: [
    RouterLink,
    KpiCardComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent
  ],
  template: `
    <div class="p-6 max-w-7xl mx-auto flex flex-col gap-6">
      <!-- Breadcrumb / Volver -->
      <div class="flex items-center justify-between">
        <a routerLink="/patients" class="text-xs font-medium flex items-center gap-1 hover:underline" style="color: var(--accent-blue);">
          ← Volver al listado de afiliados
        </a>
      </div>

      @if (loading()) {
        <emx-loading-state />
      } @else if (!pacienteId()) {
        <emx-error-state message="Afiliado no encontrado. El ID en la URL no es válido." />
      } @else if (mainError()) {
        <emx-error-state [message]="mainError()!" (retry)="cargarPaciente()" />
      } @else {
        <!-- Encabezado Ficha 360 -->
        <div class="glass rounded-panel p-5 flex flex-col gap-4">
          <div class="flex flex-wrap items-center justify-between gap-4 border-b pb-4" style="border-color: var(--border-glass);">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-3">
                <h1 class="text-xl font-bold" style="color: var(--text-primary);">
                  {{ paciente()?.apellido }}, {{ paciente()?.nombre }}
                </h1>
                <emx-status-badge [variant]="coberturaBadgeVariant()">
                  {{ estadoCoberturaTexto() }}
                </emx-status-badge>
                <emx-status-badge [variant]="deudaBadgeVariant()">
                  {{ estadoDeudaTexto() }}
                </emx-status-badge>
              </div>
              <span class="text-xs font-mono" style="color: var(--text-muted);">
                Afiliado N°: <strong style="color: var(--text-secondary);">{{ paciente()?.numeroAfiliado || ficha()?.numeroAfiliado || '—' }}</strong> · DNI: <strong style="color: var(--text-secondary);">{{ paciente()?.dni || '—' }}</strong>
              </span>
            </div>

            <!-- Identificación rápida -->
            <div class="flex items-center gap-4 text-xs">
              <div class="flex flex-col">
                <span style="color: var(--text-muted);">Teléfono</span>
                <span class="font-medium" style="color: var(--text-primary);">{{ paciente()?.telefono || ficha()?.telefono || '—' }}</span>
              </div>
              <div class="flex flex-col">
                <span style="color: var(--text-muted);">Cuenta Grupo</span>
                <span class="font-mono font-medium" style="color: var(--text-primary);">{{ ficha()?.numeroCuentaGrupo || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- KPIs principales de resumen -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <emx-kpi-card label="Plan Actual" [value]="coberturaActual() ? coberturaActual()!.planNombre : (ficha()?.cobertura?.nombre || 'Sin Plan')" accentColor="blue" />
            <emx-kpi-card label="Saldo Deuda" [value]="fmtCurrency(saldoPendiente())" [accentColor]="saldoPendiente() > 0 ? 'red' : 'emerald'" />
            <emx-kpi-card label="Saldo a Favor" [value]="fmtCurrency(ficha()?.saldoFavor)" accentColor="emerald" />
            <emx-kpi-card label="Atenciones Mes" [value]="(consumo()?.atencionesConsumidas ?? 0) + ' / ' + (consumo()?.atencionesMaximas ?? 0)" accentColor="cyan" />
          </div>
        </div>

        <!-- Solapas / Navigation Tabs -->
        <div class="flex items-center gap-1 border-b overflow-x-auto pb-1" style="border-color: var(--border-glass);">
          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2"
            [class.border-blue-500]="activeTab() === 'cobertura'"
            [style.color]="activeTab() === 'cobertura' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('cobertura')"
          >
            Cobertura y Consumo
          </button>

          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2"
            [class.border-blue-500]="activeTab() === 'grupo-familiar'"
            [style.color]="activeTab() === 'grupo-familiar' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('grupo-familiar')"
          >
            Grupo Familiar
          </button>

          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 border-transparent"
            [class.border-blue-500]="activeTab() === 'facturas'"
            [style.color]="activeTab() === 'facturas' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('facturas')"
          >
            Facturas y Pagos
          </button>

          <button
            type="button"
            class="px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 border-transparent"
            [class.border-blue-500]="activeTab() === 'cuenta-corriente'"
            [style.color]="activeTab() === 'cuenta-corriente' ? 'var(--accent-blue)' : 'var(--text-muted)'"
            (click)="selectTab('cuenta-corriente')"
          >
            Cuenta Corriente
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
            Historial de Asistencias
          </button>
        </div>

        <!-- Tab Content -->
        @switch (activeTab()) {
          @case ('cobertura') {
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Bloque Cobertura -->
              <div class="glass rounded-panel p-4 flex flex-col gap-3">
                <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--text-primary);">
                  Detalle de Cobertura Vigente
                </h3>

                @if (coberturaError()) {
                  <emx-error-state message="Error al cargar la cobertura vigente" (retry)="cargarCobertura()" />
                } @else if (coberturaActual()) {
                  <div class="grid grid-cols-2 gap-3 text-xs">
                    <div><span style="color: var(--text-muted);">Origen:</span> <strong style="color: var(--text-primary);">{{ coberturaActual()!.origen }}</strong></div>
                    <div><span style="color: var(--text-muted);">Plan:</span> <strong style="color: var(--text-primary);">{{ coberturaActual()!.planNombre || '—' }}</strong></div>
                    <div><span style="color: var(--text-muted);">Institución:</span> <strong style="color: var(--text-primary);">{{ coberturaActual()!.institucionNombre || '—' }}</strong></div>
                    <div><span style="color: var(--text-muted);">Estado:</span> <strong style="color: var(--text-primary);">{{ coberturaActual()!.estadoCobertura || '—' }}</strong></div>
                    <div><span style="color: var(--text-muted);">Vigencia Hasta:</span> <strong style="color: var(--text-primary);">{{ coberturaActual()!.vigenciaHasta || '—' }}</strong></div>
                    <div><span style="color: var(--text-muted);">Cubierto:</span> <strong style="color: var(--text-primary);">{{ coberturaActual()!.cubierto ? 'Sí' : 'No' }}</strong></div>
                  </div>
                } @else {
                  <emx-empty-state message="No se encontró registro de cobertura vigente para este afiliado." />
                }
              </div>

              <!-- Bloque Consumo Mensual -->
              <div class="glass rounded-panel p-4 flex flex-col gap-3">
                <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--text-primary);">
                  Consumo del Período
                </h3>

                @if (consumoError()) {
                  <emx-error-state message="Error al cargar el consumo mensual" (retry)="cargarConsumo()" />
                } @else if (consumo()) {
                  <div class="grid grid-cols-2 gap-3 text-xs">
                    <div><span style="color: var(--text-muted);">Atenciones Consumidas:</span> <strong style="color: var(--text-primary);">{{ consumo()?.atencionesConsumidas ?? 0 }} / {{ consumo()?.atencionesMaximas ?? 0 }}</strong></div>
                    <div><span style="color: var(--text-muted);">Controles Médicos:</span> <strong style="color: var(--text-primary);">{{ consumo()?.controlesMedicosConsumidos ?? 0 }} / {{ consumo()?.controlesMedicosMaximos ?? 0 }}</strong></div>
                    <div><span style="color: var(--text-muted);">Órdenes Disponibles:</span> <strong style="color: var(--text-primary);">{{ consumo()?.ordenesDisponibles?.length ?? 0 }}</strong></div>
                    <div><span style="color: var(--text-muted);">Alertas Activas:</span> <strong style="color: var(--text-primary);">{{ ficha()?.alertas?.length ?? 0 }}</strong></div>
                  </div>
                } @else {
                  <emx-empty-state message="Sin datos de consumo mensual disponibles." />
                }
              </div>
            </div>
          }

          @case ('grupo-familiar') {
            <emx-empty-state message="Solapa Grupo familiar — La tarea F2-02 la habilita con miembros y acciones." />
          }

          @case ('facturas') {
            @if (facturasError()) {
              <emx-error-state message="Error al cargar el listado de facturas y pagos." (retry)="cargarFacturas()" />
            } @else {
              <emx-empty-state message="Solapa Facturas y pagos — La tarea F2-02 la habilita con paginación server-side y acciones." />
            }
          }

          @case ('cuenta-corriente') {
            <emx-empty-state message="Solapa Cuenta corriente — La tarea F2-03 la conecta con cobranzas y recibos." />
          }

          @case ('documentacion') {
            <emx-empty-state message="Solapa Documentación — La tarea F2-05 la conecta con el repositorio adjunto." />
          }

          @case ('historial') {
            <emx-empty-state message="Solapa Historial de asistencias — Enlazado directo al log médico del paciente." />
          }
        }
      }
    </div>
  `,
})
export class PatientDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(PatientApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pacienteId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly mainError = signal<string | null>(null);

  readonly activeTab = signal<PatientDetailTab>('cobertura');

  readonly paciente = signal<PacienteDTO | null>(null);
  readonly ficha = signal<FichaAfiliadoDTO | null>(null);
  readonly facturas = signal<FacturaDTO[]>([]);
  readonly consumo = signal<ConsumoMensualDTO | null>(null);
  readonly cobertura = signal<CoberturaVigenteDTO[]>([]);

  // Errores aislados por bloque
  readonly fichaError = signal(false);
  readonly facturasError = signal(false);
  readonly consumoError = signal(false);
  readonly coberturaError = signal(false);

  readonly coberturaActual = computed(
    () => this.cobertura().find((c) => c.cubierto) ?? this.cobertura()[0] ?? null
  );

  readonly estadoCoberturaTexto = computed(() => {
    const cob = this.coberturaActual();
    if (!cob) return 'SIN COBERTURA REGISTRADA';
    if (cob.cubierto || cob.estadoCobertura === 'VIGENTE' || cob.estadoCobertura === 'ACTIVA') {
      return 'VIGENTE';
    }
    return cob.estadoCobertura ? cob.estadoCobertura.toUpperCase() : 'INACTIVA';
  });

  readonly coberturaBadgeVariant = computed(() => {
    const txt = this.estadoCoberturaTexto();
    return txt === 'VIGENTE' || txt === 'ACTIVA' ? 'stable' : 'critical';
  });

  readonly saldoPendiente = computed(() =>
    this.facturas().reduce(
      (acc, f) => acc + (f.saldoPendiente ?? f.importeTotal ?? 0),
      0
    )
  );

  readonly estadoDeudaTexto = computed(() => {
    if (this.facturasError()) {
      return 'ERROR AL DEDUCIR DEUDA';
    }
    return this.saldoPendiente() > 0 ? 'CON DEUDA PENDIENTE' : 'AL DÍA';
  });

  readonly deudaBadgeVariant = computed(() => {
    if (this.facturasError()) return 'urgent';
    return this.saldoPendiente() > 0 ? 'critical' : 'stable';
  });

  readonly fmtCurrency = fmtCurrency;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = Number(idParam);
    if (isNaN(id) || id <= 0) {
      this.pacienteId.set(null);
      this.loading.set(false);
      return;
    }
    this.pacienteId.set(id);

    const tabParam = this.route.snapshot.queryParamMap.get('tab') as PatientDetailTab;
    if (
      tabParam &&
      [
        'cobertura',
        'grupo-familiar',
        'facturas',
        'cuenta-corriente',
        'documentacion',
        'historial'
      ].includes(tabParam)
    ) {
      this.activeTab.set(tabParam);
    }

    this.cargarPaciente();
  }

  selectTab(tab: PatientDetailTab): void {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  cargarPaciente(): void {
    const id = this.pacienteId();
    if (!id) return;

    this.loading.set(true);
    this.mainError.set(null);

    this.api
      .getById(id)
      .pipe(
        catchError(() => {
          this.mainError.set('No se pudo cargar el afiliado solicitado.');
          this.loading.set(false);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((paciente) => {
        if (!paciente) return;
        this.paciente.set(paciente);
        this.cargarBloques(id, paciente.dni);
      });
  }

  cargarBloques(pacienteId: number, dni: string): void {
    this.cargarFicha(pacienteId);
    this.cargarFacturas(pacienteId);
    this.cargarConsumo(pacienteId);
    this.cargarCobertura(dni);
    this.loading.set(false);
  }

  cargarFicha(pacienteId?: number): void {
    const id = pacienteId ?? this.pacienteId();
    if (!id) return;
    this.fichaError.set(false);
    this.api
      .getFicha(id)
      .pipe(
        catchError(() => {
          this.fichaError.set(true);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((f) => {
        if (f) this.ficha.set(f);
      });
  }

  cargarFacturas(pacienteId?: number): void {
    const id = pacienteId ?? this.pacienteId();
    if (!id) return;
    this.facturasError.set(false);
    this.api
      .getFacturasAfiliado(id)
      .pipe(
        catchError(() => {
          this.facturasError.set(true);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((f) => {
        this.facturas.set(f || []);
      });
  }

  cargarConsumo(pacienteId?: number): void {
    const id = pacienteId ?? this.pacienteId();
    if (!id) return;
    this.consumoError.set(false);
    this.api
      .getConsumoMensual(id)
      .pipe(
        catchError(() => {
          this.consumoError.set(true);
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((c) => {
        if (c) this.consumo.set(c);
      });
  }

  cargarCobertura(dni?: string): void {
    const searchDni = dni ?? this.paciente()?.dni;
    if (!searchDni) return;
    this.coberturaError.set(false);
    this.api
      .getCoberturaVigente(searchDni)
      .pipe(
        catchError(() => {
          this.coberturaError.set(true);
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((cob) => {
        this.cobertura.set(cob || []);
      });
  }
}
