import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ConciliacionInstitucionalCierreDTO } from '../dto/conciliacion-cierre.dto';

@Injectable({
  providedIn: 'root',
})
export class ConciliacionCierreApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/conciliacion-institucional-cierres`;

  getByInstitucion(institucionId: number): Observable<ConciliacionInstitucionalCierreDTO[]> {
    return this.http.get<ConciliacionInstitucionalCierreDTO[]>(`${this.baseUrl}?institucionId.equals=${institucionId}`);
  }

  crearCierre(payload: ConciliacionInstitucionalCierreDTO): Observable<ConciliacionInstitucionalCierreDTO> {
    return this.http.post<ConciliacionInstitucionalCierreDTO>(this.baseUrl, payload);
  }
}
