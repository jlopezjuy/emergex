import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import {
  AltaInstitucionCompletaRequest,
  AltaInstitucionCompletaResponse,
  ContractDTO,
  ContractStatus,
  EstadoInstitucion,
  FacturacionContratoDTO,
  GenerarFacturaContratoRequest,
  PagoInstitucionalResponseDTO,
  PagoInstitucionalItemDTO,
  ContratoCoberturaPlanDTO,
  RegistrarPagoInstitucionalRequest,
  InstitucionEstadoCuentaDTO,
  InstitutionDTO,
  InstitutionType,
  InstitucionMiembroItem,
} from '../dto/institution.dto';

// ── ContratoCobertura backend types ──────────────────────────────────────────

type EstadoContrato = 'BORRADOR' | 'ACTIVO' | 'SUSPENDIDO' | 'VENCIDO' | 'RESCINDIDO' | 'EN_RENEGOCIACION' | 'FINALIZADO' | 'ANULADO';

interface ContratoBackend {
  id?: number;
  codigo: string;
  modalidadCobertura: 'INDIVIDUAL_PLAN' | 'AREA_PROTEGIDA' | 'EVENTO';
  vigenciaDesde: string;
  vigenciaHasta: string;
  estadoContrato: EstadoContrato;
  precioMensualAcordado: number;
  precioEventoAcordado?: number;
  topeAtencionesMensuales: number;
  kpiRespuestaMinutos: number;
  condicionesParticulares?: string;
  institucion: { id: number };
  planComercial: { id: number };
  nombre?: string;
}

interface BackendPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

const STATUS_TO_BACKEND: Record<ContractStatus, EstadoContrato> = {
  active:    'ACTIVO',
  suspended: 'SUSPENDIDO',
  ended:     'FINALIZADO',
  draft:     'BORRADOR',
};

const STATUS_FROM_BACKEND: Partial<Record<EstadoContrato, ContractStatus>> = {
  ACTIVO:     'active',
  SUSPENDIDO: 'suspended',
  FINALIZADO: 'ended',
  VENCIDO:    'ended',
  RESCINDIDO: 'ended',
  BORRADOR:   'draft',
};

function contratoToDTO(b: ContratoBackend): ContractDTO {
  return {
    id:           b.id,
    code:         b.codigo ?? '',
    plan:         b.planComercial ? String(b.planComercial.id) : '',
    from:         b.vigenciaDesde ? b.vigenciaDesde.split('T')[0] : '',
    to:           b.vigenciaHasta ? b.vigenciaHasta.split('T')[0] : '',
    status:       STATUS_FROM_BACKEND[b.estadoContrato] ?? 'draft',
    monthlyPrice: b.precioMensualAcordado ?? 0,
    eventPrice:   b.precioEventoAcordado ?? undefined,
    monthlyCap:   b.topeAtencionesMensuales ?? 0,
    kpiMinutes:   b.kpiRespuestaMinutos ?? 0,
    conditions:   b.condicionesParticulares,
  };
}

function contratoToBackend(dto: ContractDTO, institucionId: number, planNumericId: number): Omit<ContratoBackend, 'id'> & { id?: number } {
  return {
    ...(dto.id ? { id: dto.id } : {}),
    codigo:                  dto.code,
    modalidadCobertura:      'AREA_PROTEGIDA',
    vigenciaDesde:           dto.from ? dto.from + 'T00:00:00Z' : '',
    vigenciaHasta:           dto.to   ? dto.to   + 'T00:00:00Z' : '',
    estadoContrato:          STATUS_TO_BACKEND[dto.status],
    precioMensualAcordado:   dto.monthlyPrice,
    precioEventoAcordado:    dto.eventPrice ?? undefined,
    topeAtencionesMensuales: dto.monthlyCap,
    kpiRespuestaMinutos:     dto.kpiMinutes,
    condicionesParticulares: dto.conditions || undefined,
    institucion:             { id: institucionId },
    planComercial:           { id: planNumericId },
  };
}

