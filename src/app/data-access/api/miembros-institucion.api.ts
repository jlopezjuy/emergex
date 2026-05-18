import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface MiembroInstitucionDTO {
  id: number;
  nombre: string;
  apellido: string;
  rol?: string;
  dni?: string;
  activo?: boolean;
}

interface MiembroBackend {
  id: number;
  nombre?: string;
  apellido?: string;
  rol?: string;
  dni?: string;
  activo?: boolean;
}

function toDTO(b: MiembroBackend): MiembroInstitucionDTO {
  return {
    id:       b.id,
    nombre:   b.nombre ?? '',
    apellido: b.apellido ?? '',
    rol:      b.rol,
    dni:      b.dni,
    activo:   b.activo,
  };
}

@Injectable({ providedIn: 'root' })
export class MiembrosInstitucionApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v2/miembros-institucion`;

  search(query: string, institucionId: number): Observable<MiembroInstitucionDTO[]> {
    return this.http.get<MiembroBackend[]>(`${this.base}/search`, {
      params: { q: query, institucionId: String(institucionId) },
    }).pipe(map(list => list.map(toDTO)));
  }
}
