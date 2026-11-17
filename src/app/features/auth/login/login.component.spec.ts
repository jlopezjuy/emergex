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

  it('links back to the public landing and shows no unverified metrics or certifications', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const back = Array.from(root.querySelectorAll('a')).find((a) => a.getAttribute('href') === '/');
    expect(back?.textContent).toContain('Volver al inicio');
    expect(root.textContent).not.toMatch(/ISO 27001|SLA|2,847/);
    expect(root.querySelectorAll('a[href="#"]')).toHaveLength(0);
  });

  it('lleva a un rol operativo al dashboard, como antes', () => {
    sessionStoreMock.hasAnyRole.mockImplementation((roles: string[]) => roles.includes('ROLE_DESPACHANTE'));
    submitLogin();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('keeps the login screen out of search results without blocking link discovery', () => {
    TestBed.createComponent(LoginComponent);
    expect(document.title).toBe('Ingresar | Emergex');
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, follow');
  });
});
