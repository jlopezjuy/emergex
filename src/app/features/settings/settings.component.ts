import { Component, inject } from '@angular/core';
import { ThemeService } from '../../core/theme/theme.service';
import { AuthService } from '../../core/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  template: `
    <div class="p-6 flex flex-col gap-6 h-full overflow-y-auto">
      <div>
        <h1 class="font-semibold text-lg" style="color: var(--text-primary);">Configuración</h1>
        <p class="text-sm mt-0.5" style="color: var(--text-muted);">Preferencias del sistema y cuenta</p>
      </div>

      <!-- Apariencia -->
      <div class="glass rounded-panel p-5 flex flex-col gap-4">
        <h2 class="eyebrow">Apariencia</h2>
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium" style="color: var(--text-primary);">Modo de color</p>
            <p class="text-xs mt-0.5" style="color: var(--text-muted);">
              {{ theme.theme() === 'dark' ? 'Modo noche — sala de control 24/7' : 'Modo día — supervisión con luz ambiente' }}
            </p>
          </div>
          <button
            type="button"
            class="btn btn--ghost btn--sm"
            (click)="theme.toggleTheme()"
          >
            @if (theme.theme() === 'dark') {
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="7" cy="7" r="2.5"/>
                <path d="M7 1v1M7 12v1M1 7h1M12 7h1M2.8 2.8l.7.7M10.5 10.5l.7.7M10.5 3.5l-.7.7M3.5 10.5l-.7.7"/>
              </svg>
              Cambiar a modo día
            } @else {
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M7 1.5A5.5 5.5 0 1 0 12.5 7 4 4 0 0 1 7 1.5z"/>
              </svg>
              Cambiar a modo noche
            }
          </button>
        </div>
      </div>

      <!-- Sistema -->
      <div class="glass rounded-panel p-5 flex flex-col gap-4">
        <h2 class="eyebrow">Sistema</h2>
        <div class="flex flex-col gap-3">
          <div class="flex items-center justify-between py-2 border-b" style="border-color: var(--border-hairline);">
            <div>
              <p class="text-sm font-medium" style="color: var(--text-primary);">Versión</p>
              <p class="font-mono text-xs mt-0.5" style="color: var(--text-muted);">Emergex v1.0.0-alpha</p>
            </div>
          </div>
          <div class="flex items-center justify-between py-2 border-b" style="border-color: var(--border-hairline);">
            <div>
              <p class="text-sm font-medium" style="color: var(--text-primary);">Entorno</p>
              <p class="font-mono text-xs mt-0.5" style="color: var(--text-muted);">localhost:4200 → api:8080</p>
            </div>
          </div>
          <div class="flex items-center justify-between py-2">
            <div>
              <p class="text-sm font-medium" style="color: var(--text-primary);">Atajo de teclado</p>
              <p class="text-xs mt-0.5" style="color: var(--text-muted);">Nueva emergencia</p>
            </div>
            <span class="font-mono text-xs px-2 py-1 rounded" style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-secondary);">N</span>
          </div>
        </div>
      </div>

      <!-- Cuenta -->
      <div class="glass rounded-panel p-5 flex flex-col gap-4">
        <h2 class="eyebrow">Cuenta</h2>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full flex items-center justify-center font-mono font-bold text-sm"
            style="background: var(--accent-blue); color: white;">OP</div>
          <div>
            <p class="font-semibold text-sm" style="color: var(--text-primary);">Operador</p>
            <p class="text-xs mt-0.5" style="color: var(--text-muted);">Centro de operaciones</p>
          </div>
        </div>
        <button
          type="button"
          class="btn btn--ghost btn--sm self-start"
          style="color: var(--accent-red);"
          (click)="logout()"
        >Cerrar sesión</button>
      </div>
    </div>
  `,
})
export class SettingsComponent {
  readonly theme = inject(ThemeService);
  private auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
