import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LedgerMovimientoDTO } from '../dto/ledger.dto';

/**
 * Cliente HTTP del submayor de cuentas corrientes (S0-11).
 *
 * `cuentas-corrientes.component.ts` llamaba a `/api/ledger-cuenta-corriente`, una ruta que nunca
 * existió — el backend expone `/api/ledger/terceros/{terceroId}/{saldo|movimientos}`
 * ({@link ar.com.aliviarsalud.app.web.rest.LedgerCuentaCorrienteResource} en el backend). El
 * error quedaba solo en `console.error` y la pantalla mostraba una tabla vacía sin avisar.
 */
@Injectable({ providedIn: 'root' })
export class LedgerApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/ledger`;

  getSaldo(terceroId: number): Observable<number> {
    return this.http.get<number>(`${this.base}/terceros/${terceroId}/cxc/saldo`);
  }

  getSaldoCxc(terceroId: number): Observable<number> {
    return this.http.get<number>(`${this.base}/terceros/${terceroId}/cxc/saldo`);
  }

  getSaldoCxp(terceroId: number): Observable<number> {
    return this.http.get<number>(`${this.base}/terceros/${terceroId}/cxp/saldo`);
  }

  getMovimientos(terceroId: number): Observable<LedgerMovimientoDTO[]> {
    return this.http.get<LedgerMovimientoDTO[]>(`${this.base}/terceros/${terceroId}/cxc/movimientos`);
  }

  getMovimientosCxc(terceroId: number): Observable<LedgerMovimientoDTO[]> {
    return this.http.get<LedgerMovimientoDTO[]>(`${this.base}/terceros/${terceroId}/cxc/movimientos`);
  }

  getMovimientosCxp(terceroId: number): Observable<LedgerMovimientoDTO[]> {
    return this.http.get<LedgerMovimientoDTO[]>(`${this.base}/terceros/${terceroId}/cxp/movimientos`);
  }
}

