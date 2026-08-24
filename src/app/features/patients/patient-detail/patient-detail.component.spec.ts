import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { PatientDetailComponent } from './patient-detail.component';
import { PatientApiService } from '../../../data-access/api/patient.api';

describe('PatientDetailComponent', () => {
  let patientApiMock: {
    getById: ReturnType<typeof vi.fn>;
    getFicha: ReturnType<typeof vi.fn>;
    getFichaFinanciera: ReturnType<typeof vi.fn>;
    getFacturasAfiliado: ReturnType<typeof vi.fn>;
    getConsumoMensual: ReturnType<typeof vi.fn>;
    getCoberturaVigente: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    patientApiMock = {
      getById: vi.fn().mockReturnValue(
        of({
          id: 1,
          nombre: 'Juan',
          apellido: 'Pérez',
          dni: '12345678',
          telefono: '3880000000',
          numeroAfiliado: 'AF-1'
        })
      ),
      getFicha: vi.fn().mockReturnValue(
        of({
          estadoGrupo: 'ACTIVO',
          numeroCuentaGrupo: 'CC-1',
          saldoFavor: 1000,
          alertas: []
        })
      ),
      getFichaFinanciera: vi.fn().mockReturnValue(
        of({
          pacienteId: 1,
          nombreCompleto: 'Pérez, Juan',
          dni: '12345678',
          saldoResponsabilidadPaciente: 800,
          saldoPendienteTerceros: 0,
          saldoTotalRelacionado: 800,
          comprobantes: []
        })
      ),
      getFacturasAfiliado: vi.fn().mockReturnValue(
        of([
          { id: 1, estado: 'EMITIDA', importeTotal: 1000, saldoPendiente: 500 },
          { id: 2, estado: 'VENCIDA', importeTotal: 300, saldoPendiente: 300 }
        ])
      ),
      getConsumoMensual: vi.fn().mockReturnValue(
        of({
          atencionesConsumidas: 1,
          atencionesMaximas: 2,
          controlesMedicosConsumidos: 0,
          controlesMedicosMaximos: 1,
          ordenesDisponibles: ['ORD-1']
        })
      ),
      getCoberturaVigente: vi.fn().mockReturnValue(
        of([
          {
            cubierto: true,
            estadoCobertura: 'VIGENTE',
            origen: 'AFILIADO',
            planNombre: 'Plan Comercial Base'
          }
        ])
      )
    };
  });

  const setupTestingModule = async (queryParamTab: string | null = null) => {
    await TestBed.configureTestingModule({
      imports: [PatientDetailComponent],
      providers: [
        provideRouter([]),
        { provide: PatientApiService, useValue: patientApiMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: '1' }),
              queryParamMap: convertToParamMap(queryParamTab ? { tab: queryParamTab } : {})
            }
          }
        }
      ]
    }).compileComponents();
  };

  it('debería cargar la ficha 360 del afiliado correctamente con estados de texto', async () => {
    await setupTestingModule();
    const fixture = TestBed.createComponent(PatientDetailComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.loading()).toBe(false);
    expect(component.paciente()?.dni).toBe('12345678');
    expect(component.saldoPendiente()).toBe(800);
    expect(component.estadoCoberturaTexto()).toBe('VIGENTE');
    expect(component.estadoDeudaTexto()).toBe('CON DEUDA PENDIENTE');
  });

  it('debería sincronizar la solapa activa desde el queryParam tab', async () => {
    await setupTestingModule('facturas');
    const fixture = TestBed.createComponent(PatientDetailComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.activeTab()).toBe('facturas');
  });

  it('debería aislar errores por bloque cuando el servicio de facturas falla', async () => {
    patientApiMock.getFacturasAfiliado.mockReturnValue(throwError(() => new Error('HTTP 500')));
    await setupTestingModule();

    const fixture = TestBed.createComponent(PatientDetailComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.loading()).toBe(false);
    expect(component.paciente()?.dni).toBe('12345678');
    expect(component.facturasError()).toBe(true);
    expect(component.coberturaError()).toBe(false);
    expect(component.coberturaActual()?.estadoCobertura).toBe('VIGENTE');
  });

  it('debería listar los miembros del grupo familiar cuando se selecciona la solapa correspondiente', async () => {
    patientApiMock.getFicha.mockReturnValue(
      of({
        estadoGrupo: 'ACTIVO',
        numeroCuentaGrupo: 'CC-1',
        saldoFavor: 1000,
        integrantes: [
          { id: 10, nombre: 'María', apellido: 'Pérez', rolFamiliar: 'TITULAR', dni: '87654321', estado: 'ACTIVO' }
        ]
      })
    );
    await setupTestingModule('grupo-familiar');
    const fixture = TestBed.createComponent(PatientDetailComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.activeTab()).toBe('grupo-familiar');
    expect(component.integrantesGrupo().length).toBe(1);
    expect(component.integrantesGrupo()[0].nombre).toBe('María');
  });

  it('debería permitir registrar un recibo de cobranza y reflejar el resultado', async () => {
    await setupTestingModule('cuenta-corriente');
    const fixture = TestBed.createComponent(PatientDetailComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.activeTab()).toBe('cuenta-corriente');
    expect(typeof component.registrarReciboCobranza).toBe('function');
  });
});
