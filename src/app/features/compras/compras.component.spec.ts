import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ComprasComponent } from './compras.component';
import { ComprasApiService } from '../../data-access/api/compras.api';
import { CostosApiService } from '../../data-access/api/costos.api';
import { UserFeedbackService } from '../../core/notifications/user-feedback.service';
import { of } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';

describe('ComprasComponent', () => {
  let component: ComprasComponent;
  let fixture: ComponentFixture<ComprasComponent>;
  let comprasApiMock: Record<string, ReturnType<typeof vi.fn>>;
  let costosApiMock: Record<string, ReturnType<typeof vi.fn>>;
  let feedbackServiceMock: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    comprasApiMock = {
      getSolicitudes: vi.fn().mockReturnValue(of([{ id: 1, concepto: 'Insumos', montoEstimado: 500, estado: 'PRESENTADA' }])),
      getSolicitudesPage: vi.fn().mockReturnValue(of({
        data: [{ id: 1, concepto: 'Insumos', montoEstimado: 500, estado: 'PRESENTADA', centroCostoId: 1 }],
        total: 1,
        page: 0,
        size: 10,
        totalPages: 1
      })),
      crearSolicitud: vi.fn().mockReturnValue(of({ id: 2, concepto: 'Insumos 2', centroCostoId: 1 })),
      aprobarSolicitud: vi.fn().mockReturnValue(of({ id: 1, estado: 'APROBADA' })),
      getOrdenesCompra: vi.fn().mockReturnValue(of([{ id: 10, numero: 'OC-0010', montoTotal: 1500, estado: 'EMITIDA' }])),
      getOrdenesCompraPage: vi.fn().mockReturnValue(of({
        data: [{ id: 10, numero: 'OC-0010', montoTotal: 1500, estado: 'EMITIDA' }],
        total: 1,
        page: 0,
        size: 10,
        totalPages: 1
      })),
      getCotizacionesPorSolicitud: vi.fn().mockReturnValue(of([{ id: 100, solicitudCompraId: 1, montoCotizado: 1200, proveedorNombre: 'Droguería Sur' }])),
      registrarCotizacion: vi.fn().mockReturnValue(of({ id: 101, solicitudCompraId: 1, montoCotizado: 1100 })),
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
        provideRouter([]),
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

  it('debería cargar solicitudes y órdenes de compra paginadas al iniciar (V3-S3-01)', () => {
    expect(component.solicitudes().length).toBe(1);
    expect(component.ordenesCompra().length).toBe(1);
    expect(component.centrosCosto().length).toBe(1);
    expect(component.solicitudesTotal()).toBe(1);
    expect(component.ordenesTotal()).toBe(1);
  });

  it('debería seleccionar una solicitud y cargar sus cotizaciones (V3-S3-02)', () => {
    const sol = component.solicitudes()[0];
    component.seleccionarSolicitudParaCotizar(sol);

    expect(component.solicitudSeleccionada()?.id).toBe(1);
    expect(component.activeTab()).toBe('cotizaciones');
    expect(comprasApiMock['getCotizacionesPorSolicitud']).toHaveBeenCalledWith(1);
    expect(component.cotizaciones().length).toBe(1);
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

    expect(comprasApiMock['overrideMatching']).toHaveBeenCalledWith({
      comprobanteId: 100,
      motivoExcepcion: 'Excepción gerencial',
      usuarioAprobador: 'gerente.aprobador'
    });
    expect(feedbackServiceMock['push']).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
  });
});
