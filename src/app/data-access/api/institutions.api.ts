import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { InstitutionDTO, InstitutionType } from '../dto/institution.dto';

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
}
