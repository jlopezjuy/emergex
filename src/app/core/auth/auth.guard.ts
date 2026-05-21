import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  // JWT exists but account not yet loaded (e.g. hard refresh)
  if (auth.currentAccount()) {
    return true;
  }

  return auth.fetchAccount().pipe(
    map(() => true),
    catchError(() => {
      auth.logout();
      return of(router.createUrlTree(['/login']));
    }),
  );
};
