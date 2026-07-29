import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ConvenioObraSocialDTO, EstadoContratoConvenio } from '../dto/convenio-obra-social.dto';

interface ContratoCoberturaBackend {
  id: number;
  codigo?: string;
  modalidadCobertura: string;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  estadoContrato: EstadoContratoConvenio;
  condicionesParticulares?: string;
  obraSocial?: { id: number; nombre?: string };
}

function toDTO(b: ContratoCoberturaBackend): ConvenioObraSocialDTO {
  return {
    id: b.id,
    codigo: b.codigo,
    vigenciaDesde: b.vigenciaDesde ? b.vigenciaDesde.split('T')[0] : '',
    vigenciaHasta: b.vigenciaHasta ? b.vigenciaHasta.split('T')[0] : undefined,
    estadoContrato: b.estadoContrato,
    condicionesParticulares: b.condicionesParticulares,
    obraSocial: { id: b.obraSocial?.id ?? 0, nombre: b.obraSocial?.nombre },
  };
}

function toBackend(dto: ConvenioObraSocialDTO): Omit<ContratoCoberturaBackend, 'id'> & { id?: number } {
  return {
    ...(dto.id ? { id: dto.id } : {}),
    codigo: dto.codigo || undefined,
    modalidadCobertura: 'CONVENIO_OBRA_SOCIAL',
    vigenciaDesde: dto.vigenciaDesde + 'T00:00:00Z',
    vigenciaHasta: dto.vigenciaHasta ? dto.vigenciaHasta + 'T00:00:00Z' : undefined,
    estadoContrato: dto.estadoContrato,
    condicionesParticulares: dto.condicionesParticulares || undefined,
    obraSocial: { id: dto.obraSocial.id },
  };
}

@Injectable({ providedIn: 'root' })
export class ConvenioObraSocialApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v2/contratos-cobertura`;

  /** Convenios de la empresa actual con esta obra social (tenant forzado server-side). */
  getByObraSocial(obraSocialId: number): Observable<ConvenioObraSocialDTO[]> {
    return this.http
      .get<ContratoCoberturaBackend[]>(this.base, {
        params: {
          'obraSocialId.equals': String(obraSocialId),
          'modalidadCobertura.equals': 'CONVENIO_OBRA_SOCIAL',
          sort: 'vigenciaDesde,desc',
          size: '100',
        },
      })
      .pipe(map((list) => list.map(toDTO)));
  }

  create(dto: ConvenioObraSocialDTO): Observable<ConvenioObraSocialDTO> {
    return this.http.post<ContratoCoberturaBackend>(this.base, toBackend(dto)).pipe(map(toDTO));
  }

  update(dto: ConvenioObraSocialDTO): Observable<ConvenioObraSocialDTO> {
    return this.http.put<ContratoCoberturaBackend>(`${this.base}/${dto.id}`, toBackend(dto)).pipe(map(toDTO));
  }
}
