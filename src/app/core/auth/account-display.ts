import { Account } from './models/account.model';

/** Nombre para mostrar de la cuenta: nombre y apellido, o el login si no están cargados. */
export function nombreDeCuenta(cuenta: Account | null, alternativo = 'Usuario'): string {
  const nombre = [cuenta?.firstName, cuenta?.lastName].filter(Boolean).join(' ').trim();
  return nombre || cuenta?.login || alternativo;
}

/** Iniciales (máximo dos letras) de un nombre para el avatar. */
export function inicialesDe(nombre: string): string {
  const partes = nombre.split(/\s+/).filter(Boolean);
  const letras = partes.length > 1 ? partes[0][0] + partes[partes.length - 1][0] : (partes[0] ?? '?').slice(0, 2);
  return letras.toUpperCase();
}
