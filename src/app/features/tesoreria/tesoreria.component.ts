import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TesoreriaApi, Caja, MovimientoCaja, ArqueoCaja } from '../../data-access/api/tesoreria.api';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { UserFeedbackService } from '../../core/notifications/user-feedback.service';
import { MonedaPipe } from '../../shared/pipes/moneda.pipe';
import { FechaPipe } from '../../shared/pipes/fecha.pipe';
import { EstadoPipe } from '../../shared/pipes/estado.pipe';
import { etiquetaEstado, formatMoneda } from '../../core/i18n/formato';

@Component({
  selector: 'emx-tesoreria',
  standalone: true,
  imports: [MonedaPipe, FechaPipe, EstadoPipe, DecimalPipe, FormsModule, GlassCardComponent, EmptyStateComponent],
  template: `
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold" style="color: var(--text-primary)">Tesorería</h1>
        <p class="text-sm" style="color: var(--text-muted)">Abrí cajas, registrá movimientos y hacé el arqueo al cierre.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Card 1: Abrir caja -->
        <emx-glass-card>
          <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">Apertura de caja</h2>
          <div class="space-y-4">
            <div>
              <label for="tes-caja-nombre" class="block text-xs font-semibold mb-1" style="color: var(--text-muted)">Nombre de la caja</label>
              <input id="tes-caja-nombre" type="text" [ngModel]="cajaNombre()" (ngModelChange)="cajaNombre.set($event)" placeholder="Ej: Caja Central"
                     class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent" style="border-color: var(--border-glass); color: var(--text-primary)" />
            </div>
            <div>
              <label for="tes-monto-inicial" class="block text-xs font-semibold mb-1" style="color: var(--text-muted)">Monto inicial ($)</label>
              <input id="tes-monto-inicial" type="number" min="0" [ngModel]="montoInicial()" (ngModelChange)="montoInicial.set($event)" placeholder="Ej: 5000"
                     class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent tabular-nums" style="border-color: var(--border-glass); color: var(--text-primary)" />
            </div>
            <button (click)="ejecutarAbrirCaja()" [disabled]="loadingAbrir()" class="btn-primary w-full text-sm font-medium py-2 rounded-lg">
              {{ loadingAbrir() ? 'Abriendo...' : 'Abrir caja' }}
            </button>
          </div>
        </emx-glass-card>

        <!-- Card 2: Registrar movimiento -->
        <emx-glass-card>
          <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">Registrar movimiento</h2>
          <div class="space-y-3">
            <div>
              <label for="tes-caja-mov" class="block text-xs font-semibold mb-1" style="color: var(--text-muted)">Caja</label>
              <select id="tes-caja-mov" [ngModel]="cajaIdMovimiento()" (ngModelChange)="cajaIdMovimiento.set($event)" [title]="nombreCaja(cajaIdMovimiento())"
                      class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent" style="border-color: var(--border-glass); color: var(--text-primary)">
                <option [ngValue]="null" disabled>{{ loadingCajas() ? 'Cargando...' : 'Seleccioná una caja' }}</option>
                @for (c of cajasAbiertas(); track c.id) {
                  <option [ngValue]="c.id">{{ c.nombre }} (#{{ c.id }})</option>
                }
              </select>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label for="tes-mov-tipo" class="block text-xs font-semibold mb-1" style="color: var(--text-muted)">Tipo</label>
                <select id="tes-mov-tipo" [ngModel]="movTipo()" (ngModelChange)="movTipo.set($event)"
                        class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent" style="border-color: var(--border-glass); color: var(--text-primary)">
                  <option value="INGRESO">Ingreso</option>
                  <option value="EGRESO">Egreso</option>
                </select>
              </div>
              <div>
                <label for="tes-mov-monto" class="block text-xs font-semibold mb-1" style="color: var(--text-muted)">Monto ($)</label>
                <input id="tes-mov-monto" type="number" min="0" [ngModel]="movMonto()" (ngModelChange)="movMonto.set($event)" placeholder="Ej: 1500"
                       class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent tabular-nums" style="border-color: var(--border-glass); color: var(--text-primary)" />
              </div>
            </div>
            <div>
              <label for="tes-mov-concepto" class="block text-xs font-semibold mb-1" style="color: var(--text-muted)">Concepto</label>
              <input id="tes-mov-concepto" type="text" [ngModel]="movConcepto()" (ngModelChange)="movConcepto.set($event)" placeholder="Concepto del movimiento"
                     class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent" style="border-color: var(--border-glass); color: var(--text-primary)" />
            </div>
            <button (click)="ejecutarRegistrarMovimiento()" [disabled]="loadingMovimiento()" class="btn-primary w-full text-sm font-medium py-2 rounded-lg">
              {{ loadingMovimiento() ? 'Registrando...' : 'Registrar movimiento' }}
            </button>
          </div>
        </emx-glass-card>

        <!-- Card 3: Arqueo y billetaje -->
        <emx-glass-card>
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold" style="color: var(--text-primary)">Arqueo</h2>
            <button
              type="button"
              (click)="mostrarBilletaje.update(v => !v)"
              class="text-xs px-2.5 py-1 rounded border border-[var(--border-glass)] text-[var(--accent-blue)] bg-[var(--surface-glass)] hover:bg-white/5 transition font-semibold"
            >
              {{ mostrarBilletaje() ? 'Ocultar billetaje' : 'Contar por billetes' }}
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <label for="tes-caja-arqueo" class="block text-xs font-semibold mb-1" style="color: var(--text-muted)">Caja a arquear</label>
              <select id="tes-caja-arqueo" [ngModel]="cajaIdArqueo()" (ngModelChange)="cajaIdArqueo.set($event)" [title]="nombreCaja(cajaIdArqueo())"
                      class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent" style="border-color: var(--border-glass); color: var(--text-primary)">
                <option [ngValue]="null" disabled>{{ loadingCajas() ? 'Cargando...' : 'Seleccioná una caja' }}</option>
                @for (c of cajasAbiertas(); track c.id) {
                  <option [ngValue]="c.id">{{ c.nombre }} (#{{ c.id }})</option>
                }
              </select>
            </div>

            @if (mostrarBilletaje()) {
              <div class="p-3 bg-[var(--surface-glass)] rounded-xl border border-[var(--border-glass)] space-y-2">
                <div class="billetaje-fila grid items-center gap-2 text-[10px] font-bold uppercase text-[var(--text-muted)] border-b border-[var(--border-glass)] pb-1"
                     style="grid-template-columns: 4.5rem minmax(0, 1fr);">
                  <span>Billete</span>
                  <span class="text-right">Cantidad</span>
                </div>
                @for (d of denominaciones; track d) {
                  <div class="billetaje-fila grid items-center gap-x-2 gap-y-0.5 text-xs" style="grid-template-columns: 4.5rem minmax(0, 1fr);">
                    <span class="font-bold text-[var(--text-primary)] whitespace-nowrap tabular-nums">$ {{ d | number }}</span>
                    <input
                      type="number"
                      min="0"
                      [value]="billetes()[d] || ''"
                      (input)="actualizarCantidadBillete(d, +$any($event.target).value)"
                      placeholder="0"
                      class="w-full min-w-0 px-2 py-1 border rounded text-right tabular-nums bg-[var(--surface-inset)]"
                      style="border-color: var(--border-glass); color: var(--text-primary);"
                    />
                    <span class="col-span-2 text-right text-[11px] whitespace-nowrap tabular-nums text-[var(--text-muted)]">
                      = {{ ((billetes()[d] || 0) * d) | moneda }}
                    </span>
                  </div>
                }
                <div class="border-t border-[var(--border-glass)] pt-2 flex justify-between items-center text-xs font-bold">
                  <span class="text-[var(--text-primary)]">Total contado:</span>
                  <span class="text-base font-bold tabular-nums text-[var(--text-primary)]">{{ arqMontoFisico() | moneda }}</span>
                </div>
              </div>
            }

            <div>
              <label for="tes-arq-monto" class="block text-xs font-semibold mb-1" style="color: var(--text-muted)">Monto contado ($)</label>
              <input id="tes-arq-monto" type="number" min="0" [ngModel]="arqMontoFisico()" (ngModelChange)="arqMontoFisico.set($event)" placeholder="Ingresá lo que contaste"
                     class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent font-bold tabular-nums" style="border-color: var(--border-glass); color: var(--text-primary);" />
            </div>
            @if (hayDiferenciaDeArqueo()) {
              <div>
                <label for="tes-arq-justificacion" class="block text-xs font-semibold mb-1" style="color: var(--accent-amber, #f59e0b)">
                  {{ diferenciaDeArqueo() > 0 ? 'Sobrante' : 'Faltante' }} de {{ diferenciaDeArqueo() | moneda }}: explicá la diferencia *
                </label>
                <textarea id="tes-arq-justificacion" [ngModel]="arqJustificacion()" (ngModelChange)="arqJustificacion.set($event)" rows="2" maxlength="500"
                          placeholder="Explicá el sobrante o faltante"
                          class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent" style="border-color: var(--border-glass); color: var(--text-primary);"></textarea>
              </div>
            }
            <button (click)="ejecutarArqueo()" [disabled]="loadingArqueo()" class="btn-primary w-full text-sm font-medium py-2 rounded-lg">
              {{ loadingArqueo() ? 'Procesando...' : 'Cerrar arqueo' }}
            </button>
          </div>
        </emx-glass-card>
      </div>

      <!-- Estado de cajas (GET /cajas) -->
      <emx-glass-card>
        <div class="mb-4">
          <h2 class="text-lg font-semibold" style="color: var(--text-primary)">Cajas</h2>
          <p class="text-xs" style="color: var(--text-muted)">Elegí una caja para ver sus movimientos.</p>
        </div>
        @if (cajas().length > 0) {
          <ul class="space-y-2">
            @for (c of cajas(); track c.id) {
              <li>
                <button type="button" (click)="seleccionarCajaHistorial(c.id)" [attr.aria-pressed]="cajaIdHistorial() === c.id"
                        class="w-full flex items-center justify-between gap-3 text-left text-sm px-3 py-2 rounded-lg border transition"
                        [style.border-color]="cajaIdHistorial() === c.id ? 'var(--accent-blue)' : 'var(--border-glass)'"
                        style="color: var(--text-primary)">
                  <span class="min-w-0 break-words">{{ c.nombre }} (#{{ c.id }})</span>
                  <span class="flex items-center gap-3 shrink-0">
                    <span class="text-xs" style="color: var(--text-muted)">Estado: {{ c.estado | estado }}</span>
                    <span class="tabular-nums" [style.color]="c.saldoActual === 0 ? 'var(--text-muted)' : 'var(--text-primary)'">Saldo actual {{ c.saldoActual | moneda }}</span>
                  </span>
                </button>
              </li>
            }
          </ul>
        } @else {
          <emx-empty-state message="No hay cajas abiertas. Abrí una desde la ficha superior para que aparezca acá."></emx-empty-state>
        }
      </emx-glass-card>

      @if (cajaIdHistorial() != null) {
        <emx-glass-card class="mt-6 block">
          <div class="mb-4">
            <h2 class="text-lg font-semibold" style="color: var(--text-primary)">Movimientos de {{ nombreCaja(cajaIdHistorial()) }}</h2>
          </div>
          @if (loadingMovimientosCaja()) {
            <p class="text-sm" style="color: var(--text-muted)">Cargando movimientos...</p>
          } @else if (movimientosCaja().length === 0) {
            <emx-empty-state message="Esta caja todavía no tiene movimientos."></emx-empty-state>
          } @else {
            <div class="overflow-x-auto" data-testid="movimientos-caja">
              <table class="w-full text-sm" style="color: var(--text-primary)">
                <thead>
                  <tr class="text-xs text-left" style="color: var(--text-muted)">
                    @if (movimientosConFecha()) { <th class="py-2 pr-3 font-semibold">Fecha</th> }
                    <th class="py-2 pr-3 font-semibold">Tipo</th>
                    <th class="py-2 pr-3 font-semibold">Concepto</th>
                    <th class="py-2 pr-3 font-semibold text-right">Monto</th>
                    @if (movimientosConUsuario()) { <th class="py-2 font-semibold">Usuario</th> }
                  </tr>
                </thead>
                <tbody>
                  @for (m of movimientosCaja(); track m.id) {
                    <tr class="border-t" style="border-color: var(--border-glass)">
                      @if (movimientosConFecha()) { <td class="py-2 pr-3 whitespace-nowrap">{{ m.fecha | fecha }}</td> }
                      <td class="py-2 pr-3">{{ m.tipo | estado }}</td>
                      <td class="py-2 pr-3">{{ m.concepto }}</td>
                      <td class="py-2 pr-3 text-right tabular-nums whitespace-nowrap">{{ m.tipo === 'EGRESO' ? '−' : '' }}{{ m.monto | moneda }}</td>
                      @if (movimientosConUsuario()) { <td class="py-2">{{ m.usuario || '—' }}</td> }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </emx-glass-card>
      }
    </div>
  `,
  styles: [`
    .btn-primary { background: var(--accent-blue); color: white; transition: opacity 0.2s; }
    .btn-primary:hover:not(:disabled) { opacity: 0.9; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  `]
})
export class TesoreriaComponent implements OnInit {
  private readonly api = inject(TesoreriaApi);
  private readonly feedback = inject(UserFeedbackService);

