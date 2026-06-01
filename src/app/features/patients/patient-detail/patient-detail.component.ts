import { Component, signal, inject, OnInit, computed, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PatientApiService } from '../../../data-access/api/patient.api';
import { PacienteDTO, FichaAfiliadoDTO, FacturaDTO, ConsumoMensualDTO, CoberturaVigenteDTO } from '../../../data-access/dto/patient.dto';

function fmtCurrency(n?: number): string {
  return '$' + (n ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 });
}

@Component({
  selector: 'emx-patient-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="detail-page">
      <div class="page-header">
        <a routerLink="/patients" class="back-link">← Volver a afiliados</a>
      </div>

      @if (loading()) {
        <p class="status-msg">Cargando ficha 360…</p>
      } @else if (!pacienteId()) {
        <p class="status-msg error">Afiliado no encontrado. El ID en la URL no es válido.</p>
      } @else if (error()) {
        <p class="status-msg error">{{ error() }}</p>
      } @else {
        <div class="grid">
          <section class="card">
            <h3>Afiliado</h3>
            <div class="rows">
              <div><span>Nombre</span><strong>{{ paciente()?.apellido }}, {{ paciente()?.nombre }}</strong></div>
              <div><span>DNI</span><strong>{{ paciente()?.dni || '—' }}</strong></div>
              <div><span>Teléfono</span><strong>{{ paciente()?.telefono || ficha()?.telefono || '—' }}</strong></div>
              <div><span>N° Afiliado</span><strong>{{ paciente()?.numeroAfiliado || ficha()?.numeroAfiliado || '—' }}</strong></div>
              <div><span>Estado grupo</span><strong>{{ ficha()?.estadoGrupo || '—' }}</strong></div>
              <div><span>Cuenta</span><strong>{{ ficha()?.numeroCuentaGrupo || '—' }}</strong></div>
            </div>
          </section>

          <section class="card">
            <h3>Cobertura vigente</h3>
            @if (coberturaActual()) {
              <div class="rows">
                <div><span>Origen</span><strong>{{ coberturaActual()!.origen }}</strong></div>
                <div><span>Plan</span><strong>{{ coberturaActual()!.planNombre || ficha()?.cobertura?.nombre || '—' }}</strong></div>
                <div><span>Institución</span><strong>{{ coberturaActual()!.institucionNombre || '—' }}</strong></div>
                <div><span>Estado</span><strong>{{ coberturaActual()!.estadoCobertura || '—' }}</strong></div>
                <div><span>Vigencia hasta</span><strong>{{ coberturaActual()!.vigenciaHasta || '—' }}</strong></div>
                <div><span>Cubierto</span><strong>{{ coberturaActual()!.cubierto ? 'Sí' : 'No' }}</strong></div>
              </div>
            } @else {
              <p class="muted">No se pudo determinar cobertura vigente por DNI.</p>
            }
          </section>

          <section class="card">
            <h3>Facturación / deuda</h3>
            <div class="rows">
              <div><span>Facturas</span><strong>{{ facturas().length }}</strong></div>
              <div><span>Emitidas/Vencidas</span><strong>{{ deudaCount() }}</strong></div>
              <div><span>Saldo pendiente</span><strong>{{ fmtCurrency(saldoPendiente()) }}</strong></div>
              <div><span>Saldo a favor</span><strong>{{ fmtCurrency(ficha()?.saldoFavor) }}</strong></div>
            </div>
          </section>

          <section class="card">
            <h3>Consumo mensual</h3>
            <div class="rows">
              <div><span>Atenciones</span><strong>{{ consumo()?.atencionesConsumidas ?? 0 }} / {{ consumo()?.atencionesMaximas ?? 0 }}</strong></div>
              <div><span>Controles</span><strong>{{ consumo()?.controlesMedicosConsumidos ?? 0 }} / {{ consumo()?.controlesMedicosMaximos ?? 0 }}</strong></div>
              <div><span>Órdenes disponibles</span><strong>{{ consumo()?.ordenesDisponibles?.length ?? 0 }}</strong></div>
              <div><span>Alertas</span><strong>{{ ficha()?.alertas?.length ?? 0 }}</strong></div>
            </div>
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .detail-page { padding: 24px; max-width: 1100px; margin: 0 auto; }
    .page-header { margin-bottom: 14px; }
    .back-link { color: var(--accent-blue); text-decoration: none; font-size: 13px; font-weight: 500; }
    .back-link:hover { text-decoration: underline; }
    .status-msg { color: var(--text-muted); font-size: 14px; padding: 24px 0; text-align: center; }
    .status-msg.error { color: #ef4444; }
    .grid { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; }
    .card { background: var(--bg-elevated); border: 1px solid var(--border-glass); border-radius: 12px; padding: 14px; }
    .card h3 { margin:0 0 10px; font-size: 13px; font-weight: 700; color: var(--text-primary); }
    .rows { display:grid; grid-template-columns: 1fr 1fr; gap: 8px 10px; }
    .rows div { display:flex; flex-direction:column; gap:2px; }
    .rows span { font-size: 11px; color: var(--text-muted); }
    .rows strong { font-size: 12.5px; color: var(--text-primary); }
    .muted { color: var(--text-muted); font-size: 12px; margin:0; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } .rows { grid-template-columns: 1fr; } }
  `],
})
export class PatientDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(PatientApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly pacienteId = signal<number | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly paciente = signal<PacienteDTO | null>(null);
  readonly ficha = signal<FichaAfiliadoDTO | null>(null);
  readonly facturas = signal<FacturaDTO[]>([]);
  readonly consumo = signal<ConsumoMensualDTO | null>(null);
  readonly cobertura = signal<CoberturaVigenteDTO[]>([]);

  readonly coberturaActual = computed(() => this.cobertura().find(c => c.cubierto) ?? this.cobertura()[0] ?? null);
  readonly saldoPendiente = computed(() => this.facturas().reduce((acc, f) => acc + (f.saldoPendiente ?? f.importeTotal ?? 0), 0));
  readonly deudaCount = computed(() => this.facturas().filter(f => f.estado === 'EMITIDA' || f.estado === 'VENCIDA').length);

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

    this.api.getById(id).pipe(
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((paciente) => {
      if (!paciente) {
        this.error.set('No se pudo cargar el afiliado solicitado.');
        this.loading.set(false);
        return;
      }

      this.paciente.set(paciente);

      forkJoin({
        ficha: this.api.getFicha(id).pipe(catchError(() => of(null))),
        facturas: this.api.getFacturasAfiliado(id).pipe(catchError(() => of([]))),
        consumo: this.api.getConsumoMensual(id).pipe(catchError(() => of(null))),
        cobertura: this.api.getCoberturaVigente(paciente.dni).pipe(catchError(() => of([]))),
      }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ ficha, facturas, consumo, cobertura }) => {
        this.ficha.set(ficha);
        this.facturas.set(facturas);
        this.consumo.set(consumo);
        this.cobertura.set(cobertura);
        this.loading.set(false);
      });
    });
  }
}
