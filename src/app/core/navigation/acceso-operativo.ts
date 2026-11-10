/**
 * Roles con acceso a la consola operativa (despacho de emergencias).
 *
 * Es el mismo conjunto que admite el `roleGuard` de `/dashboard` en `app.routes.ts`: quien no
 * puede entrar a la consola no debe ver en la barra superior los contadores de emergencias
 * (Activas / Críticas / Disp.) ni las acciones de alta («Institucional», «+ Nueva Emergencia»).
 * Un usuario sólo administrativo (por ejemplo ROLE_CONTADOR) queda afuera (H-10).
 * Si cambia el guard de `/dashboard`, actualizar esta lista.
 */
export const ROLES_ACCESO_OPERATIVO: readonly string[] = [
  'ROLE_DESPACHANTE',
  'ROLE_OPERADOR',
  'ROLE_ADMIN',
  'ROLE_ADMINISTRADOR',
  'ROLE_PROPIETARIO',
];

export function tieneAccesoOperativo(hasAnyRole: (roles: string[]) => boolean): boolean {
  return hasAnyRole([...ROLES_ACCESO_OPERATIVO]);
}
