import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FleetStore } from '../../core/stores/fleet.store';
import { SessionStore } from '../../core/stores/session.store';
import { ThemeService } from '../../core/theme/theme.service';
import { SafeHtmlPipe } from '../../shared/pipes/safe-html.pipe';

type NavItem = {
  path: string;
  label: string;
  title: string;
  icon: string;
  alert?: 'fleet';
  adminOnly?: boolean;
};

@Component({
  selector: 'emx-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, SafeHtmlPipe],
  template: `
    <aside
      class="h-screen border-r flex-shrink-0 transition-all duration-200 flex flex-col"
      [style.width.px]="expanded() ? 228 : 72"
      style="background: var(--bg-elevated); border-color: var(--border-glass);"
    >
      <div class="px-3 pt-3 pb-2 border-b" style="border-color: var(--border-glass);">
        <div class="flex items-center gap-2">
          <div
            class="w-10 h-10 rounded-btn flex items-center justify-center"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass); overflow: hidden;"
          >
            <img
              src="/images/logo/logo.png"
              alt="Emergex"
              class="w-full h-full object-contain p-1"
              draggable="false"
            />
          </div>
          @if (expanded()) {
            <div class="min-w-0">
              <p class="text-xs font-semibold truncate" style="color: var(--text-primary);">Emergex</p>
              <p class="text-[10px] font-mono uppercase tracking-widest truncate" style="color: var(--text-muted);">Centro operativo</p>
            </div>
          }
          <button
            type="button"
            class="ml-auto nav-icon-btn"
            [title]="expanded() ? 'Contraer menú' : 'Expandir menú'"
            (click)="expanded.update(v => !v)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              @if (expanded()) {
                <path d="m15 18-6-6 6-6"/>
              } @else {
                <path d="m9 18 6-6-6-6"/>
              }
            </svg>
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        @for (item of visibleItems(); track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="nav-active"
            class="nav-item"
            [title]="item.title"
          >
            <span class="icon" [innerHTML]="item.icon | safeHtml"></span>
            @if (expanded()) {
              <span class="label">{{ item.label }}</span>
            }
            @if (item.alert === 'fleet' && fleetAlert()) {
              <span class="alert-dot"></span>
            }
          </a>
        }
      </div>

      <div class="px-2 pb-2 pt-1 border-t space-y-1" style="border-color: var(--border-glass);">
        <button type="button" class="nav-item" title="Cambiar tema" (click)="theme.toggleTheme()">
          <span class="icon">
            @if (theme.theme() === 'dark') {
              ☀️
            } @else {
              🌙
            }
          </span>
          @if (expanded()) {
            <span class="label">Tema</span>
          }
        </button>

        <a routerLink="/settings" routerLinkActive="nav-active" class="nav-item" title="Configuración">
          <span class="icon">⚙️</span>
          @if (expanded()) {
            <span class="label">Configuración</span>
          }
        </a>
      </div>
    </aside>
  `,
  styles: [`
    .nav-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      min-height: 38px;
      border-radius: 10px;
      color: var(--text-muted);
      text-decoration: none;
      border: 1px solid transparent;
      background: transparent;
      padding: 0 10px;
      transition: all 0.15s ease;
      font-size: 12px;
      cursor: pointer;
    }
    .nav-item:hover {
      background: var(--surface-glass);
      border-color: var(--border-glass);
      color: var(--text-primary);
    }
    .icon {
      width: 18px;
      min-width: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    .label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-weight: 500;
    }
    .nav-active {
      background: rgba(59, 130, 246, 0.14) !important;
      border-color: rgba(59, 130, 246, 0.35) !important;
      color: var(--accent-blue) !important;
      box-shadow: inset 2px 0 0 var(--accent-blue);
    }
    .nav-icon-btn {
      display: inline-flex;
      width: 30px;
      height: 30px;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: 1px solid transparent;
      color: var(--text-muted);
      background: transparent;
    }
    .nav-icon-btn:hover {
      background: var(--surface-glass);
      border-color: var(--border-glass);
      color: var(--text-primary);
    }
    .alert-dot {
      position: absolute;
      right: 8px;
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: var(--accent-amber);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-amber) 20%, transparent);
    }
  `],
})
export class SidebarComponent {
  readonly theme = inject(ThemeService);
  private readonly fleet = inject(FleetStore);
  private readonly session = inject(SessionStore);

  readonly expanded = signal(false);
  readonly fleetAlert = computed(() =>
    this.fleet.ambulances().some(
      a => a.estado === 'MANTENIMIENTO' || (a.bateria != null && a.bateria < 20),
    ),
  );

  readonly visibleItems = computed(() =>
    this.mainItems.filter(item => !item.adminOnly || this.session.isGlobalAdmin()),
  );

  readonly mainItems: NavItem[] = [
    { path: '/dashboard', label: 'Operaciones', title: 'Operaciones', icon: '🏠' },
    { path: '/turnos', label: 'Turnos', title: 'Consola de turnos', icon: '📅' },
    { path: '/map', label: 'Mapa', title: 'Mapa', icon: '🗺️' },
    { path: '/asistencias/historial', label: 'Historial', title: 'Historial asistencias', icon: '🕓' },
    { path: '/fleet', label: 'Flota', title: 'Flota', icon: '🚑', alert: 'fleet' },
    { path: '/staff', label: 'Personal', title: 'Personal', icon: '👥' },
    { path: '/patients', label: 'Afiliados', title: 'Afiliados', icon: '🧑‍⚕️' },
    { path: '/institutions', label: 'Instituciones', title: 'Instituciones', icon: '🏥' },
    { path: '/plans', label: 'Planes', title: 'Planes comerciales', icon: '📦' },
    { path: '/facturacion', label: 'Facturación', title: 'Facturación', icon: '🧾' },
    { path: '/events', label: 'Eventos', title: 'Eventos', icon: '📅' },
    { path: '/hospitals', label: 'Hospitales', title: 'Hospitales', icon: '🏨' },
    { path: '/communications', label: 'Comunicaciones', title: 'Comunicaciones', icon: '📡' },
    { path: '/internacion', label: 'Internación', title: 'Internación domiciliaria', icon: '🛏️' },
    { path: '/analytics', label: 'Analítica', title: 'Analítica', icon: '📊' },
    { path: '/admin/global', label: 'Admin global', title: 'Administración global', icon: '🏢', adminOnly: true },
  ];
}
