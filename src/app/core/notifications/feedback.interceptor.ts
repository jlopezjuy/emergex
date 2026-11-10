import { HttpEventType, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, tap, throwError } from 'rxjs';
import { UserFeedbackService } from './user-feedback.service';

export const feedbackInterceptor: HttpInterceptorFn = (req, next) => {
  const feedback = inject(UserFeedbackService);

  return next(req).pipe(
    tap(event => {
      if (event.type === HttpEventType.Response) {
        feedback.fromResponseHeaders(event.headers, event.status);
      }
    }),
    catchError(error => {
      feedback.fromHttpError(error);
      return throwError(() => error);
    }),
  );
};