  // Form states
  cajaNombre = signal<string>('Caja Principal');
  /** Amount fields start empty (S4): a typed value, not a pre-filled 0. */
  montoInicial = signal<number | null>(null);
  loadingAbrir = signal<boolean>(false);

  cajas = signal<Caja[]>([]);
  loadingCajas = signal<boolean>(false);
  cajaIdMovimiento = signal<number | null>(null);
  movTipo = signal<'INGRESO' | 'EGRESO'>('INGRESO');
  movMonto = signal<number | null>(null);
  movConcepto = signal<string>('');
  loadingMovimiento = signal<boolean>(false);

  cajaIdArqueo = signal<number | null>(null);
  arqMontoFisico = signal<number | null>(null);
  arqJustificacion = signal<string>('');
  loadingArqueo = signal<boolean>(false);

  /** Una caja cerrada ya no admite movimientos ni arqueos: sólo se ofrecen las abiertas (QA-ROL-025). */
  readonly cajasAbiertas = computed(() => this.cajas().filter((c) => c.estado !== 'CERRADA'));

  /** No difference is reported until the counted amount was entered (S4). */
  readonly diferenciaDeArqueo = computed(() => {
    const contado = this.arqMontoFisico();
    const caja = this.cajas().find((c) => c.id === this.cajaIdArqueo());
    return caja && contado != null ? contado - caja.saldoActual : 0;
  });
  readonly hayDiferenciaDeArqueo = computed(() => this.diferenciaDeArqueo() !== 0);

