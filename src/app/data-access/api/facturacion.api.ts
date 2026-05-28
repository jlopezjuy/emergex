import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ─── Backend shapes ───────────────────────────────────────────────────────────

interface BackendFactura {
  id: number;
  numeroFactura?: string;
  estado?: string;
  tipoFactura?: string;
  fechaEmision?: string;
  periodoDesde?: string;
  periodoHasta?: string;
  grupoFamiliarId?: number;
  grupoNumeroCuenta?: string;
  importeTotal?: number;
  saldoPendiente?: number;
}

interface BackendGenerarResponse {
  mes?: number | null;
  anio: number;
  totalGeneradas: number;
  totalOmitidas: number;
  facturasGeneradas: BackendFactura[];
}

interface BackendPagoResponse {
  pagoId: number;
  facturaId: number;
  fechaPago?: string;
  monto?: number;
  metodoPago?: string;
  estadoPago?: string;
  saldoPendiente?: number;
}

// ─── Frontend DTOs ────────────────────────────────────────────────────────────

export type EstadoFactura = 'EMITIDA' | 'PAGADA' | 'VENCIDA' | 'ANULADA';

export type MetodoPago =
  | 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA_DEBITO' | 'TARJETA_CREDITO'
  | 'MERCADOPAGO' | 'CHEQUE' | 'OBRA_SOCIAL' | 'PREPAGA' | 'OTRO';

export interface FacturaDTO {
  id: number;
  numeroFactura: string;
  estado: EstadoFactura | string;
  tipoFactura: string;
  fechaEmision: string;
  periodoDesde: string;
  periodoHasta: string;
  grupoFamiliarId?: number;
  grupoNumeroCuenta?: string;
  importeTotal: number;
  saldoPendiente?: number;
  tipoPeriodo: 'MENSUAL' | 'ANUAL';
}

export interface GenerarResponseDTO {
  mes: number | null;
  anio: number;
  totalGeneradas: number;
  totalOmitidas: number;
  facturasGeneradas: FacturaDTO[];
  tipoPeriodo: 'MENSUAL' | 'ANUAL';
}

export interface RegistrarPagoRequest {
  fechaPago: string;
  monto: number;
  metodoPago: MetodoPago;
  numeroReferencia?: string;
  nota?: string;
}

export interface PagoResponseDTO {
  pagoId: number;
  facturaId: number;
  fechaPago?: string;
  monto?: number;
  metodoPago?: string;
  estadoPago?: string;
  saldoPendiente?: number;
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toFacturaDTO(b: BackendFactura, tipoPeriodo: 'MENSUAL' | 'ANUAL'): FacturaDTO {
  return {
    id:               b.id,
    numeroFactura:    b.numeroFactura ?? `FAC-${b.id}`,
    estado:           (b.estado ?? 'EMITIDA') as EstadoFactura,
    tipoFactura:      b.tipoFactura ?? '',
    fechaEmision:     b.fechaEmision ?? '',
    periodoDesde:     b.periodoDesde ?? '',
    periodoHasta:     b.periodoHasta ?? '',
    grupoFamiliarId:  b.grupoFamiliarId,
    grupoNumeroCuenta: b.grupoNumeroCuenta,
    importeTotal:     b.importeTotal ?? 0,
    saldoPendiente:   b.saldoPendiente,
    tipoPeriodo,
  };
}

function toGenerarDTO(b: BackendGenerarResponse): GenerarResponseDTO {
  const tipoPeriodo: 'MENSUAL' | 'ANUAL' = b.mes == null ? 'ANUAL' : 'MENSUAL';
  return {
    mes:               b.mes ?? null,
    anio:              b.anio,
    totalGeneradas:    b.totalGeneradas,
    totalOmitidas:     b.totalOmitidas,
    facturasGeneradas: b.facturasGeneradas.map(f => toFacturaDTO(f, tipoPeriodo)),
    tipoPeriodo,
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class FacturacionApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v1/facturacion`;

  generarMensual(mes: number, anio: number): Observable<GenerarResponseDTO> {
    const params = new HttpParams().set('mes', mes).set('anio', anio);
    return this.http.post<BackendGenerarResponse>(`${this.base}/generar-mensual`, null, { params })
      .pipe(map(toGenerarDTO));
  }

  generarAnual(anio: number): Observable<GenerarResponseDTO> {
    const params = new HttpParams().set('anio', anio);
    return this.http.post<BackendGenerarResponse>(`${this.base}/generar-anual`, null, { params })
      .pipe(map(toGenerarDTO));
  }

  listarFacturas(estado?: EstadoFactura | null, page = 0, size = 50): Observable<FacturaDTO[]> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
      .set('sort', 'fechaEmision,desc');
    if (estado) params = params.set('estado', estado);
    return this.http.get<BackendFactura[]>(`${this.base}/facturas`, { params })
      .pipe(map(list => list.map(f => toFacturaDTO(f, f.periodoDesde && f.periodoHasta && this.isAnual(f.periodoDesde, f.periodoHasta) ? 'ANUAL' : 'MENSUAL'))));
  }

  registrarPago(facturaId: number, req: RegistrarPagoRequest): Observable<PagoResponseDTO> {
    return this.http.post<BackendPagoResponse>(`${this.base}/facturas/${facturaId}/pago`, req);
  }

  generarIndividual(pacienteId: number, mes: number, anio: number, anual: boolean): Observable<GenerarResponseDTO> {
    let params = new HttpParams()
      .set('pacienteId', pacienteId)
      .set('anio', anio)
      .set('anual', anual);
    if (!anual) params = params.set('mes', mes);
    return this.http.post<BackendGenerarResponse>(`${this.base}/generar-individual`, null, { params })
      .pipe(map(toGenerarDTO));
  }

  private isAnual(desde: string, hasta: string): boolean {
    const d = new Date(desde + 'T00:00:00');
    const h = new Date(hasta + 'T00:00:00');
    return d.getMonth() === 0 && d.getDate() === 1 && h.getMonth() === 11 && h.getDate() === 31;
  }
}
