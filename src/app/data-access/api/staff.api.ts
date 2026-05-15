import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProfesionalSaludDTO } from '../dto/staff.dto';

@Injectable({ providedIn: 'root' })
export class StaffApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  getProfesionales(): Observable<ProfesionalSaludDTO[]> {
    return this.http.get<ProfesionalSaludDTO[]>(`${this.base}/profesional-saluds`);
  }
}