interface InstitucionBackend {
  id: number;
  nombreFantasia: string;
  razonSocial?: string;
  cuit?: string;
  tipoInstitucion?: string;
  telefono?: string;
  email?: string;
  contactoAdministrativo?: string;
  contactoOperativo?: string;
  activa: boolean;
  estadoInstitucional?: string;
  direccion?: string;
  latitud?: number;
  longitud?: number;
  perimetroJson?: string;
  empresaId?: number;
  planComercialNombre?: string;
}

type TipoInstitucion =
  | 'ESCUELA' | 'JARDIN' | 'COLEGIO_SECUNDARIO'
  | 'UNIVERSIDAD'
  | 'SHOPPING' | 'EMPRESA'
  | 'CLUB' | 'GIMNASIO'
  | 'GERIATRICO'
  | 'ORGANISMO_PUBLICO'
  | 'EVENTO' | 'OTRO';

function mapTipoToFrontend(tipo?: string): InstitutionType {
  switch (tipo as TipoInstitucion) {
    case 'ESCUELA':
    case 'JARDIN':
    case 'COLEGIO_SECUNDARIO': return 'colegio';
    case 'UNIVERSIDAD':        return 'universidad';
    case 'SHOPPING':
    case 'EMPRESA':            return 'empresa';
    case 'CLUB':
    case 'GIMNASIO':           return 'club';
    case 'GERIATRICO':         return 'hospital';
    case 'ORGANISMO_PUBLICO':  return 'gobierno';
    case 'EVENTO':
    case 'OTRO':
    default:                   return 'otro';
  }
}

function mapTipoToBackend(type: InstitutionType): string {
  switch (type) {
    case 'colegio':     return 'COLEGIO_SECUNDARIO';
    case 'universidad': return 'UNIVERSIDAD';
    case 'empresa':     return 'EMPRESA';
    case 'club':        return 'CLUB';
    case 'hospital':    return 'GERIATRICO';
    case 'gobierno':    return 'ORGANISMO_PUBLICO';
    case 'ong':
    case 'otro':
    default:            return 'OTRO';
  }
}

function parsePolygon(json?: string): [number, number][] | undefined {
  if (!json) return undefined;
  try { return JSON.parse(json) as [number, number][]; } catch { return undefined; }
}

function toDTO(b: InstitucionBackend): InstitutionDTO {
  return {
    id:           String(b.id),
    name:         b.nombreFantasia,
    razonSocial:  b.razonSocial ?? '',
    cuit:         b.cuit ?? '',
    type:         mapTipoToFrontend(b.tipoInstitucion),
    status:       (b.estadoInstitucional as EstadoInstitucion) ?? (b.activa ? 'ACTIVA' : 'BAJA'),
    plan:         b.planComercialNombre ?? '',
    email:        b.email,
    phone:        b.telefono,
    adminContact: b.contactoAdministrativo,
    opsContact:   b.contactoOperativo,
    address:      b.direccion,
    lat:          b.latitud,
    lng:          b.longitud,
    polygon:      parsePolygon(b.perimetroJson),
  };
}

function toBackend(dto: InstitutionDTO): Omit<InstitucionBackend, 'id'> & { id?: number } {
  return {
    ...(dto.id ? { id: Number(dto.id) } : {}),
    nombreFantasia:        dto.name,
    razonSocial:           dto.razonSocial || undefined,
    cuit:                  dto.cuit || undefined,
    tipoInstitucion:       mapTipoToBackend(dto.type),
    activa:                dto.status === 'ACTIVA',
    estadoInstitucional:   dto.status,
    telefono:              dto.phone || undefined,
    email:                 dto.email || undefined,
    contactoAdministrativo: dto.adminContact || undefined,
    contactoOperativo:     dto.opsContact || undefined,
    direccion:             dto.address || undefined,
    latitud:               dto.lat,
    longitud:              dto.lng,
    perimetroJson:         dto.polygon?.length ? JSON.stringify(dto.polygon) : undefined,
    planComercialNombre:   dto.plan || undefined,
  };
}

