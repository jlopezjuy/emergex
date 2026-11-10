import { Routes } from '@angular/router';

export const ADMINISTRACION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./centro-administrativo/centro-administrativo.component').then(
        (m) => m.CentroAdministrativoComponent
      ),
  },
  {
    path: 'proveedores',
    loadComponent: () =>
      import('./proveedores/proveedores.component').then(
        (m) => m.ProveedoresComponent
      ),
  },
  {
    path: 'proveedores/:id',
    loadComponent: () =>
      import('./proveedores/proveedor-detail.component').then(
        (m) => m.ProveedorDetailComponent
      ),
  },
  {
    path: 'reportes',
    loadComponent: () =>
      import('./reportes/reportes-admin.component').then(
        (m) => m.ReportesAdminComponent
      ),
  },
];
