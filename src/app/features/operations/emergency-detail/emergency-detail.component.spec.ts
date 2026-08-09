import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EmergencyDetailComponent } from './emergency-detail.component';
import { EmergencyApiService } from '../../../data-access/api/emergency.api';
import { SessionStore } from '../../../core/stores/session.store';
import { ActivatedRoute, Router } from '@angular/router';

describe('EmergencyDetailComponent', () => {
  let emergencyApiMock: any;
  let sessionStoreMock: any;
  let activatedRouteMock: any;
  let routerMock: any;

  beforeEach(async () => {
    emergencyApiMock = {
      getById: vi.fn().mockReturnValue(of({ id: 1 })),
      getDetalle: vi.fn().mockReturnValue(of({ id: 1 })),
      getEpisodios: vi.fn().mockReturnValue(of([])),
      getTimeline: vi.fn().mockReturnValue(of([])),
      getTrackingInfo: vi.fn().mockReturnValue(of(null)),
      getAtencionByTicket: vi.fn().mockReturnValue(of(null)),
      agregarNota: vi.fn().mockReturnValue(of({})),
      getHospitales: vi.fn().mockReturnValue(of([])),
      getDiagnosticosFrecuentes: vi.fn().mockReturnValue(of([])),
      getCoberturaSnapshot: vi.fn().mockReturnValue(of(null)),
      getAtencionesPorTicket: vi.fn().mockReturnValue(of([])),
      getLatestGeo: vi.fn().mockReturnValue(of(null)),
      getTracking: vi.fn().mockReturnValue(of(null)),
    };
    sessionStoreMock = {
      isDespachante: vi.fn().mockReturnValue(true),
      isOperador: vi.fn().mockReturnValue(true),
      isAdministrador: vi.fn().mockReturnValue(true),
      isPropietario: vi.fn().mockReturnValue(true),
      isAdmin: vi.fn().mockReturnValue(true),
      isMedicoCampo: vi.fn().mockReturnValue(false),
      isProfesional: vi.fn().mockReturnValue(false),
    };
    activatedRouteMock = {
      paramMap: of({ get: () => '1' }),
      snapshot: {
        paramMap: {
          get: () => '1'
        },
        queryParamMap: {
          get: () => null
        }
      }
    };
    routerMock = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [EmergencyDetailComponent],
      providers: [
        { provide: EmergencyApiService, useValue: emergencyApiMock },
        { provide: SessionStore, useValue: sessionStoreMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: Router, useValue: routerMock },
      ],
    }).compileComponents();
  });

  it('debería habilitar o deshabilitar canCreateOperationalNotes según los roles del usuario', () => {
    // 1. Roles permitidos (como Despachante/Operador/Admin)
    const fixture = TestBed.createComponent(EmergencyDetailComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.canCreateOperationalNotes()).toBe(true);

    // 2. Roles no permitidos (solo Médico de campo o Profesional sin despacho)
    sessionStoreMock.isDespachante.mockReturnValue(false);
    sessionStoreMock.isOperador.mockReturnValue(false);
    sessionStoreMock.isAdministrador.mockReturnValue(false);
    sessionStoreMock.isPropietario.mockReturnValue(false);
    sessionStoreMock.isAdmin.mockReturnValue(false);
    sessionStoreMock.isMedicoCampo.mockReturnValue(true);
    sessionStoreMock.isProfesional.mockReturnValue(true);

    // Re-evaluamos o recreamos para comprobar el computed
    const fixture2 = TestBed.createComponent(EmergencyDetailComponent);
    const component2 = fixture2.componentInstance;
    fixture2.detectChanges();

    expect(component2.canCreateOperationalNotes()).toBe(false);
  });
});
