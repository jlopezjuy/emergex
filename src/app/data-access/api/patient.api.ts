import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PacienteDTO } from '../dto/patient.dto';

@Injectable({ providedIn: 'root' })
export class PatientApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/pacientes`;

  getAll(): Observable<PacienteDTO[]> {
    return this.http.get<PacienteDTO[]>(this.base);
  }

  getById(id: number): Observable<PacienteDTO> {
    return this.http.get<PacienteDTO>(`${this.base}/${id}`);
  }
}
