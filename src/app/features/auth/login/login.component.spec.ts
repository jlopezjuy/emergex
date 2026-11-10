import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router, provideRouter } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../../core/auth/auth.service';
import { SessionStore } from '../../../core/stores/session.store';

describe('LoginComponent (aterrizaje por rol, ADM-UX-013)', () => {
  let authMock: { login: ReturnType<typeof vi.fn> };
  let sessionStoreMock: { hasAnyRole: ReturnType<typeof vi.fn> };
  let router: Router;

  beforeEach(async () => {
    authMock = { login: vi.fn().mockReturnValue(of({})) };
    sessionStoreMock = { hasAnyRole: vi.fn().mockReturnValue(false) };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        { provide: SessionStore, useValue: sessionStoreMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  const submitLogin = () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.componentInstance['form'].setValue({ username: 'admin', password: 'admin' });
    fixture.componentInstance.submit();
    return fixture;
  };

  it('lleva al rol administrativo al Centro Administrativo, no al dashboard operativo', () => {
    sessionStoreMock.hasAnyRole.mockReturnValue(true);
    submitLogin();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/administracion');
  });

  it('lleva a un rol operativo al dashboard, como antes', () => {
    sessionStoreMock.hasAnyRole.mockImplementation((roles: string[]) => roles.includes('ROLE_DESPACHANTE'));
    submitLogin();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });
});
