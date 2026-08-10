import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComprasComponent } from './compras.component';
import { ComprasApiService } from '../../data-access/api/compras.api';
import { CostosApiService } from '../../data-access/api/costos.api';
import { UserFeedbackService } from '../../core/notifications/user-feedback.service';
import { of, throwError } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';

describe('ComprasComponent', () => {
  let component: ComprasComponent;
  let fixture: ComponentFixture<ComprasComponent>;
  let comprasApiMock: any;
  let costosApiMock: any;
  let feedbackServiceMock: any;

  beforeEach(async () => {
    comprasApiMock = {
      getSolicitudes: vi.fn().mockReturnValue(of([{ id: 1, concepto: 'Insumos', montoEstimado: 500, estado: 'PENDIENTE' }])),
      crearSolicitud: vi.fn().mockReturnValue(of({ id: 2, concepto: 'Insumos 2' })),
      aprobarSolicitud: vi.fn().mockReturnValue(of({ id: 1, estado: 'APROBADA' })),
      getOrdenesCompra: vi.fn().mockReturnValue(of([{ id: 10, numero: 'OC-0010', montoTotal: 1500, estado: 'EMITIDA' }])),
      getComprobantesProveedor: vi.fn().mockReturnValue(of([
        { id: 100, tipoDocumento: 'FACTURA_A', puntoVenta: 1, numeroDocumento: 123, fechaComprobante: '2026-08-10', montoTotal: 1500, estadoMatching: 'BLOQUEADO_DIFERENCIA' }
      ])),
      registrarRecepcion: vi.fn().mockReturnValue(of({ id: 5, numeroRemito: 'REM-100' })),
      overrideMatching: vi.fn().mockReturnValue(of({ id: 100, estadoMatching: 'MATCH_OK' }))
    };

    costosApiMock = {
      getCentrosCosto: vi.fn().mockReturnValue(of([{ id: 1, codigo: 'CC-01', nombre: 'San Isidro' }]))
    };

    feedbackServiceMock = {
      push: vi.fn(),
      fromHttpError: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ComprasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ComprasApiService, useValue: comprasApiMock },
        { provide: CostosApiService, useValue: costosApiMock },
        { provide: UserFeedbackService, useValue: feedbackServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ComprasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería cargar solicitudes y órdenes de compra al iniciar', () => {
    expect(component.solicitudes().length).toBe(1);
    expect(component.ordenesCompra().length).toBe(1);
    expect(component.centrosCosto().length).toBe(1);
  });

  it('debería agregar líneas a la recepción de bienes', () => {
    expect(component.lineasRecepcion.length).toBe(1);
    component.agregarLineaRecepcion();
    expect(component.lineasRecepcion.length).toBe(2);
    component.quitarLineaRecepcion(0);
    expect(component.lineasRecepcion.length).toBe(1);
  });

  it('debería ejecutar la destrabación de matching con motivo obligatorio', () => {
    component.iniciarOverride(100);
    component.motivoOverride.set('Excepción gerencial');
    component.confirmarOverride();

    expect(comprasApiMock.overrideMatching).toHaveBeenCalledWith({
      comprobanteId: 100,
      motivoExcepcion: 'Excepción gerencial',
      usuarioAprobador: 'gerente.aprobador'
    });
    expect(feedbackServiceMock.push).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });
});
