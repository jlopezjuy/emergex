import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { catchError, of } from 'rxjs';
import { RouterLink } from '@angular/router';
import { DashboardApiService } from '../../data-access/api/dashboard.api';
import { DashboardComercialDTO } from '../../data-access/dto/dashboard.dto';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';
import { DonutChartComponent, DonutSegment } from '../../shared/components/charts/donut-chart/donut-chart.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CurrencyPipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-management-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    GlassCardComponent,
    DonutChartComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    CurrencyPipe,
    DecimalPipe,
  ],
  template: `
    <div class="flex flex-col overflow-y-auto h-full p-6">
      <!-- Header -->
      <div
        class="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 gap-4 border-b"
        style="border-color: var(--border-glass);"
      >
        <div>
          <h1 class="font-bold text-2xl tracking-tight" style="color: var(--text-primary);">
            💼 Dashboard Gerencial & Comercial
          </h1>
          <p class="text-xs font-medium mt-1" style="color: var(--text-muted);">
            Indicadores clave de negocio, facturación y suscripciones en tiempo real
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            (click)="load()"
            class="px-4 py-2 rounded-xl text-xs font-mono font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary);"
          >
            🔄 Recargar
          </button>
        </div>
      </div>

      @if (loading()) {
        <emx-loading-state />
      } @else if (error()) {
        <emx-error-state [message]="error()!" (retry)="load()" />
      } @else {
        <!-- KPIs Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <!-- Afiliados Activos -->
          <emx-glass-card class="relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 text-6xl opacity-10 transition-transform group-hover:scale-110">👥</div>
            <p class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">Afiliados Activos</p>
            <h3 class="text-4xl font-bold font-mono mt-2" style="color: var(--accent-cyan);">
              {{ data()?.totalAfiliadosActivos ?? 0 }}
            </h3>
            <p class="text-[10px] font-mono mt-2" style="color: var(--text-muted);">
              Pacientes con cobertura vigente
            </p>
          </emx-glass-card>

          <!-- Altas del Mes -->
          <emx-glass-card class="relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 text-6xl opacity-10 transition-transform group-hover:scale-110">📈</div>
            <p class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">Altas del Mes</p>
            <h3 class="text-4xl font-bold font-mono mt-2" style="color: var(--accent-cyan);">
              {{ data()?.altasMesActual ?? 0 }}
            </h3>
            <p class="text-[10px] font-mono mt-2" style="color: var(--text-muted);">
              Nuevos afiliados mes calendario
            </p>
          </emx-glass-card>

          <!-- Ingresos Recaudados -->
          <emx-glass-card class="relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 text-6xl opacity-10 transition-transform group-hover:scale-110">💰</div>
            <p class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">Ingresos del Mes</p>
            <h3 class="text-4xl font-bold font-mono mt-2" style="color: var(--accent-emerald);">
              {{ (data()?.ingresosMesActual ?? 0) | currency:'USD':'symbol-narrow':'1.0-0' }}
            </h3>
            <p class="text-[10px] font-mono mt-2" style="color: var(--text-muted);">
              Facturas cobradas mes actual
            </p>
          </emx-glass-card>

          <!-- Instituciones Activas -->
          <emx-glass-card class="relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 text-6xl opacity-10 transition-transform group-hover:scale-110">🏥</div>
            <p class="font-mono text-xs uppercase tracking-wider" style="color: var(--text-muted);">Instituciones B2B</p>
            <h3 class="text-4xl font-bold font-mono mt-2" style="color: var(--accent-blue);">
              {{ data()?.institucionesActivas ?? 0 }}
            </h3>
            <p class="text-[10px] font-mono mt-2" style="color: var(--text-muted);">
              Convenios corporativos activos
            </p>
          </emx-glass-card>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <!-- Suscripciones por Plan (Donut) -->
          <emx-glass-card class="lg:col-span-1 flex flex-col justify-between">
            <div>
              <h2 class="font-bold text-sm tracking-wide mb-6" style="color: var(--text-primary);">
                Distribución por Plan Comercial
              </h2>
              @if (planSegments().length > 0) {
                <div class="flex flex-col items-center justify-center gap-6">
                  <emx-donut-chart
                    [size]="140"
                    [strokeWidth]="12"
                    [segments]="planSegments()"
                    [centerLabel]="(data()?.totalAfiliadosActivos ?? 0).toString()"
                    centerSub="AFILIADOS"
                  />
                  <div class="flex flex-col gap-2 w-full mt-2">
                    @for (seg of planSegments(); track seg.label) {
                      <div class="flex items-center gap-2 justify-between">
                        <div class="flex items-center gap-2">
                          <span class="w-3 h-3 rounded-full flex-shrink-0" [style.background]="seg.color"></span>
                          <span class="text-xs font-semibold" style="color: var(--text-secondary);">{{ seg.label }}</span>
                        </div>
                        <div class="flex items-center gap-3 font-mono text-xs">
                          <span class="font-bold" style="color: var(--text-primary);">{{ seg.value }}</span>
                          <span style="color: var(--text-muted);">
                            ({{ ((seg.value / (data()?.totalAfiliadosActivos || 1)) * 100) | number:'1.0-1' }}%)
                          </span>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              } @else {
                <div class="flex flex-col items-center justify-center py-12">
                  <span class="text-3xl mb-2">📁</span>
                  <p class="text-xs font-mono" style="color: var(--text-muted);">No hay planes asignados activos.</p>
                </div>
              }
            </div>
          </emx-glass-card>

          <!-- Facturación y Cobros -->
          <emx-glass-card class="lg:col-span-2 flex flex-col justify-between">
            <div>
              <h2 class="font-bold text-sm tracking-wide mb-6" style="color: var(--text-primary);">
                Eficiencia de Facturación & Mora
              </h2>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <!-- Cobradas -->
                <div class="p-4 rounded-xl" style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15);">
                  <p class="font-mono text-[10px] uppercase tracking-wider" style="color: var(--accent-emerald);">Facturas Pagadas</p>
                  <p class="text-3xl font-bold font-mono mt-2" style="color: var(--text-primary);">
                    {{ data()?.facturasCobradas ?? 0 }}
                  </p>
                  <p class="text-[10px] font-mono mt-1" style="color: var(--text-muted);">Recaudadas con éxito</p>
                </div>

                <!-- Impagas -->
                <div class="p-4 rounded-xl" style="background: rgba(245, 158, 11, 0.05); border: 1px solid rgba(245, 158, 11, 0.15);">
                  <p class="font-mono text-[10px] uppercase tracking-wider" style="color: var(--accent-amber);">Facturas Impagas</p>
                  <p class="text-3xl font-bold font-mono mt-2" style="color: var(--text-primary);">
                    {{ data()?.facturasImpagas ?? 0 }}
                  </p>
                  <p class="text-[10px] font-mono mt-1" style="color: var(--text-muted);">Pendientes de cobro / AFIP</p>
                </div>

                <!-- Mora -->
                <div
                  class="p-4 rounded-xl"
                  [style.background]="(data()?.moraFacturas ?? 0) > 15 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)'"
                  [style.borderColor]="(data()?.moraFacturas ?? 0) > 15 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'"
                  style="border-width: 1px;"
                >
                  <p class="font-mono text-[10px] uppercase tracking-wider" [style.color]="(data()?.moraFacturas ?? 0) > 15 ? 'var(--accent-red)' : 'var(--accent-emerald)'">Tasa de Mora</p>
                  <p class="text-3xl font-bold font-mono mt-2" style="color: var(--text-primary);">
                    {{ (data()?.moraFacturas ?? 0) | number:'1.0-1' }}%
                  </p>
                  <p class="text-[10px] font-mono mt-1" style="color: var(--text-muted);">Porcentaje del saldo impago</p>
                </div>
              </div>

              <!-- Visual breakdown -->
              <div class="w-full">
                <div class="flex items-center justify-between text-xs font-mono mb-2" style="color: var(--text-muted);">
                  <span>Progreso de Recaudación</span>
                  <span class="font-bold" style="color: var(--text-primary);">
                    {{ ((data()?.facturasCobradas ?? 0) / ((data()?.facturasCobradas ?? 0) + (data()?.facturasImpagas ?? 0) || 1) * 100) | number:'1.0-0' }}%
                  </span>
                </div>
                <div class="h-3 w-full rounded-full overflow-hidden flex" style="background: var(--surface-glass);">
                  <div
                    class="h-full"
                    style="background: var(--accent-emerald); transition: width 0.5s ease;"
                    [style.width.%]="((data()?.facturasCobradas ?? 0) / ((data()?.facturasCobradas ?? 0) + (data()?.facturasImpagas ?? 0) || 1) * 100)"
                  ></div>
                  <div
                    class="h-full"
                    style="background: var(--accent-amber); transition: width 0.5s ease;"
                    [style.width.%]="((data()?.facturasImpagas ?? 0) / ((data()?.facturasCobradas ?? 0) + (data()?.facturasImpagas ?? 0) || 1) * 100)"
                  ></div>
                </div>
                <div class="flex gap-4 mt-3 text-[10px] font-mono" style="color: var(--text-muted);">
                  <div class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded bg-[var(--accent-emerald)]"></span>
                    <span>Cobradas</span>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <span class="w-2.5 h-2.5 rounded bg-[var(--accent-amber)]"></span>
                    <span>Pendientes</span>
                  </div>
                </div>
              </div>
            </div>
          </emx-glass-card>
        </div>

        <!-- Quick actions and alert notifications -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Acciones rápidas -->
          <emx-glass-card>
            <h2 class="font-bold text-sm tracking-wide mb-4" style="color: var(--text-primary);">
              ⚡ Accesos Directos de Gestión
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                routerLink="/patients"
                class="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
                style="background: var(--surface-glass); border: 1px solid var(--border-glass); text-decoration: none;"
              >
                <span class="text-xl">➕</span>
                <div>
                  <p class="text-xs font-bold" style="color: var(--text-primary);">Nuevo Afiliado</p>
                  <p class="text-[10px]" style="color: var(--text-muted);">Dar de alta titular/grupo familiar</p>
                </div>
              </a>

              <a
                routerLink="/institutions"
                class="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
                style="background: var(--surface-glass); border: 1px solid var(--border-glass); text-decoration: none;"
              >
                <span class="text-xl">🏥</span>
                <div>
                  <p class="text-xs font-bold" style="color: var(--text-primary);">Nueva Institución</p>
                  <p class="text-[10px]" style="color: var(--text-muted);">Registrar convenio corporativo B2B</p>
                </div>
              </a>

              <a
                routerLink="/plans"
                class="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
                style="background: var(--surface-glass); border: 1px solid var(--border-glass); text-decoration: none;"
              >
                <span class="text-xl">📦</span>
                <div>
                  <p class="text-xs font-bold" style="color: var(--text-primary);">Planes Comerciales</p>
                  <p class="text-[10px]" style="color: var(--text-muted);">Configurar coberturas y tarifas</p>
                </div>
              </a>

              <a
                routerLink="/facturacion"
                class="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99]"
                style="background: var(--surface-glass); border: 1px solid var(--border-glass); text-decoration: none;"
              >
                <span class="text-xl">🧾</span>
                <div>
                  <p class="text-xs font-bold" style="color: var(--text-primary);">Facturación</p>
                  <p class="text-[10px]" style="color: var(--text-muted);">Generar cuotas mensuales y cobrar</p>
                </div>
              </a>
            </div>
          </emx-glass-card>

          <!-- Estado y Recomendaciones de Gestión -->
          <emx-glass-card>
            <h2 class="font-bold text-sm tracking-wide mb-4" style="color: var(--text-primary);">
              📢 Estado de Salud de la Empresa
            </h2>
            <div class="flex flex-col gap-3">
              @if ((data()?.moraFacturas ?? 0) > 15) {
                <div class="flex items-start gap-3 p-3 rounded-xl" style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2);">
                  <span class="text-lg">⚠️</span>
                  <div>
                    <p class="text-xs font-bold text-red-400">Mora Excesiva en Cobros</p>
                    <p class="text-[10px] mt-0.5" style="color: var(--text-muted);">
                      La tasa de mora supera el 15%. Se recomienda iniciar contacto de cobranza activa para los afiliados con facturas emitidas sin pago.
                    </p>
                  </div>
                </div>
              } @else {
                <div class="flex items-start gap-3 p-3 rounded-xl" style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2);">
                  <span class="text-lg">✅</span>
                  <div>
                    <p class="text-xs font-bold text-emerald-400">Índice de Mora Saludable</p>
                    <p class="text-[10px] mt-0.5" style="color: var(--text-muted);">
                      La tasa de mora está controlada dentro de los parámetros seguros (menor a 15%). El flujo de caja comercial está sano.
                    </p>
                  </div>
                </div>
              }

              @if ((data()?.totalAfiliadosActivos ?? 0) === 0) {
                <div class="flex items-start gap-3 p-3 rounded-xl" style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2);">
                  <span class="text-lg">💡</span>
                  <div>
                    <p class="text-xs font-bold text-amber-400">Sin Afiliados Activos</p>
                    <p class="text-[10px] mt-0.5" style="color: var(--text-muted);">
                      Aún no hay pacientes asociados a coberturas comerciales activas. Pruebe agregar un nuevo afiliado desde el botón de accesos rápidos.
                    </p>
                  </div>
                </div>
              } @else {
                <div class="flex items-start gap-3 p-3 rounded-xl" style="background: rgba(34, 211, 238, 0.08); border: 1px solid rgba(34, 211, 238, 0.2);">
                  <span class="text-lg">📈</span>
                  <div>
                    <p class="text-xs font-bold text-cyan-400">Crecimiento de Cobertura</p>
                    <p class="text-[10px] mt-0.5" style="color: var(--text-muted);">
                      Se han registrado un total de {{ data()?.altasMesActual ?? 0 }} altas este mes. Excelente ritmo comercial.
                    </p>
                  </div>
                </div>
              }

              <div class="flex flex-col gap-2 mt-1">
                <p class="text-[10px] font-mono uppercase tracking-wider" style="color: var(--text-muted);">Alertas comerciales inmediatas</p>
                @if ((data()?.coberturasPorVencer?.length ?? 0) === 0) {
                  <p class="text-[11px]" style="color: var(--text-muted);">No hay coberturas próximas a vencer en los próximos días.</p>
                } @else {
                  @for (c of (data()?.coberturasPorVencer ?? []).slice(0, 4); track c.coberturaId) {
                    <div class="flex items-center justify-between p-2 rounded-lg" style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2);">
                      <div>
                        <p class="text-[11px] font-semibold" style="color: var(--text-primary);">
                          {{ c.pacienteApellido }}, {{ c.pacienteNombre }}
                        </p>
                        <p class="text-[10px]" style="color: var(--text-muted);">
                          DNI {{ c.pacienteDni }} · {{ c.planNombre }}
                        </p>
                      </div>
                      <div class="text-right">
                        <p class="text-[10px] font-mono" style="color: var(--accent-amber);">{{ c.diasRestantes }} días</p>
                        <p class="text-[10px]" style="color: var(--text-muted);">{{ c.vigenciaHasta }}</p>
                      </div>
                    </div>
                  }
                }
              </div>
            </div>
          </emx-glass-card>
        </div>
      }
    </div>
  `,
})
export class ManagementDashboardComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private dashboardApi = inject(DashboardApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<DashboardComercialDTO | null>(null);

  readonly planSegments = computed<DonutSegment[]>(() => {
    const cd = this.data();
    if (!cd || !cd.afiliadosPorPlan) return [];
    const colors = ['var(--accent-cyan)', 'var(--accent-blue)', 'var(--accent-emerald)', 'var(--accent-amber)', 'var(--accent-red)'];
    return Object.entries(cd.afiliadosPorPlan).map(([plan, count], idx) => ({
      value: count,
      label: plan,
      color: colors[idx % colors.length],
    }));
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.dashboardApi
      .comercial()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (d) => {
          if (d) {
            this.data.set(d);
          } else {
            this.error.set('No se pudo obtener la información gerencial. Verifique su conexión.');
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Error al cargar analítica comercial/gerencial.');
          this.loading.set(false);
        },
      });
  }
}
