import { HttpParams, HttpResponse } from '@angular/common/http';
import { OperatorFunction, map } from 'rxjs';

/**
 * Utilidades de paginación contra los endpoints JHipster del backend.
 *
 * Equivale a lo que el frontend generado tenía en `core/request/request-util.ts` y
 * `config/pagination.constants.ts`; en esta app no existía y el literal 'X-Total-Count' estaba
 * repetido a mano en siete servicios. Se centraliza acá para que un error como el del header mal
 * expuesto —que hacía leer total = 0 en todas las pantallas— se detecte y se arregle en un
 * solo lugar.
 */

/** Header con el total de filas que devuelve PaginationUtil del backend. */
export const TOTAL_COUNT_HEADER = 'X-Total-Count';

/** Tamaño de página por defecto de los listados. */
export const ITEMS_PER_PAGE = 25;

export interface PagedResult<T> {
  data: T[];
  total: number;
}

/**
 * Arma los HttpParams salteando valores vacíos, igual que el `createRequestOption` del frontend
 * generado. Los `undefined`, `null` y '' no se mandan: en los endpoints con Criteria, un filtro
 * vacío no es "traer todo" sino un parámetro que el backend intenta parsear.
 */
export function buildParams(req: Record<string, string | number | boolean | undefined | null>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(req)) {
    if (value === undefined || value === null || value === '') continue;
    params = params.set(key, String(value));
  }
  return params;
}

/**
 * Convierte la respuesta con `observe: 'response'` en {@link PagedResult}.
 *
 * Si el header no llega, `total` queda en 0 y el listado se ve sin paginación. Suele ser un
 * problema de CORS y no del endpoint: el backend tiene que incluir X-Total-Count en
 * `jhipster.cors.exposed-headers`, y esa lista debe ser válida — si contiene un nombre de header
 * mal formado, el navegador descarta la lista entera y no se expone ninguno.
 */
export function toPagedResult<T>(): OperatorFunction<HttpResponse<T[]>, PagedResult<T>> {
  return map((res: HttpResponse<T[]>) => ({
    data: res.body ?? [],
    total: Number(res.headers.get(TOTAL_COUNT_HEADER) ?? 0),
  }));
}
