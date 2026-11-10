import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EmitirOrdenDePagoDTO, EjecutarOrdenDePagoDTO, OrdenDePagoDTO } from '../dto/ordenes-pago.dto';

@Injectable({ providedIn: 'root' })
export class OrdenesPagoApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/cxp/ordenes-pago`;

  getOrdenesDePago(): Observable<OrdenDePagoDTO[]> {
    return this.http.get<OrdenDePagoDTO[]>(this.base);
  }

  emitirOrdenDePago(dto: EmitirOrdenDePagoDTO): Observable<OrdenDePagoDTO> {
    return this.http.post<OrdenDePagoDTO>(this.base, dto);
  }

  aprobarOrdenDePago(id: number): Observable<OrdenDePagoDTO> {
    return this.http.post<OrdenDePagoDTO>(`${this.base}/${id}/aprobar`, {});
  }

  ejecutarOrdenDePago(id: number, dto?: EjecutarOrdenDePagoDTO, idempotencyKey?: string): Observable<OrdenDePagoDTO> {
    let headers = new HttpHeaders();
    if (idempotencyKey) {
      headers = headers.set('X-Idempotency-Key', idempotencyKey);
    }
    return this.http.post<OrdenDePagoDTO>(`${this.base}/${id}/ejecutar`, dto || {}, { headers });
  }
}
