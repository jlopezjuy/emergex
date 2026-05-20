import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from './auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401 && !req.url.includes('/api/refresh')) {
        return authService.refreshToken().pipe(
          switchMap(() => next(req)),
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
