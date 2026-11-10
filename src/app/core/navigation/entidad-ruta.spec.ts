import { describe, it, expect } from 'vitest';
import { routes } from '../../app.routes';
import { ADMINISTRACION_ROUTES } from '../../features/administracion/administracion.routes';
import { rutaParaEntidad, TIPOS_ENTIDAD_NAVEGABLES } from './entidad-ruta';

/**
 * Collects every concrete path the router can resolve, so the mapping can be
 * asserted against the real route table instead of against hardcoded strings.
 */
function collectRoutePaths(): string[] {
  const paths: string[] = [];

  const walk = (list: typeof routes, prefix: string): void => {
    for (const route of list) {
      if (route.path === undefined || route.path === '**') {
        continue;
      }
      const full = [prefix, route.path].filter(Boolean).join('/');
      paths.push(`/${full}`);
      if (route.children) {
        walk(route.children, full);
      }
      if (route.path === 'administracion') {
        walk(ADMINISTRACION_ROUTES, full);
      }
    }
  };

  walk(routes, '');
  return paths;
}

/** `/patients/123?x=1` -> `/patients/:id` so it can be compared to a route definition. */
function toRoutePattern(url: string): string {
  return url
    .split('?')[0]
    .split('/')
    .map((segment) => (/^\d+$/.test(segment) ? ':id' : segment))
    .join('/');
}

describe('rutaParaEntidad', () => {
  const declaredPaths = collectRoutePaths();

  it('devuelve null para tipo desconocido, nulo o sin id', () => {
    expect(rutaParaEntidad('DESCONOCIDO', 99)).toBeNull();
    expect(rutaParaEntidad(null, 99)).toBeNull();
    expect(rutaParaEntidad(undefined, 99)).toBeNull();
    expect(rutaParaEntidad('AFILIADO', null)).toBeNull();
  });

  it('acepta el tipo en minúsculas', () => {
    expect(rutaParaEntidad('afiliado', 7)).toBe('/patients/7');
  });

  describe.each(TIPOS_ENTIDAD_NAVEGABLES)('tipo %s', (tipo) => {
    it('resuelve a una ruta declarada en el router', () => {
      const url = rutaParaEntidad(tipo, 42);

      expect(url, `${tipo} no produjo ninguna ruta`).not.toBeNull();
      expect(
        declaredPaths,
        `${tipo} apunta a "${url}", que no existe en el router y caería en el wildcard 404`,
      ).toContain(toRoutePattern(url as string));
    });
  });

  it('lleva el ticket pendiente de tarifación a la solapa de pendientes de prefacturación', () => {
    expect(rutaParaEntidad('TICKET', 75051)).toBe('/prefacturacion?tab=pendientes&ticketId=75051');
  });

  it('lleva el documento comercial al listado de facturación enfocado', () => {
    expect(rutaParaEntidad('DOCUMENTO_COMERCIAL', 3)).toBe('/facturacion?facturaId=3');
  });

  it('lleva el débito a la solapa de débitos de obra social', () => {
    expect(rutaParaEntidad('DEBITO', 2)).toBe('/facturacion?tab=debitos-os&debitoId=2');
  });

  it('lleva la orden de compra a la solapa de órdenes', () => {
    expect(rutaParaEntidad('ORDEN_COMPRA', 4)).toBe('/compras?tab=ordenes&ordenCompraId=4');
  });

  it('lleva el lote a la solapa de lotes de prefacturación', () => {
    expect(rutaParaEntidad('LOTE', 5)).toBe('/prefacturacion?tab=lotes&loteId=5');
  });

  it('mantiene los destinos de ficha que ya funcionaban', () => {
    expect(rutaParaEntidad('AFILIADO', 123)).toBe('/patients/123');
    expect(rutaParaEntidad('TERCERO', 456)).toBe('/administracion/proveedores/456');
  });
});
