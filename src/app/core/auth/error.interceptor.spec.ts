import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { UserFeedbackService } from '../notifications/user-feedback.service';
import { AuthService } from './auth.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor — 403 (QA-ROL-014/033/036)', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let navigate: ReturnType<typeof vi.fn>;
  let push: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    navigate = vi.fn();
    push = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: { navigate } },
        { provide: AuthService, useValue: { logout: vi.fn(), refreshToken: vi.fn() } },
        { provide: UserFeedbackService, useValue: { push } },
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
});
