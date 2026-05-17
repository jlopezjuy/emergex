import { Component, inject, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../core/theme/theme.service';
import { FleetStore } from '../../core/stores/fleet.store';

@Component({
  selector: 'emx-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav
      class="flex flex-col items-center gap-1 py-4 h-screen border-r"
      style="width: 64px; background: var(--bg-elevated); border-color: var(--border-glass); flex-shrink: 0;"
    >
      <!-- Logo -->
      <div
        class="flex items-center justify-center w-10 h-10 rounded-btn mb-3"
        style="background: linear-gradient(135deg, #DC2626, #EF4444); box-shadow: 0 0 20px rgba(239,68,68,0.5);"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="white">
          <path d="M10 2L2 18h16L10 2z" fill-opacity="0.15"/>
          <path d="M9 9h2v5H9zM9 7h2v1H9z"/>
        </svg>
      </div>

      <!-- Operations -->
      <a routerLink="/dashboard" routerLinkActive="nav-active" class="nav-icon-btn" title="Operaciones">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 2L2 9h2v7h4v-4h2v4h4V9h2L9 2z"/>
        </svg>
      </a>

      <!-- Map -->
      <a routerLink="/map" routerLinkActive="nav-active" class="nav-icon-btn" title="Mapa">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M11.5 1l-5 2-5-2v14l5 2 5-2 5 2V3l-5-2z"/>
          <path d="M6.5 3v13M11.5 1v14"/>
        </svg>
      </a>

      <!-- Fleet -->
      <a routerLink="/fleet" routerLinkActive="nav-active" class="nav-icon-btn relative" title="Flota">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="1" y="6" width="16" height="8" rx="2"/>
          <path d="M4 6V5a2 2 0 012-2h6a2 2 0 012 2v1"/>
          <circle cx="4.5" cy="14" r="1.5"/><circle cx="13.5" cy="14" r="1.5"/>
          <path d="M8 8h2M8 11h2"/>
        </svg>
        @if (fleetAlert()) {
          <span
            class="absolute top-1 right-1 w-2 h-2 rounded-full"
            style="background: var(--accent-amber); box-shadow: 0 0 4px var(--accent-amber);"
          ></span>
        }
      </a>

      <!-- Staff -->
      <a routerLink="/staff" routerLinkActive="nav-active" class="nav-icon-btn" title="Personal">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="9" cy="6" r="3"/>
          <path d="M3 15c0-3.31 2.69-6 6-6s6 2.69 6 6"/>
        </svg>
      </a>

      <!-- Patients / Afiliados -->
      <a routerLink="/patients" routerLinkActive="nav-active" class="nav-icon-btn" title="Afiliados">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="7" cy="5" r="3"/>
          <path d="M1 15c0-3.31 2.69-5 6-5"/>
          <circle cx="13" cy="10" r="2.5"/>
          <path d="M10.5 14c0-1.93 1.12-3 3.5-3s3.5 1.07 3.5 3"/>
        </svg>
      </a>

      <!-- Institutions -->
      <a routerLink="/institutions" routerLinkActive="nav-active" class="nav-icon-btn" title="Instituciones">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="4" y="2" width="16" height="20" rx="2"/>
          <path d="M9 22v-4h6v4"/>
          <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01M12 6h.01M12 10h.01M12 14h.01"/>
        </svg>
      </a>

      <!-- Plans -->
      <a routerLink="/plans" routerLinkActive="nav-active" class="nav-icon-btn" title="Planes comerciales">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m7.5 4.27 9 5.15"/>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
          <path d="m3.3 7 8.7 5 8.7-5"/>
          <path d="M12 22V12"/>
        </svg>
      </a>

      <!-- Events -->
      <a routerLink="/events" routerLinkActive="nav-active" class="nav-icon-btn" title="Eventos">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="3" width="14" height="13" rx="1.5"/>
          <path d="M2 7h14"/>
          <path d="M6 1v4M12 1v4"/>
          <path d="M5 11h2M8.5 11h2M5 13.5h2M8.5 13.5h2M12 11h1"/>
        </svg>
      </a>

      <!-- Hospitals -->
      <a routerLink="/hospitals" routerLinkActive="nav-active" class="nav-icon-btn" title="Hospitales">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="2" y="4" width="14" height="12" rx="1"/>
          <path d="M6 16V10h6v6M9 7v4M7 9h4"/>
          <path d="M6 4V2h6v2"/>
        </svg>
      </a>

      <!-- Communications -->
      <a routerLink="/communications" routerLinkActive="nav-active" class="nav-icon-btn" title="Comunicaciones">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 13.5c0-4.14 3.36-7.5 7.5-7.5m0 0a7.5 7.5 0 017.5 7.5"/>
          <path d="M5 13.5a4.5 4.5 0 014.5-4.5m0 0a4.5 4.5 0 014.5 4.5"/>
          <circle cx="9.5" cy="13.5" r="1.5"/>
        </svg>
      </a>

      <!-- Analytics -->
      <a routerLink="/analytics" routerLinkActive="nav-active" class="nav-icon-btn" title="Analítica">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M2 14L6 9l4 3 3-5 3 4"/>
          <line x1="2" y1="16" x2="16" y2="16"/>
        </svg>
      </a>

      <div class="flex-1"></div>

      <!-- Divider -->
      <div class="w-8 border-t my-1" style="border-color: var(--border-glass);"></div>

      <!-- Theme toggle -->
      <button type="button" class="nav-icon-btn" title="Cambiar tema" (click)="theme.toggleTheme()">
        @if (theme.theme() === 'dark') {
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="8" cy="8" r="3"/>
            <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M11.89 4.11l-1.06 1.06M4.11 11.89l-1.06 1.06"/>
          </svg>
        } @else {
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M8 1.5A6.5 6.5 0 1 0 14.5 8 5 5 0 0 1 8 1.5z"/>
          </svg>
        }
      </button>

      <!-- Settings -->
      <a routerLink="/settings" routerLinkActive="nav-active" class="nav-icon-btn" title="Configuración">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="8" cy="8" r="2.5"/>
          <path d="M8 1v1.5m0 11V15M1 8h1.5m11 0H15M3.05 3.05l1.06 1.06m7.78 7.78 1.06 1.06M11.89 4.11l-1.06 1.06M4.11 11.89l-1.06 1.06"/>
        </svg>
      </a>
    </nav>
  `,
  styles: [`
    .nav-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      color: var(--text-muted);
      background: transparent;
      border: none;
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .nav-icon-btn:hover {
      background: var(--surface-glass);
      color: var(--text-primary);
    }
    .nav-active {
      background: rgba(59, 130, 246, 0.15) !important;
      color: var(--accent-blue) !important;
      box-shadow: -3px 0 0 var(--accent-blue) inset;
    }
  `],
})
export class SidebarComponent {
  readonly theme = inject(ThemeService);
  private fleet = inject(FleetStore);

  readonly fleetAlert = computed(() =>
    this.fleet.ambulances().some(
      (a) => a.estado === 'MANTENIMIENTO' || (a.bateria != null && a.bateria < 20),
    ),
  );
}
