import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BusquedaGlobalResultadoDTO } from '../dto/busqueda-global.dto';

@Injectable({
  providedIn: 'root'
})
export class BusquedaGlobalApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/v1/busqueda-global`;

  buscar(query: string, limite: number = 10): Observable<BusquedaGlobalResultadoDTO> {
    let params = new HttpParams().set('query', query);
    if (limite) {
      params = params.set('limite', limite.toString());
    }
    return this.http.get<BusquedaGlobalResultadoDTO>(this.baseUrl, { params });
  }
}
