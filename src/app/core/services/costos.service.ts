import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CentroCosto } from '../models/costos.model';

@Injectable({
  providedIn: 'root',
})
export class CostosService {
  private http = inject(HttpClient);
  private apiUrl = '/api/costos';

  getCentrosCosto(): Observable<CentroCosto[]> {
    return this.http.get<CentroCosto[]>(`${this.apiUrl}/centros`);
  }

  crearCentroCosto(centro: CentroCosto): Observable<CentroCosto> {
    return this.http.post<CentroCosto>(`${this.apiUrl}/centros`, centro);
  }
}
