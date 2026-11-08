import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { CobranzasApiService, DocumentoPendienteDTO } from '../../../../data-access/api/cobranzas.api';
import {
  MEDIOS_PAGO,
  MedioPago,
  RetencionForm,
  TIPOS_RETENCION,
  montoNeto,
  retencionVacia,
  validarRetenciones,
} from './retenciones-cobro';

@Component({
  selector: 'app-registrar-cobranza-modal',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-white text-gray-900 rounded-lg shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div class="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h3 class="text-lg font-semibold">Registrar Cobro</h3>
          <button type="button" class="text-gray-400 hover:text-gray-600" (click)="cerrar.emit()">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div class="p-6 overflow-y-auto flex-1">
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Número de Recibo</label>
                <input type="text" formControlName="numeroRecibo" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" placeholder="Ej: 0001-00000123">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Monto Total Cobrado</label>
                <input type="number" formControlName="montoCobrado" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2">
                <p class="mt-1 text-xs text-gray-500">Total que cancela deuda, incluidas las retenciones.</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Medio de pago</label>
                <select formControlName="medioPago" data-testid="medio-pago" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm border p-2 bg-white">
                  <option value="" disabled>Seleccioná un medio</option>
                  @for (m of mediosPago; track m.valor) {
                    <option [value]="m.valor">{{ m.etiqueta }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700">Moneda</label>
                <input type="text" formControlName="moneda" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 sm:text-sm border p-2" readonly>
              </div>
            </div>

            <div class="mt-2">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-md font-medium text-gray-700">Retenciones sufridas</h4>
                <button type="button" data-testid="agregar-retencion" class="text-sm font-medium text-indigo-600 hover:text-indigo-800" (click)="agregarRetencion()">
                  + Agregar retención
                </button>
              </div>
              <p class="text-xs text-gray-500 mb-2">Lo que el cliente retuvo al pagar. Cancela deuda igual que el cobro, pero no es plata recibida.</p>
              @for (r of retenciones(); track $index; let i = $index) {
                <div class="grid grid-cols-12 gap-2 mb-2 items-end" data-testid="fila-retencion">
                  <div class="col-span-3">
                    <label class="block text-xs text-gray-600">Tributo</label>
                    <select class="block w-full rounded-md border border-gray-300 p-1.5 text-sm bg-white" [value]="r.tipo"
                            (change)="actualizarRetencion(i, { tipo: $any($event.target).value })">
                      @for (t of tiposRetencion; track t.valor) {
                        <option [value]="t.valor" [selected]="t.valor === r.tipo">{{ t.etiqueta }}</option>
                      }
                    </select>
                  </div>
                  <div class="col-span-2">
                    <label class="block text-xs text-gray-600">Monto</label>
                    <input type="number" min="0" class="block w-full rounded-md border border-gray-300 p-1.5 text-sm" [value]="r.monto ?? ''"
                           (input)="actualizarRetencion(i, { monto: $any($event.target).value === '' ? null : +$any($event.target).value })">
                  </div>
                  <div class="col-span-3">
                    <label class="block text-xs text-gray-600">N° certificado</label>
                    <input type="text" maxlength="50" class="block w-full rounded-md border border-gray-300 p-1.5 text-sm" [value]="r.numeroCertificado"
                           (input)="actualizarRetencion(i, { numeroCertificado: $any($event.target).value })">
                  </div>
                  <div class="col-span-3">
                    @if (r.tipo === 'IIBB') {
                      <label class="block text-xs text-gray-600">Jurisdicción</label>
                      <input type="text" maxlength="50" class="block w-full rounded-md border border-gray-300 p-1.5 text-sm" [value]="r.jurisdiccion"
                             (input)="actualizarRetencion(i, { jurisdiccion: $any($event.target).value })">
                    }
                  </div>
                  <div class="col-span-1 text-right">
                    <button type="button" class="text-gray-400 hover:text-red-600 text-lg leading-none" aria-label="Quitar retención" (click)="quitarRetencion(i)">×</button>
                  </div>
                </div>
              }
              @if (errorRetenciones()) {
                <div class="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded">{{ errorRetenciones() }}</div>
              }
              @if (retenciones().length > 0) {
                <div class="mt-2 text-sm font-medium text-gray-700 bg-gray-50 p-2 rounded">
                  Neto recibido: $ {{ montoNetoRecibido() | number:'1.2-2' }}
                </div>
              }
            </div>

            <div class="mt-6">
              <h4 class="text-md font-medium text-gray-700 mb-2">Documentos Pendientes</h4>
              <p class="text-sm text-gray-500 mb-4">Seleccione los documentos a imputar (hasta cubrir el monto cobrado).</p>
              
              <div class="overflow-x-auto border rounded-md">
                <table class="min-w-full divide-y divide-gray-200">
                  <thead class="bg-gray-50">
                    <tr>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                      <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                      <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Saldo Pendiente</th>
                      <th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">A Imputar</th>
                    </tr>
                  </thead>
                  <tbody class="bg-white divide-y divide-gray-200">
                    @for (doc of documentosPendientes; track doc.id) {
                      <tr>
                        <td class="px-4 py-3 whitespace-nowrap text-sm">{{ doc.numeroDocumento }}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm">{{ doc.fechaVencimiento || 'N/A' }}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">$ {{ doc.saldoPendiente | number:'1.2-2' }}</td>
                        <td class="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <input type="number" 
                                 class="w-24 border-gray-300 rounded-md text-right border p-1 sm:text-sm"
                                 [max]="doc.saldoPendiente"
                                 min="0"
                                 (input)="onImputarChange(doc.id, $event)">
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="4" class="px-4 py-8 text-center text-gray-500 text-sm">No hay documentos pendientes para este tercero.</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              
              <div class="mt-4 flex justify-between bg-blue-50 p-3 rounded-md">
                <span class="text-sm font-medium text-blue-800">Total a imputar: $ {{ totalAImputar() | number:'1.2-2' }}</span>
                <span class="text-sm font-medium text-blue-800">Saldo remanente del recibo: $ {{ saldoRemanente() | number:'1.2-2' }}</span>
              </div>
              @if (errorImputacion() ?? error(); as mensaje) {
                <div class="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">{{ mensaje }}</div>
              }
            </div>
          </form>
        </div>

        <div class="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button type="button" class="px-4 py-2 border rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50" (click)="cerrar.emit()">
            Cancelar
          </button>
          <button type="button" 
                  class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
                  [disabled]="form.invalid || subiendo() || hasImputacionError() || errorRetenciones() !== null"
                  (click)="onSubmit()">
            {{ subiendo() ? 'Registrando...' : 'Registrar Cobranza' }}
          </button>
        </div>
      </div>
    </div>
  `
})
/**
 * Modal para registrar un recibo de cobranza e imputar su monto contra documentos comerciales
 * pendientes de pago del tercero seleccionado.
 *
 * Invariantes de negocio protegidos:
 * - El total imputado no puede superar el monto cobrado (saldo remanente del recibo >= 0).
 * - El monto imputado por documento no puede superar el saldo pendiente de ese documento.
 * - Las imputaciones se aplican mediante el servicio {@link CobranzasApiService} contra
 *   POST /api/cxc/cobranzas/{id}/aplicaciones.
 *
 * Emite {@link cobranzaRegistrada} al padre para refrescar el estado de cuenta del tercero.
 */
export class RegistrarCobranzaModalComponent {
  /** ID del tercero (TerceroEmpresa) para el que se registra la cobranza. */
  @Input({ required: true }) terceroEmpresaId!: number;

  /** Documentos comerciales con saldo pendiente del tercero, provistos por el componente padre. */
  @Input() documentosPendientes: DocumentoPendienteDTO[] = [];

  /** Emite cuando el usuario cancela o cierra el modal sin registrar. */
  @Output() cerrar = new EventEmitter<void>();

  /** Emite cuando la cobranza se registró exitosamente para que el padre refresque la vista. */
  @Output() cobranzaRegistrada = new EventEmitter<void>();

  private readonly fb = inject(FormBuilder);
  private readonly cobranzasApi = inject(CobranzasApiService);

  /** Formulario reactivo con los datos del recibo de cobranza. */
  readonly form = this.fb.group({
    numeroRecibo: ['', [Validators.required]],
    montoCobrado: [0, [Validators.required, Validators.min(0.01)]],
    moneda: ['ARS'],
    // Obligatorio en la pantalla; el backend lo acepta vacío sólo por compatibilidad con clientes viejos.
    medioPago: ['', [Validators.required]],
  });

  readonly mediosPago = MEDIOS_PAGO;
  readonly tiposRetencion = TIPOS_RETENCION;

  /** Retenciones que el cliente practicó en este pago, tal como se editan en pantalla. */
  readonly retenciones = signal<RetencionForm[]>([]);

  agregarRetencion(): void {
    this.retenciones.update((lista) => [...lista, retencionVacia()]);
  }

  quitarRetencion(indice: number): void {
    this.retenciones.update((lista) => lista.filter((_, i) => i !== indice));
  }

  /** Aplica un cambio parcial a una fila, sin mutar las demás. */
  actualizarRetencion(indice: number, cambios: Partial<RetencionForm>): void {
    this.retenciones.update((lista) => lista.map((r, i) => (i === indice ? { ...r, ...cambios } : r)));
  }

  /** Problema de las retenciones cargadas (o `null`); espeja las reglas del backend. */
  errorRetenciones(): string | null {
    return validarRetenciones(this.form.value.montoCobrado ?? 0, this.retenciones());
  }

  /** Lo realmente recibido: el total que cancela deuda menos lo retenido por el cliente. */
  montoNetoRecibido(): number {
    return montoNeto(this.form.value.montoCobrado ?? 0, this.retenciones());
  }

  readonly subiendo = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Clave de idempotencia fija por apertura del modal: si el usuario reintenta tras un error de
   * red sin cerrar el modal, el reintento reutiliza la misma clave y el backend devuelve el
   * recibo ya creado en el primer intento en vez de duplicarlo (H-09).
   */
  private readonly idempotencyKey = crypto.randomUUID();

  /** Mapa de imputaciones: clave = doc.id, valor = monto a aplicar contra ese documento. */
  readonly imputaciones = signal<Record<number, number>>({});

  /**
   * Actualiza el monto a imputar para un documento, limitando al saldo pendiente
   * para respetar el invariante de no sobre-imputar el documento.
   *
   * @param docId ID del documento comercial.
   * @param event Evento de entrada del campo numérico.
   */
  onImputarChange(docId: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const value = parseFloat(target.value) || 0;

    // Invariante: no imputar más del saldo pendiente del documento
    const doc = this.documentosPendientes.find((d) => d.id === docId);
    let finalValue = value;
    if (doc && value > doc.saldoPendiente) {
      finalValue = doc.saldoPendiente;
      target.value = finalValue.toString();
    }

    this.imputaciones.update((prev) => ({ ...prev, [docId]: finalValue }));
  }

  /** Calcula el total de montos a imputar entre todos los documentos seleccionados. */
  totalAImputar(): number {
    return Object.values(this.imputaciones()).reduce((sum, val) => sum + val, 0);
  }

  /**
   * Calcula el saldo remanente del recibo (monto cobrado - total imputado).
   * Invariante: debe ser >= 0 al momento de confirmar.
   */
  saldoRemanente(): number {
    const cobrado = this.form.value.montoCobrado ?? 0;
    return cobrado - this.totalAImputar();
  }

  /**
   * Mensaje de error si el total a imputar supera el monto cobrado, o `null` si está bien.
   *
   * Es una función pura a propósito: el template la llama en cada renderizado, y escribir una señal
   * ahí (como hacía antes con `error.set`) hace que Angular aborte el render con NG0600 en cuanto
   * el formulario es válido, dejando la pantalla congelada.
   */
  errorImputacion(): string | null {
    return this.saldoRemanente() < 0 ? 'El total a imputar no puede superar el monto cobrado del recibo.' : null;
  }

  /** Indica si hay un error de imputación que bloquea el registro. */
  hasImputacionError(): boolean {
    return this.errorImputacion() !== null;
  }

  /**
   * Registra el recibo de cobranza y aplica las imputaciones contra los documentos seleccionados
   * en una sola llamada atómica (H-09): antes, el recibo se creaba con una llamada y cada
   * imputación con una llamada HTTP separada, así que una falla a mitad de camino (ej. la
   * segunda de tres imputaciones) dejaba el recibo persistido con imputaciones parciales, sin
   * que un reintento del usuario supiera si debía empezar de cero o continuar. Ahora todo va en
   * un único POST, con {@link idempotencyKey} protegiendo contra el doble envío del mismo
   * formulario.
   *
   * Emite {@link cobranzaRegistrada} al padre cuando la operación completa con éxito.
   */
  onSubmit(): void {
    if (this.form.invalid || this.hasImputacionError() || this.errorRetenciones() !== null) return;

    const val = this.form.value;
    this.subiendo.set(true);
    this.error.set(null);

    const docIdsToApply = Object.keys(this.imputaciones())
      .map((id) => parseInt(id))
      .filter((id) => (this.imputaciones()[id] ?? 0) > 0);

    this.cobranzasApi
      .registrarCobranzaConImputaciones(
        {
          terceroEmpresaId: this.terceroEmpresaId,
          numeroRecibo: val.numeroRecibo!,
          montoCobrado: val.montoCobrado!,
          moneda: val.moneda!,
          medioPago: val.medioPago as MedioPago,
          // La jurisdicción sólo viaja en IIBB: al cambiar de tributo puede quedar texto viejo.
          retenciones: this.retenciones().map((r) => ({
            tipo: r.tipo,
            monto: r.monto!,
            numeroCertificado: r.numeroCertificado.trim(),
            jurisdiccion: r.tipo === 'IIBB' ? r.jurisdiccion.trim() : undefined,
          })),
          imputaciones: docIdsToApply.map((docId) => ({
            documentoComercialId: docId,
            montoImputado: this.imputaciones()[docId],
          })),
        },
        this.idempotencyKey,
      )
      .subscribe({
        next: () => {
          this.subiendo.set(false);
          this.cobranzaRegistrada.emit();
        },
        error: (err) => {
          this.error.set(
            'Error al registrar la cobranza: ' +
              (err?.error?.detail ?? err?.error?.title ?? 'Error desconocido'),
          );
          this.subiendo.set(false);
        },
      });
  }
}
