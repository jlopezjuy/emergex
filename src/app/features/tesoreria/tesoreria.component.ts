import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TesoreriaApi, Caja, MovimientoCaja, ArqueoCaja } from '../../data-access/api/tesoreria.api';
import { GlassCardComponent } from '../../shared/components/glass-card/glass-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { UserFeedbackService } from '../../core/notifications/user-feedback.service';

@Component({
  selector: 'emx-tesoreria',
  standalone: true,
  imports: [CommonModule, FormsModule, GlassCardComponent, EmptyStateComponent],
  template: `
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold" style="color: var(--text-primary)">Tesorería</h1>
        <p class="text-sm" style="color: var(--text-muted)">Operaciones de apertura de caja, registro de movimientos y arqueos</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <!-- Card 1: Abrir Caja -->
        <emx-glass-card>
          <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">Apertura de Caja</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted)">Nombre de Caja</label>
              <input type="text" [ngModel]="cajaNombre()" (ngModelChange)="cajaNombre.set($event)" placeholder="Ej: Caja Central"
                     class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent" style="border-color: var(--border-glass); color: var(--text-primary)" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted)">Monto Inicial ($)</label>
              <input type="number" [ngModel]="montoInicial()" (ngModelChange)="montoInicial.set($event)" placeholder="0.00"
                     class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent font-mono" style="border-color: var(--border-glass); color: var(--text-primary)" />
            </div>
            <button (click)="ejecutarAbrirCaja()" [disabled]="loadingAbrir()" class="btn-primary w-full text-sm font-medium py-2 rounded-lg">
              {{ loadingAbrir() ? 'Abriendo...' : 'Abrir Caja' }}
            </button>
          </div>
        </emx-glass-card>

        <!-- Card 2: Registrar Movimiento -->
        <emx-glass-card>
          <h2 class="text-lg font-semibold mb-4" style="color: var(--text-primary)">Registrar Movimiento</h2>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted)">Caja</label>
                <select [ngModel]="cajaIdMovimiento()" (ngModelChange)="cajaIdMovimiento.set($event)"
                        class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent" style="border-color: var(--border-glass); color: var(--text-primary)">
                  <option [ngValue]="null" disabled>{{ loadingCajas() ? 'Cargando...' : 'Seleccioná una caja' }}</option>
                  <option *ngFor="let c of cajasAbiertas()" [ngValue]="c.id">#{{ c.id }} · {{ c.nombre }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted)">Tipo</label>
                <select [ngModel]="movTipo()" (ngModelChange)="movTipo.set($event)"
                        class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent" style="border-color: var(--border-glass); color: var(--text-primary)">
                  <option value="INGRESO">INGRESO</option>
                  <option value="EGRESO">EGRESO</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted)">Monto ($)</label>
              <input type="number" [ngModel]="movMonto()" (ngModelChange)="movMonto.set($event)" placeholder="0.00"
                     class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent font-mono" style="border-color: var(--border-glass); color: var(--text-primary)" />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted)">Concepto</label>
              <input type="text" [ngModel]="movConcepto()" (ngModelChange)="movConcepto.set($event)" placeholder="Concepto del movimiento"
                     class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent" style="border-color: var(--border-glass); color: var(--text-primary)" />
            </div>
            <button (click)="ejecutarRegistrarMovimiento()" [disabled]="loadingMovimiento()" class="btn-primary w-full text-sm font-medium py-2 rounded-lg">
              {{ loadingMovimiento() ? 'Registrando...' : 'Registrar Movimiento' }}
            </button>
          </div>
        </emx-glass-card>

        <!-- Card 3: Realizar Arqueo & Billetaje -->
        <emx-glass-card>
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-lg font-semibold" style="color: var(--text-primary)">Realizar Arqueo</h2>
            <button
              type="button"
              (click)="mostrarBilletaje.update(v => !v)"
              class="text-xs px-2.5 py-1 rounded border border-[var(--border-glass)] text-[var(--accent-blue)] bg-[var(--surface-glass)] hover:bg-white/5 transition font-semibold"
            >
              {{ mostrarBilletaje() ? '✕ Ocultar Billetaje' : '💵 Calculadora Billetaje' }}
            </button>
          </div>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted)">Caja a Arqueada</label>
              <select [ngModel]="cajaIdArqueo()" (ngModelChange)="cajaIdArqueo.set($event)"
                      class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent" style="border-color: var(--border-glass); color: var(--text-primary)">
                <option [ngValue]="null" disabled>{{ loadingCajas() ? 'Cargando...' : 'Seleccioná una caja' }}</option>
                <option *ngFor="let c of cajasAbiertas()" [ngValue]="c.id">#{{ c.id }} · {{ c.nombre }}</option>
              </select>
            </div>

            @if (mostrarBilletaje()) {
              <div class="p-3 bg-[var(--surface-glass)] rounded-xl border border-[var(--border-glass)] space-y-2">
                <div class="flex justify-between items-center text-xs font-bold uppercase text-[var(--text-muted)] border-b border-[var(--border-glass)] pb-1">
                  <span>Denominación</span>
                  <span>Cantidad</span>
                  <span>Subtotal ($)</span>
                </div>
                @for (d of denominaciones; track d) {
                  <div class="flex items-center justify-between gap-2 text-xs">
                    <span class="font-mono font-bold w-16 text-[var(--text-primary)]">$ {{ d | number }}</span>
                    <input
                      type="number"
                      min="0"
                      [value]="billetes()[d] || ''"
                      (input)="actualizarCantidadBillete(d, +$any($event.target).value)"
                      placeholder="0"
                      class="w-20 px-2 py-1 border rounded text-right font-mono bg-[var(--surface-inset)]"
                      style="border-color: var(--border-glass); color: var(--text-primary);"
                    />
                    <span class="font-mono text-right w-24 font-bold text-emerald-400">
                      $ {{ ((billetes()[d] || 0) * d) | number:'1.2-2' }}
                    </span>
                  </div>
                }
                <div class="border-t border-[var(--border-glass)] pt-2 flex justify-between items-center text-xs font-bold">
                  <span class="text-[var(--text-primary)]">Total Conteo Físico:</span>
                  <span class="text-base text-emerald-400 font-mono font-extrabold">$ {{ arqMontoFisico() | number:'1.2-2' }}</span>
                </div>
              </div>
            }

            <div>
              <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted)">Monto Físico Total Contado ($)</label>
              <input type="number" [ngModel]="arqMontoFisico()" (ngModelChange)="arqMontoFisico.set($event)" placeholder="0.00"
                     class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent font-mono font-bold text-emerald-400" style="border-color: var(--border-glass);" />
            </div>
            @if (hayDiferenciaDeArqueo()) {
              <div>
                <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--accent-amber, #f59e0b)">
                  Justificación de la diferencia ($ {{ diferenciaDeArqueo() | number:'1.2-2' }}) *
                </label>
                <textarea [ngModel]="arqJustificacion()" (ngModelChange)="arqJustificacion.set($event)" rows="2" maxlength="500"
                          placeholder="Explicá el sobrante o faltante"
                          class="w-full px-3 py-2 border rounded-lg text-sm bg-transparent" style="border-color: var(--border-glass); color: var(--text-primary);"></textarea>
              </div>
            }
            <button (click)="ejecutarArqueo()" [disabled]="loadingArqueo()" class="btn-primary w-full text-sm font-medium py-2 rounded-lg">
              {{ loadingArqueo() ? 'Procesando...' : 'Cerrar Arqueo' }}
            </button>
          </div>
        </emx-glass-card>
      </div>

      <!-- Estado de cajas (lectura real vía GET /cajas) -->
      <emx-glass-card>
        <div class="mb-4">
          <h2 class="text-lg font-semibold" style="color: var(--text-primary)">Estado de Caja</h2>
        </div>
        <ng-container *ngIf="cajas().length > 0; else sinCajas">
          <ul class="space-y-2">
            <li *ngFor="let c of cajas()" class="flex items-center justify-between text-sm px-3 py-2 rounded-lg border" style="border-color: var(--border-glass); color: var(--text-primary)">
              <span>#{{ c.id }} · {{ c.nombre }}</span>
              <span class="flex items-center gap-3">
                <span class="text-xs font-semibold uppercase" [style.color]="c.estado === 'CERRADA' ? 'var(--text-muted)' : 'var(--accent-green)'">{{ c.estado }}</span>
                <span class="font-mono">Saldo actual $&nbsp;{{ c.saldoActual }}</span>
              </span>
            </li>
          </ul>
        </ng-container>
        <ng-template #sinCajas>
          <emx-empty-state message="No hay cajas abiertas. Abrí una desde la ficha superior para que aparezca acá."></emx-empty-state>
        </ng-template>
      </emx-glass-card>
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
  montoInicial = signal<number>(0);
  loadingAbrir = signal<boolean>(false);

  cajas = signal<Caja[]>([]);
  loadingCajas = signal<boolean>(false);
  cajaIdMovimiento = signal<number | null>(null);
  movTipo = signal<'INGRESO' | 'EGRESO'>('INGRESO');
  movMonto = signal<number>(0);
  movConcepto = signal<string>('');
  loadingMovimiento = signal<boolean>(false);

  cajaIdArqueo = signal<number | null>(null);
  arqMontoFisico = signal<number>(0);
  arqJustificacion = signal<string>('');
  loadingArqueo = signal<boolean>(false);

  /** Una caja cerrada ya no admite movimientos ni arqueos: sólo se ofrecen las abiertas (QA-ROL-025). */
  readonly cajasAbiertas = computed(() => this.cajas().filter((c) => c.estado !== 'CERRADA'));

  readonly diferenciaDeArqueo = computed(() => {
    const caja = this.cajas().find((c) => c.id === this.cajaIdArqueo());
    return caja ? this.arqMontoFisico() - caja.saldoActual : 0;
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
    this.api.abrirCaja(this.cajaNombre().trim(), this.montoInicial()).subscribe({
      next: (caja: Caja) => {
        this.loadingAbrir.set(false);
        this.cajas.update((list) => [...list, caja]);
        this.cajaIdMovimiento.set(caja.id);
        this.cajaIdArqueo.set(caja.id);
        this.feedback.push({
          type: 'success',
          title: 'Caja abierta',
          message: `Caja "${caja.nombre}" (ID #${caja.id}) abierta con saldo inicial $${caja.saldoActual}.`,
        });
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
    if (!this.movConcepto().trim() || this.movMonto() <= 0) {
      this.feedback.push({ type: 'warning', title: 'Validación', message: 'Ingresá un concepto válido y un monto mayor a 0.' });
      return;
    }
    this.loadingMovimiento.set(true);
    this.api.registrarMovimientoCaja(this.cajaIdMovimiento()!, this.movTipo(), this.movMonto(), this.movConcepto().trim()).subscribe({
      next: (mov: MovimientoCaja) => {
        this.loadingMovimiento.set(false);
        this.feedback.push({
          type: 'success',
          title: 'Movimiento registrado',
          message: `Movimiento #${mov.id} (${mov.tipo}) de $${mov.monto} registrado exitosamente.`,
        });
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
    if (this.arqMontoFisico() < 0) {
      this.feedback.push({ type: 'warning', title: 'Validación', message: 'El monto físico contado debe ser igual o mayor a 0.' });
      return;
    }
    const justificacion = this.arqJustificacion().trim() || undefined;
    if (this.hayDiferenciaDeArqueo() && !justificacion) {
      this.feedback.push({
        type: 'warning',
        title: 'Justificación requerida',
        message: `El conteo difiere del saldo de la caja en $${this.diferenciaDeArqueo()}. Explicá la diferencia para cerrar el arqueo.`,
      });
      return;
    }
    this.loadingArqueo.set(true);
    this.api.realizarArqueoCaja(this.cajaIdArqueo()!, this.arqMontoFisico(), justificacion).subscribe({
      next: (arq: ArqueoCaja) => {
        this.loadingArqueo.set(false);
        const quien = arq.realizadoPor ? ` por ${arq.realizadoPor}` : '';
        const dif = arq.diferencia ? ` Diferencia: $${arq.diferencia}.` : '';
        this.feedback.push({
          type: 'success',
          title: 'Arqueo realizado',
          message: `Arqueo #${arq.id}${quien} con un conteo de $${arq.montoFisicoContado}.${dif} La caja quedó cerrada.`,
        });
        this.arqJustificacion.set('');
        this.arqMontoFisico.set(0);
        this.cargarCajas();
      },
      error: (err) => {
        this.loadingArqueo.set(false);
        this.feedback.fromHttpError(err);
      },
    });
  }
}
