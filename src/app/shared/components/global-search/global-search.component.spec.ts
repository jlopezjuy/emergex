import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GlobalSearchComponent } from './global-search.component';
import { BusquedaGlobalApi } from '../../../data-access/api/busqueda-global.api';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { BusquedaGlobalResultadoDTO } from '../../../data-access/dto/busqueda-global.dto';

describe('GlobalSearchComponent', () => {
  let component: GlobalSearchComponent;
  let fixture: ComponentFixture<GlobalSearchComponent>;
  let apiMock: { buscar: ReturnType<typeof vi.fn> };
  let routerMock: { navigateByUrl: ReturnType<typeof vi.fn> };

  const mockResultado: BusquedaGlobalResultadoDTO = {
    query: 'Pérez',
    totalCoincidencias: 2,
    resultados: [
      {
        tipo: 'AFILIADO',
        id: 123,
        codigo: 'AF-123',
        titulo: 'Pérez Juan',
        subtitulo: 'DNI 12345678',
        urlRef: '/afiliados/123'
      },
      {
        tipo: 'TERCERO',
        id: 456,
        codigo: 'PROV-456',
        titulo: 'Pérez Insumos SRL',
        subtitulo: 'CUIT 30-12345678-9',
        urlRef: '/terceros/456'
      }
    ]
  };

  beforeEach(async () => {
    apiMock = {
      buscar: vi.fn().mockReturnValue(of(mockResultado))
    };
    routerMock = {
      navigateByUrl: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [GlobalSearchComponent],
      providers: [
        { provide: BusquedaGlobalApi, useValue: apiMock },
        { provide: Router, useValue: routerMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GlobalSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería instanciarse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debería mapear correctamente tipo AFILIADO a la ruta real /patients/:id', () => {
    const route = component.obtenerRutaReal({
      tipo: 'AFILIADO',
      id: 123,
      titulo: 'Pérez Juan'
    });
    expect(route).toBe('/patients/123');
  });

  it('debería retornar null para tipos sin ficha implementada todavía (ej. TERCERO)', () => {
    const route = component.obtenerRutaReal({
      tipo: 'TERCERO',
      id: 456,
      titulo: 'Pérez Insumos'
    });
    expect(route).toBeNull();
  });

  it('debería buscar con debounceTime de 300ms', async () => {
    component.onQueryInput('Pérez');
    expect(apiMock.buscar).not.toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 350));
    expect(apiMock.buscar).toHaveBeenCalledWith('Pérez', 10);
    expect(component.resultados()).toEqual(mockResultado.resultados);
    expect(component.cargando()).toBe(false);
  });

  it('debería navegar cuando se selecciona un resultado navegable y cerrar el modal', () => {
    let closedTriggered = false;
    component.closed.subscribe(() => (closedTriggered = true));

    component.seleccionarResultado({
      tipo: 'AFILIADO',
      id: 123,
      titulo: 'Pérez Juan'
    });

    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/patients/123');
    expect(closedTriggered).toBe(true);
  });

  it('no debería navegar cuando se selecciona un resultado sin ruta implementada', () => {
    let closedTriggered = false;
    component.closed.subscribe(() => (closedTriggered = true));

    component.seleccionarResultado({
      tipo: 'TERCERO',
      id: 456,
      titulo: 'Pérez Insumos'
    });

    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
    expect(closedTriggered).toBe(false);
  });

  it('debería manejar errores de la API estableciendo el estado de error', async () => {
    apiMock.buscar.mockReturnValue(throwError(() => new Error('HTTP 500')));
    component.onQueryInput('ErrorQuery');
    await new Promise((r) => setTimeout(r, 350));

    expect(component.error()).toBe(true);
    expect(component.cargando()).toBe(false);
  });
});
