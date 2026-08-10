import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { InstitutionDetailComponent } from './institution-detail.component';
import { InstitutionsApiService } from '../../../data-access/api/institutions.api';

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
      getById: vi.fn().mockReturnValue(
        of({
          id: '1',
          name: 'Colegio San Martín',
          razonSocial: 'Colegio San Martín S.A.',
          cuit: '30-12345678-9',
          status: 'ACTIVA',
          address: 'Av. Libertador 1234',
          members: 150
        })
      ),
      getEstadoCuentaInstitucion: vi.fn().mockReturnValue(
        of({
          saldoPendiente: 0,
          facturasVencidas: 0,
          totalPagosHistorico: 50000
        })
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
});
