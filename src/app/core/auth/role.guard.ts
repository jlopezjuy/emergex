import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SessionStore } from '../stores/session.store';
import { AuthService } from './auth.service';

export const roleGuard = (...roles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const session = inject(SessionStore);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login']);
    }
    if (session.hasAnyRole(roles)) {
      return true;
    }
    return router.createUrlTree(['/access-denied']);
  };
};
