import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { localDateYmd } from '../../shared/utils/date-local.util';
// ... (rest of imports/mappings)


type BackendTipoEvento =
  | 'DEPORTIVO'
  | 'CULTURAL'
  | 'EMPRESARIAL'
  | 'EDUCATIVO'
  | 'RELIGIOSO'
  | 'MASIVO'
  | 'OTRO';

interface BackendEvento {
  id: number;
  nombre: string;
  tipoEvento: BackendTipoEvento;
  direccion: string;
  fechaInicio: string;
  fechaFin: string;
  cantidadAsistentesEstimados: number;
  responsableEvento?: string;
  activo: boolean;
  institucionId?: number;
  institucionNombre?: string;
  empresaId?: number;
}

export type FrontendEventType =
  | 'Deportivo'
  | 'Cultural'
  | 'Corporativo'
  | 'Educativo'
  | 'Musical / Concierto'
  | 'Religioso'
  | 'Político'
  | 'Privado / Social';

export type FrontendEventStatus = 'scheduled' | 'inprogress' | 'closed';

export interface FrontendEvento {
  id: string;
  name: string;
  type: FrontendEventType;
  org: string;
  responsible: string;
  attendees: number;
  address: string;
  dateFrom: string;
  timeFrom: string;
  dateTo: string;
  timeTo: string;
  units: string[];
  status: FrontendEventStatus;
  institucionId?: number;
}

const TIPO_MAP: Record<BackendTipoEvento, FrontendEventType> = {
  DEPORTIVO:   'Deportivo',
  CULTURAL:    'Cultural',
  EMPRESARIAL: 'Corporativo',
  EDUCATIVO:   'Educativo',
  RELIGIOSO:   'Religioso',
  MASIVO:      'Musical / Concierto',
  OTRO:        'Privado / Social',
};

const TIPO_REVERSE_MAP: Record<FrontendEventType, BackendTipoEvento> = {
  'Deportivo':           'DEPORTIVO',
  'Cultural':            'CULTURAL',
  'Corporativo':         'EMPRESARIAL',
  'Educativo':           'EDUCATIVO',
  'Musical / Concierto': 'MASIVO',
  'Religioso':           'RELIGIOSO',
  'Político':            'OTRO',
  'Privado / Social':    'OTRO',
};

function splitInstant(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = localDateYmd(d);
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return { date, time };
}

function toFrontend(b: BackendEvento): FrontendEvento {
  const { date: dateFrom, time: timeFrom } = splitInstant(b.fechaInicio);
  const { date: dateTo, time: timeTo } = splitInstant(b.fechaFin);
  return {
    id:          String(b.id),
    name:        b.nombre,
    type:        TIPO_MAP[b.tipoEvento] ?? 'Privado / Social',
    org:         b.institucionNombre ?? '',
    responsible: b.responsableEvento ?? '',
    attendees:   b.cantidadAsistentesEstimados ?? 0,
    address:     b.direccion ?? '',
    dateFrom,
    timeFrom,
    dateTo,
    timeTo,
    units:       [],
    status:      b.activo ? 'scheduled' : 'closed',
    institucionId: b.institucionId,
  };
}

interface EventoPayload {
  nombre: string;
  tipoEvento: BackendTipoEvento;
  direccion: string;
  fechaInicio: string;
  fechaFin: string;
  cantidadAsistentesEstimados: number;
  responsableEvento?: string;
  activo: boolean;
  institucionId?: number;
}

function toPayload(f: FrontendEvento): EventoPayload {
  return {
    nombre:                      f.name,
    tipoEvento:                  TIPO_REVERSE_MAP[f.type],
    direccion:                   f.address,
    fechaInicio:                 new Date(`${f.dateFrom}T${f.timeFrom}:00`).toISOString(),
    fechaFin:                    new Date(`${f.dateTo}T${f.timeTo}:00`).toISOString(),
    cantidadAsistentesEstimados: f.attendees,
    responsableEvento:           f.responsible,
    activo:                      f.status !== 'closed',
    institucionId:               f.institucionId,
  };
}

@Injectable({ providedIn: 'root' })
export class EventsApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v2/eventos-cobertura`;

  getAll(): Observable<FrontendEvento[]> {
    return this.http
      .get<BackendEvento[]>(this.base)
      .pipe(map(list => list.map(toFrontend)));
  }

  query(params: { page?: number; size?: number }): Observable<{ data: FrontendEvento[]; total: number }> {
    let httpParams = new HttpParams();
    if (params.page !== undefined) httpParams = httpParams.set('page', String(params.page));
    if (params.size !== undefined) httpParams = httpParams.set('size', String(params.size));

    return this.http.get<BackendEvento[]>(this.base, {
      params: httpParams,
      observe: 'response'
    }).pipe(
      map(res => ({
        data: (res.body ?? []).map(toFrontend),
        total: Number(res.headers.get('X-Total-Count') ?? '0')
      }))
    );
  }

  getById(id: number): Observable<FrontendEvento> {
    return this.http
      .get<BackendEvento>(`${this.base}/${id}`)
      .pipe(map(toFrontend));
  }

  create(evento: FrontendEvento): Observable<FrontendEvento> {
    return this.http
      .post<BackendEvento>(this.base, toPayload(evento))
      .pipe(map(toFrontend));
  }

  update(id: string, evento: FrontendEvento): Observable<FrontendEvento> {
    return this.http
      .put<BackendEvento>(`${this.base}/${id}`, { id: Number(id), ...toPayload(evento) })
      .pipe(map(toFrontend));
  }

  cerrar(id: string | number): Observable<FrontendEvento> {
    return this.http
      .post<BackendEvento>(`${this.base}/${id}/cerrar`, {})
      .pipe(map(toFrontend));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
