import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ProductoDTO {
  id?: number;
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  precioCompra?: number;
  precioVenta?: number;
  stockMaximo?: number;
  stock?: number;
  stockMinimo?: number;
  sku?: string;
  codigoBarras?: string;
  reservado?: number;
  costo?: number;
  precioBase?: number;
  porcentajeImpuesto?: number;
  precio?: number;
  peso?: number;
  miniatura?: string;
  activo?: boolean;
  unidadDeMedida?: string;
  fechaVencimiento?: string;
  lote?: string;
  proveedor?: string;
  ubicacionFisica?: string;
  temperaturaAlmacenamiento?: string;
  requiereRefrigeracion?: boolean;
  alertaVencimiento?: number;
  estadoProducto?: 'DISPONIBLE' | 'AGOTADO' | 'DISCONTINUADO' | 'VENCIDO' | 'EN_RESERVA';
  observacionCalidad?: string;
}

export interface MovimientoStockDTO {
  id?: number;
  fechaMovimiento?: string;
  tipoMovimiento?: 'INGRESO' | 'EGRESO' | 'AJUSTE_INVENTARIO' | 'TRANSFERENCIA' | 'DEVOLUCION' | 'CONSUMO_PROPIO';
  cantidadAnterior?: number;
  cantidadMovimiento?: number;
  cantidadPosterior?: number;
  motivo?: string;
  usuarioResponsable?: string;
  documentoReferencia?: string;
  observacion?: string;
  producto?: ProductoDTO;
}

export interface EquipoInternacionDTO {
  id?: number;
  cantidad?: number;
  fechaEntrega?: string;
  fechaDevolucion?: string;
  estadoEquipo?: 'ENTREGADO' | 'DISPONIBLE' | 'EN_REPARACION' | 'DEVENTO_DANIO' | 'RETIRADO' | 'EXTRAVIADO';
  observacionEntrega?: string;
  observacionDevolucion?: string;
  responsableEntrega?: string;
  responsableDevolucion?: string;
  producto?: ProductoDTO;
  internacionId?: number;
}

export interface MedicamentoDTO {
  id?: number;
  nombreGenerico?: string;
  dosis?: string;
  formaFarmaceutica?: string;
  codigoNacional?: string;
  almacenamientoRecomendado?: string;
  restriccionEdad?: string;
  contraindicacion?: string;
  requiereRecetaEspecial?: boolean;
  medicamentoControlado?: boolean;
  interaccionConocida?: string;
  efectoAdversoFrecuente?: string;
  dosisMaximaDiaria?: string;
  contraindicacionEmbarazo?: boolean;
  contraindicacionLactancia?: boolean;
}

export interface InsumoDomiciliarioDTO {
  id?: number;
  productoId?: number;
  cantidadRequerida?: number;
  cantidadEntregada?: number;
  cantidadConsumida?: number;
  cantidadDevuelta?: number;
  lote?: string;
  fechaVencimiento?: string;
  estado?: string;
  internacionId?: number;
}

export interface PaginatedResult<T> {
  content: T[];
  totalElements: number;
}

@Injectable({
  providedIn: 'root'
})
export class StockProductosApi {
  private readonly http = inject(HttpClient);
  private readonly apiBase = `${environment.apiUrl}/api`;

