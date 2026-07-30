import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ComprobanteProveedor, RecepcionBienes } from '../models/recepcion-matching.model';

@Injectable({
  providedIn: 'root',
})
export class MatchingService {
  private http = inject(HttpClient);
  private apiUrl = '/api/matching';

  getRecepciones(): Observable<RecepcionBienes[]> {
    return this.http.get<RecepcionBienes[]>(`${this.apiUrl}/recepciones`);
  }

  getComprobantesProveedor(): Observable<ComprobanteProveedor[]> {
    return this.http.get<ComprobanteProveedor[]>(`${this.apiUrl}/comprobantes`);
  }
}
