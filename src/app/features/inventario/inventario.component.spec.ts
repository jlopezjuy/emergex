import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventarioComponent } from './inventario.component';
import { StockProductosApi, ProductoDTO, MovimientoStockDTO, EquipoInternacionDTO, MedicamentoDTO } from '../../data-access/api/stock-productos.api';
import { UserFeedbackService } from '../../core/notifications/user-feedback.service';
import { of, throwError } from 'rxjs';

interface ApiMock {
  getProductos: ReturnType<typeof vi.fn>;
  createProducto: ReturnType<typeof vi.fn>;
  updateProducto: ReturnType<typeof vi.fn>;
  deleteProducto: ReturnType<typeof vi.fn>;
  getMovimientosStock: ReturnType<typeof vi.fn>;
  createMovimientoStock: ReturnType<typeof vi.fn>;
  getEquiposInternacion: ReturnType<typeof vi.fn>;
  createEquipoInternacion: ReturnType<typeof vi.fn>;
  updateEquipoInternacion: ReturnType<typeof vi.fn>;
  getMedicamentos: ReturnType<typeof vi.fn>;
  createMedicamento: ReturnType<typeof vi.fn>;
  updateMedicamento: ReturnType<typeof vi.fn>;
  deleteMedicamento: ReturnType<typeof vi.fn>;
}

interface FeedbackMock {
  push: ReturnType<typeof vi.fn>;
  fromHttpError: ReturnType<typeof vi.fn>;
}

describe('InventarioComponent', () => {
  let component: InventarioComponent;
  let fixture: ComponentFixture<InventarioComponent>;
  let apiMock: ApiMock;
  let feedbackMock: FeedbackMock;

  const mockProductos: ProductoDTO[] = [
    { id: 1, codigo: 'PROD-001', nombre: 'Gasas Esteriles', stock: 50, estadoProducto: 'DISPONIBLE', precio: 150 },
  ];
  const mockMovimientos: MovimientoStockDTO[] = [
    { id: 10, fechaMovimiento: '2026-08-10T10:00:00Z', tipoMovimiento: 'INGRESO', cantidadMovimiento: 20, producto: mockProductos[0] },
  ];
  const mockEquipos: EquipoInternacionDTO[] = [
    { id: 100, cantidad: 1, estadoEquipo: 'DISPONIBLE', producto: mockProductos[0] },
  ];
  const mockMedicamentos: MedicamentoDTO[] = [
    { id: 200, nombreGenerico: 'Ibuprofeno', dosis: '400 mg' },
  ];

  beforeEach(async () => {
    TestBed.resetTestingModule();
    apiMock = {
      getProductos: vi.fn().mockReturnValue(of({ content: mockProductos, totalElements: 1 })),
      createProducto: vi.fn().mockReturnValue(of(mockProductos[0])),
      updateProducto: vi.fn().mockReturnValue(of(mockProductos[0])),
      deleteProducto: vi.fn().mockReturnValue(of(undefined)),
      getMovimientosStock: vi.fn().mockReturnValue(of({ content: mockMovimientos, totalElements: 1 })),
      createMovimientoStock: vi.fn().mockReturnValue(of(mockMovimientos[0])),
      getEquiposInternacion: vi.fn().mockReturnValue(of({ content: mockEquipos, totalElements: 1 })),
      createEquipoInternacion: vi.fn().mockReturnValue(of(mockEquipos[0])),
      updateEquipoInternacion: vi.fn().mockReturnValue(of(mockEquipos[0])),
      getMedicamentos: vi.fn().mockReturnValue(of({ content: mockMedicamentos, totalElements: 1 })),
      createMedicamento: vi.fn().mockReturnValue(of(mockMedicamentos[0])),
      updateMedicamento: vi.fn().mockReturnValue(of(mockMedicamentos[0])),
      deleteMedicamento: vi.fn().mockReturnValue(of(undefined)),
    };
    feedbackMock = {
      push: vi.fn(),
      fromHttpError: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [InventarioComponent],
      providers: [
        { provide: StockProductosApi, useValue: apiMock },
        { provide: UserFeedbackService, useValue: feedbackMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InventarioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse y cargar los datos de la solapa por defecto (productos)', () => {
    expect(component).toBeTruthy();
    expect(apiMock.getProductos).toHaveBeenCalledWith(0, 10);
    expect(component.productos().length).toBe(1);
    expect(component.productos()[0].nombre).toBe('Gasas Esteriles');
  });

  it('debería cambiar de solapa y cargar movimientos de stock', () => {
    component.setTab('movimientos');
    expect(component.activeTab()).toBe('movimientos');
    expect(apiMock.getMovimientosStock).toHaveBeenCalledWith(0, 10);
    expect(component.movimientos().length).toBe(1);
  });

  it('debería cambiar a la solapa de equipos de internación', () => {
    component.setTab('equipos');
    expect(component.activeTab()).toBe('equipos');
    expect(apiMock.getEquiposInternacion).toHaveBeenCalledWith(0, 10);
    expect(component.equipos().length).toBe(1);
  });

  it('debería cambiar a la solapa de medicamentos', () => {
    component.setTab('medicamentos');
    expect(component.activeTab()).toBe('medicamentos');
    expect(apiMock.getMedicamentos).toHaveBeenCalledWith(0, 10);
    expect(component.medicamentos().length).toBe(1);
  });

  it('debería manejar errores de la API estableciendo el estado de error', () => {
    apiMock.getProductos.mockReturnValue(throwError(() => new Error('Error de servidor')));
    component.cargarProductos();
    expect(component.error()).toBe('No se pudieron cargar los productos');
  });
});
