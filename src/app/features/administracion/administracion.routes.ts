import { Routes } from '@angular/router';

export const ADMINISTRACION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./centro-administrativo/centro-administrativo.component').then(
        (m) => m.CentroAdministrativoComponent
      ),
  },
];