  // --- PRODUCTOS (/api/productos) ---
  getProductos(page = 0, size = 10, sort = 'id,desc'): Observable<PaginatedResult<ProductoDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    return this.http.get<ProductoDTO[]>(`${this.apiBase}/productos`, { params, observe: 'response' }).pipe(
      map(response => ({
        content: response.body || [],
        totalElements: parseInt(response.headers.get('X-Total-Count') || '0', 10)
      }))
    );
  }

  createProducto(producto: Partial<ProductoDTO>): Observable<ProductoDTO> {
    return this.http.post<ProductoDTO>(`${this.apiBase}/productos`, producto);
  }

  updateProducto(id: number, producto: Partial<ProductoDTO>): Observable<ProductoDTO> {
    return this.http.put<ProductoDTO>(`${this.apiBase}/productos/${id}`, producto);
  }

  deleteProducto(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/productos/${id}`);
  }

  // --- MOVIMIENTOS STOCK (/api/movimiento-stocks) ---
  getMovimientosStock(page = 0, size = 10, sort = 'fechaMovimiento,desc'): Observable<PaginatedResult<MovimientoStockDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    return this.http.get<MovimientoStockDTO[]>(`${this.apiBase}/movimiento-stocks`, { params, observe: 'response' }).pipe(
      map(response => ({
        content: response.body || [],
        totalElements: parseInt(response.headers.get('X-Total-Count') || '0', 10)
      }))
    );
  }

  createMovimientoStock(movimiento: Partial<MovimientoStockDTO>): Observable<MovimientoStockDTO> {
    return this.http.post<MovimientoStockDTO>(`${this.apiBase}/movimiento-stocks`, movimiento);
  }

  // --- EQUIPO INTERNACION (/api/equipo-internacions) ---
  getEquiposInternacion(page = 0, size = 10, eagerload = true): Observable<PaginatedResult<EquipoInternacionDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('eagerload', eagerload.toString());

    return this.http.get<EquipoInternacionDTO[]>(`${this.apiBase}/equipo-internacions`, { params, observe: 'response' }).pipe(
      map(response => ({
        content: response.body || [],
        totalElements: parseInt(response.headers.get('X-Total-Count') || '0', 10)
      }))
    );
  }

  createEquipoInternacion(equipo: Partial<EquipoInternacionDTO>): Observable<EquipoInternacionDTO> {
    return this.http.post<EquipoInternacionDTO>(`${this.apiBase}/equipo-internacions`, equipo);
  }

  updateEquipoInternacion(id: number, equipo: Partial<EquipoInternacionDTO>): Observable<EquipoInternacionDTO> {
    return this.http.put<EquipoInternacionDTO>(`${this.apiBase}/equipo-internacions/${id}`, equipo);
  }

  // --- MEDICAMENTOS (/api/medicamentos) ---
  getMedicamentos(page = 0, size = 10, sort = 'nombreGenerico,asc'): Observable<PaginatedResult<MedicamentoDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    return this.http.get<MedicamentoDTO[]>(`${this.apiBase}/medicamentos`, { params, observe: 'response' }).pipe(
      map(response => ({
        content: response.body || [],
        totalElements: parseInt(response.headers.get('X-Total-Count') || '0', 10)
      }))
    );
  }

  createMedicamento(medicamento: Partial<MedicamentoDTO>): Observable<MedicamentoDTO> {
    return this.http.post<MedicamentoDTO>(`${this.apiBase}/medicamentos`, medicamento);
  }

  updateMedicamento(id: number, medicamento: Partial<MedicamentoDTO>): Observable<MedicamentoDTO> {
    return this.http.put<MedicamentoDTO>(`${this.apiBase}/medicamentos/${id}`, medicamento);
  }

  deleteMedicamento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBase}/medicamentos/${id}`);
  }

  // --- INSUMOS DOMICILIARIOS (/api/insumo-domiciliarios) ---
  getInsumosDomiciliarios(page = 0, size = 10, sort = 'id,desc'): Observable<PaginatedResult<InsumoDomiciliarioDTO>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    return this.http.get<InsumoDomiciliarioDTO[]>(`${this.apiBase}/insumo-domiciliarios`, { params, observe: 'response' }).pipe(
      map(response => ({
        content: response.body || [],
        totalElements: parseInt(response.headers.get('X-Total-Count') || '0', 10)
      }))
    );
  }

  createInsumoDomiciliario(insumo: Partial<InsumoDomiciliarioDTO>): Observable<InsumoDomiciliarioDTO> {
    return this.http.post<InsumoDomiciliarioDTO>(`${this.apiBase}/insumo-domiciliarios`, insumo);
  }

  updateInsumoDomiciliario(id: number, insumo: Partial<InsumoDomiciliarioDTO>): Observable<InsumoDomiciliarioDTO> {
    return this.http.put<InsumoDomiciliarioDTO>(`${this.apiBase}/insumo-domiciliarios/${id}`, insumo);
  }
}
