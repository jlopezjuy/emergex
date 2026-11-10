import { describe, expect, it } from 'vitest';
import { Account } from '../../core/auth/models/account.model';
import { SURVEY_ADMIN_TENANT_ROLES, SURVEY_OPERATOR_TENANT_ROLES, canAccessSurveyTenant } from './survey-access';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  login: 'user',
  email: 'user@example.com',
  authorities: [],
  empresa: { id: 1, nombre: 'Emergex', estado: 'ACTIVA' },
  usuarioEmpresa: { id: 10, rol: 'ADMINISTRADOR', activo: true },
  ...overrides,
});

describe('survey tenant access', () => {
  it('autoriza por usuarioEmpresa real y no por authorities', () => {
    expect(canAccessSurveyTenant(account({ authorities: ['ROLE_USER'] }), SURVEY_ADMIN_TENANT_ROLES)).toBe(true);
    expect(canAccessSurveyTenant(account({ authorities: ['ROLE_ADMIN'], usuarioEmpresa: undefined }), SURVEY_ADMIN_TENANT_ROLES)).toBe(false);
  });

  it('exige empresa y membresía activas', () => {
    expect(canAccessSurveyTenant(account({ empresa: { id: 1, nombre: 'Emergex', estado: 'SUSPENDIDA' } }), SURVEY_ADMIN_TENANT_ROLES)).toBe(false);
    expect(canAccessSurveyTenant(account({ usuarioEmpresa: { id: 10, rol: 'ADMINISTRADOR', activo: false } }), SURVEY_ADMIN_TENANT_ROLES)).toBe(false);
  });

  it('permite operador sólo en rutas operativas', () => {
    const operator = account({ usuarioEmpresa: { id: 10, rol: 'OPERADOR', activo: true } });
    expect(canAccessSurveyTenant(operator, SURVEY_OPERATOR_TENANT_ROLES)).toBe(true);
    expect(canAccessSurveyTenant(operator, SURVEY_ADMIN_TENANT_ROLES)).toBe(false);
  });
});
