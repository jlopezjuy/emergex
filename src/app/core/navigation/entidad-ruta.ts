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
      // La OP actual no expone proveedor; redirige al listado de proveedores (G0-05)
      return `/administracion/proveedores`;
    case 'CONTRATO':
      // Un contratoId no es un institucionId; se reporta como carencia de API
      return null;
    case 'DEBITO':
      return `/facturacion`;
    case 'TICKET':
    case 'DOCUMENTO_COMERCIAL':
    case 'ORDEN_COMPRA':
      return null;
    default:
      return null;
  }
}
