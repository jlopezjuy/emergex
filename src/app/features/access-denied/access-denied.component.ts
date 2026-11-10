import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { rutaInicialParaRoles } from '../../core/navigation/ruta-inicial';
import { SessionStore } from '../../core/stores/session.store';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="h-screen flex flex-col items-center justify-center gap-6" style="background: var(--bg-deep);">
      <div class="flex items-center justify-center w-20 h-20 rounded-full"
        style="background: var(--accent-red-dim); border: 1px solid rgba(239,68,68,0.3);">
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor"
          stroke-width="1.5" style="color: var(--accent-red);">
          <rect x="9" y="16" width="18" height="14" rx="2"/>
          <path d="M12 16v-4a6 6 0 0112 0v4"/>
          <circle cx="18" cy="23" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
      </div>
      <div class="flex flex-col items-center gap-1.5">
        <p class="font-semibold text-2xl" style="color: var(--text-primary);">Acceso denegado</p>
        <p class="text-sm text-center max-w-xs" style="color: var(--text-secondary);">
          No tenés permisos para acceder a esta sección. Contactá al administrador del sistema.
        </p>
      </div>
      <div class="flex items-center gap-3">
        @if (rutaInicial !== RUTA_SIN_ACCESO) {
          <a [routerLink]="rutaInicial" data-testid="volver" class="btn btn--ghost btn--sm">Volver al inicio</a>
        }
        <button type="button" data-testid="cerrar-sesion" class="btn btn--ghost btn--sm" (click)="cerrarSesion()">
          Cerrar sesión
        </button>
      </div>
    </div>
  `,
})
export class AccessDeniedComponent {
  private readonly auth = inject(AuthService);
  private readonly sessionStore = inject(SessionStore);

  protected readonly RUTA_SIN_ACCESO = '/access-denied';
  protected readonly rutaInicial = rutaInicialParaRoles((roles) => this.sessionStore.hasAnyRole(roles));

  protected cerrarSesion(): void {
    this.auth.logout();
  }
}
