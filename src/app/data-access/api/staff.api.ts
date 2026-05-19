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

export interface IProfesionalOnboardingRequest {
  profesional: {
    nombre: string;
    apellido: string;
    matricula: string;
    documento?: string | null;
    telefono?: string | null;
    email?: string | null;
    atencionDomiciliaria: boolean;
    atencionEmergencia: boolean;
    activo: boolean;
  };
  especialidades: {
    especialidadPrincipalId: number;
    subespecialidadIds: number[];
  };
  usuario: {
    username?: string | null;
    email?: string | null;
    passwordTemporal?: string | null;
    authorities: string[];
  };
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
  createdAt: string;
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
  private v2 = `${environment.apiUrl}/api/v2/profesionales`;
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

  onboardingCreate(payload: IProfesionalOnboardingRequest): Observable<ProfesionalSaludDTO> {
    return this.http.post<ProfesionalSaludDTO>(`${this.v2}/onboarding`, payload);
  }

  onboardingUpdate(id: number, payload: IProfesionalOnboardingRequest): Observable<ProfesionalSaludDTO> {
    return this.http.put<ProfesionalSaludDTO>(`${this.v2}/onboarding/${id}`, payload);
  }

  getAuthorities(): Observable<string[]> {
    return this.http.get<string[]>(`${this.v2}/authorities`);
  }

  getAuthoritiesByProfesional(id: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.v2}/${id}/authorities`);
  }
}
