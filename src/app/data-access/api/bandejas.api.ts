import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BandejaTrabajoResumenDTO } from '../dto/bandejas.dto';

@Injectable({ providedIn: 'root' })
export class BandejasApi {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/admin/bandejas-trabajo`;

  getResumen(): Observable<BandejaTrabajoResumenDTO> {
    return this.http.get<BandejaTrabajoResumenDTO>(`${this.base}/resumen`);
  }
}
