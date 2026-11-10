import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DebitoDocumentoDTO,
  RegistrarDebitoRequest,
  ActualizarEstadoDebitoRequest
} from '../dto/debitos.dto';

@Injectable({
  providedIn: 'root'
})
export class DebitosApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/debitos-documentos`;

  getDebitos(): Observable<DebitoDocumentoDTO[]> {
    return this.http.get<DebitoDocumentoDTO[]>(this.baseUrl);
  }

  getDebitoById(id: number): Observable<DebitoDocumentoDTO> {
    return this.http.get<DebitoDocumentoDTO>(`${this.baseUrl}/${id}`);
  }

  registrarDebito(req: RegistrarDebitoRequest): Observable<DebitoDocumentoDTO> {
    return this.http.post<DebitoDocumentoDTO>(this.baseUrl, req);
  }

  actualizarEstado(id: number, req: ActualizarEstadoDebitoRequest): Observable<DebitoDocumentoDTO> {
    return this.http.put<DebitoDocumentoDTO>(`${this.baseUrl}/${id}/estado`, req);
  }
}
