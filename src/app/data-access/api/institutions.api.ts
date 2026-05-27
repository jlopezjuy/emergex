import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ContractDTO, ContractStatus, InstitutionDTO, InstitutionType } from '../dto/institution.dto';

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
  direccion?: string;
  latitud?: number;
  longitud?: number;
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

function toDTO(b: InstitucionBackend): InstitutionDTO {
  return {
    id:           String(b.id),
    name:         b.nombreFantasia,
    razonSocial:  b.razonSocial ?? '',
    cuit:         b.cuit ?? '',
    type:         mapTipoToFrontend(b.tipoInstitucion),
    status:       b.activa ? 'activa' : 'inactiva',
    plan:         b.planComercialNombre ?? '',
    email:        b.email,
    phone:        b.telefono,
    adminContact: b.contactoAdministrativo,
    opsContact:   b.contactoOperativo,
    address:      b.direccion,
    lat:          b.latitud,
    lng:          b.longitud,
  };
}

function toBackend(dto: InstitutionDTO): Omit<InstitucionBackend, 'id' | 'planComercialNombre'> & { id?: number } {
  return {
    ...(dto.id ? { id: Number(dto.id) } : {}),
    nombreFantasia:        dto.name,
    razonSocial:           dto.razonSocial || undefined,
    cuit:                  dto.cuit || undefined,
    tipoInstitucion:       mapTipoToBackend(dto.type),
    activa:                dto.status === 'activa',
    telefono:              dto.phone || undefined,
    email:                 dto.email || undefined,
    contactoAdministrativo: dto.adminContact || undefined,
    contactoOperativo:     dto.opsContact || undefined,
    direccion:             dto.address || undefined,
    latitud:               dto.lat,
    longitud:              dto.lng,
  };
}

@Injectable({ providedIn: 'root' })
export class InstitutionsApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v2/instituciones`;

  getAll(): Observable<InstitutionDTO[]> {
    return this.http.get<InstitucionBackend[]>(this.base).pipe(
      map(list => list.map(toDTO)),
    );
  }

  create(dto: InstitutionDTO): Observable<InstitutionDTO> {
    return this.http.post<InstitucionBackend>(this.base, toBackend(dto)).pipe(
      map(toDTO),
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

  // ── ContratoCobertura ────────────────────────────────────────────────────────

  private contratoBase = `${environment.apiUrl}/api/v2/contratos-cobertura`;

  getContratosByInstitucion(institucionId: number): Observable<ContractDTO[]> {
    return this.http
      .get<BackendPage<ContratoBackend>>(
        `${this.contratoBase}?institucionId.equals=${institucionId}&size=50`,
      )
      .pipe(map(page => page.content.map(contratoToDTO)));
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
}
