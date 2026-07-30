import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LedgerCuentaCorriente } from '../models/ledger.model';

@Injectable({
  providedIn: 'root',
})
export class LedgerService {
  private http = inject(HttpClient);
  private apiUrl = '/api/ledger';

  getSaldoTercero(terceroId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/terceros/${terceroId}/saldo`);
  }

  getMovimientosTercero(terceroId: number): Observable<LedgerCuentaCorriente[]> {
    return this.http.get<LedgerCuentaCorriente[]>(`${this.apiUrl}/terceros/${terceroId}/movimientos`);
  }
}
