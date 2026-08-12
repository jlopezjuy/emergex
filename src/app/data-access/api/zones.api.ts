import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ZonaCoberturaDTO {
  id?: number;
  nombre: string;
  codigoPostal: string;
}

export interface TarifaPrestacionZonaDTO {
  id?: number;
  cargoMinimo: number;
  costoEspera30Min: number;
  prestacion: {
    id: number;
    nombre: string;
    codigo: string;
  };
  zona: {
    id: number;
    nombre: string;
    codigoPostal: string;
  };
}

// El formulario de alta sólo tiene los ids de prestación/zona (vienen de un <select>); nombre y
// código son campos de sólo lectura que el backend ya conoce. Partial<TarifaPrestacionZonaDTO>
// no alcanza para esto: sólo relaja las claves de primer nivel, no los campos anidados.
export interface TarifaPrestacionZonaWriteRequest {
  cargoMinimo: number;
  costoEspera30Min: number;
  prestacion: { id: number };
  zona: { id: number };
}

export interface PrestacionMedicaDTO {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipoAsistencia: string;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class ZonesApiService {
  private http = inject(HttpClient);
  private zonesBase = `${environment.apiUrl}/api/zonas-cobertura`;
  private tariffsBase = `${environment.apiUrl}/api/tarifas-prestacion-zona`;
  private prestacionsBase = `${environment.apiUrl}/api/prestaciones-medicas`;

  // ── Zones ──
  getZones(): Observable<ZonaCoberturaDTO[]> {
    return this.http.get<ZonaCoberturaDTO[]>(this.zonesBase);
  }

  createZone(dto: ZonaCoberturaDTO): Observable<ZonaCoberturaDTO> {
    return this.http.post<ZonaCoberturaDTO>(this.zonesBase, dto);
  }

  updateZone(id: number, dto: ZonaCoberturaDTO): Observable<ZonaCoberturaDTO> {
    return this.http.put<ZonaCoberturaDTO>(`${this.zonesBase}/${id}`, dto);
  }

  deleteZone(id: number): Observable<void> {
    return this.http.delete<void>(`${this.zonesBase}/${id}`);
  }

  // ── Tariffs ──
  getTariffs(): Observable<TarifaPrestacionZonaDTO[]> {
    return this.http.get<TarifaPrestacionZonaDTO[]>(this.tariffsBase);
  }

  createTariff(dto: TarifaPrestacionZonaWriteRequest): Observable<TarifaPrestacionZonaDTO> {
    return this.http.post<TarifaPrestacionZonaDTO>(this.tariffsBase, dto);
  }

  updateTariff(id: number, dto: TarifaPrestacionZonaWriteRequest): Observable<TarifaPrestacionZonaDTO> {
    return this.http.put<TarifaPrestacionZonaDTO>(`${this.tariffsBase}/${id}`, dto);
  }

  deleteTariff(id: number): Observable<void> {
    return this.http.delete<void>(`${this.tariffsBase}/${id}`);
  }

  // ── Prestaciones ──
  getPrestaciones(): Observable<PrestacionMedicaDTO[]> {
    return this.http.get<PrestacionMedicaDTO[]>(this.prestacionsBase);
  }
}
