import { Routes } from '@angular/router';

export const INTERNACION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./internacion-list/internacion-list.component').then(
        (m) => m.InternacionListComponent,
      ),
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./internacion-create/internacion-create.component').then(
        (m) => m.InternacionCreateComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./internacion-detail/internacion-detail.component').then(
        (m) => m.InternacionDetailComponent,
      ),
  },
];
