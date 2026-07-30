import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CrearSolicitudCompraRequest, OrdenDeCompra, SolicitudCompra } from '../models/compras.model';

@Injectable({
  providedIn: 'root',
})
export class ComprasService {
  private http = inject(HttpClient);
  private apiUrl = '/api/compras';

  getSolicitudes(): Observable<SolicitudCompra[]> {
    return this.http.get<SolicitudCompra[]>(`${this.apiUrl}/solicitudes`);
  }

  crearSolicitud(request: CrearSolicitudCompraRequest): Observable<SolicitudCompra> {
    return this.http.post<SolicitudCompra>(`${this.apiUrl}/solicitudes`, request);
  }

  aprobarSolicitud(id: number): Observable<SolicitudCompra> {
    return this.http.post<SolicitudCompra>(`${this.apiUrl}/solicitudes/${id}/aprobar`, {});
  }

  getOrdenes(): Observable<OrdenDeCompra[]> {
    return this.http.get<OrdenDeCompra[]>(`${this.apiUrl}/ordenes`);
  }
}
