import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { Observable, firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { noAuthGuard } from './no-auth.guard';
import { AuthService } from './auth.service';
import { SessionStore } from '../stores/session.store';
import { LANDING_ROUTE } from '../../features/landing/landing.routes';

type Account = { authorities: string[] } | null;

describe('noAuthGuard (public pages: landing and login)', () => {
  let isAuthenticated: ReturnType<typeof signal<boolean>>;
  let account: ReturnType<typeof signal<Account>>;
  let authMock: {
    isAuthenticated: () => boolean;
    currentAccount: () => Account;
    fetchAccount: ReturnType<typeof vi.fn>;
    ensureAuthenticated: ReturnType<typeof vi.fn>;
    refreshToken: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    isAuthenticated = signal(false);
    account = signal<Account>(null);
    authMock = {
      isAuthenticated: () => isAuthenticated(),
      currentAccount: () => account(),
      fetchAccount: vi.fn(),
      ensureAuthenticated: vi.fn(),
      refreshToken: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authMock },
        {
          provide: SessionStore,
          useValue: {
            hasAnyRole: (roles: string[]) => roles.some((r) => (account()?.authorities ?? []).includes(r)),
          },
        },
      ],
    });
  });

  const run = async (): Promise<boolean | UrlTree> => {
    const result = TestBed.runInInjectionContext(() => noAuthGuard({} as never, {} as never));
    return isObservable(result)
      ? firstValueFrom(result as Observable<boolean | UrlTree>)
      : (result as boolean | UrlTree);
  };

  const urlOf = (result: boolean | UrlTree) =>
    result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;

  it('lets an anonymous visitor see the public page', async () => {
    expect(await run()).toBe(true);
  });

  it('does not probe the refresh cookie for an anonymous visitor (a 401 there forces /login)', async () => {
    await run();
    expect(authMock.ensureAuthenticated).not.toHaveBeenCalled();
    expect(authMock.refreshToken).not.toHaveBeenCalled();
  });

  it('sends an authenticated administrative user to their role home', async () => {
    isAuthenticated.set(true);
    account.set({ authorities: ['ROLE_USER', 'ROLE_ADMINISTRADOR'] });
    expect(urlOf(await run())).toBe('/administracion');
  });

  it('sends an authenticated driver to /tripulacion instead of a fixed /dashboard', async () => {
    isAuthenticated.set(true);
    account.set({ authorities: ['ROLE_USER', 'ROLE_CHOFER'] });
    expect(urlOf(await run())).toBe('/tripulacion');
  });

  it('loads the account first when the session has a token but no account yet', async () => {
    isAuthenticated.set(true);
    authMock.fetchAccount.mockImplementation(() => {
      account.set({ authorities: ['ROLE_DESPACHANTE'] });
      return of(account());
    });
    expect(urlOf(await run())).toBe('/dashboard');
    expect(authMock.fetchAccount).toHaveBeenCalledOnce();
  });

  it('keeps the public page visible when the account cannot be loaded', async () => {
    isAuthenticated.set(true);
    authMock.fetchAccount.mockReturnValue(throwError(() => new Error('401')));
    expect(await run()).toBe(true);
  });
});

describe('root route (landing)', () => {
  it('matches only the exact root URL', () => {
    expect(LANDING_ROUTE.path).toBe('');
    expect(LANDING_ROUTE.pathMatch).toBe('full');
  });

  const root = LANDING_ROUTE;

  it('is guarded by noAuthGuard so signed-in users still land on their role home', () => {
    expect(root?.canActivate).toContain(noAuthGuard);
  });

  it('renders the public landing page for anonymous visitors', async () => {
    const component = await (root?.loadComponent as () => Promise<unknown>)();
    expect((component as { name: string }).name).toContain('LandingComponent');
  });
});
