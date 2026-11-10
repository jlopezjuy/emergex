import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { signal } from '@angular/core';
import { UserFeedbackService } from '../notifications/user-feedback.service';
import { AuthService } from './auth.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor — 403 (QA-ROL-014/033/036)', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let navigate: ReturnType<typeof vi.fn>;
  let push: ReturnType<typeof vi.fn>;
  let toasts: ReturnType<typeof signal<Array<{ title: string }>>>;

  beforeEach(() => {
    navigate = vi.fn();
    toasts = signal<Array<{ title: string }>>([]);
    push = vi.fn().mockImplementation((t: { title: string }) => toasts.update((l) => [t, ...l]));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate } },
        { provide: AuthService, useValue: { logout: vi.fn(), refreshToken: vi.fn() } },
        { provide: UserFeedbackService, useValue: { push, toasts: toasts.asReadonly() } },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  it('un 403 de una llamada no expulsa al usuario de la pantalla', () => {
    let status = 0;
    http.get('/api/algo').subscribe({ error: (e) => (status = e.status) });
    backend.expectOne('/api/algo').flush({}, { status: 403, statusText: 'Forbidden' });

    expect(status).toBe(403);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('avisa con un toast que falta el permiso', () => {
    http.get('/api/algo').subscribe({ error: () => undefined });
    backend.expectOne('/api/algo').flush({}, { status: 403, statusText: 'Forbidden' });

    expect(push).toHaveBeenCalledTimes(1);
    expect(push.mock.calls[0][0].type).toBe('warning');
  });

  it('varios 403 simultáneos generan un solo aviso', () => {
    for (const url of ['/api/a', '/api/b', '/api/c']) {
      http.get(url).subscribe({ error: () => undefined });
    }
    for (const url of ['/api/a', '/api/b', '/api/c']) {
      backend.expectOne(url).flush({}, { status: 403, statusText: 'Forbidden' });
    }
    expect(push).toHaveBeenCalledTimes(1);
  });

  it('no apila un segundo aviso mientras el primero sigue visible, aunque pase la ventana de 3 s (QA-ROL-047)', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-07T10:00:00Z'));
      http.get('/api/a').subscribe({ error: () => undefined });
      backend.expectOne('/api/a').flush({}, { status: 403, statusText: 'Forbidden' });

      vi.setSystemTime(new Date('2026-11-07T10:00:05Z'));
      http.get('/api/b').subscribe({ error: () => undefined });
      backend.expectOne('/api/b').flush({}, { status: 403, statusText: 'Forbidden' });

      expect(push).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('vuelve a avisar cuando el aviso anterior ya se cerró', () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-11-07T10:00:00Z'));
      http.get('/api/a').subscribe({ error: () => undefined });
      backend.expectOne('/api/a').flush({}, { status: 403, statusText: 'Forbidden' });
      toasts.set([]);

      vi.setSystemTime(new Date('2026-11-07T10:00:05Z'));
      http.get('/api/b').subscribe({ error: () => undefined });
      backend.expectOne('/api/b').flush({}, { status: 403, statusText: 'Forbidden' });

      expect(push).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
