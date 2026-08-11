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

import { ITEMS_PER_PAGE, PagedResult, buildParams, toPagedResult } from './pagination';

export interface TerceroQuery {
  q?: string;
  rol?: string;
  esProveedor?: boolean;
  page?: number;
  size?: number;
}

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

  /**
   * Obtiene el listado paginado server-side de terceros/proveedores (V3-S3-01).
   * Consume GET /api/terceros con cabecera X-Total-Count.
   */
  getPage(query: TerceroQuery = {}): Observable<PagedResult<TerceroResumenDTO>> {
    const params = buildParams({
      q: query.q?.trim(),
      rol: query.rol,
      esProveedor: query.esProveedor,
      page: query.page ?? 0,
      size: query.size ?? ITEMS_PER_PAGE,
      sort: 'id,asc',
    });

    return this.http
      .get<TerceroResumenDTO[]>(this.base, { params, observe: 'response' })
      .pipe(toPagedResult());
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
