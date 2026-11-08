/**
 * Header figures of the B2C invoice list.
 *
 * They must reconcile on screen: invoiced = collected + pending + cancelled. Pending is the
 * outstanding balance of every non-cancelled invoice (invoices waiting for ARCA are still
 * owed), and collected is what was actually applied, including partial payments.
 */
export interface FacturaParaKpi {
  estado: string;
  importeTotal: number;
  saldoPendiente?: number | null;
}

export interface KpisFacturacion {
  totalFacturado: number;
  cobrado: number;
  pendiente: number;
  anulado: number;
  vencidas: number;
}

function saldoDe(f: FacturaParaKpi): number {
  if (f.saldoPendiente !== undefined && f.saldoPendiente !== null) return Number(f.saldoPendiente) || 0;
  return f.estado === 'PAGADA' ? 0 : Number(f.importeTotal) || 0;
}

export function calcularKpisFacturacion(facturas: readonly FacturaParaKpi[]): KpisFacturacion {
  let totalFacturado = 0;
  let pendiente = 0;
  let anulado = 0;
  let vencidas = 0;
  for (const f of facturas) {
    const importe = Number(f.importeTotal) || 0;
    totalFacturado += importe;
    if (f.estado === 'ANULADA') {
      anulado += importe;
      continue;
    }
    pendiente += saldoDe(f);
    if (f.estado === 'VENCIDA') vencidas++;
  }
  const cobrado = totalFacturado - pendiente - anulado;
  return { totalFacturado, cobrado, pendiente, anulado, vencidas };
}
