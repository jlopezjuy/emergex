import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { UserFeedbackService } from './user-feedback.service';

describe('UserFeedbackService.fromHttpError (QA-ROL-042)', () => {
  let service: UserFeedbackService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    service = TestBed.inject(UserFeedbackService);
  });

  it('traduce profesionalNotFound en vez de mostrar la clave técnica', () => {
    service.fromHttpError(
      new HttpErrorResponse({ status: 400, error: { title: 'Profesional no encontrado', message: 'error.profesionalNotFound' } }),
    );

    const mensaje = service.toasts()[0].message;
    expect(mensaje).not.toContain('profesionalNotFound');
    expect(mensaje.toLowerCase()).toContain('profesional');
    expect(mensaje).toContain('administrador');
  });
});
