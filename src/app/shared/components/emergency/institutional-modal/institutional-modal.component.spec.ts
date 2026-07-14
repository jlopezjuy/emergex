import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { InstitutionalModalComponent } from './institutional-modal.component';
import { InstitutionsApiService } from '../../../../data-access/api/institutions.api';
import { MiembrosInstitucionApiService } from '../../../../data-access/api/miembros-institucion.api';
import { EmergencyApiService } from '../../../../data-access/api/emergency.api';
import { PatientApiService } from '../../../../data-access/api/patient.api';
import { FleetApiService } from '../../../../data-access/api/fleet.api';
import { ContractDTO } from '../../../../data-access/dto/institution.dto';

describe('InstitutionalModalComponent', () => {
  let component: InstitutionalModalComponent;
  let fixture: any;

  const institutionsApiMock = {
    getAll: vi.fn().mockReturnValue(of([
      { id: '1', name: 'Institución A', status: 'ACTIVA', address: 'Calle Falsa 123' },
      { id: '2', name: 'Institución B', status: 'ACTIVA', address: 'Calle Falsa 456' },
      { id: '3', name: 'Institución Suspendida', status: 'SUSPENDIDA', address: 'Calle Falsa 789' },
      { id: '4', name: 'Institución Baja', status: 'BAJA', address: 'Calle Falsa 000' }
    ])),
    getContratosByInstitucion: vi.fn().mockReturnValue(of([]))
  };

  const miembrosApiMock = {
    search: vi.fn().mockReturnValue(of([]))
  };

  const emergencyApiMock = {
    crear: vi.fn().mockReturnValue(of({ id: 100 }))
  };

  const patientApiMock = {
    getCoberturaVigente: vi.fn().mockReturnValue(of([]))
  };

  const fleetApiMock = {
    ambulanciasDisponibles: vi.fn().mockReturnValue(of([]))
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [InstitutionalModalComponent],
      providers: [
        { provide: InstitutionsApiService, useValue: institutionsApiMock },
        { provide: MiembrosInstitucionApiService, useValue: miembrosApiMock },
        { provide: EmergencyApiService, useValue: emergencyApiMock },
        { provide: PatientApiService, useValue: patientApiMock },
        { provide: FleetApiService, useValue: fleetApiMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InstitutionalModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería autoseleccionar si hay un único contrato activo', async () => {
    const mockContracts: ContractDTO[] = [
      { id: 10, code: 'CONTRATO-10', plan: 'Plan Premium', from: '2026-01-01', to: '2027-01-01', status: 'active', monthlyPrice: 100, monthlyCap: 10, kpiMinutes: 15 }
    ];
    institutionsApiMock.getContratosByInstitucion.mockReturnValue(of(mockContracts));

    component.selectInstitution({
      id: '1',
      name: 'Institución A',
      status: 'ACTIVA',
      address: 'Calle Falsa 123',
      plan: 'Premium',
      razonSocial: 'Razon Social A',
      cuit: '20-12345678-9',
      type: 'EMPRESA'
    });
    fixture.detectChanges();

    expect(component.availableContracts().length).toBe(1);
    expect(component.form().contratoCoberturaId).toBe(10);
    expect(component.step1Valid()).toBe(true);
  });

  it('debería requerir seleccionar contrato si hay múltiples disponibles', async () => {
    const mockContracts: ContractDTO[] = [
      { id: 10, code: 'CONTRATO-10', plan: 'Plan A', from: '2026-01-01', to: '2027-01-01', status: 'active', monthlyPrice: 100, monthlyCap: 10, kpiMinutes: 15 },
      { id: 20, code: 'CONTRATO-20', plan: 'Plan B', from: '2026-01-01', to: '2027-01-01', status: 'active', monthlyPrice: 200, monthlyCap: 20, kpiMinutes: 15 }
    ];
    institutionsApiMock.getContratosByInstitucion.mockReturnValue(of(mockContracts));

    component.selectInstitution({
      id: '1',
      name: 'Institución A',
      status: 'ACTIVA',
      address: 'Calle Falsa 123',
      plan: 'Plan A',
      razonSocial: 'Razon Social A',
      cuit: '20-12345678-9',
      type: 'EMPRESA'
    });
    fixture.detectChanges();

    expect(component.availableContracts().length).toBe(2);
    expect(component.form().contratoCoberturaId).toBeNull();
    // step1Valid debe ser false porque no hay contrato seleccionado y hay múltiples
    expect(component.step1Valid()).toBe(false);

    component.patchForm({ contratoCoberturaId: 20 });
    fixture.detectChanges();
    expect(component.step1Valid()).toBe(true);
  });

  it('debería mostrar instituciones suspendidas o de baja en los resultados pero no permitir seleccionarlas', async () => {
    component.onInstitutionInput('Institución');
    fixture.detectChanges();

    const results = component.institutionResults();
    const suspendida = results.find(r => r.status === 'SUSPENDIDA');
    const baja = results.find(r => r.status === 'BAJA');

    expect(suspendida).toBeDefined();
    expect(baja).toBeDefined();

    // Intentar seleccionar
    component.selectInstitution(suspendida!);
    fixture.detectChanges();
    expect(component.institution()).toBeNull();

    component.selectInstitution(baja!);
    fixture.detectChanges();
    expect(component.institution()).toBeNull();
  });

  it('debería enviar el profesional del móvil para un paciente a identificar al llegar', () => {
    component.selectInstitution({
      id: '1',
      name: 'Institución A',
      status: 'ACTIVA',
      address: 'Calle Falsa 123',
      type: 'EMPRESA',
      razonSocial: 'Institución A S.A.',
      cuit: '30-12345678-9',
      plan: 'Plan Área Protegida',
    });
    component.patchForm({
      patientType: 'unknown',
      contratoCoberturaId: 10,
      symptoms: 'Persona inconsciente sin identificación disponible',
      prio: 'green',
    });
    component.availableUnits.set([
      {
        id: 1,
        identificador: 'MOVIL-01',
        tripulacionActual: [{ profesionalId: 42, rol: 'MEDICO', profesionalNombre: 'Médico de guardia' }],
      },
    ]);
    component.selectedUnitId.set(1);

    component.submit();

    expect(emergencyApiMock.crear).toHaveBeenCalledWith(expect.objectContaining({
      institucionId: 1,
      contratoCoberturaId: 10,
      ambulanciaId: 1,
      profesionalId: 42,
    }));
  });
});
