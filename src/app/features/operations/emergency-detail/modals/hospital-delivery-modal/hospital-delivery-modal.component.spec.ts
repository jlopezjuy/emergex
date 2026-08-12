import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HospitalDeliveryModalComponent } from './hospital-delivery-modal.component';
import { EmergencyApiService } from '../../../../../data-access/api/emergency.api';

describe('HospitalDeliveryModalComponent', () => {
  const emergencyApiMock = {
    completarEntregaHospitalaria: vi.fn(),
    finalizarTraslado: vi.fn(),
    registrarEntregaHospitalaria: vi.fn(),
  };

  beforeEach(async () => {
    emergencyApiMock.completarEntregaHospitalaria.mockReset();
    emergencyApiMock.finalizarTraslado.mockReset();
    emergencyApiMock.registrarEntregaHospitalaria.mockReset();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('123e4567-e89b-12d3-a456-426614174000');

    await TestBed.configureTestingModule({
      imports: [HospitalDeliveryModalComponent],
      providers: [{ provide: EmergencyApiService, useValue: emergencyApiMock }],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(HospitalDeliveryModalComponent);
    fixture.componentRef.setInput('ticketId', 66816);
    fixture.componentRef.setInput('hospitales', [{ id: 12, nombre: 'Hospital Central' }]);
    fixture.detectChanges();
    return fixture;
  }

  function completeRequiredFields(component: HospitalDeliveryModalComponent): void {
    component.entregaReceptorNombre.set('Dra. Ana Pérez');
    component.entregaHospitalId.set(12);
    component.closeImpresion.set('Paciente estabilizado al arribo.');
  }

  it('completa entrega y cierre con una única mutación atómica', () => {
    emergencyApiMock.completarEntregaHospitalaria.mockReturnValue(of({ id: 66816, estadoActual: 'COMPLETADO' }));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const confirmed = vi.fn();
    component.confirmed.subscribe(confirmed);
    completeRequiredFields(component);

    component.confirmarEntregaHospitalaria();

    expect(emergencyApiMock.completarEntregaHospitalaria).toHaveBeenCalledWith(
      66816,
      expect.objectContaining({
        entrega: expect.objectContaining({ hospitalId: 12, receptorNombre: 'Dra. Ana Pérez' }),
        cierre: {
          resolucion: {
            impresionClinica: 'Paciente estabilizado al arribo.',
            requiereTraslado: true,
            tipoResolucion: 'DERIVADO_HOSPITAL',
          },
        },
      }),
      '123e4567-e89b-12d3-a456-426614174000',
    );
    expect(emergencyApiMock.registrarEntregaHospitalaria).not.toHaveBeenCalled();
    expect(emergencyApiMock.finalizarTraslado).not.toHaveBeenCalled();
    expect(confirmed).toHaveBeenCalledOnce();
  });

  it('bloquea el envío sin hospital receptor o sin catálogo de hospitales', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;
    completeRequiredFields(component);
    component.entregaHospitalId.set(null);

    component.confirmarEntregaHospitalaria();

    expect(emergencyApiMock.completarEntregaHospitalaria).not.toHaveBeenCalled();
    expect(component.entregaError()).toContain('hospital receptor');

    fixture.componentRef.setInput('hospitales', []);
    component.confirmarEntregaHospitalaria();
    expect(component.entregaError()).toContain('No hay hospitales');
  });

  it('mantiene el formulario y pide recargar ante un conflicto 409', () => {
    emergencyApiMock.completarEntregaHospitalaria.mockReturnValue(throwError(() => ({ status: 409 })));
    const fixture = createComponent();
    const component = fixture.componentInstance;
    const confirmed = vi.fn();
    component.confirmed.subscribe(confirmed);
    completeRequiredFields(component);

    component.confirmarEntregaHospitalaria();

    expect(component.entregaError()).toMatch(/recargá/i);
    expect(component.entregaReceptorNombre()).toBe('Dra. Ana Pérez');
    expect(component.entregaHospitalId()).toBe(12);
    expect(confirmed).not.toHaveBeenCalled();
  });

  it('muestra el detalle RFC 7807 y conserva el formulario ante un error de negocio', () => {
    emergencyApiMock.completarEntregaHospitalaria.mockReturnValue(
      throwError(() => ({ status: 400, error: { detail: 'La entrega requiere un hospital activo.' } })),
    );
    const fixture = createComponent();
    const component = fixture.componentInstance;
    completeRequiredFields(component);

    component.confirmarEntregaHospitalaria();

    expect(component.entregaError()).toBe('La entrega requiere un hospital activo.');
    expect(component.entregaReceptorNombre()).toBe('Dra. Ana Pérez');
    expect(component.entregaHospitalId()).toBe(12);

    component.confirmarEntregaHospitalaria();
    expect(emergencyApiMock.completarEntregaHospitalaria.mock.calls[0][2]).toBe(
      '123e4567-e89b-12d3-a456-426614174000',
    );
    expect(emergencyApiMock.completarEntregaHospitalaria.mock.calls[1][2]).toBe(
      '123e4567-e89b-12d3-a456-426614174000',
    );
  });
});
