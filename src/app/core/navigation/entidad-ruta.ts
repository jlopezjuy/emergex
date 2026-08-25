/**
 * Mapa centralizado de tipos de entidad a rutas Angular navegables.
 *
 * Literales reconocidos del backend:
 * - Bandejas (BandejaTrabajoService.java:79,98,120,147,161): TICKET, DEBITO, ORDEN_PAGO, CONTRATO
 * - Busqueda Global (BusquedaGlobalAdministrativaServiceImpl.java:81,89,101,115,129,150):
 *   AFILIADO, TERCERO, DOCUMENTO_COMERCIAL, CONTRATO, ORDEN_COMPRA, ORDEN_PAGO
 */
export function rutaParaEntidad(tipo: string | null | undefined, id: number | string | null | undefined): string | null {
  if (!tipo || id == null) {
    return null;
  }

  switch (tipo.toUpperCase()) {
    case 'AFILIADO':
      return `/patients/${id}`;
    case 'TERCERO':
      return `/administracion/proveedores/${id}`;
    case 'ORDEN_PAGO':
      return `/administracion/proveedores`;
    case 'CONTRATO':
      return `/administracion/contratos/${id}`;
    case 'DEBITO':
      return `/administracion/debitos/${id}`;
    case 'TICKET':
      return `/asistencias/${id}`;
    case 'DOCUMENTO_COMERCIAL':
      return `/facturas/${id}`;
    case 'ORDEN_COMPRA':
      return `/compras/ordenes/${id}`;
    case 'LOTE':
      return `/prefacturacion/lotes/${id}`;
    default:
      return null;
  }
}
