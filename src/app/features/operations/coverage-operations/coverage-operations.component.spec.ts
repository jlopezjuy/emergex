import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { CoverageOperationsComponent } from './coverage-operations.component';
import { EmergencyApiService } from '../../../data-access/api/emergency.api';
import { EventsApiService } from '../../../data-access/api/events.api';
import { IncidentesApiService } from '../../../data-access/api/incidentes.api';
import { InstitutionsApiService } from '../../../data-access/api/institutions.api';
import { EmergencyDetailComponent } from '../emergency-detail/emergency-detail.component';
import { AddAssistedPersonModalComponent } from './add-assisted-person-modal.component';

import { TicketAsistenciaDTO } from '../../../data-access/dto/ticket.dto';

describe('CoverageOperationsComponent — tipo incidente', () => {
  let incidentesApiMock: Record<string, ReturnType<typeof vi.fn>>;
  let emergencyApiMock: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    incidentesApiMock = {
      getIncidente: vi.fn().mockReturnValue(of({ id: 42, numeroIncidente: 'IN-000001', descripcion: 'Choque colectivo', estado: 'ABIERTO' })),
      getTicketsIncidente: vi.fn().mockReturnValue(of([
        { id: 99, codigo: 'E-000001', estado: 'RECIBIDO', nivelUrgencia: 'ROJO', pacienteDescripcion: 'Pérez, Juan' },
      ])),
      cerrarIncidente: vi.fn().mockReturnValue(of({ id: 42, estado: 'CERRADO' })),
    };
    emergencyApiMock = {
      getAsistenciasPorContexto: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [CoverageOperationsComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ tipo: 'incidente', id: '42' }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: EmergencyApiService, useValue: emergencyApiMock },
        { provide: EventsApiService, useValue: {} },
        { provide: IncidentesApiService, useValue: incidentesApiMock },
        { provide: InstitutionsApiService, useValue: {} },
      ],
    })
      .overrideComponent(EmergencyDetailComponent, { set: { template: '<div></div>', imports: [] } })
      .overrideComponent(AddAssistedPersonModalComponent, { set: { template: '<div></div>', imports: [] } })
      .compileComponents();
  });

  it('debería cargar el operativo del incidente (header + roster de tickets)', () => {
    const fixture = TestBed.createComponent(CoverageOperationsComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    expect(comp.tipo()).toBe('incidente');
    expect(comp.contextoId()).toBe(42);
    expect(incidentesApiMock['getIncidente']).toHaveBeenCalledWith(42);
    expect(incidentesApiMock['getTicketsIncidente']).toHaveBeenCalledWith(42);
    expect(comp.headerNombre()).toBe('IN-000001');
    expect(comp.roster().length).toBe(1);
    expect(comp.roster()[0].id).toBe(99);
    expect(comp.loading()).toBe(false);
  });

  it('debería cerrar el incidente en finalizarOperativo', () => {
    const fixture = TestBed.createComponent(CoverageOperationsComponent);
    fixture.detectChanges();
    const comp = fixture.componentInstance;

    // Un ticket activo NO cierra el operativo; forzamos allClosed seteando el roster.
    comp.roster.set([
      { id: 99, codigo: 'E-000001', estado: 'COMPLETADO' } as unknown as TicketAsistenciaDTO,
    ]);
    expect(comp.allClosed()).toBe(true);

    comp.finalizarOperativo();
    expect(incidentesApiMock['cerrarIncidente']).toHaveBeenCalledWith(42);
  });
});
