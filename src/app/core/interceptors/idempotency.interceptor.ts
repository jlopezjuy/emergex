import { HttpInterceptorFn } from '@angular/common/http';

export const idempotencyInterceptor: HttpInterceptorFn = (req, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const idempotencyKey = crypto.randomUUID();
    const correlationId = 'web-' + crypto.randomUUID();

    const clonedReq = req.clone({
      setHeaders: {
        'X-Idempotency-Key': idempotencyKey,
        'X-Correlation-Id': correlationId,
      },
    });
    return next(clonedReq);
  }
  return next(req);
};
