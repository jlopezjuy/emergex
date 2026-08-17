import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BandejaTrabajoResumenDTO, ResumenBandejaCoberturaDTO } from '../dto/bandejas.dto';

@Injectable({ providedIn: 'root' })
export class BandejasApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/gestion/bandejas-trabajo`;
  private baseCobertura = `${environment.apiUrl}/api/gestion/bandejas-cobertura`;

  getResumen(): Observable<BandejaTrabajoResumenDTO> {
    return this.http.get<BandejaTrabajoResumenDTO>(`${this.base}/resumen`);
  }

  getResumenCobertura(desde?: string, hasta?: string): Observable<ResumenBandejaCoberturaDTO> {
    let params: { [param: string]: string } = {};
    if (desde) params['desde'] = desde;
    if (hasta) params['hasta'] = hasta;
    return this.http.get<ResumenBandejaCoberturaDTO>(this.baseCobertura, { params });
  }
}
