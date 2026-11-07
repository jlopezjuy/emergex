import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Caja {
  id: number;
  nombre: string;
  estado: 'ABIERTA' | 'CERRADA';
  /** Saldo vigente de la caja. El backend no expone un "monto inicial". */
  saldoActual: number;
}

export interface MovimientoCaja {
  id: number;
  tipo: 'INGRESO' | 'EGRESO';
  monto: number;
  concepto: string;
}

export interface ArqueoCaja {
  id: number;
  montoFisicoContado: number;
  saldoTeorico?: number;
  diferencia?: number;
  realizadoPor?: string;
  fechaHora?: string;
  justificacion?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TesoreriaApi {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v2/tesoreria`;

  obtenerCajas(): Observable<Caja[]> {
    return this.http.get<Caja[]>(`${this.apiUrl}/cajas`);
  }

  abrirCaja(nombre: string, montoInicial: number): Observable<Caja> {
    const params = new HttpParams()
      .set('nombre', nombre)
      .set('montoInicial', montoInicial);
    return this.http.post<Caja>(`${this.apiUrl}/cajas`, null, { params });
  }

  registrarMovimientoCaja(
    cajaId: number,
    tipo: 'INGRESO' | 'EGRESO',
    monto: number,
    concepto: string
  ): Observable<MovimientoCaja> {
    const params = new HttpParams()
      .set('tipo', tipo)
      .set('monto', monto)
      .set('concepto', concepto);
    return this.http.post<MovimientoCaja>(`${this.apiUrl}/cajas/${cajaId}/movimientos`, null, { params });
  }

  realizarArqueoCaja(cajaId: number, montoFisicoContado: number, justificacion?: string): Observable<ArqueoCaja> {
    let params = new HttpParams().set('montoFisicoContado', montoFisicoContado);
    if (justificacion) {
      params = params.set('justificacion', justificacion);
    }
    return this.http.post<ArqueoCaja>(`${this.apiUrl}/cajas/${cajaId}/arqueo`, null, { params });
  }
}