  readonly denominaciones: number[] = [20000, 10000, 2000, 1000, 500, 200, 100];
  readonly billetes = signal<Record<number, number>>({
    20000: 0,
    10000: 0,
    2000: 0,
    1000: 0,
    500: 0,
    200: 0,
    100: 0,
  });
  readonly mostrarBilletaje = signal<boolean>(false);

  /** Box whose movements are listed below the grid (017). */
  readonly cajaIdHistorial = signal<number | null>(null);
  readonly movimientosCaja = signal<MovimientoCaja[]>([]);
  readonly loadingMovimientosCaja = signal<boolean>(false);
  readonly movimientosConFecha = computed(() => this.movimientosCaja().some((m) => !!m.fecha));
  readonly movimientosConUsuario = computed(() => this.movimientosCaja().some((m) => !!m.usuario));

  nombreCaja(id: number | null): string {
    return this.cajas().find((c) => c.id === id)?.nombre ?? '';
  }

  seleccionarCajaHistorial(id: number): void {
    this.cajaIdHistorial.set(id);
    this.cargarMovimientosCaja(id);
  }

  cargarMovimientosCaja(id: number): void {
    this.loadingMovimientosCaja.set(true);
    this.api.obtenerMovimientosCaja(id).subscribe({
      next: (list) => {
        if (this.cajaIdHistorial() !== id) return;
        this.movimientosCaja.set(list);
        this.loadingMovimientosCaja.set(false);
      },
      error: (err) => {
        this.movimientosCaja.set([]);
        this.loadingMovimientosCaja.set(false);
        this.feedback.fromHttpError(err);
      },
    });
  }

