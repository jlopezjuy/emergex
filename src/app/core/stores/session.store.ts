import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from '../auth/auth.service';

const ROLES = {
  PROPIETARIO: 'ROLE_PROPIETARIO',
  ADMINISTRADOR: 'ROLE_ADMINISTRADOR',
  DESPACHANTE: 'ROLE_DESPACHANTE',
  OPERADOR: 'ROLE_OPERADOR',
  PROFESIONAL: 'ROLE_PROFESIONAL',
  CHOFER: 'ROLE_CHOFER',
  MEDICO_CAMPO: 'ROLE_MEDICO_CAMPO',
} as const;

@Injectable({ providedIn: 'root' })
export class SessionStore {
  private auth = inject(AuthService);

  readonly account = this.auth.currentAccount;

  readonly authorities = computed(() => this.account()?.authorities ?? []);

  readonly isAdmin = computed(
    () =>
      this.authorities().includes(ROLES.ADMINISTRADOR) ||
      this.authorities().includes(ROLES.PROPIETARIO),
  );

  readonly isDespachante = computed(() =>
    this.authorities().includes(ROLES.DESPACHANTE),
  );

  readonly isOperador = computed(() =>
    this.authorities().includes(ROLES.OPERADOR),
  );

  readonly isProfesional = computed(() =>
    this.authorities().includes(ROLES.PROFESIONAL),
  );

  readonly isChofer = computed(() =>
    this.authorities().includes(ROLES.CHOFER),
  );

  readonly isMedicoCampo = computed(() =>
    this.authorities().includes(ROLES.MEDICO_CAMPO),
  );

  readonly isPropietario = computed(() =>
    this.authorities().includes(ROLES.PROPIETARIO),
  );

  readonly isAdministrador = computed(() =>
    this.authorities().includes(ROLES.ADMINISTRADOR),
  );

  hasRole(role: string): boolean {
    return this.authorities().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((r) => this.authorities().includes(r));
  }
}
