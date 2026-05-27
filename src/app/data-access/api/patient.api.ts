import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { localDateYmd } from '../../shared/utils/date-local.util';
import {
  PacienteDTO,
  CreatePacienteRequest,
  FichaAfiliadoDTO,
  MiembroGrupoFamiliarDTO,
  AddMiembroRequest,
  FacturaDTO,
  RegistrarPagoRequest,
  PagoResponseDTO,
  CrearCoberturaRequest,
  ConsumoMensualDTO,
  OrdenMedicaDTO,
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

  /**
   * Crea un nuevo grupo familiar para el titular.
   * Útil al dar de alta nuevos afiliados y establecer su cuenta de cobro.
   * 
   * @param req Estructura con número de cuenta auto-generado, estado y empresa vinculada (multi-tenant).
   * @returns Observable con el ID del grupo familiar creado.
   */
  createGrupoFamiliar(req: { numeroCuenta: string; estadoGrupo: 'ACTIVO' | 'INACTIVO'; empresa: { id: number } }): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${environment.apiUrl}/api/grupo-familiars`, req);
  }

  /**
   * Obtiene la lista de membresías familiares asociadas a un grupo familiar específico.
   * Permite reconstruir e identificar con total fidelidad a todos los dependientes vinculados
   * en la base de datos real (con sus DNIs, géneros, ID de paciente y ID de miembro).
   * 
   * @param grupoFamiliarId Identificador único del grupo familiar en el backend.
   * @returns Observable que emite un arreglo de objetos tipados MiembroGrupoFamiliarDTO.
   */
  getMiembros(grupoFamiliarId: number): Observable<MiembroGrupoFamiliarDTO[]> {
    return this.http.get<MiembroGrupoFamiliarDTO[]>(`${this.miembrosBase}?grupoFamiliarId.equals=${grupoFamiliarId}`);
  }

  /**
   * Vincula un paciente existente a un grupo familiar, otorgándole un rol específico.
   * Esta operación es de naturaleza transaccional en el negocio y se ejecuta al registrar
   * un nuevo dependiente o configurar el titular inicial de una cuenta.
   * 
   * @param req Estructura AddMiembroRequest con rolFamiliar, fecha de ingreso, estado, empresa, grupo y paciente.
   * @returns Observable que emite la confirmación del backend.
   */
  addMiembro(req: AddMiembroRequest): Observable<unknown> {
    return this.http.post<unknown>(this.miembrosBase, req);
  }

  /**
   * Modifica el rol familiar (ej. de DEPENDIENTE a CO_TITULAR o viceversa) de una membresía activa.
   * Permite mantener la consistencia del grupo en base de datos si se edita el parentesco en la UI
   * de un familiar que ya estaba guardado, sin necesidad de darlo de baja y volverlo a crear.
   * 
   * @param miembroId Identificador único de la membresía familiar (MiembroGrupoFamiliar).
   * @param rol Nuevo rol asignado en el grupo familiar comercial.
   * @returns Observable que emite la confirmación del backend.
   */
  updateMiembroRol(miembroId: number, rol: 'TITULAR' | 'CO_TITULAR' | 'DEPENDIENTE'): Observable<unknown> {
    return this.http.patch<unknown>(`${this.miembrosBase}/${miembroId}`, {
      rolFamiliar: rol
    });
  }

  /**
   * Realiza la baja lógica de un miembro de grupo familiar en el backend.
   * Configura la fecha de salida al día de hoy, el estado en INACTIVA y asienta el motivo de cambio.
   * Esto libera la vacante familiar y previene cobros adicionales inconsistentes.
   * 
   * @param miembroId Identificador único del miembro a dar de baja.
   * @param motivo Explicación opcional del motivo de la baja (ej. 'Baja por edición de grupo').
   * @returns Observable que emite la respuesta del servidor.
   */
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

  /**
   * Dispara la emisión manual e individual de la factura mensual para un afiliado.
   * El backend procesará de forma segura su plan y estado actual para generar la deuda correspondiente.
   * 
   * @param pacienteId ID del paciente titular.
   * @param mes Mes opcional para la emisión.
   * @param anio Año opcional para la emisión.
   * @returns Observable con la respuesta del servidor.
   */
  generarFacturaIndividual(pacienteId: number, mes?: number, anio?: number): Observable<unknown> {
    let params = new HttpParams().set('pacienteId', String(pacienteId));
    if (mes) params = params.set('mes', String(mes));
    if (anio) params = params.set('anio', String(anio));
    return this.http.post<unknown>(`${this.facturacionBase}/generar-individual`, null, { params });
  }

  registrarPago(facturaId: number, req: RegistrarPagoRequest): Observable<PagoResponseDTO> {
    return this.http.post<PagoResponseDTO>(`${this.facturacionBase}/facturas/${facturaId}/pago`, req);
  }

  crearCobertura(pacienteId: number, req: CrearCoberturaRequest): Observable<unknown> {
    return this.http.post<unknown>(`${this.afiliadosBase}/${pacienteId}/coberturas`, req);
  }

  getConsumoMensual(pacienteId: number): Observable<ConsumoMensualDTO> {
    return this.http.get<ConsumoMensualDTO>(`${this.afiliadosBase}/${pacienteId}/consumo-mensual`);
  }

  getOrdenesMedicas(pacienteId: number): Observable<OrdenMedicaDTO[]> {
    return this.http.get<OrdenMedicaDTO[]>(`${environment.apiUrl}/api/ordenes-medicas/paciente/${pacienteId}`);
  }
}
