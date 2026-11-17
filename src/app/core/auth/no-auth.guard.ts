import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';
import { SessionStore } from '../stores/session.store';
import { rutaInicialParaRoles } from '../navigation/ruta-inicial';

/**
 * Guards public pages (landing, login, password recovery): anonymous visitors see them, while a
 * signed-in user is sent to the home of their role (same source as the login redirect).
 *
 * It only reads the in-memory session on purpose. Probing the refresh cookie here would be a
 * mistake: a 401 from /api/auth/refresh makes the error interceptor log out and navigate to
 * /login, which would hijack the public landing for every anonymous visitor.
 */
export const noAuthGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const session = inject(SessionStore);

  if (!auth.isAuthenticated()) {
    return true;
  }

  const roleHome = () => router.parseUrl(rutaInicialParaRoles((roles) => session.hasAnyRole(roles)));

  if (auth.currentAccount()) {
    return roleHome();
  }

  return auth.fetchAccount().pipe(
    map(() => roleHome()),
    catchError(() => of(true)),
  );
};
