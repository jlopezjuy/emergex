/**
 * Ruta de aterrizaje por rol tras autenticarse.
 *
 * Antes vivía duplicada: la raíz (`app.routes.ts`) redirigía a /administracion para el rol
 * administrativo, pero el login (`login.component.ts`) navegaba siempre a /dashboard sin mirar
 * el rol — el admin arrancaba cada sesión en la consola operativa en lugar del Centro
 * Administrativo (H13). Una sola fuente evita que las dos rutas de entrada vuelvan a divergir.
 */

const ROLES_ATERRIZAJE_ADMINISTRATIVO = ['ROLE_ADMIN', 'ROLE_PROPIETARIO', 'ROLE_ADMINISTRADOR', 'ROLE_CONTADOR'];

export function rutaInicialParaRoles(hasAnyRole: (roles: string[]) => boolean): string {
  return hasAnyRole(ROLES_ATERRIZAJE_ADMINISTRATIVO) ? '/administracion' : '/dashboard';
}
