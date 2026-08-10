import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TerceroResumenDTO } from '../dto/ledger.dto';
import {
  RegistrarTerceroRequestDTO,
  SolicitarCbuRequestDTO,
  CuentaBancariaTerceroDTO,
  TerceroEmpresaDTO
} from '../dto/terceros.dto';

/**
 * REST client for managing Terceros, Perfil Fiscal, and CBU Maker-Checker workflows.
 */
@Injectable({ providedIn: 'root' })
export class TercerosApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/terceros`;

  buscar(query: string): Observable<TerceroResumenDTO[]> {
    return this.http.get<TerceroResumenDTO[]>(this.base, { params: { q: query } });
  }

  registrarTercero(dto: RegistrarTerceroRequestDTO): Observable<TerceroEmpresaDTO> {
    return this.http.post<TerceroEmpresaDTO>(this.base, dto);
  }

  solicitarAltaCbu(dto: SolicitarCbuRequestDTO): Observable<CuentaBancariaTerceroDTO> {
    return this.http.post<CuentaBancariaTerceroDTO>(`${this.base}/cuentas-bancarias/solicitar`, dto);
  }

  aprobarCbu(id: number): Observable<CuentaBancariaTerceroDTO> {
    return this.http.post<CuentaBancariaTerceroDTO>(`${this.base}/cuentas-bancarias/${id}/aprobar`, {});
  }
}
