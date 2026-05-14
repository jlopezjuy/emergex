import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div
      class="min-h-screen flex items-center justify-center"
      style="background: var(--bg-deep);"
    >
      <!-- Background glow -->
      <div
        class="absolute inset-0 pointer-events-none"
        style="background: radial-gradient(ellipse 60% 40% at 50% 20%, rgba(59,130,246,0.08), transparent);"
      ></div>

      <!-- Card -->
      <div
        class="glass-strong rounded-card p-8 w-full relative z-10"
        style="max-width: 380px;"
      >
        <!-- Logo -->
        <div class="flex flex-col items-center gap-3 mb-8">
          <div
            class="w-14 h-14 rounded-card flex items-center justify-center"
            style="background: var(--accent-blue);"
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <!-- Cross / medical -->
              <rect x="11" y="4" width="6" height="20" rx="2" fill="white"/>
              <rect x="4" y="11" width="20" height="6" rx="2" fill="white"/>
            </svg>
          </div>
          <div class="text-center">
            <h1 class="font-mono font-bold text-xl tracking-tight" style="color: var(--text-primary);">
              EMERGEX
            </h1>
            <p class="text-xs mt-0.5" style="color: var(--text-muted);">
              Sistema de Gestión de Emergencias
            </p>
          </div>
        </div>

        <!-- Form -->
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4">
          @if (errorMsg()) {
            <div
              class="rounded-btn px-3 py-2 text-xs"
              style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #FCA5A5;"
            >
              {{ errorMsg() }}
            </div>
          }

          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Usuario
            </label>
            <input
              type="text"
              formControlName="username"
              placeholder="nombre.apellido"
              autocomplete="username"
              class="rounded-btn px-3 py-2.5 text-sm w-full outline-none transition-all"
              style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
              Contraseña
            </label>
            <input
              type="password"
              formControlName="password"
              placeholder="••••••••"
              autocomplete="current-password"
              class="rounded-btn px-3 py-2.5 text-sm w-full outline-none transition-all"
              style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
            />
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" formControlName="rememberMe" class="rounded" />
            <span class="text-xs" style="color: var(--text-secondary);">Recordarme</span>
          </label>

          <button
            type="submit"
            class="btn btn--primary mt-2"
            [disabled]="loading() || form.invalid"
          >
            @if (loading()) {
              <svg class="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 1a6 6 0 010 12"/>
              </svg>
              Ingresando...
            } @else {
              Ingresar al sistema
            }
          </button>
        </form>

        <p class="text-center text-xs mt-6" style="color: var(--text-muted);">
          Emergex v1.0 · Acceso restringido
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly loading = signal(false);
  readonly errorMsg = signal<string | null>(null);

  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    rememberMe: [false],
  });

  submit(): void {
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
        rememberMe: val.rememberMe ?? false,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: () => {
          this.loading.set(false);
          this.errorMsg.set('Credenciales inválidas. Verificá usuario y contraseña.');
        },
      });
  }
}