  actualizarCantidadBillete(denominacion: number, cantidad: number): void {
    const cant = Math.max(0, isNaN(cantidad) ? 0 : cantidad);
    const updated = { ...this.billetes(), [denominacion]: cant };
    this.billetes.set(updated);

    const total = Object.entries(updated).reduce((acc, [d, c]) => acc + (+d * c), 0);
    this.arqMontoFisico.set(total);
  }

  ngOnInit(): void {
    this.cargarCajas();
  }

  cargarCajas(): void {
    this.loadingCajas.set(true);
    this.api.obtenerCajas().subscribe({
      next: (list) => {
        this.cajas.set(list);
        this.loadingCajas.set(false);
        const abiertas = list.filter((c) => c.estado !== 'CERRADA');
        const sigueAbierta = (id: number | null) => id != null && abiertas.some((c) => c.id === id);
        if (!sigueAbierta(this.cajaIdMovimiento())) this.cajaIdMovimiento.set(abiertas[0]?.id ?? null);
        if (!sigueAbierta(this.cajaIdArqueo())) this.cajaIdArqueo.set(abiertas[0]?.id ?? null);
        const historial = this.cajaIdHistorial();
        const siguiente = historial != null && list.some((c) => c.id === historial) ? historial : (abiertas[0] ?? list[0])?.id;
        if (siguiente != null) this.seleccionarCajaHistorial(siguiente);
      },
      error: (err) => {
        this.loadingCajas.set(false);
        this.feedback.fromHttpError(err);
      },
    });
  }

