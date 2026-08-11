import { Component, inject, signal, OnInit, OnDestroy, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthApiService } from '../../../data-access/api/auth.api';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { DateUtils } from '../../../core/utils/date.utils';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="reset-pwd">

      <!-- ── Animated background ── -->
      <div class="reset-pwd__bg" aria-hidden="true">
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
            <pattern id="resetGrid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M0 0H48M0 0V48" stroke="rgba(148,163,184,0.06)" stroke-width="0.6"/>
            </pattern>
          </defs>
          <rect width="1200" height="800" fill="url(#bgGlowR)"/>
          <rect width="1200" height="800" fill="url(#bgGlowB)"/>
          <rect width="1200" height="800" fill="url(#resetGrid)"/>
        </svg>
      </div>

      <!-- ── Top bar ── -->
      <div class="reset-pwd__topbar">
        <div class="reset-pwd__brand">
          <img
            src="images/logo/logoEmergex.png"
            alt="Emergex"
            style="height:34px;width:auto;object-fit:contain;"
          >
          <div class="eyebrow" style="margin-top:1px">Cuando cada minuto cuenta</div>
        </div>
        <div style="display:flex;align-items:center;gap:14px">
          <div class="reset-pwd__status">
            <span class="dot-live"></span>
            <span class="mono micro" style="color:var(--text-secondary)">Sistema operativo</span>
          </div>
          <div class="reset-pwd__clock mono">{{ clock() }}</div>
        </div>
      </div>

      <!-- ── Center: form ── -->
      <div class="reset-pwd__center">
        <div class="reset-pwd__card glass-strong">
          
          <div class="reset-pwd__head">
            <div class="eyebrow" style="color:var(--accent-red)">● ACTUALIZACIÓN DE CREDENCIALES</div>
            <h1 style="margin:8px 0 4px;font-size:24px;font-weight:600;letter-spacing:-0.015em">Restablecer contraseña</h1>
            <div style="font-size:13px;color:var(--text-secondary)">Definí una nueva contraseña para recuperar el acceso a tu cuenta.</div>
          </div>

          @if (!key()) {
            <div class="reset-pwd__error-panel">
              <div class="reset-pwd__error">No se detectó una clave de recuperación válida en la URL.</div>
              <p style="font-size:13px;color:var(--text-secondary);margin:0 0 20px 0;">El enlace que abriste podría estar incompleto. Solicitá un nuevo enlace de recuperación.</p>
              <button class="btn btn--danger reset-pwd__cta" routerLink="/forgot-password">
                Solicitar nueva clave
              </button>
            </div>
          } @else if (successMsg()) {
            <div class="reset-pwd__success-panel">
              <div class="reset-pwd__success">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>{{ successMsg() }}</span>
              </div>
              <p style="font-size:13px;color:var(--text-secondary);margin:0 0 20px 0;">Tu contraseña ha sido actualizada con éxito. Ya podés iniciar sesión con tus nuevas credenciales.</p>
              <button class="btn btn--danger reset-pwd__cta" routerLink="/login">
                Iniciar sesión ahora
              </button>
            </div>
          } @else {
            <form [formGroup]="form" (ngSubmit)="submit()">
              @if (errorMsg()) {
                <div class="reset-pwd__error">{{ errorMsg() }}</div>
              }

              <div class="reset-pwd__fields">
                <div class="qc-field">
                  <label class="eyebrow">Nueva contraseña</label>
                  <input
                    class="qc-input"
                    type="password"
                    formControlName="newPassword"
                    placeholder="Mínimo 4 caracteres"
                    autocomplete="new-password"
                    autofocus
                  />
                  @if (form.get('newPassword')?.touched && form.get('newPassword')?.errors?.['minlength']) {
                    <span class="reset-pwd__field-error">La contraseña debe tener al menos 4 caracteres.</span>
                  }
                </div>

                <div class="qc-field">
                  <label class="eyebrow">Confirmar contraseña</label>
                  <input
                    class="qc-input"
                    type="password"
                    formControlName="confirmPassword"
                    placeholder="Repetí la contraseña"
                    autocomplete="new-password"
                  />
                  @if (form.touched && form.errors?.['mismatch']) {
                    <span class="reset-pwd__field-error">Las contraseñas ingresadas no coinciden.</span>
                  }
                </div>
              </div>

              <button class="btn btn--danger reset-pwd__cta" type="submit"
                [disabled]="loading() || form.invalid"
                [style.opacity]="form.invalid ? '0.5' : '1'">
                @if (loading()) {
                  <span class="reset-pwd__spin"></span>
                  <span>Restableciendo contraseña…</span>
                } @else {
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span>Actualizar contraseña</span>
                }
              </button>
            </form>
          }

          <div class="reset-pwd__divider"></div>

          <div class="reset-pwd__foot">
            <a class="reset-pwd__link reset-pwd__back-link" routerLink="/login">
              Volver al inicio de sesión
            </a>
          </div>
        </div>
      </div>

      <!-- ── Bottom bar ── -->
      <div class="reset-pwd__bottom">
        <div class="mono micro" style="color:var(--text-muted)">
          © 2026 Emergex Healthcare Systems · v3.2.0
        </div>
        <div style="display:flex;gap:18px">
          <a class="reset-pwd__link" href="#" (click)="$event.preventDefault()">Soporte 24/7</a>
          <a class="reset-pwd__link" href="#" (click)="$event.preventDefault()">Documentación</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ── Full-screen wrapper ── */
    .reset-pwd {
      position: fixed;
      inset: 0;
      display: flex;
      flex-direction: column;
      background: var(--bg-deep);
      overflow: hidden;
    }

    /* ── Background ── */
    .reset-pwd__bg {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 0;
    }

    /* ── Top bar ── */
    .reset-pwd__topbar {
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
    .reset-pwd__brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .reset-pwd__status {
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
    .reset-pwd__clock {
      font-size: 13px;
      color: var(--text-secondary);
      letter-spacing: 0.04em;
    }

    /* ── Center ── */
    .reset-pwd__center {
      position: relative;
      z-index: 1;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 28px;
    }

    /* ── Form card ── */
    .reset-pwd__card {
      width: 100%;
      max-width: 420px;
      border-radius: var(--r-card);
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .reset-pwd__head {
      margin-bottom: 24px;
    }
    .reset-pwd__fields {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 20px;
    }
    .reset-pwd__cta {
      width: 100%;
      height: 42px;
      font-size: 14px;
      gap: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .reset-pwd__divider {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 16px 0;
      color: var(--text-dim);
      font-size: 12px;
    }
    .reset-pwd__divider::before,
    .reset-pwd__divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--border-hairline);
    }
    .reset-pwd__foot {
      margin-top: 10px;
      text-align: center;
    }
    .reset-pwd__error {
      padding: 8px 12px;
      border-radius: var(--r-btn);
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.3);
      color: var(--accent-red);
      font-size: 12.5px;
      margin-bottom: 16px;
    }
    .reset-pwd__error-panel, .reset-pwd__success-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 8px 0;
    }
    .reset-pwd__success {
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
      width: 100%;
      box-sizing: border-box;
    }
    .reset-pwd__field-error {
      color: var(--accent-red);
      font-size: 11px;
      margin-top: 4px;
      display: block;
    }
    .reset-pwd__link {
      font-size: 11.5px;
      color: var(--accent-blue);
      text-decoration: none;
      transition: opacity 0.15s;
    }
    .reset-pwd__link:hover { opacity: 0.75; }
    .reset-pwd__back-link {
      font-size: 13px;
      font-weight: 500;
    }

    /* ── Spin loader ── */
    .reset-pwd__spin {
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
    .reset-pwd__bottom {
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

    .reset-pwd .qc-input {
      background: var(--surface-inset);
      border: 1px solid var(--border-strong);
      color: var(--text-primary);
    }
    .reset-pwd .qc-input::placeholder {
      color: var(--text-muted);
    }
    .reset-pwd .qc-input:focus {
      border-color: var(--accent-blue);
      background: var(--bg-elevated);
    }

    [data-theme="light"] .reset-pwd__card {
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
    }

    [data-theme="light"] .reset-pwd__bg {
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
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private api = inject(AuthApiService);

  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly successMsg = signal<string | null>(null);
  readonly clock = signal(DateUtils.format(DateUtils.now(), 'HH:mm:ss'));
  readonly key = signal<string | null>(null);

  private clockInterval = setInterval(() => this.clock.set(DateUtils.format(DateUtils.now(), 'HH:mm:ss')), 1000);

  form!: FormGroup;

  ngOnInit(): void {
    // Inicializar el formulario con validador de coincidencia
    this.form = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(100)]],
        confirmPassword: ['', [Validators.required]],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );

    // Capturar la key de los query params
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const resetKey = params['key'];
      if (resetKey) {
        this.key.set(resetKey);
      }
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.clockInterval);
  }

  private passwordMatchValidator(g: FormGroup) {
    const newPwd = g.get('newPassword')?.value;
    const confirmPwd = g.get('confirmPassword')?.value;
    return newPwd === confirmPwd ? null : { mismatch: true };
  }

  submit(): void {
    if (this.form.invalid || !this.key()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    const newPassword = this.form.value.newPassword!;
    const key = this.key()!;

    this.api
      .finishPasswordReset(key, newPassword)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.successMsg.set('Contraseña actualizada correctamente.');
        },
        error: (_err) => {
          this.loading.set(false);
          // Mapeamos el error 500 o 400 del backend a un mensaje comprensible y amigable
          this.errorMsg.set(
            'La clave de recuperación es inválida o ha expirado. Por favor, solicitá un nuevo enlace.'
          );
        },
      });
  }
}
