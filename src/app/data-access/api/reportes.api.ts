import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ReporteFinancieroDTO, ReporteComprasDTO, ReportePadronContratosDTO } from '../dto/reportes.dto';

export interface ReporteComercialDTO {
  totalSuscripciones: number;
  suscripcionesPorPlan: Record<string, number>;
  totalFacturado: number;
  consumosPorPrestacion: Record<string, number>;
  ingresosPorPrestacion: Record<string, number>;
  altasMes?: number;
  coberturasPorVencer?: number;
  afiliadosPorInstitucion?: Record<string, number>;
  altasSerie?: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class ReportesApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v1/reportes`;

  comercial(desde?: string, hasta?: string): Observable<ReporteComercialDTO> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ReporteComercialDTO>(`${this.base}/comercial`, { params });
  }

  financiero(desde?: string, hasta?: string): Observable<ReporteFinancieroDTO> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ReporteFinancieroDTO>(`${this.base}/financiero`, { params });
  }

  compras(desde?: string, hasta?: string): Observable<ReporteComprasDTO> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ReporteComprasDTO>(`${this.base}/compras`, { params });
  }

  padronContratos(desde?: string, hasta?: string): Observable<ReportePadronContratosDTO> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<ReportePadronContratosDTO>(`${this.base}/padron-contratos`, { params });
  }

  downloadCitiVentas(anio: number, mes: number): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/api/reportes/libro-iva/citi-ventas?anio=${anio}&mes=${mes}`, {
      responseType: 'blob',
    });
  }

  downloadCitiCompras(anio: number, mes: number): Observable<Blob> {
    return this.http.get(`${environment.apiUrl}/api/reportes/libro-iva/citi-compras?anio=${anio}&mes=${mes}`, {
      responseType: 'blob',
    });
  }
}
