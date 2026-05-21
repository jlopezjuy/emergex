import { Component, input, output, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { NgIf } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationStore } from '../../core/stores/notification.store';
import { AuthService } from '../../core/auth/auth.service';
import { EmergencyModalService } from '../../shared/components/emergency/emergency-modal.service';

@Component({
  selector: 'emx-header',
  standalone: true,
  imports: [NgIf],
  template: `
    <header
      class="flex items-center justify-between px-3 py-2 border-b flex-shrink-0 relative min-h-14"
      style="background: var(--bg-elevated); border-color: var(--border-glass);"
    >
      <!-- Left: Title + breadcrumb -->
      <div class="flex items-center gap-2 min-w-0">
        <div class="flex flex-col min-w-0">
          <span class="font-semibold text-sm leading-tight" style="color: var(--text-primary);">
            <span class="truncate block">Centro de Operaciones</span>
          </span>
          <span class="text-xs truncate" style="color: var(--text-muted);">Emergex · Dashboard operativo</span>
        </div>
      </div>

      <!-- Center: Tenant switcher -->
      <div class="items-center tenant-chip-wrap hide-below-2xl">
        <button
          type="button"
          class="flex items-center gap-2 px-3 py-1.5 rounded-btn text-xs transition-colors min-w-0"
          style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-secondary);"
        >
          <span
            class="font-mono font-bold text-xs rounded px-1"
            style="background: var(--accent-blue); color: white;"
          >EX</span>
          <div class="flex flex-col items-start leading-tight min-w-0">
            <span class="font-semibold truncate max-w-[110px]" style="color: var(--text-primary);">{{ tenantName() }}</span>
            <span class="truncate max-w-[110px]" style="color: var(--text-muted);">{{ tenantSede() }}</span>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);">
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>
      </div>

      <!-- Right: Stats + clock + actions -->
      <div class="flex items-center gap-2 ml-auto flex-wrap justify-end min-w-0">
        <!-- Sys stats -->
        <div class="flex items-center gap-3 text-xs font-mono hide-below-xl">
          <div class="flex items-center gap-1.5">
            <span class="dot" style="background: var(--accent-cyan);"></span>
            <span style="color: var(--text-secondary);">Activas</span>
            <span style="color: var(--accent-cyan);" class="font-semibold">{{ activeCount() }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="dot" style="background: var(--accent-red);"></span>
            <span style="color: var(--text-secondary);">Críticas</span>
            <span style="color: var(--accent-red);" class="font-semibold">{{ criticalCount() }}</span>
          </div>
          <div class="flex items-center gap-1.5">
            <span class="dot" style="background: var(--accent-emerald);"></span>
            <span style="color: var(--text-secondary);">Disp.</span>
            <span style="color: var(--accent-emerald);" class="font-semibold">{{ availableCount() }}</span>
          </div>
        </div>

        <!-- Separator -->
        <div class="h-5 border-l hide-below-xl" style="border-color: var(--border-glass);"></div>

        <!-- Clock + date -->
        <div class="flex flex-col items-end leading-tight hide-below-lg">
          <span
            class="font-mono text-xs font-semibold"
            style="color: var(--accent-cyan); text-shadow: 0 0 12px rgba(34,211,238,0.5);"
          >{{ clock() }}</span>
          <span class="font-mono text-xs" style="color: var(--text-muted);">{{ clockDate() }} · ART (UTC-3)</span>
        </div>

        <!-- Sistema OK -->
        <div class="badge badge--stable">
          <span class="dot"></span>
          Sistema OK
        </div>

        <!-- Institucional -->
        <button
          type="button"
          class="btn btn--ghost btn--sm hide-below-2xl"
          (click)="createInstitutional.emit()"
          style="border-color: rgba(59,130,246,0.35); color: var(--accent-blue);"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Institucional
        </button>

        <!-- Nueva emergencia -->
        <button
          type="button"
          class="btn btn--primary btn--sm"
          (click)="emergencyModalService.open()"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 1v10M1 6h10"/>
          </svg>
          <span class="hide-below-md">Nueva Emergencia</span>
          <span class="show-below-md">Emergencia</span>
          <span
            class="font-mono text-xs ml-1 px-1 rounded"
            style="background: rgba(255,255,255,0.15); opacity: 0.8;"
          >N</span>
        </button>

        <!-- Notifications -->
        <button type="button" class="action-icon relative" title="Notificaciones">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M8 1a5.5 5.5 0 00-5.5 5.5V10l-1 2h13l-1-2V6.5A5.5 5.5 0 008 1z"/>
            <path d="M6 13a2 2 0 004 0"/>
          </svg>
          @if (notifications.unreadCount() > 0) {
            <span
              class="absolute -top-1 -right-1 font-mono text-white rounded-full flex items-center justify-center"
              style="background: var(--accent-red); width: 14px; height: 14px; font-size: 8px; font-weight: 700;"
            >{{ notifications.unreadCount() }}</span>
          }
        </button>

        <!-- User chip -->
        <div class="relative">
          <button
            type="button"
            class="flex items-center gap-2 px-2 py-1 rounded-btn"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass);"
            (click)="toggleMenu($event)"
          >
            <div
              class="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold"
              style="background: var(--accent-blue); color: white;"
            >{{ userInitials() }}</div>
            <span class="text-xs font-medium hide-below-xl" style="color: var(--text-secondary);">{{ userName() }}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-muted);">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </button>

          <!-- User dropdown -->
          @if (menuOpen()) {
            <div
              class="user-menu"
              (click)="$event.stopPropagation()"
            >
              <div class="user-menu__head">
                <div style="font-size:13px; font-weight:600; color: var(--text-primary);">{{ userName() }}</div>
                <div class="mono micro" style="color: var(--text-muted); margin-top:2px;">{{ userEmail() }}</div>
              </div>
              <button class="user-menu__item" (click)="openProfile()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-secondary);">
                  <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
                </svg>
                Mi perfil
              </button>
              <button class="user-menu__item" (click)="openPreferences()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--text-secondary);">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
                </svg>
                Preferencias
              </button>
              <button class="user-menu__item user-menu__item--danger" (click)="logout()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Cerrar sesión
              </button>
            </div>
          }
        </div>
      </div>
    </header>
  `,
  styles: [`
    .tenant-chip-wrap { display: flex; }
    .show-below-md { display: none; }

    @media (max-width: 1600px) {
      .hide-below-2xl { display: none !important; }
    }
    @media (max-width: 1360px) {
      .hide-below-xl { display: none !important; }
    }
    @media (max-width: 1180px) {
      .hide-below-lg { display: none !important; }
    }
    @media (max-width: 980px) {
      .hide-below-md { display: none !important; }
      .show-below-md { display: inline !important; }
    }

    .user-menu {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      width: 200px;
      border-radius: var(--r-card);
      background: var(--bg-elevated);
      border: 1px solid var(--border-glass);
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      z-index: 100;
      overflow: hidden;
    }
    .user-menu__head {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-hairline);
    }
    .user-menu__item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 9px 14px;
      font-size: 13px;
      color: var(--text-secondary);
      background: transparent;
      border: none;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s;
    }
    .user-menu__item:hover {
      background: var(--surface-hover);
      color: var(--text-primary);
    }
    .user-menu__item--danger { color: var(--accent-red); }
    .user-menu__item--danger:hover { background: rgba(239,68,68,0.08); color: var(--accent-red); }
  `],
})
export class HeaderComponent implements OnInit, OnDestroy {
  activeCount = input(0);
  criticalCount = input(0);
  availableCount = input(0);

