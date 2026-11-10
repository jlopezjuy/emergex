import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { Account } from '../../core/auth/models/account.model';

export type SurveyTenantRole = 'PROPIETARIO' | 'ADMINISTRADOR' | 'OPERADOR';

export const SURVEY_ADMIN_TENANT_ROLES: readonly SurveyTenantRole[] = ['PROPIETARIO', 'ADMINISTRADOR'];
export const SURVEY_OPERATOR_TENANT_ROLES: readonly SurveyTenantRole[] = [...SURVEY_ADMIN_TENANT_ROLES, 'OPERADOR'];

export function canAccessSurveyTenant(account: Account | null, allowedRoles: readonly SurveyTenantRole[]): boolean {
  const membership = account?.usuarioEmpresa;
  return !!account?.empresa?.id && account.empresa.estado === 'ACTIVA' && !!membership?.id && membership.activo === true &&
    allowedRoles.includes(membership.rol as SurveyTenantRole);
}

export function surveyTenantGuard(allowedRoles: readonly SurveyTenantRole[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated()) return router.createUrlTree(['/login']);
    return canAccessSurveyTenant(auth.currentAccount(), allowedRoles) ? true : router.createUrlTree(['/access-denied']);
  };
}
