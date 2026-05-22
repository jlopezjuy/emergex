import { Component, inject, signal, OnDestroy, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApiService } from '../../../data-access/api/auth.api';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { DateUtils } from '../../../core/utils/date.utils';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="forgot-pwd">

      <!-- ── Animated background ── -->
      <div class="forgot-pwd__bg" aria-hidden="true">
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
            <pattern id="forgotGrid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M0 0H48M0 0V48" stroke="rgba(148,163,184,0.06)" stroke-width="0.6"/>
            </pattern>
          </defs>
          <rect width="1200" height="800" fill="url(#bgGlowR)"/>
          <rect width="1200" height="800" fill="url(#bgGlowB)"/>
          <rect width="1200" height="800" fill="url(#forgotGrid)"/>
        </svg>
      </div>

      <!-- ── Top bar ── -->
      <div class="forgot-pwd__topbar">
        <div class="forgot-pwd__brand">
          <img
            src="images/logo/logoEmergex.png"
            alt="Emergex"
            style="height:34px;width:auto;object-fit:contain;"
          >
          <div class="eyebrow" style="margin-top:1px">Cuando cada minuto cuenta</div>
        </div>
        <div style="display:flex;align-items:center;gap:14px">
          <div class="forgot-pwd__status">
            <span class="dot-live"></span>
            <span class="mono micro" style="color:var(--text-secondary)">Sistema operativo</span>
          </div>
          <div class="forgot-pwd__clock mono">{{ clock() }}</div>
        </div>
      </div>

      <!-- ── Center: form ── -->
      <div class="forgot-pwd__center">
        <form class="forgot-pwd__card glass-strong" [formGroup]="form" (ngSubmit)="submit()">
          <div class="forgot-pwd__head">
            <div class="eyebrow" style="color:var(--accent-red)">● RECUPERACIÓN DE ACCESO</div>
            <h1 style="margin:8px 0 4px;font-size:24px;font-weight:600;letter-spacing:-0.015em">¿Olvidaste tu contraseña?</h1>
            <div style="font-size:13px;color:var(--text-secondary)">Ingresá tu correo electrónico para restablecer tu cuenta.</div>
          </div>

          @if (errorMsg()) {
            <div class="forgot-pwd__error">{{ errorMsg() }}</div>
          }

          @if (successMsg()) {
            <div class="forgot-pwd__success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <span>{{ successMsg() }}</span>
            </div>
          } @else {
            <div class="forgot-pwd__fields">
              <div class="qc-field">
                <label class="eyebrow">Correo electrónico</label>
                <input
                  class="qc-input"
                  type="email"
                  formControlName="email"
                  placeholder="ejemplo@emergex.com"
                  autocomplete="email"
                  autofocus
                />
                @if (form.get('email')?.touched && form.get('email')?.errors?.['email']) {
                  <span class="forgot-pwd__field-error">Ingresá una dirección de correo válida.</span>
                }
              </div>
            </div>

            <button class="btn btn--danger forgot-pwd__cta" type="submit"
              [disabled]="loading() || form.invalid"
              [style.opacity]="form.invalid ? '0.5' : '1'">
              @if (loading()) {
                <span class="forgot-pwd__spin"></span>
                <span>Enviando solicitud…</span>
              } @else {
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <span>Enviar instrucciones</span>
              }
            </button>
          }

          <div class="forgot-pwd__divider"></div>

          <div class="forgot-pwd__foot">
            <a class="forgot-pwd__link forgot-pwd__back-link" routerLink="/login">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:4px"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
              Volver al inicio de sesión
            </a>
          </div>
        </form>
      </div>

      <!-- ── Bottom bar ── -->
      <div class="forgot-pwd__bottom">
        <div class="mono micro" style="color:var(--text-muted)">
          © 2026 Emergex Healthcare Systems · v3.2.0
        </div>
        <div style="display:flex;gap:18px">
          <a class="forgot-pwd__link" href="#" (click)="$event.preventDefault()">Soporte 24/7</a>
          <a class="forgot-pwd__link" href="#" (click)="$event.preventDefault()">Documentación</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Full-screen wrapper ── */
    .forgot-pwd {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      background: var(--bg-deep);
      overflow: hidden;
    }

    /* ── Background ── */
    .forgot-pwd__bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }

    /* ── Top bar ── */
    .forgot-pwd__topbar {
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
    .forgot-pwd__brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .forgot-pwd__status {
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
    .forgot-pwd__clock {
      font-size: 13px;
      color: var(--text-secondary);
      letter-spacing: 0.04em;
    }

    /* ── Center ── */
    .forgot-pwd__center {
      position: relative;
      z-index: 1;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 28px;
    }

    /* ── Form card ── */
    .forgot-pwd__card {
      width: 100%;
      max-width: 420px;
      border-radius: var(--r-card);
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .forgot-pwd__head {
      margin-bottom: 24px;
    }
    .forgot-pwd__fields {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 20px;
    }
    .forgot-pwd__cta {
      width: 100%;
      height: 42px;
      font-size: 14px;
      gap: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .forgot-pwd__divider {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 16px 0;
      color: var(--text-dim);
      font-size: 12px;
    }
    .forgot-pwd__divider::before,
    .forgot-pwd__divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border-hairline);
    }
    .forgot-pwd__foot {
      margin-top: 10px;
      text-align: center;
    }
    .forgot-pwd__error {
      padding: 8px 12px;
      border-radius: var(--r-btn);
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.3);
      color: var(--accent-red);
      font-size: 12.5px;
      margin-bottom: 16px;
    }
    .forgot-pwd__success {
      display: flex;
      align-items: flex-start;
      padding: 12px 14px;
      border-radius: var(--r-btn);
      background: rgba(16,185,129,0.1);
      border: 1px solid rgba(16,185,129,0.3);
      color: var(--accent-emerald);
      font-size: 13px;
      line-height: 1.4;
      margin-bottom: 16px;
    }
    .forgot-pwd__field-error {
      color: var(--accent-red);
      font-size: 11px;
      margin-top: 4px;
      display: block;
    }
    .forgot-pwd__link {
      font-size: 11.5px;
      color: var(--accent-blue);
      text-decoration: none;
      transition: opacity 0.15s;
    }
    .forgot-pwd__link:hover { opacity: 0.75; }
    .forgot-pwd__back-link {
      font-size: 13px;
      font-weight: 500;
    }

    /* ── Spin loader ── */
    .forgot-pwd__spin {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.25);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Bottom bar ── */
    .forgot-pwd__bottom {
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

    .forgot-pwd .qc-input {
      background: var(--surface-inset);
      border: 1px solid var(--border-strong);
      color: var(--text-primary);
    }
    .forgot-pwd .qc-input::placeholder {
      color: var(--text-muted);
    }
    .forgot-pwd .qc-input:focus {
      border-color: var(--accent-blue);
      background: var(--bg-elevated);
    }

    [data-theme="light"] .forgot-pwd__card {
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }

    [data-theme="light"] .forgot-pwd__bg {
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
  `],
})
export class ForgotPasswordComponent implements OnDestroy {
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private api = inject(AuthApiService);

  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);
  readonly clock = signal(DateUtils.format(DateUtils.now(), 'HH:mm:ss'));

  private clockInterval = setInterval(() => this.clock.set(DateUtils.format(DateUtils.now(), 'HH:mm:ss')), 1000);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  ngOnDestroy(): void {
    clearInterval(this.clockInterval);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    const email = this.form.value.email!;

    this.api
      .requestPasswordReset(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.successMsg.set(
            'Si el correo electrónico ingresado está registrado en el sistema, recibirás un mensaje con las instrucciones para restablecer tu contraseña.'
          );
        },
        error: (err) => {
          this.loading.set(false);
          // Si es un error de CORS, o red, o de otro tipo. En JHipster siempre devuelve 200 en init (por seguridad anti-enumeración)
          // por lo que si da error es un problema real de infraestructura.
          this.errorMsg.set('Ocurrió un error al procesar tu solicitud. Por favor, reintentá más tarde.');
        },
      });
  }
}
