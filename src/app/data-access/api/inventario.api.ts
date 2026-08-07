import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Lote {
  id: string;
  producto: string;
  cantidad: number;
  fechaVencimiento: string;
}

export interface MovimientoInventario {
  id: string;
  producto: string;
  cantidad: number;
  fecha: string;
  loteId: string;
}

@Injectable({
  providedIn: 'root'
})
export class InventarioApi {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/inventario`;

  getStock(): Observable<Lote[]> {
    return this.http.get<Lote[]>(`${this.apiUrl}/stock`);
  }

  getConsumosFefo(): Observable<MovimientoInventario[]> {
    return this.http.get<MovimientoInventario[]>(`${this.apiUrl}/consumos-fefo`);
  }
}
