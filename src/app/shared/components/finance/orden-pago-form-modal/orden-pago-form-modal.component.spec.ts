import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OrdenPagoFormModalComponent } from './orden-pago-form-modal.component';
import { OrdenesPagoApiService } from '../../../../data-access/api/ordenes-pago.api';
import { UserFeedbackService } from '../../../../core/notifications/user-feedback.service';
import { of, throwError } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';

describe('OrdenPagoFormModalComponent', () => {
  let component: OrdenPagoFormModalComponent;
  let fixture: ComponentFixture<OrdenPagoFormModalComponent>;
  let ordenesPagoApiMock: { emitirOrdenDePago: ReturnType<typeof vi.fn> };
  let feedbackServiceMock: { push: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    ordenesPagoApiMock = {
      emitirOrdenDePago: vi.fn()
    };
    feedbackServiceMock = {
      push: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [OrdenPagoFormModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: OrdenesPagoApiService, useValue: ordenesPagoApiMock },
        { provide: UserFeedbackService, useValue: feedbackServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrdenPagoFormModalComponent);
    component = fixture.componentInstance;
    component.comprobanteId = 10;
    fixture.detectChanges();
  });

  it('debería emitir orden de pago exitosamente en modo emisión', () => {
    component.comprobanteId = 10;
    component.ngOnInit();

    ordenesPagoApiMock.emitirOrdenDePago.mockReturnValue(of({
      id: 1,
      numeroOp: 'OP-2026-001',
      comprobanteId: 10,
      montoBruto: 1000,
      montoNeto: 900,
      estado: 'PENDIENTE_APROBACION'
    }));

    component.opForm.patchValue({
      numeroOp: 'OP-2026-001',
      montoRetenciones: 100
    });

    const emitSpy = vi.spyOn(component.emitted, 'emit');
    component.onSubmitOp();

    expect(ordenesPagoApiMock.emitirOrdenDePago).toHaveBeenCalledWith({
      comprobanteId: 10,
      numeroOp: 'OP-2026-001',
      montoRetenciones: 100
    });
    expect(feedbackServiceMock.push).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
    expect(emitSpy).toHaveBeenCalled();
  });

  it('debería emitir el evento executed con medioPago y referenciaTransf en modo ejecución', () => {
    component.opId = 5;
    component.numeroOp = 'OP-005';
    component.montoNeto = 4500;
    component.ngOnInit();

    const executedSpy = vi.spyOn(component.executed, 'emit');

    component.opForm.patchValue({
      medioPago: 'CHEQUE',
      referenciaTransf: 'CHQ-12345'
    });

    component.onSubmit();

    expect(executedSpy).toHaveBeenCalledWith({
      medioPago: 'CHEQUE',
      referenciaTransf: 'CHQ-12345'
    });
  });

  it('debería mostrar error si falla la emisión en modo emisión', () => {
    component.comprobanteId = 10;
    component.ngOnInit();

    ordenesPagoApiMock.emitirOrdenDePago.mockReturnValue(throwError(() => ({
      error: { detail: 'El comprobante ya posee una OP emitida.' }
    })));

    component.opForm.patchValue({
      numeroOp: 'OP-2026-001',
      montoRetenciones: 0
    });

    component.onSubmitOp();

    expect(feedbackServiceMock.push).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      message: 'El comprobante ya posee una OP emitida.'
    }));
  });
});
