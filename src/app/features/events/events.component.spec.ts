import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EventsComponent } from './events.component';
import { EventsApiService } from '../../data-access/api/events.api';
import { FleetApiService } from '../../data-access/api/fleet.api';
import { EmergencyApiService } from '../../data-access/api/emergency.api';
import { InstitutionsApiService } from '../../data-access/api/institutions.api';

describe('EventsComponent', () => {
  let eventsApiMock: Record<string, ReturnType<typeof vi.fn>>;
  let fleetApiMock: Record<string, ReturnType<typeof vi.fn>>;
  let emergencyApiMock: Record<string, ReturnType<typeof vi.fn>>;
  let institutionsApiMock: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    eventsApiMock = {
      getAll: vi.fn().mockReturnValue(of([])),
      getIncidentsByEvent: vi.fn().mockReturnValue(of([])),
    };
    fleetApiMock = {
      ambulancias: vi.fn().mockReturnValue(of([])),
    };
    emergencyApiMock = {
      crear: vi.fn().mockReturnValue(of({ id: 1 })),
    };
    institutionsApiMock = {
      getAll: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [EventsComponent],
      providers: [
        { provide: EventsApiService, useValue: eventsApiMock },
        { provide: FleetApiService, useValue: fleetApiMock },
        { provide: EmergencyApiService, useValue: emergencyApiMock },
        { provide: InstitutionsApiService, useValue: institutionsApiMock },
      ],
    }).compileComponents();
  });

  it('debería soportar estados de loading, error y retry al obtener eventos', async () => {
    // Configuramos el mock para fallar
    eventsApiMock['getAll'].mockReturnValue(throwError(() => new Error('Error de red')));

    const fixture = TestBed.createComponent(EventsComponent);
    const component = fixture.componentInstance;
    
    // Antes de detectChanges, no se ha corrido ngOnInit/loadEvents
    expect(component.loadingEvents()).toBe(false);
    expect(component.errorEvents()).toBe(false);

    // Corremos ngOnInit
    fixture.detectChanges();

    // Debería haber fallado y setear error en true
    expect(component.loadingEvents()).toBe(false);
    expect(component.errorEvents()).toBe(true);

    // Ahora mockeamos éxito
    eventsApiMock['getAll'].mockReturnValue(of([
      { id: '100', name: 'Maratón de Jujuy', type: 'Deportivo', status: 'scheduled', units: [] }
    ]));

    // Reintentamos
    component.retryLoadEvents();
    expect(component.loadingEvents()).toBe(false); // Sincrónico en test con mocks simples
    expect(component.errorEvents()).toBe(false);
    expect(component.events().length).toBe(1);
    expect(component.events()[0].name).toBe('Maratón de Jujuy');
  });
});
