import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { routes } from '../../app.routes';
import { AuthService } from './auth.service';
import { SessionStore } from '../stores/session.store';

/**
 * Decisión de producto (QA por roles, 2026-11-07): propietario y contador operan Facturación,
 * Tesorería y Obras Sociales/Planes. El guard debe coincidir con lo que el backend ya admite
 * (QA-ROL-030) y con lo que el menú les ofrece.
 */
function puedeEntrar(path: string, rol: string): boolean {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { isAuthenticated: vi.fn().mockReturnValue(true) } },
      { provide: SessionStore, useValue: { hasAnyRole: (roles: string[]) => roles.includes(rol), hasRole: vi.fn() } },
      { provide: Router, useValue: { createUrlTree: vi.fn().mockReturnValue('/access-denied') } },
    ],
  });
  const shell = routes.find((r) => r.children && r.children.length > 0);
  const ruta = shell?.children?.find((r) => r.path === path);
  expect(ruta, `ruta ${path}`).toBeDefined();
  const guard = ruta?.canActivate?.[0] as () => unknown;
  return TestBed.runInInjectionContext(() => guard()) === true;
}

describe('guards de rutas según decisión de producto', () => {
  it.each([
    ['facturacion', 'ROLE_PROPIETARIO'],
    ['facturacion', 'ROLE_CONTADOR'],
    ['tesoreria', 'ROLE_PROPIETARIO'],
    ['tesoreria', 'ROLE_CONTADOR'],
    ['obras-sociales', 'ROLE_PROPIETARIO'],
    ['obras-sociales', 'ROLE_CONTADOR'],
  ])('%s admite %s', (path, rol) => {
    expect(puedeEntrar(path, rol)).toBe(true);
  });

  it('no se abre a quien no corresponde', () => {
    expect(puedeEntrar('facturacion', 'ROLE_AUDITOR')).toBe(false);
    expect(puedeEntrar('tesoreria', 'ROLE_OPERADOR')).toBe(false);
  });
});
