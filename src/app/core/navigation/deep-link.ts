import { ParamMap } from '@angular/router';

/**
 * Lectura defensiva de los parámetros de foco que usan las bandejas y la búsqueda global.
 *
 * Las pantallas administrativas son componentes únicos con solapas internas, así que un ítem
 * se enfoca por query param (`tab` + id de la entidad) en lugar de por una ruta de detalle.
 * Ver `entidad-ruta.ts`, que es quien construye esas URLs.
 */

/** Devuelve el id pedido sólo si es un entero positivo; cualquier otra cosa se ignora. */
export function leerIdDeFoco(params: ParamMap, clave: string): number | null {
  const crudo = params.get(clave);
  if (!crudo) {
    return null;
  }
  const id = Number(crudo);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Devuelve la solapa pedida sólo si la pantalla realmente la tiene. */
export function leerTabDeFoco<T extends string>(
  params: ParamMap,
  permitidos: readonly T[],
): T | null {
  const crudo = params.get('tab');
  return crudo && (permitidos as readonly string[]).includes(crudo) ? (crudo as T) : null;
}
