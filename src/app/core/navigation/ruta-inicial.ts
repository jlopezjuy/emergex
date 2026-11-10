/**
 * Ruta de aterrizaje por rol tras autenticarse.
 *
 * Antes vivía duplicada: la raíz (`app.routes.ts`) redirigía a /administracion para el rol
 * administrativo, pero el login (`login.component.ts`) navegaba siempre a /dashboard sin mirar
 * el rol — el admin arrancaba cada sesión en la consola operativa en lugar del Centro
 * Administrativo (H13). Una sola fuente evita que las dos rutas de entrada vuelvan a divergir.
 */

/**
 * Cada rol aterriza en una pantalla cuyo `roleGuard` (app.routes.ts) lo admite. El orden importa:
 * con varios roles gana la primera entrada que coincida (mayor alcance primero).
 *
 * QA-ROL-032/035/038: antes todo rol no administrativo iba a /dashboard, cuyo guard sólo admite
 * despachante/operador/administrativos, y 10 de 15 usuarios de prueba terminaban en
 * "Acceso denegado" al iniciar sesión.
 */
const HOME_POR_ROL: ReadonlyArray<{ roles: string[]; ruta: string }> = [
  { roles: ['ROLE_ADMIN', 'ROLE_PROPIETARIO', 'ROLE_ADMINISTRADOR', 'ROLE_CONTADOR'], ruta: '/administracion' },
  { roles: ['ROLE_DESPACHANTE', 'ROLE_OPERADOR'], ruta: '/dashboard' },
  { roles: ['ROLE_AUDITOR'], ruta: '/auditoria-medica' },
  { roles: ['ROLE_PROFESIONAL', 'ROLE_MEDICO_CAMPO'], ruta: '/clinico' },
  { roles: ['ROLE_CHOFER'], ruta: '/tripulacion' },
];

/** Sin rol funcional (p. ej. sólo ROLE_USER) no hay pantalla útil: se dice explícitamente. */
const RUTA_SIN_ACCESO = '/access-denied';

export function rutaInicialParaRoles(hasAnyRole: (roles: string[]) => boolean): string {
  return HOME_POR_ROL.find((h) => hasAnyRole(h.roles))?.ruta ?? RUTA_SIN_ACCESO;
}
