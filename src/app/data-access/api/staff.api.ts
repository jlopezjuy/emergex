import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProfesionalSaludDTO } from '../dto/staff.dto';

export interface SubespecialidadCatalogItem {
  id: number;
  nombre: string;
  descripcion?: string;
}

type CreateBody = Pick<ProfesionalSaludDTO,
  'nombre' | 'apellido' | 'activo' | 'atencionDomiciliaria' | 'atencionEmergencia'
> & Partial<Pick<ProfesionalSaludDTO,
  'matricula' | 'telefono' | 'email'
>> & {
  subespecialidads?: { id: number }[];
};

type PatchBody = { id: number } & Partial<Pick<ProfesionalSaludDTO,
  'nombre' | 'apellido' | 'matricula' | 'telefono' | 'email' |
  'atencionDomiciliaria' | 'atencionEmergencia' | 'activo'
>>;

type PutBody = {
  id: number;
  nombre: string;
  apellido: string;
  activo: boolean;
  atencionDomiciliaria: boolean;
  atencionEmergencia: boolean;
  matricula?: string;
  telefono?: string;
  email?: string;
  empresa: { id: number };
  user?: { id: number };
  subespecialidads: { id: number }[];
};

@Injectable({ providedIn: 'root' })
export class StaffApiService {
  private http = inject(HttpClient);
  private v1 = `${environment.apiUrl}/api/v1`;
  private crud = `${environment.apiUrl}/api/profesional-saluds`;

  getProfesionales(): Observable<ProfesionalSaludDTO[]> {
    return this.http.get<ProfesionalSaludDTO[]>(`${this.v1}/profesionales`);
  }

  getDisponibles(): Observable<ProfesionalSaludDTO[]> {
    return this.http.get<ProfesionalSaludDTO[]>(`${this.v1}/profesionales/disponibles`);
  }

  getSubespecialidadesCatalog(): Observable<SubespecialidadCatalogItem[]> {
    return this.http.get<SubespecialidadCatalogItem[]>(
      `${environment.apiUrl}/api/subespecialidads?size=200&sort=id,asc`
    );
  }

  create(body: CreateBody): Observable<ProfesionalSaludDTO> {
    return this.http.post<ProfesionalSaludDTO>(this.crud, body);
  }

  put(id: number, body: PutBody): Observable<ProfesionalSaludDTO> {
    return this.http.put<ProfesionalSaludDTO>(`${this.crud}/${id}`, body);
  }

  patch(id: number, body: PatchBody): Observable<ProfesionalSaludDTO> {
    return this.http.patch<ProfesionalSaludDTO>(`${this.crud}/${id}`, body);
  }
}
