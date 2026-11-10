import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CentroCostoDTO {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class CostosApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/costos/centros`;

  getCentrosCosto(): Observable<CentroCostoDTO[]> {
    return this.http.get<CentroCostoDTO[]>(this.base);
  }

  crearCentroCosto(dto: Partial<CentroCostoDTO>): Observable<CentroCostoDTO> {
    return this.http.post<CentroCostoDTO>(this.base, dto);
  }
}
