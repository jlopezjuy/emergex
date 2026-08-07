import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TerceroResumenDTO } from '../dto/ledger.dto';

/**
 * Búsqueda de terceros de la empresa actual, para selectores de UI (S0-11).
 *
 * No había ningún endpoint de lectura para TerceroEmpresa — solo alta y workflow de CBU — así
 * que la pantalla de cuentas corrientes no tenía forma de elegir un tercero antes de pedir su
 * saldo.
 */
@Injectable({ providedIn: 'root' })
export class TercerosApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/terceros`;

  buscar(query: string): Observable<TerceroResumenDTO[]> {
    return this.http.get<TerceroResumenDTO[]>(this.base, { params: { q: query } });
  }
}