  createInstitutional = output<void>();

  readonly emergencyModalService = inject(EmergencyModalService);
  readonly notifications = inject(NotificationStore);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly menuOpen = signal(false);

  readonly tenantName = computed(() =>
    this.auth.currentAccount()?.empresa?.nombre?.toUpperCase() ?? 'EMERGEX DEMO',
  );

  readonly tenantSede = computed(() => {
    const nombre = this.auth.currentAccount()?.empresa?.nombre;
    return nombre ? 'Sede operativa' : 'Demo';
  });

  readonly userInitials = computed(() => {
    const a = this.auth.currentAccount();
    if (!a) return 'OP';
    const f = a.firstName?.[0] ?? '';
    const l = a.lastName?.[0] ?? '';
    return (f + l).toUpperCase() || a.login.slice(0, 2).toUpperCase();
  });

  readonly userName = computed(() => {
    const a = this.auth.currentAccount();
    if (!a) return 'Operador';
    return a.firstName ? `${a.firstName} ${a.lastName ?? ''}`.trim() : a.login;
  });

  readonly userEmail = computed(() =>
    this.auth.currentAccount()?.email ?? '',
  );

  readonly clock = signal('00:00:00');
  readonly clockDate = signal('');
  private interval?: ReturnType<typeof setInterval>;
  private docClickListener?: () => void;

  ngOnInit(): void {
    this.updateClock();
    this.interval = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.interval);
    this.removeDocListener();
  }

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    const next = !this.menuOpen();
    this.menuOpen.set(next);
    if (next) {
      this.docClickListener = () => this.menuOpen.set(false);
      document.addEventListener('click', this.docClickListener);
    } else {
      this.removeDocListener();
    }
  }

  logout(): void {
    this.menuOpen.set(false);
    this.auth.logout();
    this.router.navigateByUrl('/login').catch(() => {
      window.location.href = '/login';
    });
  }

  openProfile(): void {
    this.menuOpen.set(false);
    this.router.navigate(['/profile']);
  }

  openPreferences(): void {
    this.menuOpen.set(false);
    this.router.navigate(['/settings'], { queryParams: { section: 'preferences' } });
  }

  private removeDocListener(): void {
    if (this.docClickListener) {
      document.removeEventListener('click', this.docClickListener);
      this.docClickListener = undefined;
    }
  }

  private updateClock(): void {
    const now = new Date();
    this.clock.set(now.toLocaleTimeString('es-AR', { hour12: false }));
    this.clockDate.set(
      now.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }),
    );
  }
}
