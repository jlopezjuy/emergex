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

  armarPresentacion(loteId: number): Observable<import('../dto/bandejas.dto').PresentacionLoteDTO> {
    return this.http.post<import('../dto/bandejas.dto').PresentacionLoteDTO>(
      `${environment.apiUrl}/api/v1/presentaciones/lotes/${loteId}/armar`,
      {}
    );
  }

  enviarPresentacion(presentacionId: number): Observable<import('../dto/bandejas.dto').PresentacionLoteDTO> {
    return this.http.put<import('../dto/bandejas.dto').PresentacionLoteDTO>(
      `${environment.apiUrl}/api/v1/presentaciones/${presentacionId}/enviar`,
      {}
    );
  }

  observarPresentacion(presentacionId: number, observaciones: string): Observable<import('../dto/bandejas.dto').PresentacionLoteDTO> {
    let params = { observaciones };
    return this.http.put<import('../dto/bandejas.dto').PresentacionLoteDTO>(
      `${environment.apiUrl}/api/v1/presentaciones/${presentacionId}/observar`,
      null,
      { params }
    );
  }

  aceptarPresentacion(presentacionId: number, montoAceptado?: number): Observable<import('../dto/bandejas.dto').PresentacionLoteDTO> {
    let params: { [param: string]: string } = {};
    if (montoAceptado != null) params['montoAceptado'] = montoAceptado.toString();
    return this.http.put<import('../dto/bandejas.dto').PresentacionLoteDTO>(
      `${environment.apiUrl}/api/v1/presentaciones/${presentacionId}/aceptar`,
      null,
      { params }
    );
  }

  anularLineaLote(lineaId: number, motivo?: string): Observable<void> {
    let params: { [param: string]: string } = {};
    if (motivo) params['motivo'] = motivo;
    return this.http.put<void>(
      `${environment.apiUrl}/api/v2/prefacturacion/lineas/${lineaId}/anular`,
      null,
      { params }
    );
  }

  registrarDebitoDetallado(dto: import('../dto/bandejas.dto').DebitoDetalladoDTO): Observable<import('../dto/bandejas.dto').DebitoDetalladoDTO> {
    return this.http.post<import('../dto/bandejas.dto').DebitoDetalladoDTO>(
      `${environment.apiUrl}/api/v1/debitos-documentos/detallado`,
      dto
    );
  }

  apelarDebito(debitoId: number, motivo?: string): Observable<any> {
    let params: { [param: string]: string } = {};
    if (motivo) params['motivo'] = motivo;
    return this.http.put<any>(
      `${environment.apiUrl}/api/v1/debitos-documentos/${debitoId}/apelar`,
      null,
      { params }
    );
  }

  refacturarLineaDebito(lineaDebitoId: number, motivo?: string): Observable<void> {
    let params: { [param: string]: string } = {};
    if (motivo) params['motivo'] = motivo;
    return this.http.put<void>(
      `${environment.apiUrl}/api/v1/debitos-documentos/lineas/${lineaDebitoId}/refacturar`,
      null,
      { params }
    );
  }
}
