import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

export const SKIP_AUTH_REFRESH = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return next(req).pipe(
    catchError((error) => {
      if (
        error.status === 401 &&
        !req.context.get(SKIP_AUTH_REFRESH) &&
        !req.url.includes('/api/auth/refresh')
      ) {
        return authService.refreshToken().pipe(
          switchMap(() =>
            next(
              req.clone({
                context: req.context.set(SKIP_AUTH_REFRESH, true),
              }),
            ),
          ),
          catchError(() => {
            authService.logout();
            return throwError(() => error);
          })
        );
      } else if (error.status === 401) {
        authService.logout();
      } else if (error.status === 403) {
        router.navigate(['/access-denied']);
      }
      return throwError(() => error);
    }),
  );
};
