import { describe, it, expect, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal, computed } from '@angular/core';
import { HeaderComponent } from './header.component';
import { SessionStore } from '../../core/stores/session.store';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationStore } from '../../core/stores/notification.store';

function montar(roles: string[]) {
  const authorities = signal(roles);
  TestBed.configureTestingModule({
    imports: [HeaderComponent],
    providers: [
      provideRouter([]),
      {
        provide: SessionStore,
        useValue: {
          authorities,
          hasAnyRole: (r: string[]) => r.some((x) => authorities().includes(x)),
        },
      },
      { provide: AuthService, useValue: { currentAccount: signal(null), logout: () => undefined } },
      { provide: NotificationStore, useValue: { unreadCount: computed(() => 0) } },
    ],
  });
  const fixture = TestBed.createComponent(HeaderComponent);
  fixture.detectChanges();
  return fixture;
}

describe('HeaderComponent — barra superior por rol (S6)', () => {
  afterEach(() => {
    fixture?.destroy();
  });
  let fixture: ReturnType<typeof montar> | undefined;

  it('un usuario sólo administrativo (CONTADOR) no ve contadores operativos ni acciones de emergencia', () => {
    fixture = montar(['ROLE_USER', 'ROLE_CONTADOR']);
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).not.toContain('Activas');
    expect(texto).not.toContain('Críticas');
    expect(texto).not.toContain('Disp.');
    expect(texto).not.toContain('Institucional');
    expect(texto).not.toContain('Nueva Emergencia');
  });

  it('un usuario con acceso operativo (DESPACHANTE) sigue viendo contadores y acciones', () => {
    fixture = montar(['ROLE_USER', 'ROLE_DESPACHANTE']);
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Activas');
    expect(texto).toContain('Críticas');
    expect(texto).toContain('Disp.');
    expect(texto).toContain('Institucional');
    expect(texto).toContain('Nueva Emergencia');
  });

  it('el título de la página no se trunca', () => {
    fixture = montar(['ROLE_CONTADOR']);
    const titulo = fixture.nativeElement.querySelector('[data-testid="titulo-ruta"]') as HTMLElement;
    expect(titulo).toBeTruthy();
    expect(titulo.classList.contains('truncate')).toBe(false);
    expect(titulo.querySelector('.truncate')).toBeNull();
  });
});
