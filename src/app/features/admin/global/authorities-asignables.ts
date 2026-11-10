/**
 * Permisos (authorities) que el Admin global puede asignar al crear o editar un usuario de empresa.
 * Espejo de `AdminEmpresaUserServiceImpl.AUTHORITIES_ASIGNABLES` en el backend, sin ROLE_USER
 * (siempre se envía) ni ROLE_ADMIN (no asignable por este endpoint).
 */
export interface AuthorityAsignable {
  authority: string;
  label: string;
}

export const AUTHORITIES_ASIGNABLES: readonly AuthorityAsignable[] = [
  { authority: 'ROLE_PROPIETARIO', label: 'Propietario' },
  { authority: 'ROLE_ADMINISTRADOR', label: 'Administrador' },
  { authority: 'ROLE_CONTADOR', label: 'Contador' },
  { authority: 'ROLE_AUDITOR', label: 'Auditor médico' },
  { authority: 'ROLE_DESPACHANTE', label: 'Despachante' },
  { authority: 'ROLE_OPERADOR', label: 'Operador' },
  { authority: 'ROLE_PROFESIONAL', label: 'Profesional' },
  { authority: 'ROLE_MEDICO_CAMPO', label: 'Médico de campo' },
  { authority: 'ROLE_CHOFER', label: 'Chofer' },
];

const NOMBRES_ASIGNABLES = new Set(AUTHORITIES_ASIGNABLES.map((a) => a.authority));

/** ROLE_USER va siempre: el backend interpreta una lista vacía como "conservar las actuales". */
export function authoritiesParaEnviar(seleccion: ReadonlySet<string>): string[] {
  return ['ROLE_USER', ...[...seleccion].filter((a) => NOMBRES_ASIGNABLES.has(a))];
}

export function authoritiesSeleccionadas(actuales: readonly string[] | undefined): Set<string> {
  return new Set((actuales ?? []).filter((a) => NOMBRES_ASIGNABLES.has(a)));
}
