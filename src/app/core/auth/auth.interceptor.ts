import { HttpInterceptorFn } from '@angular/common/http';

import { JWT_STORAGE_KEY } from './auth.constants';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(JWT_STORAGE_KEY);
  if (token) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
    return next(cloned);
  }
  return next(req);
};
