import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated() && auth.currentAccount()) {
    return true;
  }

  return auth.ensureAuthenticated().pipe(
    switchMap((authenticated) => {
      if (!authenticated) {
        return of(router.createUrlTree(['/login']));
      }
      return auth.fetchAccount().pipe(
        map(() => true),
        catchError(() => {
          auth.logout();
          return of(router.createUrlTree(['/login']));
        }),
      );
    }),
  );
};