@Injectable({ providedIn: 'root' })
export class InstitutionsApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v2/instituciones`;

  getAll(): Observable<InstitutionDTO[]> {
    return this.http.get<InstitucionBackend[]>(`${this.base}?size=1000`).pipe(
      map(list => list.map(toDTO)),
    );
  }

  create(dto: InstitutionDTO): Observable<InstitutionDTO> {
    return this.http.post<InstitucionBackend>(this.base, toBackend(dto)).pipe(
      map(toDTO),
    );
  }

  altaCompleta(req: AltaInstitucionCompletaRequest): Observable<AltaInstitucionCompletaResponse> {
    const payload = {
      institucion: toBackend(req.institucion as InstitutionDTO),
      contratoInicial: req.contratoInicial
        ? {
            ...req.contratoInicial,
            vigenciaDesde: req.contratoInicial.vigenciaDesde
              ? `${req.contratoInicial.vigenciaDesde}T00:00:00Z`
              : req.contratoInicial.vigenciaDesde,
            vigenciaHasta: req.contratoInicial.vigenciaHasta
              ? `${req.contratoInicial.vigenciaHasta}T00:00:00Z`
              : req.contratoInicial.vigenciaHasta,
          }
        : undefined,
    };
    return this.http.post<any>(`${this.base}/alta-completa`, payload).pipe(
      map(res => ({
        institucion: toDTO(res.institucion),
        contratoCobertura: res.contratoCobertura,
      }))
    );
  }

  update(dto: InstitutionDTO): Observable<InstitutionDTO> {
    return this.http.put<InstitucionBackend>(`${this.base}/${dto.id}`, toBackend(dto)).pipe(
      map(toDTO),
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  patchInstitucion(id: number, patch: Partial<Pick<InstitucionBackend, 'perimetroJson'>>): Observable<InstitutionDTO> {
    return this.http.patch<InstitucionBackend>(`${this.base}/${id}`, { id, ...patch }).pipe(map(toDTO));
  }

  // ── ContratoCobertura ────────────────────────────────────────────────────────

  private contratoBase = `${environment.apiUrl}/api/v2/contratos-cobertura`;

  getContratosByInstitucion(institucionId: number): Observable<ContractDTO[]> {
    return this.http
      .get<ContratoBackend[]>(`${this.contratoBase}/institucion/${institucionId}`)
      .pipe(map(list => list.map(contratoToDTO)));
  }

  /** All active contracts for the current empresa (multi-tenant filtered server-side). */
  getAllContratosActivos(): Observable<ContractDTO[]> {
    return this.http
      .get<ContratoBackend[]>(`${this.contratoBase}?estadoContrato.equals=ACTIVO&size=100`)
      .pipe(map(list => list.map(contratoToDTO)));
  }

  getMiembros(institucionId: number, page = 0, size = 50): Observable<InstitucionMiembroItem[]> {
    return this.http.get<any[]>(
      `${environment.apiUrl}/api/v2/instituciones/${institucionId}/miembros`,
      { params: { page: page.toString(), size: size.toString() } }
    ).pipe(
      map(list => list.map(m => ({
        id: m.id,
        nombre: m.nombre ?? '',
        apellido: m.apellido ?? '',
        dni: m.dni,
        telefono: m.telefono,
        rol: m.rol ?? '',
        vigenciaDesde: m.vigenciaDesde,
        vigenciaHasta: m.vigenciaHasta,
        activo: m.activo ?? true,
      } as InstitucionMiembroItem)))
    );
  }

  saveContrato(dto: ContractDTO, institucionId: number, planNumericId: number): Observable<ContractDTO> {
    const body = contratoToBackend(dto, institucionId, planNumericId);
    if (dto.id) {
      return this.http
        .put<ContratoBackend>(`${this.contratoBase}/${dto.id}`, body)
        .pipe(map(contratoToDTO));
    }
    return this.http
      .post<ContratoBackend>(this.contratoBase, body)
      .pipe(map(contratoToDTO));
  }

  // ── Planes por contrato ──────────────────────────────────────────────────────

  private planesBase = `${environment.apiUrl}/api/v2/contratos-cobertura`;

  getPlanesByContrato(contratoId: number): Observable<ContratoCoberturaPlanDTO[]> {
    return this.http.get<ContratoCoberturaPlanDTO[]>(`${this.planesBase}/${contratoId}/planes`);
  }

  addPlanToContrato(contratoId: number, plan: Omit<ContratoCoberturaPlanDTO, 'id'>): Observable<ContratoCoberturaPlanDTO> {
    return this.http.post<ContratoCoberturaPlanDTO>(`${this.planesBase}/${contratoId}/planes`, plan);
  }

  // ── Facturación institucional ────────────────────────────────────────────────

  private facturacionInstBase = `${environment.apiUrl}/api/v2/facturacion-institucional`;

  generarFacturaInstitucional(req: GenerarFacturaContratoRequest): Observable<FacturacionContratoDTO> {
    return this.http.post<FacturacionContratoDTO>(`${this.facturacionInstBase}/generar`, req);
  }

  getFacturasByContrato(contratoId: number): Observable<FacturacionContratoDTO[]> {
    return this.http.get<FacturacionContratoDTO[]>(`${this.facturacionInstBase}/contrato/${contratoId}`);
  }

  getAllFacturasInstitucionales(page = 0, size = 50): Observable<FacturacionContratoDTO[]> {
    return this.http.get<FacturacionContratoDTO[]>(`${this.facturacionInstBase}`, {
      params: { page: String(page), size: String(size), sort: 'periodoDesde,desc' }
    });
  }

  registrarPagoFacturaInstitucional(facturacionContratoId: number, req: RegistrarPagoInstitucionalRequest): Observable<PagoInstitucionalResponseDTO> {
    return this.http.post<PagoInstitucionalResponseDTO>(`${this.facturacionInstBase}/${facturacionContratoId}/pagos`, req);
  }

  getPagosFacturaInstitucional(facturacionContratoId: number): Observable<PagoInstitucionalItemDTO[]> {
    return this.http.get<PagoInstitucionalItemDTO[]>(`${this.facturacionInstBase}/${facturacionContratoId}/pagos`);
  }

  // ── Estado institucional ─────────────────────────────────────────────────────

  cambiarEstadoInstitucion(id: number, estado: EstadoInstitucion): Observable<InstitutionDTO> {
    return this.http.patch<InstitucionBackend>(
      `${environment.apiUrl}/api/v2/instituciones/${id}/estado`,
      JSON.stringify(estado),
      { headers: { 'Content-Type': 'application/json' } }
    ).pipe(map(toDTO));
  }

  getEstadoCuentaInstitucion(id: number): Observable<InstitucionEstadoCuentaDTO> {
    return this.http.get<InstitucionEstadoCuentaDTO>(`${this.base}/${id}/estado-cuenta`);
  }

  getEstadoDeudaInstitucion(id: number): Observable<InstitucionEstadoCuentaDTO> {
    return this.http.get<InstitucionEstadoCuentaDTO>(`${this.base}/${id}/estado-deuda`);
  }

  suspenderPorDeuda(id: number, motivo: string, forzarConDeuda = false, autorizadoPor?: string): Observable<InstitutionDTO> {
    return this.http.post<InstitucionBackend>(
      `${this.base}/${id}/suspender-por-deuda`,
      { motivo, forzarConDeuda, autorizadoPor },
    ).pipe(map(toDTO));
  }

  reactivarInstitucion(id: number, motivo: string, forzarConDeuda = false, autorizadoPor?: string): Observable<InstitutionDTO> {
    return this.http.post<InstitucionBackend>(
      `${this.base}/${id}/reactivar`,
      { motivo, forzarConDeuda, autorizadoPor },
    ).pipe(map(toDTO));
  }

  importarPadron(contratoId: number, file: File): Observable<string> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${environment.apiUrl}/api/v2/contratos-institucionales/${contratoId}/importar-padron`, formData, {
      responseType: 'text'
    });
  }
}
