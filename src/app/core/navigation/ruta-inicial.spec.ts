import { describe, it, expect } from 'vitest';
import { rutaInicialParaRoles } from './ruta-inicial';

const conRoles = (...authorities: string[]) => (roles: string[]) => roles.some((r) => authorities.includes(r));

describe('rutaInicialParaRoles', () => {
  it.each([
    ['ROLE_ADMIN', '/administracion'],
    ['ROLE_PROPIETARIO', '/administracion'],
    ['ROLE_ADMINISTRADOR', '/administracion'],
    ['ROLE_CONTADOR', '/administracion'],
    ['ROLE_DESPACHANTE', '/dashboard'],
    ['ROLE_OPERADOR', '/dashboard'],
    ['ROLE_PROFESIONAL', '/clinico'],
    ['ROLE_MEDICO_CAMPO', '/clinico'],
    ['ROLE_CHOFER', '/tripulacion'],
    ['ROLE_AUDITOR', '/auditoria-medica'],
  ])('%s aterriza en %s', (rol, ruta) => {
    expect(rutaInicialParaRoles(conRoles('ROLE_USER', rol))).toBe(ruta);
  });

  it('QA-ROL-038: un usuario sin rol funcional no cae en /dashboard (que su guard rechaza)', () => {
    expect(rutaInicialParaRoles(conRoles('ROLE_USER'))).toBe('/access-denied');
  });

  it('con varios roles gana el de mayor alcance administrativo', () => {
    expect(rutaInicialParaRoles(conRoles('ROLE_PROFESIONAL', 'ROLE_ADMINISTRADOR'))).toBe('/administracion');
  });
});
