import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ImportarPadronObraSocialResultDTO, ObraSocialDTO } from '../dto/obra-social.dto';

@Injectable({ providedIn: 'root' })
export class ObrasSocialesApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/obra-socials`;

  /** Catálogo global (sin tenant): trae activas e inactivas, size alto porque no se pagina en UI. */
  getAll(params: { nombre?: string; activa?: boolean } = {}): Observable<ObraSocialDTO[]> {
    const query: Record<string, string> = { size: '500', sort: 'nombre,asc' };
    if (params.nombre) query['nombre.contains'] = params.nombre;
    if (params.activa != null) query['activa.equals'] = String(params.activa);
    return this.http.get<ObraSocialDTO[]>(this.base, { params: query });
  }

  getById(id: number): Observable<ObraSocialDTO> {
    return this.http.get<ObraSocialDTO>(`${this.base}/${id}`);
  }

  create(dto: Omit<ObraSocialDTO, 'id'>): Observable<ObraSocialDTO> {
    return this.http.post<ObraSocialDTO>(this.base, dto);
  }

  update(dto: ObraSocialDTO): Observable<ObraSocialDTO> {
    return this.http.put<ObraSocialDTO>(`${this.base}/${dto.id}`, dto);
  }

  /** Baja lógica (activa=false) — el backend nunca borra físicamente, preserva historial de coberturas. */
  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  importarPadron(file: File): Observable<ImportarPadronObraSocialResultDTO> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportarPadronObraSocialResultDTO>(`${this.base}/importar-padron`, formData);
  }
}
