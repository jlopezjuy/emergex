import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { noAuthGuard } from './core/auth/no-auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'access-denied',
    loadComponent: () =>
      import('./features/access-denied/access-denied.component').then(
        (m) => m.AccessDeniedComponent,
      ),
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
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'fleet',
        loadComponent: () =>
          import('./features/fleet/fleet.component').then((m) => m.FleetComponent),
      },
      {
        path: 'staff',
        canActivate: [roleGuard('ROLE_ADMIN', 'ROLE_ADMINISTRADOR')],
        loadComponent: () =>
          import('./features/staff/staff.component').then((m) => m.StaffComponent),
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./features/events/events.component').then((m) => m.EventsComponent),
      },
      {
        path: 'patients',
        loadComponent: () =>
          import('./features/patients/patients.component').then((m) => m.PatientsComponent),
      },
      {
        path: 'patients/:id',
        loadComponent: () =>
          import('./features/patients/patient-detail/patient-detail.component').then((m) => m.PatientDetailComponent),
      },
      {
        path: 'institutions',
        canActivate: [roleGuard('ROLE_ADMIN', 'ROLE_PROPIETARIO', 'ROLE_ADMINISTRADOR')],
        loadComponent: () =>
          import('./features/institutions/institutions.component').then((m) => m.InstitutionsComponent),
      },
      {
        path: 'plans',
        canActivate: [roleGuard('ROLE_ADMIN', 'ROLE_PROPIETARIO', 'ROLE_ADMINISTRADOR')],
        loadComponent: () =>
          import('./features/plans/plans.component').then((m) => m.PlansComponent),
      },
      {
        path: 'facturacion',
        canActivate: [roleGuard('ROLE_ADMIN', 'ROLE_ADMINISTRADOR')],
        loadComponent: () =>
          import('./features/facturacion/facturacion.component').then((m) => m.FacturacionComponent),
      },
      {
        path: 'hospitals',
        loadComponent: () =>
          import('./features/hospitals/hospitals.component').then(
            (m) => m.HospitalsComponent,
          ),
      },
      {
        path: 'internacion',
        loadChildren: () =>
          import('./features/internacion/internacion.routes').then(
            (m) => m.INTERNACION_ROUTES,
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
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
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
        loadComponent: () =>
          import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
      },
    ],
  },
];
