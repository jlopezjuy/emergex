import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FleetStore } from '../../core/stores/fleet.store';

import { ThemeService } from '../../core/theme/theme.service';
import { SafeHtmlPipe } from '../../shared/pipes/safe-html.pipe';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, of, map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { MenuService, IMenuItem } from '../../core/menu/menu.service';
import { SessionStore } from '../../core/stores/session.store';

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
        @for (item of visibleItems(); track item.id) {
          <a
            [routerLink]="item.route || ''"
            routerLinkActive="nav-active"
            class="nav-item"
            [title]="item.title"
          >
            <span class="icon" [innerHTML]="item.icon | safeHtml"></span>
            @if (expanded()) {
              <span class="label">{{ item.label }}</span>
            }
            @if ((item.id === 'fleet' || item.id === 'ambulancias') && fleetAlert()) {
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
  private readonly menuService = inject(MenuService);
  private readonly authService = inject(AuthService);
  private readonly sessionStore = inject(SessionStore);

  readonly expanded = signal(false);
  readonly fleetAlert = computed(() =>
    this.fleet.ambulances().some(
      a => a.estado === 'MANTENIMIENTO' || (a.bateria != null && a.bateria < 20),
    ),
  );

  readonly menuItems = signal<IMenuItem[]>([]);
  readonly visibleItems = computed(() => this.menuItems());

  constructor() {
    toObservable(this.authService.currentAccount)
      .pipe(
        switchMap(account => {
          if (account) {
            return this.menuService.getMenu().pipe(
              map(items => {
                const newItems = [...items];
                
                // NOTA DE ARQUITECTURA (F0-03): Los ítems inyectados a mano deben filtrarse por los mismos roles
                // que protegen su ruta en `app.routes.ts`. Lo correcto a futuro es mover estos ítems al
                // `MenuService` del backend para centralizar la navegación por perfil de usuario y tenant.

                const insertIndex = newItems.findIndex(i => i.id === 'facturacion' || i.id === 'staff');
                const finalIndex = insertIndex !== -1 ? insertIndex : newItems.length;

                if (this.sessionStore.hasAnyRole(['ROLE_ADMIN', 'ROLE_AUDITOR', 'ROLE_ADMINISTRADOR'])) {
                  newItems.splice(finalIndex, 0, {
                    id: 'auditoria-medica',
                    label: 'Auditoría',
                    title: 'Auditoría Médica',
                    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>',
                    route: '/auditoria-medica',
                    order: 90
                  });
                }
                
                if (this.sessionStore.hasAnyRole(['ROLE_ADMIN', 'ROLE_ADMINISTRADOR', 'ROLE_PROPIETARIO'])) {
                  newItems.splice(finalIndex + 1, 0, {
                    id: 'prefacturacion',
                    label: 'Prefacturación',
                    title: 'Prefacturación',
                    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>',
                    route: '/prefacturacion',
                    order: 91
                  });
                }
                
                if (this.sessionStore.hasAnyRole(['ROLE_ADMIN', 'ROLE_GERENTE', 'ROLE_CONTADOR'])) {
                  newItems.push({
                    id: 'tesoreria',
                    label: 'Tesorería',
                    title: 'Tesorería',
                    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>',
                    route: '/tesoreria',
                    order: 100
                  });
                }

                if (this.sessionStore.hasAnyRole(['ROLE_ADMIN', 'ROLE_ADMINISTRADOR', 'ROLE_PROPIETARIO'])) {
                  newItems.push({
                    id: 'inventario',
                    label: 'Inventario',
                    title: 'Inventario y FEFO',
                    icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
                    route: '/inventario',
                    order: 101
                  });
                }
                return newItems;
              })
            );
          }
          return of([]);
        }),
        takeUntilDestroyed()
      )
      .subscribe({
        next: (items) => this.menuItems.set(items),
        error: (err) => {
          console.error('Error fetching menu:', err);
          this.menuItems.set([]);
        }
      });
  }
}
