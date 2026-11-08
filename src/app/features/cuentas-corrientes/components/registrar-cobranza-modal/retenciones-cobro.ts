/**
 * Lógica pura de las retenciones sufridas en un cobro (QA-ROL-019).
 *
 * Una retención sufrida (Ganancias, IIBB, IVA, SUSS) es plata que el cliente no paga pero que
 * igual cancela deuda de sus facturas. Por eso el "monto cobrado" del recibo es el total que
 * cancela deuda (bruto) y lo realmente recibido es ese monto menos las retenciones. Estas reglas
 * espejan las del backend (`CobranzaService`) para avisar antes de enviar; el backend las vuelve a
 * validar y es la autoridad.
 */

export type TipoRetencion = 'GANANCIAS' | 'IIBB' | 'IVA' | 'SUSS';
export type MedioPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'OTRO';

export const TIPOS_RETENCION: ReadonlyArray<{ valor: TipoRetencion; etiqueta: string }> = [
  { valor: 'GANANCIAS', etiqueta: 'Ganancias' },
  { valor: 'IIBB', etiqueta: 'Ingresos Brutos' },
  { valor: 'IVA', etiqueta: 'IVA' },
  { valor: 'SUSS', etiqueta: 'SUSS' },
];

export const MEDIOS_PAGO: ReadonlyArray<{ valor: MedioPago; etiqueta: string }> = [
  { valor: 'EFECTIVO', etiqueta: 'Efectivo' },
  { valor: 'TRANSFERENCIA', etiqueta: 'Transferencia' },
  { valor: 'CHEQUE', etiqueta: 'Cheque' },
  { valor: 'OTRO', etiqueta: 'Otro' },
];

/** Una fila de retención tal como se edita en el formulario (el monto puede estar vacío). */
export interface RetencionForm {
  tipo: TipoRetencion;
  monto: number | null;
  numeroCertificado: string;
  /** Sólo se usa y se envía cuando el tipo es IIBB. */
  jurisdiccion: string;
}

export function retencionVacia(): RetencionForm {
  return { tipo: 'GANANCIAS', monto: null, numeroCertificado: '', jurisdiccion: '' };
}

/** Suma lo retenido; una fila sin monto todavía no cuenta. */
export function totalRetenciones(retenciones: readonly RetencionForm[]): number {
  return retenciones.reduce((suma, r) => suma + (r.monto ?? 0), 0);
}

/** Lo realmente recibido: lo que cancela deuda menos lo que el cliente retuvo. */
export function montoNeto(montoCobrado: number, retenciones: readonly RetencionForm[]): number {
  return montoCobrado - totalRetenciones(retenciones);
}

/**
 * Devuelve el primer problema de las retenciones, o `null` si están bien.
 *
 * Cada una necesita monto positivo y número de certificado; la de IIBB además la jurisdicción
 * (cada provincia es un crédito fiscal distinto). Y la suma tiene que quedar por debajo del monto
 * cobrado: si el cliente no pagó nada, no es un cobro.
 */
export function validarRetenciones(montoCobrado: number, retenciones: readonly RetencionForm[]): string | null {
  for (const [i, r] of retenciones.entries()) {
    const fila = `Retención ${i + 1}`;
    if (r.monto === null || !(r.monto > 0)) return `${fila}: ingresá un monto mayor a cero.`;
    if (r.numeroCertificado.trim() === '') return `${fila}: falta el número de certificado.`;
    if (r.tipo === 'IIBB' && r.jurisdiccion.trim() === '') return `${fila}: falta la jurisdicción de Ingresos Brutos.`;
  }
  if (retenciones.length > 0 && totalRetenciones(retenciones) >= montoCobrado) {
    return 'Las retenciones no pueden igualar ni superar el monto cobrado.';
  }
  return null;
}
