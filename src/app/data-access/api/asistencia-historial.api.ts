import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  AsistenciaDashboardHistorialRequest,
  AsistenciaDashboardHistorialResponse,
} from '../dto/asistencia-historial.dto';

@Injectable({ providedIn: 'root' })
export class AsistenciaHistorialApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api/v1/asistencias/dashboard-historial`;

  getDashboard(
    request: AsistenciaDashboardHistorialRequest,
  ) {
    let params = new HttpParams();
    Object.entries(request).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<AsistenciaDashboardHistorialResponse>(this.base, { params });
  }
}
