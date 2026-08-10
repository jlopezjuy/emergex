import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CbuMakerCheckerModalComponent } from './cbu-maker-checker-modal.component';
import { TercerosApiService } from '../../../../data-access/api/terceros.api';
import { UserFeedbackService } from '../../../../core/notifications/user-feedback.service';
import { of, throwError } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';

describe('CbuMakerCheckerModalComponent', () => {
  let component: CbuMakerCheckerModalComponent;
  let fixture: ComponentFixture<CbuMakerCheckerModalComponent>;
  let tercerosApiMock: any;
  let feedbackServiceMock: any;

  beforeEach(async () => {
    tercerosApiMock = {
      solicitarAltaCbu: vi.fn(),
      aprobarCbu: vi.fn()
    };
    feedbackServiceMock = {
      push: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CbuMakerCheckerModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TercerosApiService, useValue: tercerosApiMock },
        { provide: UserFeedbackService, useValue: feedbackServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CbuMakerCheckerModalComponent);
    component = fixture.componentInstance;
    component.terceroEmpresaId = 1;
    fixture.detectChanges();
  });

  it('debería solicitar alta de CBU y emitir evento de actualización', () => {
    tercerosApiMock.solicitarAltaCbu.mockReturnValue(of({
      id: 10,
      bancoNombre: 'Galicia',
      cbu: '0070000000000000000012',
      titularNombre: 'Empresa SA',
      estado: 'PENDIENTE_VERIFICACION'
    }));

    component.cbuForm.setValue({
      bancoNombre: 'Galicia',
      cbu: '0070000000000000000012',
      titularNombre: 'Empresa SA',
      alias: 'ALIASTEST'
    });

    const updatedSpy = vi.spyOn(component.updated, 'emit');
    component.onSubmitSolicitud();

    expect(tercerosApiMock.solicitarAltaCbu).toHaveBeenCalledWith({
      terceroEmpresaId: 1,
      bancoNombre: 'Galicia',
      cbu: '0070000000000000000012',
      titularNombre: 'Empresa SA',
      alias: 'ALIASTEST'
    });
    expect(feedbackServiceMock.push).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
    expect(updatedSpy).toHaveBeenCalled();
  });

  it('debería mostrar error si el backend rechaza la aprobación', () => {
    tercerosApiMock.aprobarCbu.mockReturnValue(throwError(() => ({
      error: { detail: 'Un usuario no puede aprobar su propia solicitud de CBU.' }
    })));

    component.onAprobarCbu(10);

    expect(tercerosApiMock.aprobarCbu).toHaveBeenCalledWith(10);
    expect(feedbackServiceMock.push).toHaveBeenCalledWith(expect.objectContaining({
      type: 'error',
      message: 'Un usuario no puede aprobar su propia solicitud de CBU.'
    }));
  });
});
