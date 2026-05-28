import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

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
    let params = '';
    if (desde && hasta) {
      params = `?desde=${desde}&hasta=${hasta}`;
    } else if (desde) {
      params = `?desde=${desde}`;
    } else if (hasta) {
      params = `?hasta=${hasta}`;
    }
    return this.http.get<ReporteComercialDTO>(`${this.base}/comercial${params}`);
  }
}
