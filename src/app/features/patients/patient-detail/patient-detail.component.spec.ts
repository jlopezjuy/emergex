import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { PatientDetailComponent } from './patient-detail.component';
import { PatientApiService } from '../../../data-access/api/patient.api';

describe('PatientDetailComponent', () => {
  const patientApiMock = {
    getById: vi.fn().mockName('getById').mockReturnValue(of({
      id: 1,
      nombre: 'Juan',
      apellido: 'Pérez',
      dni: '12345678',
      telefono: '3880000000',
      numeroAfiliado: 'AF-1',
    })),
    getFicha: vi.fn().mockName('getFicha').mockReturnValue(of({
      estadoGrupo: 'ACTIVO',
      numeroCuentaGrupo: 'CC-1',
      saldoFavor: 1000,
      alertas: [],
    })),
    getFacturasAfiliado: vi.fn().mockName('getFacturasAfiliado').mockReturnValue(of([
      { id: 1, estado: 'EMITIDA', importeTotal: 1000, saldoPendiente: 500 },
      { id: 2, estado: 'VENCIDA', importeTotal: 300, saldoPendiente: 300 },
    ])),
    getConsumoMensual: vi.fn().mockName('getConsumoMensual').mockReturnValue(of({
      atencionesConsumidas: 1,
      atencionesMaximas: 2,
      controlesMedicosConsumidos: 0,
      controlesMedicosMaximos: 1,
      ordenesDisponibles: ['ORD-1'],
    })),
    getCoberturaVigente: vi.fn().mockName('getCoberturaVigente').mockReturnValue(of([
      { cubierto: true, estadoCobertura: 'ACTIVA', origen: 'AFILIADO', planNombre: 'Plan Comercial Base' },
    ])),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientDetailComponent],
      providers: [
        provideRouter([]),
        { provide: PatientApiService, useValue: patientApiMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } },
        },
      ],
    }).compileComponents();
  });

  it('debería crear y cargar la ficha 360 del afiliado', () => {
    const fixture = TestBed.createComponent(PatientDetailComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.loading()).toBe(false);
    expect(component.paciente()?.dni).toBe('12345678');
    expect(component.deudaCount()).toBe(2);
    expect(component.saldoPendiente()).toBe(800);
    expect(patientApiMock.getCoberturaVigente).toHaveBeenCalledWith('12345678');
  });
});
