import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ExcepcionDeudaModalComponent } from './excepcion-deuda-modal.component';
import { InstitutionsApiService } from '../../../../data-access/api/institutions.api';

describe('ExcepcionDeudaModalComponent', () => {
  const autorizantes = [
    { id: 1, login: 'ana.propietaria', nombreCompleto: 'Ana Propietaria' },
    { id: 2, login: 'beto.admin', nombreCompleto: 'Beto Administrador' },
  ];

  const institutionsApiMock = {
    getAutorizantes: vi.fn().mockName('getAutorizantes').mockReturnValue(of(autorizantes)),
    reactivarInstitucion: vi.fn().mockName('reactivarInstitucion').mockReturnValue(of({ id: '5' })),
    suspenderPorDeuda: vi.fn().mockName('suspenderPorDeuda').mockReturnValue(of({ id: '5' })),
  };

  beforeEach(async () => {
    institutionsApiMock.reactivarInstitucion.mockClear();
    institutionsApiMock.suspenderPorDeuda.mockClear();
    await TestBed.configureTestingModule({
      imports: [ExcepcionDeudaModalComponent],
      providers: [{ provide: InstitutionsApiService, useValue: institutionsApiMock }],
    }).compileComponents();
  });

  function createComponent() {
    const fixture = TestBed.createComponent(ExcepcionDeudaModalComponent);
    fixture.componentRef.setInput('institutionId', 5);
    fixture.componentRef.setInput('institutionName', 'Colegio Norte');
    fixture.componentRef.setInput('accion', 'reactivar');
    fixture.detectChanges();
    return fixture;
  }

  it('carga la lista de autorizantes al iniciar', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(institutionsApiMock.getAutorizantes).toHaveBeenCalled();
    expect(component.autorizantes()).toEqual(autorizantes);
    expect(component.loadingAutorizantes()).toBe(false);
  });

  it('bloquea el envío cuando los dos autorizantes son la misma persona', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.motivo.set('Pago confirmado por el cliente');
    component.autorizadoPor.set('ana.propietaria');
    component.autorizadoPorSegundo.set('ana.propietaria');

    expect(component.autorizantesDistintos()).toBe(false);
    expect(component.puedeEnviar()).toBe(false);

    component.confirmar();
    expect(institutionsApiMock.reactivarInstitucion).not.toHaveBeenCalled();
  });

  it('envía los seis parámetros al confirmar con dos autorizantes distintos', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.motivo.set('Pago confirmado por el cliente');
    component.autorizadoPor.set('ana.propietaria');
    component.autorizadoPorSegundo.set('beto.admin');
    component.vigenciaHoras.set(72);

    expect(component.puedeEnviar()).toBe(true);
    component.confirmar();

    expect(institutionsApiMock.reactivarInstitucion).toHaveBeenCalledWith(
      5,
      'Pago confirmado por el cliente',
      true,
      'ana.propietaria',
      'beto.admin',
      72,
    );
  });
});
