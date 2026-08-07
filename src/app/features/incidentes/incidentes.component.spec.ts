import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { IncidentesComponent } from './incidentes.component';
import { IncidentesApiService } from '../../data-access/api/incidentes.api';

describe('IncidentesComponent', () => {
  let apiMock: any;

  const incidenteAbierto = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    numeroIncidente: 'IN-000001',
    descripcion: 'Choque colectivo en ruta 9',
    direccion: 'Ruta 9 km 1234',
    fechaHora: '2026-08-07T10:00:00Z',
    estado: 'ABIERTO',
    ticketsCount: 2,
    ...overrides,
  });

  beforeEach(async () => {
    apiMock = {
      getIncidentes: vi.fn().mockReturnValue(of([])),
      getIncidente: vi.fn().mockReturnValue(of(incidenteAbierto())),
      crearIncidente: vi.fn().mockReturnValue(of(incidenteAbierto())),
      cerrarIncidente: vi.fn().mockReturnValue(of(incidenteAbierto({ estado: 'CERRADO' }))),
      vincularTicket: vi.fn().mockReturnValue(of(incidenteAbierto())),
      desvincularTicket: vi.fn().mockReturnValue(of(undefined)),
      getTicketsIncidente: vi.fn().mockReturnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [IncidentesComponent],
      providers: [{ provide: IncidentesApiService, useValue: apiMock }],
    }).compileComponents();
  });

  it('debería listar los incidentes al iniciar y exponer KPIs', () => {
    apiMock.getIncidentes.mockReturnValue(of([
      incidenteAbierto(),
      incidenteAbierto({ id: 2, numeroIncidente: 'IN-000002', estado: 'CERRADO', descripcion: 'Vuelco en curva' }),
    ]));

    const fixture = TestBed.createComponent(IncidentesComponent);
    fixture.detectChanges();

    expect(component(fixture).incidentes().length).toBe(2);
    expect(component(fixture).abiertos()).toBe(1);
    expect(component(fixture).cerrados()).toBe(1);
    expect(component(fixture).error()).toBeNull();
  });

  it('debería soportar error y reintento al cargar la lista', () => {
    apiMock.getIncidentes.mockReturnValue(throwError(() => new Error('Error de red')));

    const fixture = TestBed.createComponent(IncidentesComponent);
    fixture.detectChanges();
    expect(component(fixture).error()).toBeTruthy();

    apiMock.getIncidentes.mockReturnValue(of([incidenteAbierto()]));
    component(fixture).loadIncidentes();

    expect(component(fixture).incidentes().length).toBe(1);
    expect(component(fixture).error()).toBeNull();
  });

  it('debería crear un incidente y refrescar la lista', () => {
    const fixture = TestBed.createComponent(IncidentesComponent);
    fixture.detectChanges();
    const comp = component(fixture);

    comp.openCreate();
    comp.form.set({
      descripcion: 'Nuevo choque',
      direccion: 'Av. 19 de Abril',
      fechaHoraLocal: '2026-08-07T12:00',
      latitud: -24.185,
      longitud: -65.299,
    });
    expect(comp.canCreate()).toBe(true);

    comp.submitCreate();

    expect(apiMock.crearIncidente).toHaveBeenCalledWith(
      expect.objectContaining({ descripcion: 'Nuevo choque', direccion: 'Av. 19 de Abril' })
    );
    expect(comp.createOpen()).toBe(false);
    expect(apiMock.getIncidentes).toHaveBeenCalled();
  });

  it('debería abrir el detalle y cargar los tickets vinculados', () => {
    apiMock.getTicketsIncidente.mockReturnValue(of([
      { id: 99, codigo: 'E-000001', estado: 'RECIBIDO', nivelUrgencia: 'ROJO', pacienteDescripcion: 'Pérez, Juan' },
    ]));

    const fixture = TestBed.createComponent(IncidentesComponent);
    fixture.detectChanges();
    const comp = component(fixture);

    comp.openDetail(incidenteAbierto() as any);

    expect(comp.selected()).not.toBeNull();
    expect(comp.tickets().length).toBe(1);
    expect(comp.tickets()[0].codigo).toBe('E-000001');
  });

  it('debería cerrar el incidente y limpiar el detalle', () => {
    const fixture = TestBed.createComponent(IncidentesComponent);
    fixture.detectChanges();
    const comp = component(fixture);

    comp.selected.set(incidenteAbierto() as any);
    comp.cerrar(1);

    expect(apiMock.cerrarIncidente).toHaveBeenCalledWith(1);
    expect(comp.selected()).toBeNull();
    expect(apiMock.getIncidentes).toHaveBeenCalled();
  });

  it('debería vincular y desvincular tickets', () => {
    const fixture = TestBed.createComponent(IncidentesComponent);
    fixture.detectChanges();
    const comp = component(fixture);

    comp.selected.set(incidenteAbierto() as any);
    comp.vincularInput.set('77');
    comp.vincularTicket(1);
    expect(apiMock.vincularTicket).toHaveBeenCalledWith(1, 77);

    comp.desvincularTicket(1, 77);
    expect(apiMock.desvincularTicket).toHaveBeenCalledWith(1, 77);
  });

  function component(fixture: any): IncidentesComponent {
    return fixture.componentInstance;
  }
});
