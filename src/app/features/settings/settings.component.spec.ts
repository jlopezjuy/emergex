import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { SettingsComponent } from './settings.component';
import { AuthService } from '../../core/auth/auth.service';
import { Account } from '../../core/auth/models/account.model';

describe('SettingsComponent — cuenta (QA-ROL-028)', () => {
  function crear(cuenta: Account | null): HTMLElement {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { currentAccount: signal(cuenta).asReadonly(), logout: () => undefined } }],
    });
    const fixture = TestBed.createComponent(SettingsComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('muestra al usuario autenticado y su empresa, no un "Operador" fijo', () => {
    const el = crear({
      id: 1,
      login: 'qa.contador',
      email: 'c@x.com',
      authorities: ['ROLE_CONTADOR'],
      firstName: 'Carla',
      lastName: 'Ríos',
      empresa: { id: 1, nombre: 'SAE' },
    });

    const texto = el.textContent ?? '';
    expect(texto).toContain('Carla Ríos');
    expect(texto).toContain('CR');
    expect(texto).toContain('SAE');
    expect(texto).not.toContain('Centro de operaciones');
  });

  it('sin nombre cae en el login', () => {
    const el = crear({ id: 1, login: 'qa.auditor', email: 'a@x.com', authorities: ['ROLE_AUDITOR'] });

    expect(el.textContent).toContain('qa.auditor');
  });
});
