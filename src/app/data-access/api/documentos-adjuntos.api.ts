import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DocumentoAdjuntoDTO {
  id?: number;
  entidadTipo: string;
  entidadId: number;
  tipoDocumento: string;
  nombreArchivo: string;
  urlArchivo: string;
  vigenciaDesde?: string;
  vigenciaHasta?: string;
  createdAt?: string;
}

export interface AdjuntarDocumentoRequestDTO {
  entidadTipo: string;
  entidadId: number;
  tipoDocumento: string;
  nombreArchivo: string;
  urlArchivo: string;
  vigenciaDesde?: string;
  vigenciaHasta?: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentosAdjuntosApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/admin/documentos-adjuntos`;

  adjuntarDocumento(req: AdjuntarDocumentoRequestDTO): Observable<DocumentoAdjuntoDTO> {
    return this.http.post<DocumentoAdjuntoDTO>(this.base, req);
  }

  getDocumentosPorEntidad(entidadTipo: string, entidadId: number): Observable<DocumentoAdjuntoDTO[]> {
    return this.http.get<DocumentoAdjuntoDTO[]>(`${this.base}/${entidadTipo}/${entidadId}`);
  }
}
