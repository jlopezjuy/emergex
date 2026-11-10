import { Routes } from '@angular/router';
import { SurveyShellComponent } from './layout/survey-shell.component';
import { SURVEY_ADMIN_TENANT_ROLES, SURVEY_OPERATOR_TENANT_ROLES, surveyTenantGuard } from './survey-access';

const adminGuard = surveyTenantGuard(SURVEY_ADMIN_TENANT_ROLES);
const operatorGuard = surveyTenantGuard(SURVEY_OPERATOR_TENANT_ROLES);

export const ENCUESTAS_ROUTES: Routes = [
  {
    path: '',
    component: SurveyShellComponent,
    children: [
      {
        path: '',
        canActivate: [adminGuard],
        title: 'Encuestas · Emergex',
        loadComponent: () => import('./admin/survey-list.component').then(module => module.SurveyListComponent),
      },
      {
        path: 'nueva',
        canActivate: [adminGuard],
        title: 'Nueva encuesta · Emergex',
        loadComponent: () => import('./admin/survey-list.component').then(module => module.SurveyListComponent),
      },
      {
        path: 'planes',
        canActivate: [adminGuard],
        title: 'Planes de encuesta · Emergex',
        loadComponent: () => import('./admin/survey-plans.component').then(module => module.SurveyPlansComponent),
      },
      {
        path: 'campanias',
        canActivate: [adminGuard],
        title: 'Campañas de encuesta · Emergex',
        loadComponent: () => import('./admin/survey-campaigns.component').then(module => module.SurveyCampaignsComponent),
      },
      {
        path: 'campanias/:id',
        canActivate: [adminGuard],
        title: 'Detalle de campaña · Emergex',
        loadComponent: () => import('./admin/survey-campaign-detail.component').then(module => module.SurveyCampaignDetailComponent),
      },
      {
        path: 'resultados',
        canActivate: [adminGuard],
        title: 'Resultados de encuestas · Emergex',
        loadComponent: () => import('./admin/survey-results.component').then(module => module.SurveyResultsComponent),
      },
      {
        path: 'mis-llamadas',
        canActivate: [operatorGuard],
        title: 'Mis llamadas · Emergex',
        loadComponent: () => import('./operator/survey-call-queue.component').then(module => module.SurveyCallQueueComponent),
      },
      {
        path: 'contactos/:id',
        canActivate: [operatorGuard],
        title: 'Contacto de encuesta · Emergex',
        loadComponent: () => import('./operator/survey-contact.component').then(module => module.SurveyContactComponent),
      },
      {
        path: 'contactos/:id/realizar',
        canActivate: [operatorGuard],
        title: 'Realizar encuesta · Emergex',
        loadComponent: () => import('./operator/survey-contact.component').then(module => module.SurveyContactComponent),
      },
      {
        path: 'respuestas/:id',
        canActivate: [adminGuard],
        title: 'Respuesta de encuesta · Emergex',
        loadComponent: () => import('./admin/survey-response-detail.component').then(module => module.SurveyResponseDetailComponent),
      },
      {
        path: ':id',
        canActivate: [adminGuard],
        title: 'Detalle de encuesta · Emergex',
        loadComponent: () => import('./admin/survey-detail.component').then(module => module.SurveyDetailComponent),
      },
      {
        path: ':id/editar',
        canActivate: [adminGuard],
        title: 'Editar encuesta · Emergex',
        loadComponent: () => import('./admin/survey-detail.component').then(module => module.SurveyDetailComponent),
      },
      {
        path: ':id/preguntas',
        canActivate: [adminGuard],
        title: 'Preguntas de encuesta · Emergex',
        loadComponent: () => import('./admin/survey-detail.component').then(module => module.SurveyDetailComponent),
      },
    ],
  },
];
