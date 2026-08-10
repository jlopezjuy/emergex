import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AreaProtegidaDTO } from '../dto/area-protegida.dto';

@Injectable({
  providedIn: 'root',
})
export class AreaProtegidaApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/area-protegidas`;

  getByInstitucion(institucionId: number): Observable<AreaProtegidaDTO[]> {
    return this.http.get<AreaProtegidaDTO[]>(`${this.baseUrl}?institucionId.equals=${institucionId}`);
  }

  getById(id: number): Observable<AreaProtegidaDTO> {
    return this.http.get<AreaProtegidaDTO>(`${this.baseUrl}/${id}`);
  }

  createAreaProtegida(area: AreaProtegidaDTO): Observable<AreaProtegidaDTO> {
    return this.http.post<AreaProtegidaDTO>(this.baseUrl, area);
  }

  updateAreaProtegida(id: number, area: AreaProtegidaDTO): Observable<AreaProtegidaDTO> {
    return this.http.put<AreaProtegidaDTO>(`${this.baseUrl}/${id}`, area);
  }

  deleteAreaProtegida(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
