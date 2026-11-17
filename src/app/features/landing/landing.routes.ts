import { Route } from '@angular/router';
import { noAuthGuard } from '../../core/auth/no-auth.guard';

/** Public landing at the root URL. Signed-in users are redirected by noAuthGuard to their role home. */
export const LANDING_ROUTE: Route = {
  path: '',
  pathMatch: 'full',
  canActivate: [noAuthGuard],
  loadComponent: () => import('./landing.component').then((m) => m.LandingComponent),
};
