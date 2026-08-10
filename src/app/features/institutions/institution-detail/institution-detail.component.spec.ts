import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { InstitutionDetailComponent } from './institution-detail.component';
import { InstitutionsApiService } from '../../../data-access/api/institutions.api';

const baseInstitucion = {
  id: '1',
  name: 'Colegio San Martín',
  razonSocial: 'Colegio San Martín S.A.',
  cuit: '30-12345678-9',
  status: 'ACTIVA',
  address: 'Av. Libertador 1234',
  members: 150
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

  beforeEach(() => {
    apiMock = {
      getById: vi.fn().mockReturnValue(of(baseInstitucion)),
      getEstadoCuentaInstitucion: vi.fn().mockReturnValue(
        of({ saldoPendiente: 0, facturasVencidas: 0, totalPagosHistorico: 50000 })
      ),
      getContratosActivos: vi.fn().mockReturnValue(of([])),
      getContratosByInstitucion: vi.fn().mockReturnValue(of([])),
      getMiembros: vi.fn().mockReturnValue(of([])),
      getFacturasByContrato: vi.fn().mockReturnValue(of([]))
    };
  });

  const setupTestingModule = async (id = '1') => {
    await TestBed.configureTestingModule({
      imports: [InstitutionDetailComponent],
      providers: [
        provideRouter([]),
        { provide: InstitutionsApiService, useValue: apiMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id }),
              queryParamMap: convertToParamMap({})
            }
          }
        }
      ]
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
});
