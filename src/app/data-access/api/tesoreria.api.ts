import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CajaStatus {
  estado: 'ABIERTA' | 'CERRADA';
  saldoActual: number;
}

export interface MovimientoCaja {
  id: string;
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO';
  monto: number;
  concepto: string;
}

export interface ArqueoRequest {
  efectivoFisico: number;
  observaciones?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TesoreriaApi {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/tesoreria`;

  getStatus(): Observable<CajaStatus> {
    return this.http.get<CajaStatus>(`${this.apiUrl}/status`);
  }

  getMovimientos(): Observable<MovimientoCaja[]> {
    return this.http.get<MovimientoCaja[]>(`${this.apiUrl}/movimientos`);
  }

  registrarMovimiento(movimiento: Partial<MovimientoCaja>): Observable<MovimientoCaja> {
    return this.http.post<MovimientoCaja>(`${this.apiUrl}/movimientos`, movimiento);
  }

  realizarArqueo(request: ArqueoRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/arqueo`, request);
  }
}
