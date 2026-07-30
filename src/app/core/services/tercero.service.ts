import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RegistrarTerceroRequest, TerceroEmpresa } from '../models/tercero.model';
import { CuentaBancariaTercero, SolicitarCbuRequest } from '../models/cuenta-bancaria.model';

@Injectable({
  providedIn: 'root',
})
export class TerceroService {
  private http = inject(HttpClient);
  private apiUrl = '/api/terceros';

  registrarTercero(request: RegistrarTerceroRequest): Observable<TerceroEmpresa> {
    return this.http.post<TerceroEmpresa>(this.apiUrl, request);
  }

  solicitarAltaCbu(request: SolicitarCbuRequest): Observable<CuentaBancariaTercero> {
    return this.http.post<CuentaBancariaTercero>(`${this.apiUrl}/cuentas-bancarias/solicitar`, request);
  }

  aprobarCbu(cuentaId: number): Observable<CuentaBancariaTercero> {
    return this.http.post<CuentaBancariaTercero>(`${this.apiUrl}/cuentas-bancarias/${cuentaId}/aprobar`, {});
  }
}
