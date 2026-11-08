import { FacturaDTO } from '../../data-access/api/facturacion.api';
import { etiquetaEstado, formatFecha } from '../../core/i18n/formato';

/**
 * CSV of the invoices the user is looking at, ready to open in a spreadsheet in Argentina:
 * ";" as separator and "," as decimal mark, so Excel/LibreOffice in es-AR read the amounts as numbers.
 */
export function facturasACsv(filas: FacturaDTO[], periodo: (f: FacturaDTO) => string): string {
  const encabezado = ['N° factura', 'Período', 'Grupo', 'Importe', 'Saldo', 'Tipo', 'Estado', 'Emisión'];
  const lineas = filas.map((f) =>
    [
      f.numeroFactura,
      periodo(f),
      f.grupoNumeroCuenta ?? '',
      importeCsv(f.importeTotal),
      importeCsv(f.saldoPendiente ?? 0),
      f.tipoPeriodo === 'ANUAL' ? 'Anual' : 'Mensual',
      etiquetaEstado(f.estado),
      formatFecha(f.fechaEmision),
    ]
      .map(celdaCsv)
      .join(';'),
  );
  return [encabezado.join(';'), ...lineas].join('\n') + '\n';
}

function importeCsv(n: number | null | undefined): string {
  return (Number(n) || 0).toFixed(2).replace('.', ',');
}

function celdaCsv(valor: string | null | undefined): string {
  const texto = valor ?? '';
  return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Starts the browser download of a CSV text; the BOM makes Excel read the accents correctly. */
export function descargarCsv(contenido: string, nombreArchivo: string): void {
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  window.URL.revokeObjectURL(url);
}
