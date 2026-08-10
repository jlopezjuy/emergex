import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  StockProductosApi,
  ProductoDTO,
  MovimientoStockDTO,
  EquipoInternacionDTO,
  MedicamentoDTO,
  InsumoDomiciliarioDTO,
} from './stock-productos.api';
import { environment } from '../../../environments/environment';

describe('StockProductosApi', () => {
  let service: StockProductosApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StockProductosApi,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(StockProductosApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería solicitar la lista de productos con paginación server-side y parsear X-Total-Count', () => {
    const mockProductos: ProductoDTO[] = [
      { id: 1, codigo: 'P01', nombre: 'Suero Fisiológico', precioCompra: 10, precioVenta: 15, stock: 100, sku: 'SKU01', codigoBarras: '123', costo: 10, precioBase: 12, porcentajeImpuesto: 21, precio: 15, peso: 1, activo: true, proveedor: 'Farma', estadoProducto: 'DISPONIBLE' },
    ];

    service.getProductos(0, 10).subscribe(res => {
      expect(res.content.length).toBe(1);
      expect(res.content[0].nombre).toBe('Suero Fisiológico');
      expect(res.totalElements).toBe(42);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/productos?page=0&size=10&sort=id,desc`);
    expect(req.request.method).toBe('GET');
    req.flush(mockProductos, { headers: { 'X-Total-Count': '42' } });
  });

  it('debería solicitar la lista de movimientos de stock', () => {
    const mockMovimientos: MovimientoStockDTO[] = [
      { id: 10, fechaMovimiento: '2026-08-10T10:00:00Z', tipoMovimiento: 'INGRESO', cantidadAnterior: 10, cantidadMovimiento: 5, cantidadPosterior: 15, motivo: 'Compra', usuarioResponsable: 'admin', producto: { id: 1 } as ProductoDTO },
    ];

    service.getMovimientosStock(0, 5).subscribe(res => {
      expect(res.content.length).toBe(1);
      expect(res.totalElements).toBe(1);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/movimiento-stocks?page=0&size=5&sort=fechaMovimiento,desc`);
    expect(req.request.method).toBe('GET');
    req.flush(mockMovimientos, { headers: { 'X-Total-Count': '1' } });
  });

  it('debería solicitar la lista de equipos de internación', () => {
    const mockEquipos: EquipoInternacionDTO[] = [
      { id: 100, cantidad: 1, estadoEquipo: 'DISPONIBLE' },
    ];

    service.getEquiposInternacion(0, 10).subscribe(res => {
      expect(res.content.length).toBe(1);
      expect(res.totalElements).toBe(5);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/equipo-internacions?page=0&size=10&eagerload=true`);
    expect(req.request.method).toBe('GET');
    req.flush(mockEquipos, { headers: { 'X-Total-Count': '5' } });
  });

  it('debería solicitar la lista de medicamentos', () => {
    const mockMedicamentos: MedicamentoDTO[] = [
      { id: 200, nombreGenerico: 'Paracetamol', dosis: '500 mg' },
    ];

    service.getMedicamentos(0, 10).subscribe(res => {
      expect(res.content.length).toBe(1);
      expect(res.totalElements).toBe(12);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/medicamentos?page=0&size=10&sort=nombreGenerico,asc`);
    expect(req.request.method).toBe('GET');
    req.flush(mockMedicamentos, { headers: { 'X-Total-Count': '12' } });
  });

  it('debería solicitar la lista de insumos domiciliarios', () => {
    const mockInsumos: InsumoDomiciliarioDTO[] = [
      { id: 300, productoId: 1, cantidadRequerida: 10, cantidadEntregada: 10, estado: 'ENTREGADO' },
    ];

    service.getInsumosDomiciliarios(0, 10).subscribe(res => {
      expect(res.content.length).toBe(1);
      expect(res.totalElements).toBe(3);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/api/insumo-domiciliarios?page=0&size=10&sort=id,desc`);
    expect(req.request.method).toBe('GET');
    req.flush(mockInsumos, { headers: { 'X-Total-Count': '3' } });
  });
});
