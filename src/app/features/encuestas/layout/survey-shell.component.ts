import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SessionStore } from '../../../core/stores/session.store';
import { SURVEY_ADMIN_TENANT_ROLES, SURVEY_OPERATOR_TENANT_ROLES, canAccessSurveyTenant } from '../survey-access';

@Component({
  selector: 'app-survey-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <section class="survey-shell">
      <nav class="survey-nav" aria-label="Navegación de encuestas">
        @if (canAdmin()) {
          <a routerLink="/encuestas" [routerLinkActiveOptions]="{ exact: true }" routerLinkActive="active">Encuestas</a>
          <a routerLink="/encuestas/planes" routerLinkActive="active">Planes</a>
          <a routerLink="/encuestas/campanias" routerLinkActive="active">Campañas</a>
          <a routerLink="/encuestas/resultados" routerLinkActive="active">Resultados</a>
        }
        @if (canOperate()) { <a routerLink="/encuestas/mis-llamadas" routerLinkActive="active">Mis llamadas</a> }
      </nav>
      <router-outlet />
    </section>
  `,
  styles: [`
    .survey-shell { min-height: 100%; }
    .survey-nav { display:flex; gap:4px; padding:10px 18px 0; border-bottom:1px solid var(--border-hairline); overflow-x:auto; background:var(--bg-elevated); }
    .survey-nav a { padding:9px 13px; color:var(--text-muted); font-size:12px; font-weight:600; text-decoration:none; border-radius:8px 8px 0 0; white-space:nowrap; }
    .survey-nav a:hover { color:var(--text-primary); background:var(--surface-glass); }
    .survey-nav a.active { color:var(--accent-blue); background:var(--accent-blue-dim); box-shadow:inset 0 -2px 0 var(--accent-blue); }
    .survey-nav a:focus-visible { outline:2px solid var(--accent-blue); outline-offset:2px; }
  `],
})
export class SurveyShellComponent {
  private readonly session = inject(SessionStore);
  readonly canAdmin = computed(() => canAccessSurveyTenant(this.session.account(), SURVEY_ADMIN_TENANT_ROLES));
  readonly canOperate = computed(() => canAccessSurveyTenant(this.session.account(), SURVEY_OPERATOR_TENANT_ROLES));
}
