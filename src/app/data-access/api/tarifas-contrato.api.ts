import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TarifaContratoDTO } from '../dto/tarifas-contrato.dto';

@Injectable({
  providedIn: 'root',
})
export class TarifasContratoApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/tarifas-contrato`;

  getTarifasByContrato(contratoId?: number): Observable<TarifaContratoDTO[]> {
    const url = contratoId != null ? `${this.baseUrl}?contratoId=${contratoId}` : this.baseUrl;
    return this.http.get<TarifaContratoDTO[]>(url);
  }

  getTarifaById(id: number): Observable<TarifaContratoDTO> {
    return this.http.get<TarifaContratoDTO>(`${this.baseUrl}/${id}`);
  }

  createTarifa(tarifa: TarifaContratoDTO): Observable<TarifaContratoDTO> {
    return this.http.post<TarifaContratoDTO>(this.baseUrl, tarifa);
  }

  updateTarifa(id: number, tarifa: TarifaContratoDTO): Observable<TarifaContratoDTO> {
    return this.http.put<TarifaContratoDTO>(`${this.baseUrl}/${id}`, tarifa);
  }

  deleteTarifa(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
