/**
 * Mapa centralizado de tipos de entidad del backend a rutas Angular reales.
 *
 * Literales reconocidos:
 * - Bandejas (BandejaTrabajoService.java:80,110,267,300,320): TICKET, DEBITO, ORDEN_PAGO, CONTRATO
 * - Busqueda Global (BusquedaGlobalAdministrativaServiceImpl.java:81,89,101,115,129,150):
 *   AFILIADO, TERCERO, DOCUMENTO_COMERCIAL, CONTRATO, ORDEN_COMPRA, ORDEN_PAGO
 *
 * Todo destino de esta tabla debe existir en el router. Las pantallas administrativas son
 * componentes unicos con solapas internas y no rutas hijas, asi que el item se enfoca por
 * query param (`tab` + id de la entidad) en lugar de por una ruta de detalle dedicada.
 * `entidad-ruta.spec.ts` verifica cada destino contra la configuracion real del router.
 */

/** Tipos de entidad que este modulo sabe navegar. */
export const TIPOS_ENTIDAD_NAVEGABLES = [
  'AFILIADO',
  'TERCERO',
  'ORDEN_PAGO',
  'CONTRATO',
  'DEBITO',
  'TICKET',
  'DOCUMENTO_COMERCIAL',
  'ORDEN_COMPRA',
  'LOTE',
] as const;

export type TipoEntidadNavegable = (typeof TIPOS_ENTIDAD_NAVEGABLES)[number];

export function rutaParaEntidad(
  tipo: string | null | undefined,
  id: number | string | null | undefined,
): string | null {
  if (!tipo || id == null) {
    return null;
  }

  switch (tipo.toUpperCase()) {
    case 'AFILIADO':
      return `/patients/${id}`;
    case 'TERCERO':
      return `/administracion/proveedores/${id}`;
    case 'ORDEN_PAGO':
      // Las ordenes de pago se gestionan desde proveedores, que no tiene ruta por orden.
      return '/administracion/proveedores';
    case 'CONTRATO':
      // Los contratos de cobertura se gestionan desde la pantalla de instituciones.
      return '/institutions';
    case 'TICKET':
      // Solo lo emite la bandeja de facturacion para tickets pendientes de tarifacion manual.
      return `/prefacturacion?tab=pendientes&ticketId=${id}`;
    case 'LOTE':
      return `/prefacturacion?tab=lotes&loteId=${id}`;
    case 'DOCUMENTO_COMERCIAL':
      return `/facturacion?facturaId=${id}`;
    case 'DEBITO':
      return `/facturacion?tab=debitos-os&debitoId=${id}`;
    case 'ORDEN_COMPRA':
      return `/compras?tab=ordenes&ordenCompraId=${id}`;
    default:
      return null;
  }
}
