/**
 * Rumbo (hacia dónde mira) de una unidad en el mapa.
 *
 * El ícono de la ambulancia se dibuja de frente hacia el norte y MapLibre lo gira con `icon-rotate`,
 * así que acá sólo hace falta decidir cuántos grados girarlo. Todo es puro (sin mapa ni Angular)
 * para poder probarlo aislado.
 */

type LngLat = readonly [number, number];

/** Debajo de este desplazamiento (en grados, ~2 m) se considera ruido de GPS y no un movimiento. */
const UMBRAL_MOVIMIENTO_GRADOS = 2e-5;

/** Lleva un rumbo al rango [0, 360). Devuelve `null` si no es un número finito. */
export function normalizarRumbo(rumbo: number | null | undefined): number | null {
  if (rumbo == null || !Number.isFinite(rumbo)) return null;
  return ((rumbo % 360) + 360) % 360;
}

/** Rumbo inicial, en grados desde el norte y en sentido horario, de un punto a otro. */
export function rumboEntre(desde: LngLat, hasta: LngLat): number {
  const lat1 = (desde[1] * Math.PI) / 180;
  const lat2 = (hasta[1] * Math.PI) / 180;
  const dLng = ((hasta[0] - desde[0]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return normalizarRumbo((Math.atan2(y, x) * 180) / Math.PI) ?? 0;
}

export interface EntradaRumbo {
  /** Rumbo que informa el GPS de la unidad, si lo trae. */
  direccion?: number | null;
  /** Posición anterior conocida. */
  previa?: LngLat;
  /** Posición actual. */
  actual: LngLat;
  /** Último rumbo que se mostró para esta unidad. */
  ultimo?: number;
}

/**
 * Decide el rumbo a mostrar, en este orden:
 * 1. el que informa la unidad;
 * 2. el que sale de comparar su posición anterior con la actual, si de verdad se movió;
 * 3. el último que se mostró, para que al frenar no gire sola hacia el norte;
 * 4. el norte.
 */
export function resolverRumbo({ direccion, previa, actual, ultimo }: EntradaRumbo): number {
  const informado = normalizarRumbo(direccion);
  if (informado !== null) return informado;

  if (previa) {
    const desplazamiento = Math.max(Math.abs(actual[0] - previa[0]), Math.abs(actual[1] - previa[1]));
    if (desplazamiento >= UMBRAL_MOVIMIENTO_GRADOS) return rumboEntre(previa, actual);
  }
  return ultimo ?? 0;
}
