import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { noAuthGuard } from './core/auth/no-auth.guard';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/operations/operations.component').then(
            (m) => m.OperationsComponent,
          ),
      },
      {
        path: 'map',
        loadComponent: () =>
          import('./features/map/map.component').then((m) => m.MapComponent),
      },
      {
        path: 'fleet',
        loadComponent: () =>
          import('./features/fleet/fleet.component').then((m) => m.FleetComponent),
      },
      {
        path: 'staff',
        loadComponent: () =>
          import('./features/staff/staff.component').then((m) => m.StaffComponent),
      },
      {
        path: 'hospitals',
        loadComponent: () =>
          import('./features/hospitals/hospitals.component').then(
            (m) => m.HospitalsComponent,
          ),
      },
      {
        path: 'communications',
        loadComponent: () =>
          import('./features/communications/communications.component').then(
            (m) => m.CommunicationsComponent,
          ),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/analytics/analytics.component').then(
            (m) => m.AnalyticsComponent,
          ),
      },
      {
        path: 'dashboard/emergency/:id',
        loadComponent: () =>
          import('./features/operations/emergency-detail/emergency-detail.component').then(
            (m) => m.EmergencyDetailComponent,
          ),
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];
