import { Component, input, output, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { NotificationStore } from '../../core/stores/notification.store';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'emx-header',
  standalone: true,
  template: `
    <header
      class="flex items-center justify-between px-4 h-14 border-b flex-shrink-0"
      style="background: var(--bg-elevated); border-color: var(--border-glass);"
    >
      <!-- Left: Title + breadcrumb -->
      <div class="flex items-center gap-3">
        <div class="flex flex-col">
          <span class="font-semibold text-sm leading-tight" style="color: var(--text-primary);">
            Centro de Operaciones
          </span>
          <span class="text-xs" style="color: var(--text-muted);">Emergex · Dashboard operativo</span>
        </div>
      </div>

      <!-- Center: Tenant -->
      <div class="flex items-center">
        <div class="badge badge--info font-mono text-xs px-3 py-1">
          <span class="dot"></span>
          {{ tenantName() }}
        </div>
      </div>

      <!-- Right: Stats + clock + actions -->
      <div class="flex items-center gap-3">
        <!-- Sys stats -->
        <div class="flex items-center gap-4 text-xs font-mono">
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
        <div class="h-5 border-l" style="border-color: var(--border-glass);"></div>

        <!-- Clock -->
        <span
          class="font-mono text-xs"
          style="color: var(--accent-cyan); text-shadow: 0 0 12px rgba(34,211,238,0.5);"
        >{{ clock() }}</span>

        <!-- Sistema OK -->
        <div class="badge badge--stable">
          <span class="dot"></span>
          Sistema OK
        </div>

        <!-- Nueva emergencia -->
        <button
          type="button"
          class="btn btn--primary btn--sm"
          (click)="createEmergency.emit()"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 1v10M1 6h10"/>
          </svg>
          Nueva Emergencia
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
        <div
          class="flex items-center gap-2 px-2 py-1 rounded-btn"
          style="background: var(--surface-glass); border: 1px solid var(--border-glass);"
        >
          <div
            class="w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold"
            style="background: var(--accent-blue); color: white;"
          >{{ userInitials() }}</div>
          <span class="text-xs font-medium" style="color: var(--text-secondary);">{{ userName() }}</span>
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent implements OnInit, OnDestroy {
  activeCount = input(0);
  criticalCount = input(0);
  availableCount = input(0);

  createEmergency = output<void>();

  readonly notifications = inject(NotificationStore);
  private auth = inject(AuthService);

  readonly tenantName = computed(() =>
    this.auth.currentAccount()?.empresa?.nombre?.toUpperCase() ?? 'EMERGEX DEMO',
  );

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

  readonly clock = signal('00:00:00');
  private interval?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.updateClock();
    this.interval = setInterval(() => this.updateClock(), 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.interval);
  }

  private updateClock(): void {
    const now = new Date();
    this.clock.set(now.toLocaleTimeString('es-AR', { hour12: false }));
  }
}
