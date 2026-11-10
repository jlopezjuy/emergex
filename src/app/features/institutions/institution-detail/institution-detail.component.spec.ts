import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { InstitutionDetailComponent } from './institution-detail.component';
import { InstitutionsApiService } from '../../../data-access/api/institutions.api';
import { TarifasContratoApiService } from '../../../data-access/api/tarifas-contrato.api';
import { AreaProtegidaApiService } from '../../../data-access/api/area-protegida.api';
import { ConciliacionCierreApiService } from '../../../data-access/api/conciliacion-cierre.api';

const baseInstitucion = {
  id: '1',
  name: 'Colegio San Martín',
  razonSocial: 'Colegio San Martín S.A.',
  cuit: '30-12345678-9',
  status: 'ACTIVA',
  address: 'Av. Libertador 1234',
  members: 150,
};

describe('InstitutionDetailComponent', () => {
  let apiMock: {
    getById: ReturnType<typeof vi.fn>;
    getEstadoCuentaInstitucion: ReturnType<typeof vi.fn>;
    getContratosActivos: ReturnType<typeof vi.fn>;
    getContratosByInstitucion: ReturnType<typeof vi.fn>;
    getMiembros: ReturnType<typeof vi.fn>;
    getFacturasByContrato: ReturnType<typeof vi.fn>;
  };
  let tarifasApiMock: {
    getTarifasByContrato: ReturnType<typeof vi.fn>;
    createTarifa: ReturnType<typeof vi.fn>;
    updateTarifa: ReturnType<typeof vi.fn>;
    deleteTarifa: ReturnType<typeof vi.fn>;
  };
  let areaProtegidaApiMock: {
    getByInstitucion: ReturnType<typeof vi.fn>;
    createAreaProtegida: ReturnType<typeof vi.fn>;
    deleteAreaProtegida: ReturnType<typeof vi.fn>;
  };
  let cierreApiMock: {
    getByInstitucion: ReturnType<typeof vi.fn>;
    crearCierre: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    apiMock = {
      getById: vi.fn().mockReturnValue(of(baseInstitucion)),
      getEstadoCuentaInstitucion: vi.fn().mockReturnValue(
        of({ saldoPendiente: 0, facturasVencidas: 0, totalPagosHistorico: 50000 })
      ),
      getContratosActivos: vi.fn().mockReturnValue(of([{ id: 10, nombre: 'Contrato 10' }])),
      getContratosByInstitucion: vi.fn().mockReturnValue(of([{ id: 10, nombre: 'Contrato 10' }])),
      getMiembros: vi.fn().mockReturnValue(of([])),
      getFacturasByContrato: vi.fn().mockReturnValue(of([])),
    };

    tarifasApiMock = {
      getTarifasByContrato: vi.fn().mockReturnValue(of([
        { id: 1, contratoCobertura: { id: 10 }, prestacion: { id: 2, nombre: 'Consulta' }, importe: 2000, vigenciaDesde: '2026-01-01' }
      ])),
      createTarifa: vi.fn().mockReturnValue(of({ id: 2 })),
      updateTarifa: vi.fn().mockReturnValue(of({ id: 1, importe: 2500 })),
      deleteTarifa: vi.fn().mockReturnValue(of(null)),
    };

    areaProtegidaApiMock = {
      getByInstitucion: vi.fn().mockReturnValue(of([
        { id: 1, nombre: 'Sede Principal', institucionId: 1, estado: 'ACTIVA' }
      ])),
      createAreaProtegida: vi.fn().mockReturnValue(of({ id: 2 })),
      deleteAreaProtegida: vi.fn().mockReturnValue(of(null)),
    };

    cierreApiMock = {
      getByInstitucion: vi.fn().mockReturnValue(of([
        { id: 1, institucion: { id: 1 }, totalFacturado: 10000, totalPagado: 8000, saldo: 2000, cerradoAt: '2026-01-31T00:00:00Z' }
      ])),
      crearCierre: vi.fn().mockReturnValue(of({ id: 2, institucion: { id: 1 } })),
    };
  });

  const setupTestingModule = async (id = '1') => {
    await TestBed.configureTestingModule({
      imports: [InstitutionDetailComponent],
      providers: [
        provideRouter([]),
        { provide: InstitutionsApiService, useValue: apiMock },
        { provide: TarifasContratoApiService, useValue: tarifasApiMock },
        { provide: AreaProtegidaApiService, useValue: areaProtegidaApiMock },
        { provide: ConciliacionCierreApiService, useValue: cierreApiMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id }),
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    }).compileComponents();
  };

  it('debería cargar el detalle de la institución correctamente', async () => {
    await setupTestingModule();
    const fixture = TestBed.createComponent(InstitutionDetailComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.institucion()?.name).toBe('Colegio San Martín');
    expect(component.loading()).toBe(false);
  });

  it('si getContratosByInstitucion falla, contratosError se pone en true y contratos queda vacío', async () => {
    apiMock.getContratosByInstitucion.mockReturnValue(throwError(() => new Error('Network error')));
    await setupTestingModule();
    const fixture = TestBed.createComponent(InstitutionDetailComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.contratosError()).toBe(true);
    expect(component.contratos()).toEqual([]);
  });

  it('si getMiembros falla, miembrosError se pone en true y miembros queda vacío', async () => {
    apiMock.getMiembros.mockReturnValue(throwError(() => new Error('Network error')));
    await setupTestingModule();
    const fixture = TestBed.createComponent(InstitutionDetailComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.miembrosError()).toBe(true);
    expect(component.miembros()).toEqual([]);
  });

  it('si getEstadoCuentaInstitucion falla, estadoCuentaError se pone en true y estadoCuenta queda null', async () => {
    apiMock.getEstadoCuentaInstitucion.mockReturnValue(throwError(() => new Error('Network error')));
    await setupTestingModule();
    const fixture = TestBed.createComponent(InstitutionDetailComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.estadoCuentaError()).toBe(true);
    expect(component.estadoCuenta()).toBeNull();
  });

  it('debería cambiar a la solapa tarifario y cargar tarifas por contrato (G2-02)', async () => {
    await setupTestingModule();
    const fixture = TestBed.createComponent(InstitutionDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.selectTab('tarifario');
    expect(component.activeTab()).toBe('tarifario');
    expect(tarifasApiMock.getTarifasByContrato).toHaveBeenCalled();
  });

  it('debería cambiar a la solapa áreas protegidas y cargar áreas por institución (G2-03)', async () => {
    await setupTestingModule();
    const fixture = TestBed.createComponent(InstitutionDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.selectTab('areas-protegidas');
    expect(component.activeTab()).toBe('areas-protegidas');
    expect(areaProtegidaApiMock.getByInstitucion).toHaveBeenCalledWith(1);
  });

  it('debería cargar cierres de conciliación al activar la solapa cierres-conciliacion (G2-04)', async () => {
    await setupTestingModule();
    const fixture = TestBed.createComponent(InstitutionDetailComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.selectTab('cierres-conciliacion');
    expect(component.activeTab()).toBe('cierres-conciliacion');
    expect(cierreApiMock.getByInstitucion).toHaveBeenCalledWith(1);
  });
});
