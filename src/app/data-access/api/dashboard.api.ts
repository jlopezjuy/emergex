import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardOperativoDTO } from '../dto/dashboard.dto';

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v1/dashboard`;

  operativo(fecha?: string): Observable<DashboardOperativoDTO> {
    const params = fecha ? `?fecha=${fecha}` : '';
    return this.http.get<DashboardOperativoDTO>(`${this.base}/operativo${params}`);
  }
}
