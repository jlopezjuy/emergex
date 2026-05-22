import { Component, inject, signal, OnDestroy, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { DateUtils } from '../../../core/utils/date.utils';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="login">

      <!-- ── Animated background ── -->
      <div class="login__bg" aria-hidden="true">
        <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" style="width:100%;height:100%">
          <defs>
            <radialGradient id="bgGlowR" cx="20%" cy="30%" r="50%">
              <stop offset="0%" stop-color="rgba(239,68,68,0.18)"/>
              <stop offset="100%" stop-color="transparent"/>
            </radialGradient>
            <radialGradient id="bgGlowB" cx="80%" cy="75%" r="50%">
              <stop offset="0%" stop-color="rgba(59,130,246,0.16)"/>
              <stop offset="100%" stop-color="transparent"/>
            </radialGradient>
            <pattern id="loginGrid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M0 0H48M0 0V48" stroke="rgba(148,163,184,0.06)" stroke-width="0.6"/>
            </pattern>
          </defs>
          <rect width="1200" height="800" fill="url(#bgGlowR)"/>
          <rect width="1200" height="800" fill="url(#bgGlowB)"/>
          <rect width="1200" height="800" fill="url(#loginGrid)"/>
        </svg>
      </div>

      <!-- ── Top bar ── -->
      <div class="login__topbar">
        <div class="login__brand">
          <img
            src="images/logo/logoEmergex.png"
            alt="Emergex"
            style="height:34px;width:auto;object-fit:contain;"
          >
          <div class="eyebrow" style="margin-top:1px">Cuando cada minuto cuenta</div>
        </div>
        <div style="display:flex;align-items:center;gap:14px">
          <div class="login__status">
            <span class="dot-live"></span>
            <span class="mono micro" style="color:var(--text-secondary)">Sistema operativo</span>
          </div>
          <div class="login__clock mono">{{ clock() }}</div>
        </div>
      </div>

      <!-- ── Center: form + metrics ── -->
      <div class="login__center">

        <!-- Form card -->
        <form class="login__card glass-strong" [formGroup]="form" (ngSubmit)="submit()">
          <div class="login__head">
            <div class="eyebrow" style="color:var(--accent-red)">● ACCESO RESTRINGIDO</div>
            <h1 style="margin:8px 0 4px;font-size:24px;font-weight:600;letter-spacing:-0.015em">Centro de Operaciones</h1>
            <div style="font-size:13px;color:var(--text-secondary)">Identifícate para continuar.</div>
          </div>

          @if (errorMsg()) {
            <div class="login__error">{{ errorMsg() }}</div>
          }

          <div class="login__fields">
            <div class="qc-field">
              <label class="eyebrow">Nombre de usuario</label>
              <input
                class="qc-input"
                type="text"
                formControlName="username"
                placeholder="Nombre de usuario de la cuenta"
                autocomplete="username"
                autofocus
              />
            </div>
            <div class="qc-field">
              <label class="eyebrow" style="display:flex;justify-content:space-between;align-items:center">
                <span>Contraseña</span>
                <a class="login__link" routerLink="/forgot-password">¿Olvidaste tu contraseña?</a>
              </label>
              <input
                class="qc-input"
                type="password"
                formControlName="password"
                placeholder="••••••••••"
                autocomplete="current-password"
              />
            </div>
          </div>

          <button class="btn btn--danger login__cta" type="submit"
            [disabled]="loading() || form.invalid"
            [style.opacity]="form.invalid ? '0.5' : '1'">
            @if (loading()) {
              <span class="login__spin"></span>
              <span>Validando credenciales…</span>
            } @else {
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Iniciar sesión</span>
            }
          </button>

          <div class="login__divider"></div>

          <div class="login__foot">
            <div class="mono micro">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Conexión cifrada · TLS 1.3 · ISO 27001
            </div>
          </div>
        </form>

        <!-- Side metrics -->
        <div class="login__side">
          <div class="login__metric glass">
            <div class="eyebrow">Servicios último mes</div>
            <div class="mono" style="font-size:32px;font-weight:500;margin-top:4px">2,847</div>
            <div class="mono micro" style="color:var(--accent-emerald)">▲ +12% vs. mes anterior</div>
          </div>
          <div class="login__metric glass">
            <div class="eyebrow">Tiempo medio resp.</div>
            <div class="mono" style="font-size:32px;font-weight:500;margin-top:4px;color:var(--accent-cyan)">
              7.4<span style="font-size:14px;color:var(--text-muted);margin-left:4px">min</span>
            </div>
            <div class="mono micro" style="color:var(--accent-emerald)">▼ -0.8 min</div>
          </div>
          <div class="login__metric glass">
            <div class="eyebrow">Cumplimiento SLA</div>
            <div class="mono" style="font-size:32px;font-weight:500;margin-top:4px;color:var(--accent-emerald)">
              93.2<span style="font-size:14px;color:var(--text-muted);margin-left:4px">%</span>
            </div>
            <div class="mono micro" style="color:var(--text-muted)">● 192/192 críticos resueltos</div>
          </div>
        </div>
      </div>

      <!-- ── Bottom bar ── -->
      <div class="login__bottom">
        <div class="mono micro" style="color:var(--text-muted)">
          © 2026 Emergex Healthcare Systems · v3.2.0 · Build 2026.05.15
        </div>
        <div style="display:flex;gap:18px">
          <a class="login__link" href="#" (click)="$event.preventDefault()">Soporte 24/7</a>
          <a class="login__link" href="#" (click)="$event.preventDefault()">Documentación</a>
          <a class="login__link" href="#" (click)="$event.preventDefault()">Estado del sistema</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Full-screen wrapper ── */
    .login {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      background: var(--bg-deep);
      overflow: hidden;
    }

    /* ── Background ── */
    .login__bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }

    /* ── Top bar ── */
    .login__topbar {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 28px;
      border-bottom: 1px solid var(--border-hairline);
      background: color-mix(in srgb, var(--bg-elevated) 88%, transparent);
      backdrop-filter: blur(8px);
    }
    .login__brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .login__status {
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .dot-live {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--accent-emerald);
      box-shadow: 0 0 8px var(--accent-emerald);
      animation: pulse-dot 1.8s infinite;
      flex-shrink: 0;
    }
    .login__clock {
      font-size: 13px;
      color: var(--text-secondary);
      letter-spacing: 0.04em;
    }

    /* ── Center ── */
    .login__center {
      position: relative;
      z-index: 1;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 32px;
      padding: 32px 28px;
    }

    /* ── Form card ── */
    .login__card {
      width: 100%;
      max-width: 420px;
      border-radius: var(--r-card);
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .login__head {
      margin-bottom: 24px;
    }
    .login__fields {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 20px;
    }
    .login__cta {
      width: 100%;
      height: 42px;
      font-size: 14px;
      gap: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .login__divider {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 16px 0;
      color: var(--text-dim);
      font-size: 12px;
    }
    .login__divider::before,
    .login__divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border-hairline);
    }
    .login__foot {
      margin-top: 20px;
      text-align: center;
      color: var(--text-muted);
    }
    .login__error {
      padding: 8px 12px;
      border-radius: var(--r-btn);
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.3);
      color: var(--accent-red);
      font-size: 12.5px;
      margin-bottom: 12px;
    }
    .login__link {
      font-size: 11.5px;
      color: var(--accent-blue);
      text-decoration: none;
      transition: opacity 0.15s;
    }
    .login__link:hover { opacity: 0.75; }

    /* ── Spin loader ── */
    .login__spin {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.25);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Side metrics ── */
    .login__side {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 220px;
      flex-shrink: 0;
    }
    .login__metric {
      padding: 18px 20px;
      border-radius: var(--r-card);
      border: 1px solid var(--border-glass);
      background: var(--surface-glass);
    }

    /* ── Bottom bar ── */
    .login__bottom {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 28px;
      border-top: 1px solid var(--border-hairline);
      background: color-mix(in srgb, var(--bg-elevated) 88%, transparent);
      backdrop-filter: blur(8px);
    }

    .login .qc-input {
      background: var(--surface-inset);
      border: 1px solid var(--border-strong);
      color: var(--text-primary);
    }
    .login .qc-input::placeholder {
      color: var(--text-muted);
    }
    .login .qc-input:focus {
      border-color: var(--accent-blue);
      background: var(--bg-elevated);
    }

    [data-theme="light"] .login__card {
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }

    [data-theme="light"] .login__bg {
      opacity: 0.7;
    }

    /* ── btn--danger override ── */
    .btn--danger {
      background: linear-gradient(135deg, #DC2626, #B91C1C);
      color: white;
      border-color: transparent;
      box-shadow: 0 0 16px rgba(239, 68, 68, 0.3);
    }
    .btn--danger:hover:not(:disabled) {
      background: linear-gradient(135deg, #EF4444, #DC2626);
      box-shadow: 0 0 22px rgba(239, 68, 68, 0.45);
    }

    /* ── Responsive: hide side metrics on small screens ── */
    @media (max-width: 768px) {
      .login__side { display: none; }
    }
  `],
})
export class LoginComponent implements OnDestroy {
    private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly clock = signal(DateUtils.format(DateUtils.now(), 'HH:mm:ss'));

  private attempts = 0;
  private lockedUntil = 0;
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_MS = 30000;

  private clockInterval = setInterval(() => this.clock.set(DateUtils.format(DateUtils.now(), 'HH:mm:ss')), 1000);

  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  ngOnDestroy(): void {
    clearInterval(this.clockInterval);
  }


  submit(): void {
    if (this.lockedUntil && Date.now() < this.lockedUntil) {
      this.errorMsg.set(`Esperá ${Math.ceil((this.lockedUntil - Date.now()) / 1000)}s.`);
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set(null);

    const val = this.form.value;
    this.auth
            .login({
              username: val.username!,
              password: val.password!,
              rememberMe: false,
            }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
              next: () => {
                this.loading.set(false);
                this.attempts = 0;
                this.router.navigate(['/dashboard']);
              },
              error: () => {
                this.loading.set(false);
                this.attempts++;
                if (this.attempts >= this.MAX_ATTEMPTS) {
                  this.lockedUntil = Date.now() + this.LOCKOUT_MS;
                  this.errorMsg.set(`Demasiados intentos. Esperá ${this.LOCKOUT_MS / 1000}s.`);
                } else {
                  this.errorMsg.set('Credenciales inválidas. Verificá usuario y contraseña.');
                }
              },
            });
  }
}
