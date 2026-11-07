import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AccessDeniedComponent } from './access-denied.component';
import { AuthService } from '../../core/auth/auth.service';
import { SessionStore } from '../../core/stores/session.store';

describe('AccessDeniedComponent', () => {
  let fixture: ComponentFixture<AccessDeniedComponent>;
  let logout: ReturnType<typeof vi.fn>;
  let hasAnyRole: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    logout = vi.fn();
    hasAnyRole = vi.fn().mockReturnValue(false);
    await TestBed.configureTestingModule({
      imports: [AccessDeniedComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { logout } },
        { provide: SessionStore, useValue: { hasAnyRole } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AccessDeniedComponent);
    fixture.detectChanges();
  });

  it('ofrece cerrar sesión para no dejar al usuario atrapado (QA-ROL-005)', () => {
    const boton = fixture.nativeElement.querySelector('[data-testid="cerrar-sesion"]') as HTMLButtonElement;
    expect(boton).not.toBeNull();
    boton.click();
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('"Volver" apunta a la ruta inicial del rol, no siempre a /dashboard', () => {
    hasAnyRole.mockReturnValue(true);
    fixture = TestBed.createComponent(AccessDeniedComponent);
    fixture.detectChanges();
    const volver = fixture.nativeElement.querySelector('[data-testid="volver"]') as HTMLAnchorElement;
    expect(volver.getAttribute('href')).toBe('/administracion');
  });
});
