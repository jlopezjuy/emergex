import { HttpInterceptorFn } from '@angular/common/http';
import { getSecureToken } from './auth.storage';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = getSecureToken();
  if (token) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
    return next(cloned);
  }
  return next(req);
};
