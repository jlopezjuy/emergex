import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, switchMap } from 'rxjs';
import { UserFeedbackService } from '../notifications/user-feedback.service';
import { AuthService } from './auth.service';

const VENTANA_AVISO_403_MS = 3000;
const TITULO_AVISO_403 = 'Sin permiso';
// Por instancia del servicio de feedback: evita apilar un toast por cada llamada que una
// pantalla dispara en paralelo, y no comparte estado entre tests.
const ultimoAviso403 = new WeakMap<UserFeedbackService, number>();

function avisarFaltaDePermiso(feedback: UserFeedbackService): void {
  // Si el aviso anterior sigue en pantalla no se apila otro: las llamadas de una misma pantalla
  // fallan en ráfagas separadas por más de la ventana de tiempo (QA-ROL-047).
  if (feedback.toasts().some((t) => t.title === TITULO_AVISO_403)) return;
  const ahora = Date.now();
  const previo = ultimoAviso403.get(feedback);
  if (previo !== undefined && ahora - previo < VENTANA_AVISO_403_MS) return;
  ultimoAviso403.set(feedback, ahora);
  feedback.push({
    type: 'warning',
    title: TITULO_AVISO_403,
    message: 'Tu rol no tiene acceso a parte de esta información. Contactá al administrador si lo necesitás.',
  });
}

export const SKIP_AUTH_REFRESH = new HttpContextToken<boolean>(() => false);

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const feedback = inject(UserFeedbackService);
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
        // QA-ROL-014/033/036: un 403 de una llamada (a menudo secundaria) ya no expulsa de la
        // pantalla. El acceso a la ruta lo decide roleGuard; acá sólo se avisa.
        avisarFaltaDePermiso(feedback);
      }
      return throwError(() => error);
    }),
  );
};
