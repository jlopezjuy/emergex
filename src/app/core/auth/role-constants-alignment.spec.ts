import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { routes } from '../../app.routes';
import { AuthService } from './auth.service';
import { SessionStore } from '../stores/session.store';

/**
 * Roles autoritarios declarados en el backend (AuthoritiesConstants.java).
 * Fuente única de verdad para el control de acceso en Emergex (H-09 / S4-T3).
 */
describe('Alineación de roles en guards de rutas (H-09 / S4-T3)', () => {
  let authServiceMock: { isAuthenticated: ReturnType<typeof vi.fn> };
  let sessionStoreMock: { hasAnyRole: ReturnType<typeof vi.fn>; hasRole: ReturnType<typeof vi.fn> };
  let routerMock: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: vi.fn().mockReturnValue(true),
    };
    sessionStoreMock = {
      hasAnyRole: vi.fn().mockImplementation((roles: string[]) => {
        // Simula un usuario con ROLE_PROFESIONAL
        return roles.includes('ROLE_PROFESIONAL');
      }),
      hasRole: vi.fn(),
    };
    routerMock = {
      createUrlTree: vi.fn().mockReturnValue('/access-denied'),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: SessionStore, useValue: sessionStoreMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('la ruta clinico permite el acceso a usuarios con ROLE_PROFESIONAL', () => {
    const shellRoute = routes.find((r) => r.children && r.children.length > 0);
    const clinicoRoute = shellRoute?.children?.find((r) => r.path === 'clinico');
    expect(clinicoRoute).toBeDefined();

    const guardFn = clinicoRoute?.canActivate?.[0] as () => boolean | unknown;
    expect(guardFn).toBeDefined();

    const result = TestBed.runInInjectionContext(() => guardFn());
    expect(result).toBe(true);
  });

  it('la ruta inventario permite el acceso a profesionales de salud con ROLE_PROFESIONAL', () => {
    const shellRoute = routes.find((r) => r.children && r.children.length > 0);
    const inventarioRoute = shellRoute?.children?.find((r) => r.path === 'inventario');
    expect(inventarioRoute).toBeDefined();

    const guardFn = inventarioRoute?.canActivate?.[0] as () => boolean | unknown;
    expect(guardFn).toBeDefined();

    const result = TestBed.runInInjectionContext(() => guardFn());
    expect(
      result,
      'La ruta inventario debe permitir acceso a ROLE_PROFESIONAL (enfermeros/médicos) y no depender del rol fantasma ROLE_ENFERMERO'
    ).toBe(true);
  });
});
