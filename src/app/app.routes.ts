import { inject } from '@angular/core';
import { Routes, Router } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { noAuthGuard } from './core/auth/no-auth.guard';
import { roleGuard } from './core/auth/role.guard';
import { ShellComponent } from './layout/shell/shell.component';
import { SessionStore } from './core/stores/session.store';

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
    path: 'forgot-password',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        canActivate: [roleGuard('ROLE_DESPACHANTE', 'ROLE_OPERADOR', 'ROLE_ADMIN', 'ROLE_ADMINISTRADOR', 'ROLE_PROPIETARIO')],
        loadComponent: () =>
          import('./features/operations/operations.component').then(
            (m) => m.OperationsComponent,
          ),
      },
      {
        path: 'turnos',
        loadComponent: () =>
          import('./features/turnos/turnos.component').then((m) => m.TurnosComponent),
      },
      {
        path: 'clinico',
        canActivate: [roleGuard('ROLE_MEDICO', 'ROLE_PROFESIONAL', 'ROLE_ADMIN', 'ROLE_ADMINISTRADOR')],
        loadComponent: () =>
          import('./features/clinico/clinico.component').then((m) => m.ClinicoComponent),
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
          import('./features/patients/patient-detail/patient-detail.component').then(
            (m) => m.PatientDetailComponent,
          ),
      },
      {
        path: 'zonas-tarifas',
        canActivate: [roleGuard('ROLE_ADMIN', 'ROLE_PROPIETARIO', 'ROLE_ADMINISTRADOR')],
        loadComponent: () =>
          import('./features/zonas-tarifas/zonas-tarifas.component').then(
            (m) => m.ZonasTarifasComponent,
          ),
      },
      {
        path: 'grupos-familiares',
        loadComponent: () =>
          import('./features/grupos-familiares/grupos-familiares.component').then(
            (m) => m.GruposFamiliaresComponent,
          ),
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
        path: 'management',
        canActivate: [roleGuard('ROLE_ADMIN', 'ROLE_PROPIETARIO', 'ROLE_ADMINISTRADOR')],
        loadComponent: () =>
          import('./features/management-dashboard/management-dashboard.component').then(
            (m) => m.ManagementDashboardComponent,
          ),
      },
      {
        path: 'asistencias/historial',
        loadComponent: () =>
          import('./features/asistencias-historial/asistencias-historial.component').then(
            (m) => m.AsistenciasHistorialComponent,
          ),
      },
      {
        path: 'paciente',
        loadComponent: () =>
          import('./features/paciente/paciente.component').then((m) => m.PacienteComponent),
      },
      {
        path: 'settings',
        canActivate: [roleGuard('ROLE_ADMIN', 'ROLE_ADMINISTRADOR', 'ROLE_PROPIETARIO')],
        loadComponent: () =>
          import('./features/settings/settings.component').then((m) => m.SettingsComponent),
      },
      {
        path: 'admin/global',
        canActivate: [
          () => {
            const session = inject(SessionStore);
            const router = inject(Router);
            return session.isGlobalAdmin() ? true : router.createUrlTree(['/access-denied']);
          },
        ],
        loadComponent: () =>
          import('./features/admin/global/admin-global.component').then(
            (m) => m.AdminGlobalComponent,
          ),
      },
      {
        path: 'dashboard/emergency/:id',
        canActivate: [roleGuard('ROLE_DESPACHANTE', 'ROLE_OPERADOR', 'ROLE_ADMIN', 'ROLE_ADMINISTRADOR', 'ROLE_PROPIETARIO')],
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
