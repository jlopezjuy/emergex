import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HospitalDTO } from '../dto/hospital.dto';

@Injectable({ providedIn: 'root' })
export class HospitalApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  getAll(): Observable<HospitalDTO[]> {
    return this.http.get<HospitalDTO[]>(`${this.base}/hospitales`);
  }

  crear(dto: HospitalDTO): Observable<HospitalDTO> {
    return this.http.post<HospitalDTO>(`${this.base}/hospitales`, dto);
  }

  actualizar(id: number, dto: HospitalDTO): Observable<HospitalDTO> {
    return this.http.put<HospitalDTO>(`${this.base}/hospitales/${id}`, dto);
  }
}


