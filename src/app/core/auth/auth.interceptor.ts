import { HttpInterceptorFn } from '@angular/common/http';

const JWT_KEY = 'emergex_jwt';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem(JWT_KEY);
  if (token) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
    return next(cloned);
  }
  return next(req);
};
