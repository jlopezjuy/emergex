import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Caja {
  id: number;
  nombre: string;
  montoInicial: number;
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
}

@Injectable({
  providedIn: 'root',
})
export class TesoreriaApi {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/v2/tesoreria`;

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

  realizarArqueoCaja(cajaId: number, montoFisicoContado: number): Observable<ArqueoCaja> {
    const params = new HttpParams().set('montoFisicoContado', montoFisicoContado);
    return this.http.post<ArqueoCaja>(`${this.apiUrl}/cajas/${cajaId}/arqueo`, null, { params });
  }
}
