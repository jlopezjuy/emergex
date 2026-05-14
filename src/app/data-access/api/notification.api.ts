import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface NotificationLog {
  id: number;
  tipo?: string;
  mensaje?: string;
  destinatario?: string;
  fecha?: string;
  leida?: boolean;
}

export interface EnviarNotificacionRequest {
  destinatario: string;
  mensaje: string;
  tipo?: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v1/notificaciones`;

  getLog(params?: Record<string, string>): Observable<NotificationLog[]> {
    return this.http.get<NotificationLog[]>(`${this.base}/log`, { params });
  }

  enviar(req: EnviarNotificacionRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.base}/enviar`, req);
  }
}
