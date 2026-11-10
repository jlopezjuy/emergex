import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlanObraSocialDTO, Provincia } from '../dto/plan-obra-social.dto';

@Injectable({ providedIn: 'root' })
export class PlanObraSocialApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/plan-obra-sociales`;

  getByObraSocial(obraSocialId: number): Observable<PlanObraSocialDTO[]> {
    return this.http.get<PlanObraSocialDTO[]>(this.base, {
      params: { 'obraSocialId.equals': String(obraSocialId), sort: 'nombre,asc', size: '200' },
    });
  }

  create(dto: Omit<PlanObraSocialDTO, 'id'>): Observable<PlanObraSocialDTO> {
    return this.http.post<PlanObraSocialDTO>(this.base, dto);
  }

  update(dto: PlanObraSocialDTO): Observable<PlanObraSocialDTO> {
    return this.http.put<PlanObraSocialDTO>(`${this.base}/${dto.id}`, dto);
  }

  getProvincias(planId: number): Observable<Provincia[]> {
    return this.http.get<Provincia[]>(`${this.base}/${planId}/provincias`);
  }

  /** Reemplaza el conjunto completo de provincias cubiertas — no es un add/remove incremental. */
  setProvincias(planId: number, provincias: Provincia[]): Observable<Provincia[]> {
    return this.http.put<Provincia[]>(`${this.base}/${planId}/provincias`, provincias);
  }
}
