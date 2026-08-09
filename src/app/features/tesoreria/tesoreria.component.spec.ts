import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TesoreriaComponent } from './tesoreria.component';
import { TesoreriaApi } from '../../data-access/api/tesoreria.api';
import { UserFeedbackService } from '../../core/notifications/user-feedback.service';

interface ApiMock {
  abrirCaja: ReturnType<typeof vi.fn>;
  registrarMovimientoCaja: ReturnType<typeof vi.fn>;
  realizarArqueoCaja: ReturnType<typeof vi.fn>;
}

interface FeedbackMock {
  push: ReturnType<typeof vi.fn>;
  fromHttpError: ReturnType<typeof vi.fn>;
}

describe('TesoreriaComponent (F0-01)', () => {
  let apiMock: ApiMock;
  let feedbackMock: FeedbackMock;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    apiMock = {
      abrirCaja: vi.fn().mockReturnValue(of({ id: 1, nombre: 'Caja Central', montoInicial: 1000 })),
      registrarMovimientoCaja: vi.fn().mockReturnValue(of({ id: 2, tipo: 'INGRESO', monto: 500, concepto: 'Test' })),
      realizarArqueoCaja: vi.fn().mockReturnValue(of({ id: 3, montoFisicoContado: 1500 })),
    };
    feedbackMock = {
      push: vi.fn(),
      fromHttpError: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TesoreriaComponent],
      providers: [
        { provide: TesoreriaApi, useValue: apiMock },
        { provide: UserFeedbackService, useValue: feedbackMock },
      ],
    }).compileComponents();
  });

  it('debería mostrar mensaje de estado honesto con empty-state', () => {
    const fixture = TestBed.createComponent(TesoreriaComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('emx-empty-state')).not.toBeNull();
  });

  it('debería ejecutar abrirCaja y dar feedback de éxito', () => {
    const fixture = TestBed.createComponent(TesoreriaComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.cajaNombre.set('Caja Principal');
    component.montoInicial.set(2000);
    component.ejecutarAbrirCaja();

    expect(apiMock.abrirCaja).toHaveBeenCalledWith('Caja Principal', 2000);
    expect(feedbackMock.push).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success',
      title: 'Caja abierta',
    }));
  });

  it('debería notificar error al fallar abrirCaja', () => {
    apiMock.abrirCaja.mockReturnValue(throwError(() => new Error('Forbidden')));
    const fixture = TestBed.createComponent(TesoreriaComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.cajaNombre.set('Caja Principal');
    component.montoInicial.set(2000);
    component.ejecutarAbrirCaja();

    expect(feedbackMock.fromHttpError).toHaveBeenCalled();
  });
});
