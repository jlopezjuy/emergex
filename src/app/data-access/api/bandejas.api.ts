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

  getChecklistDocumental(registroPrestacionId: number): Observable<import('../dto/bandejas.dto').ChecklistPrestacionDTO> {
    return this.http.get<import('../dto/bandejas.dto').ChecklistPrestacionDTO>(
      `${environment.apiUrl}/api/registro-prestaciones/${registroPrestacionId}/checklist-documental`
    );
  }

  asignarResponsable(registroPrestacionId: number, responsable: string, proximaAccion?: string): Observable<void> {
    let params: { [param: string]: string } = { responsable };
    if (proximaAccion) params['proximaAccion'] = proximaAccion;
    return this.http.put<void>(
      `${environment.apiUrl}/api/registro-prestaciones/${registroPrestacionId}/asignar-responsable`,
      null,
      { params }
    );
  }

  simularValorizacion(request: import('../dto/bandejas.dto').SimulacionTarifaRequestDTO): Observable<import('../dto/bandejas.dto').DesgloseValorizacionDTO> {
    return this.http.post<import('../dto/bandejas.dto').DesgloseValorizacionDTO>(
      `${environment.apiUrl}/api/v1/tarifas-contrato/simular`,
      request
    );
  }

  getValorizacionPrestacion(registroPrestacionId: number): Observable<import('../dto/bandejas.dto').DesgloseValorizacionDTO> {
    return this.http.get<import('../dto/bandejas.dto').DesgloseValorizacionDTO>(
      `${environment.apiUrl}/api/registro-prestaciones/${registroPrestacionId}/valorizacion`
    );
  }
}