  ejecutarAbrirCaja(): void {
    if (!this.cajaNombre().trim()) {
      this.feedback.push({ type: 'warning', title: 'Validación', message: 'Ingresá el nombre de la caja.' });
      return;
    }
    this.loadingAbrir.set(true);
    this.api.abrirCaja(this.cajaNombre().trim(), this.montoInicial() ?? 0).subscribe({
      next: (caja: Caja) => {
        this.loadingAbrir.set(false);
        this.cajas.update((list) => [...list, caja]);
        this.cajaIdMovimiento.set(caja.id);
        this.cajaIdArqueo.set(caja.id);
        this.feedback.push({
          type: 'success',
          title: 'Caja abierta',
          message: `Caja "${caja.nombre}" (#${caja.id}) abierta con saldo inicial ${formatMoneda(caja.saldoActual)}.`,
        });
        this.montoInicial.set(null);
        this.seleccionarCajaHistorial(caja.id);
      },
      error: (err) => {
        this.loadingAbrir.set(false);
        this.feedback.fromHttpError(err);
      },
    });
  }

  ejecutarRegistrarMovimiento(): void {
    if (this.cajaIdMovimiento() == null) {
      this.feedback.push({ type: 'warning', title: 'Validación', message: 'Seleccioná una caja.' });
      return;
    }
    const monto = this.movMonto();
    if (!this.movConcepto().trim() || monto == null || monto <= 0) {
      this.feedback.push({ type: 'warning', title: 'Validación', message: 'Ingresá un concepto válido y un monto mayor a 0.' });
      return;
    }
    this.loadingMovimiento.set(true);
    const cajaId = this.cajaIdMovimiento()!;
    this.api.registrarMovimientoCaja(cajaId, this.movTipo(), monto, this.movConcepto().trim()).subscribe({
      next: (mov: MovimientoCaja) => {
        this.loadingMovimiento.set(false);
        this.feedback.push({
          type: 'success',
          title: 'Movimiento registrado',
          message: `${etiquetaEstado(mov.tipo)} #${mov.id} por ${formatMoneda(mov.monto)} registrado.`,
        });
        this.movMonto.set(null);
        this.movConcepto.set('');
        if (this.cajaIdHistorial() === cajaId) this.cargarMovimientosCaja(cajaId);
      },
      error: (err) => {
        this.loadingMovimiento.set(false);
        this.feedback.fromHttpError(err);
      },
    });
  }

  ejecutarArqueo(): void {
    if (this.cajaIdArqueo() == null) {
      this.feedback.push({ type: 'warning', title: 'Validación', message: 'Seleccioná una caja.' });
      return;
    }
    const contado = this.arqMontoFisico();
    if (contado == null) {
      this.feedback.push({ type: 'warning', title: 'Validación', message: 'Ingresá el monto que contaste.' });
      return;
    }
    if (contado < 0) {
      this.feedback.push({ type: 'warning', title: 'Validación', message: 'El monto contado debe ser igual o mayor a 0.' });
      return;
    }
    const justificacion = this.arqJustificacion().trim() || undefined;
    if (this.hayDiferenciaDeArqueo() && !justificacion) {
      this.feedback.push({
        type: 'warning',
        title: 'Justificación requerida',
        message: `El conteo difiere del saldo de la caja en ${formatMoneda(this.diferenciaDeArqueo())}. Explicá la diferencia para cerrar el arqueo.`,
      });
      return;
    }
    this.loadingArqueo.set(true);
    this.api.realizarArqueoCaja(this.cajaIdArqueo()!, contado, justificacion).subscribe({
      next: (arq: ArqueoCaja) => {
        this.loadingArqueo.set(false);
        const quien = arq.realizadoPor ? ` por ${arq.realizadoPor}` : '';
        const dif = arq.diferencia ? ` Diferencia: ${formatMoneda(arq.diferencia)}.` : '';
        this.feedback.push({
          type: 'success',
          title: 'Arqueo realizado',
          message: `Arqueo #${arq.id}${quien} con un conteo de ${formatMoneda(arq.montoFisicoContado)}.${dif} La caja quedó cerrada.`,
        });
        this.arqJustificacion.set('');
        this.arqMontoFisico.set(null);
        this.cargarCajas();
      },
      error: (err) => {
        this.loadingArqueo.set(false);
        this.feedback.fromHttpError(err);
      },
    });
  }
}
