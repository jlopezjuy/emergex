import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AreaProtegidaDTO } from '../dto/hospital.dto';

@Injectable({ providedIn: 'root' })
export class HospitalApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api`;

  getAll(): Observable<AreaProtegidaDTO[]> {
    return this.http.get<AreaProtegidaDTO[]>(`${this.base}/area-protegidas`);
  }
}
