import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { localDateYmd } from '../../shared/utils/date-local.util';
import {
  PacienteDTO,
  CreatePacienteRequest,
  FichaAfiliadoDTO,
  AddMiembroRequest,
  FacturaDTO,
  RegistrarPagoRequest,
  PagoResponseDTO,
  CrearCoberturaRequest,
} from '../dto/patient.dto';

@Injectable({ providedIn: 'root' })
export class PatientApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/pacientes`;
  private afiliadosBase = `${environment.apiUrl}/api/v1/afiliados`;
  private facturacionBase = `${environment.apiUrl}/api/v1/facturacion`;
  private miembrosBase = `${environment.apiUrl}/api/miembro-grupo-familiars`;

  getAll(): Observable<PacienteDTO[]> {
    return this.http.get<PacienteDTO[]>(this.base);
  }

  getById(id: number): Observable<PacienteDTO> {
    return this.http.get<PacienteDTO>(`${this.base}/${id}`);
  }

  create(req: CreatePacienteRequest): Observable<PacienteDTO> {
    return this.http.post<PacienteDTO>(this.base, req);
  }

  update(id: number, req: CreatePacienteRequest): Observable<PacienteDTO> {
    return this.http.put<PacienteDTO>(`${this.base}/${id}`, { ...req, id });
  }

  getFicha(pacienteId: number): Observable<FichaAfiliadoDTO> {
    return this.http.get<FichaAfiliadoDTO>(`${this.afiliadosBase}/${pacienteId}/ficha`);
  }

  addMiembro(req: AddMiembroRequest): Observable<unknown> {
    return this.http.post<unknown>(this.miembrosBase, req);
  }

  removeMiembro(miembroId: number, motivo?: string): Observable<unknown> {
    const today = localDateYmd();
    return this.http.patch<unknown>(`${this.miembrosBase}/${miembroId}`, {
      fechaSalida: today,
      estado: 'INACTIVA',
      motivoCambio: motivo ?? 'Baja solicitada',
    });
  }

  getFacturasAfiliado(pacienteId: number): Observable<FacturaDTO[]> {
    const params = new HttpParams()
      .set('pacienteId', String(pacienteId))
      .set('size', '20')
      .set('sort', 'fechaEmision,desc');
    return this.http.get<FacturaDTO[]>(`${this.facturacionBase}/facturas`, { params });
  }

  registrarPago(facturaId: number, req: RegistrarPagoRequest): Observable<PagoResponseDTO> {
    return this.http.post<PagoResponseDTO>(`${this.facturacionBase}/facturas/${facturaId}/pago`, req);
  }

  crearCobertura(pacienteId: number, req: CrearCoberturaRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.afiliadosBase}/${pacienteId}/coberturas`, req);
  }
}
