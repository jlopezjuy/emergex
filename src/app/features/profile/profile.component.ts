import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="profile-page h-full overflow-y-auto">
      <div class="profile-shell">
      <header class="flex items-end justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold" style="color: var(--text-primary);">Mi perfil</h1>
          <p class="text-sm mt-1" style="color: var(--text-muted);">Editá tus datos de usuario y profesional desde un solo lugar.</p>
        </div>
        <div class="text-xs font-mono px-2 py-1 rounded" style="background: var(--surface-glass); color: var(--text-secondary); border: 1px solid var(--border-glass);">
          {{ account()?.empresa?.nombre ?? 'Sin empresa' }} · {{ account()?.usuarioEmpresa?.rol ?? 'Sin rol' }}
        </div>
      </header>

      <section class="glass rounded-panel section-card">
        <div class="flex items-center justify-between">
          <h2 class="eyebrow">Datos personales</h2>
          <span class="text-xs section-tag">User</span>
        </div>
        <div class="fields-grid">
          <label class="field"><span>Nombre</span><input [(ngModel)]="firstName" /></label>
          <label class="field"><span>Apellido</span><input [(ngModel)]="lastName" /></label>
          <label class="field span-2"><span>Email</span><input [(ngModel)]="email" /></label>
        </div>
        <div class="meta-grid">
          <div class="meta-item"><span>Login</span><strong>{{ account()?.login ?? '—' }}</strong></div>
          <div class="meta-item"><span>Idioma</span><strong>{{ account()?.langKey ?? 'es' }}</strong></div>
          <div class="meta-item span-2"><span>Authorities</span><strong>{{ (account()?.authorities ?? []).join(', ') || '—' }}</strong></div>
        </div>
      </section>

      <section class="glass rounded-panel section-card">
        <div class="flex items-center justify-between">
          <h2 class="eyebrow">Perfil profesional</h2>
          <span class="text-xs section-tag">ProfesionalSalud</span>
        </div>
        @if (!hasProfessional()) {
          <div class="rounded p-3 text-sm" style="background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.35); color: var(--text-secondary);">
            Este usuario no tiene un ProfesionalSalud activo vinculado.
          </div>
        } @else {
          <div class="fields-grid">
            <label class="field"><span>Nombre</span><input [(ngModel)]="profNombre" /></label>
            <label class="field"><span>Apellido</span><input [(ngModel)]="profApellido" /></label>
            <label class="field"><span>Teléfono</span><input [(ngModel)]="profTelefono" /></label>
            <label class="field"><span>Email profesional</span><input [(ngModel)]="profEmail" /></label>
            <label class="field"><span>Tipo matrícula</span><input [(ngModel)]="profTipoMatricula" /></label>
            <label class="field"><span>Matrícula</span><input [value]="account()?.profesional?.matricula ?? ''" disabled /></label>
            <label class="field"><span>Jurisdicción matrícula</span><input [(ngModel)]="profMatriculaJurisdiccion" /></label>
            <label class="field"><span>Vencimiento habilitación</span><input type="date" [(ngModel)]="profFechaVencimiento" /></label>
            <label class="field span-2"><span>URL foto</span><input [(ngModel)]="profFoto" /></label>
          </div>
          <div class="checks-row">
            <label class="check"><input type="checkbox" [(ngModel)]="profAtencionDomiciliaria" /> Atención domiciliaria</label>
            <label class="check"><input type="checkbox" [(ngModel)]="profAtencionEmergencia" /> Atención emergencia</label>
          </div>
          <div class="meta-grid">
            <div class="meta-item"><span>Activo</span><strong>{{ account()?.profesional?.activo ? 'Sí' : 'No' }}</strong></div>
            <div class="meta-item span-2"><span>Subespecialidades</span><strong>{{ (account()?.profesional?.subespecialidades ?? []).join(', ') || '—' }}</strong></div>
          </div>
        }
      </section>

      <div class="sticky-actions">
        <button class="btn btn--primary" (click)="saveAll()" [disabled]="savingUser() || savingProfessional()">
          {{ savingUser() || savingProfessional() ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page { padding: 12px; }
    .profile-shell {
      max-width: 1040px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding-bottom: 6px;
    }
    .section-card {
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .section-tag { color: var(--text-muted); }
    .fields-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      padding-top: 2px;
    }
    .meta-item {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 12px;
    }
    .meta-item span { color: var(--text-muted); min-width: 110px; }
    .meta-item strong { color: var(--text-primary); font-weight: 600; word-break: break-word; }
    .field { display:flex; flex-direction:column; gap:6px; font-size:13px; color: var(--text-muted); }
    .field input {
      width: 100%;
      height: 40px;
      padding: 8px 10px;
      border-radius: var(--r-input);
      border: 1px solid var(--border-glass);
      background: var(--surface-glass);
      color: var(--text-primary);
      outline: none;
    }
    .field input:focus { border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(59,130,246,0.12); }
    .field input:disabled { opacity: .8; cursor: not-allowed; }
    .check { display:flex; align-items:center; gap:8px; font-size:13px; color: var(--text-secondary); }
    .checks-row { display:flex; flex-direction:column; gap:8px; }
    .sticky-actions {
      position: sticky;
      bottom: 0;
      display: flex;
      justify-content: flex-end;
      padding-top: 6px;
      padding-bottom: 2px;
      background: linear-gradient(to top, var(--bg-deep) 45%, transparent);
    }
    .sticky-actions .btn {
      min-width: 170px;
      height: 40px;
    }
    @media (min-width: 900px) {
      .profile-page { padding: 16px; }
      .profile-shell { gap: 16px; }
      .section-card { padding: 16px 18px; }
      .fields-grid { grid-template-columns: 1fr 1fr; gap: 10px 12px; }
      .span-2 { grid-column: 1 / -1; }
      .checks-row { flex-direction: row; align-items: center; gap: 20px; }
      .meta-grid { grid-template-columns: 1fr 1fr; gap: 8px 14px; }
      .meta-item.span-2 { grid-column: 1 / -1; }
    }
  `],
})
export class ProfileComponent {
  private auth = inject(AuthService);
  readonly account = this.auth.currentAccount;

  readonly savingUser = signal(false);
  readonly savingProfessional = signal(false);
  readonly hasProfessional = signal(false);

  firstName = '';
  lastName = '';
  email = '';

  profNombre = '';
  profApellido = '';
  profTelefono = '';
  profEmail = '';
  profFoto = '';
  profTipoMatricula = '';
  profMatriculaJurisdiccion = '';
  profFechaVencimiento = '';
  profAtencionDomiciliaria = false;
  profAtencionEmergencia = false;

  constructor() {
    effect(() => {
      const a = this.account();
      if (!a) return;
      this.firstName = a.firstName ?? '';
      this.lastName = a.lastName ?? '';
      this.email = a.email ?? '';

      const p = a.profesional;
      this.hasProfessional.set(!!p);
      this.profNombre = p?.nombre ?? '';
      this.profApellido = p?.apellido ?? '';
      this.profTelefono = p?.telefono ?? '';
      this.profEmail = p?.email ?? '';
      this.profFoto = p?.foto ?? '';
      this.profTipoMatricula = p?.tipoMatricula ?? '';
      this.profMatriculaJurisdiccion = p?.matriculaJurisdiccion ?? '';
      this.profFechaVencimiento = p?.fechaVencimientoHabilitacion ?? '';
      this.profAtencionDomiciliaria = !!p?.atencionDomiciliaria;
      this.profAtencionEmergencia = !!p?.atencionEmergencia;
    });
  }

  saveUser(): void {
    this.savingUser.set(true);
    this.auth
      .updateAccount({
        firstName: this.firstName,
        lastName: this.lastName,
        email: this.email,
      })
      .subscribe({
        next: () => this.savingUser.set(false),
        error: () => this.savingUser.set(false),
      });
  }

  saveProfessional(): void {
    if (!this.hasProfessional()) return;
    this.savingProfessional.set(true);
    this.auth
      .updateCurrentProfessional({
        nombre: this.profNombre,
        apellido: this.profApellido,
        telefono: this.profTelefono,
        email: this.profEmail,
        foto: this.profFoto,
        tipoMatricula: this.profTipoMatricula,
        matriculaJurisdiccion: this.profMatriculaJurisdiccion,
        fechaVencimientoHabilitacion: this.profFechaVencimiento || undefined,
        atencionDomiciliaria: this.profAtencionDomiciliaria,
        atencionEmergencia: this.profAtencionEmergencia,
      })
      .subscribe({
        next: () => this.savingProfessional.set(false),
        error: () => this.savingProfessional.set(false),
      });
  }

  saveAll(): void {
    this.saveUser();
    if (this.hasProfessional()) this.saveProfessional();
  }
}
