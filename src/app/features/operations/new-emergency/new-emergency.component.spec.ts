import { TestBed, ComponentFixture } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { NewEmergencyComponent } from './new-emergency.component';
import { EmergencyApiService } from '../../../data-access/api/emergency.api';
import { FleetApiService } from '../../../data-access/api/fleet.api';
import { EmergencyStore } from '../../../core/stores/emergency.store';
import { UserFeedbackService } from '../../../core/notifications/user-feedback.service';
import { TicketAsistenciaDTO } from '../../../data-access/dto/ticket.dto';
import { UnidadMovilDTO } from '../../../data-access/dto/ambulancia.dto';

/**
 * Flujo V2 — despacho múltiple simultáneo (VIR + UTIM).
 *
 * <p>Foco: la selección múltiple de unidades, la validación de al menos una
 * seleccionada, la advertencia de médico obligatorio para ROJO/AMARILLO, el
 * submit con la lista completa de ids y el manejo de error HTTP.</p>
 */
describe('NewEmergencyComponent', () => {
  let component: NewEmergencyComponent;
  let fixture: ComponentFixture<NewEmergencyComponent>;
  let apiMock: { despacharMultiple: ReturnType<typeof vi.fn> };
  let fleetMock: { ambulanciasDisponibles: ReturnType<typeof vi.fn> };
  let storeMock: { addOrUpdate: ReturnType<typeof vi.fn> };
  let feedbackMock: { fromHttpError: ReturnType<typeof vi.fn>; push: ReturnType<typeof vi.fn> };

  const emergency = (overrides: Partial<TicketAsistenciaDTO> = {}): TicketAsistenciaDTO => ({
    id: 99,
    codigo: 'E-000099',
    estado: 'RECIBIDO',
    nivelUrgencia: 'ROJO',
    ...overrides,
  });

  const unit = (id: number, overrides: Partial<UnidadMovilDTO> = {}): UnidadMovilDTO => ({
    id,
    identificador: `AMB-${id}`,
    tipo: 'UTIM',
    estado: 'DISPONIBLE',
    tripulacionActual: [{ profesionalId: 1, rol: 'MEDICO', profesionalNombre: 'Dr. Prueba' }],
    ...overrides,
  });

  beforeEach(async () => {
    apiMock = {
      despacharMultiple: vi.fn().mockReturnValue(of(emergency({ estado: 'DESPACHADO' }))),
    };
    fleetMock = { ambulanciasDisponibles: vi.fn().mockReturnValue(of([unit(1), unit(2)])) };
    storeMock = { addOrUpdate: vi.fn() };
    feedbackMock = { fromHttpError: vi.fn(), push: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [NewEmergencyComponent],
      providers: [
        provideRouter([]),
        { provide: EmergencyApiService, useValue: apiMock },
        { provide: FleetApiService, useValue: fleetMock },
        { provide: EmergencyStore, useValue: storeMock },
        { provide: UserFeedbackService, useValue: feedbackMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NewEmergencyComponent);
    fixture.componentRef.setInput('emergency', emergency());
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('carga y renderiza la lista de unidades disponibles con checkboxes', () => {
    expect(component.availableUnits()).toHaveLength(2);
    const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
  });

  it('exige al menos una unidad seleccionada para habilitar el despacho', () => {
    expect(component.hasSelection()).toBe(false);
    expect(component.canSubmit()).toBe(false);

    component.toggleUnit(1);

    expect(component.hasSelection()).toBe(true);
    expect(component.canSubmit()).toBe(true);
  });

  it('permite deseleccionar y vuelve a bloquear el despacho', () => {
    component.toggleUnit(1);
    component.toggleUnit(1);

    expect(component.hasSelection()).toBe(false);
    expect(component.canSubmit()).toBe(false);
  });

  it('advierte médico obligatorio ausente para ROJO/AMARILLO y no para VERDE', () => {
    fixture.componentRef.setInput('emergency', emergency({ nivelUrgencia: 'ROJO' }));
    fixture.detectChanges();
    expect(component.requiresMedicoWarning()).toBe(true);

    fixture.componentRef.setInput('emergency', emergency({ nivelUrgencia: 'AMARILLO' }));
    fixture.detectChanges();
    expect(component.requiresMedicoWarning()).toBe(true);

    fixture.componentRef.setInput('emergency', emergency({ nivelUrgencia: 'VERDE' }));
    fixture.detectChanges();
    expect(component.requiresMedicoWarning()).toBe(false);
  });

  it('no advierte médico ausente si alguna unidad seleccionada tiene médico', () => {
    // AMB-1 tiene médico; seleccionarla elimina la advertencia
    component.toggleUnit(1);
    expect(component.requiresMedicoWarning()).toBe(false);
  });

  it('submit llama al API con la lista de ids seleccionados y actualiza el store', () => {
    component.toggleUnit(1);
    component.toggleUnit(2);

    component.submit();

    expect(apiMock.despacharMultiple).toHaveBeenCalledWith(99, { ambulanciaIds: [1, 2] });
    expect(storeMock.addOrUpdate).toHaveBeenCalledTimes(1);
  });

  it('no envía nada si no hay unidades seleccionadas', () => {
    component.submit();

    expect(apiMock.despacharMultiple).not.toHaveBeenCalled();
  });

  it('no muestra toast propio en errores HTTP (lo hace el feedbackInterceptor global)', () => {
    apiMock.despacharMultiple.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { message: 'error.ambulanciaNoDisponible' },
          }),
      ),
    );
    component.toggleUnit(1);

    component.submit();

    expect(feedbackMock.fromHttpError).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBeNull();
    expect(component.submitting()).toBe(false);
  });

  it('muestra error inline solo para errores no HTTP', () => {
    apiMock.despacharMultiple.mockReturnValue(throwError(() => new Error('boom')));
    component.toggleUnit(1);

    component.submit();

    expect(feedbackMock.push).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('Error inesperado al despachar las unidades.');
    expect(component.submitting()).toBe(false);
  });
});
