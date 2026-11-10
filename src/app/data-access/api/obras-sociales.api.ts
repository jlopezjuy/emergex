import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ITEMS_PER_PAGE, PagedResult, buildParams, toPagedResult } from './pagination';
import { ImportarPadronObraSocialResultDTO, ObraSocialDTO } from '../dto/obra-social.dto';

export interface ObraSocialQuery {
  page?: number;
  size?: number;
  /** Búsqueda por denominación. Va server-side: el catálogo son cientos de filas. */
  nombre?: string;
  activa?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ObrasSocialesApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/obra-socials`;

  /**
   * Listado paginado del catálogo global (sin tenant: trae activas e inactivas).
   *
   * Pagina y busca SERVER-SIDE a propósito. Antes traía todo con un `size` fijo y filtraba en
   * memoria, lo que rompía en silencio al crecer el padrón: con size=500 y 834 filas, SWISS
   * MEDICAL quedaba en la posición alfabética 810 y el buscador no la encontraba, además de
   * mostrar KPIs calculados sobre un subconjunto. El endpoint ya soportaba `Pageable` y
   * `nombre.contains`; sólo faltaba usarlos.
   */
  getPage(query: ObraSocialQuery = {}): Observable<PagedResult<ObraSocialDTO>> {
    const params = buildParams({
      page: query.page ?? 0,
      size: query.size ?? ITEMS_PER_PAGE,
      sort: 'nombre,asc',
      'nombre.contains': query.nombre?.trim(),
      'activa.equals': query.activa,
    });

    return this.http
      .get<ObraSocialDTO[]>(this.base, { params, observe: 'response' })
      .pipe(toPagedResult());
  }

  /**
   * Lista completa, para SELECTORES (ej. el combo de obra social al autorizar una internación),
   * no para pantallas de listado — ésas deben usar {@link getPage}.
   *
   * 2000 es el máximo que admite Spring Data por defecto
   * (spring.data.web.pageable.max-page-size); pedir más se recorta sin avisar. El universo real
   * es acotado (RNAS 365 + RNEMP 568), así que da margen de sobra.
   */
  getAll(params: { nombre?: string; activa?: boolean } = {}): Observable<ObraSocialDTO[]> {
    const query: Record<string, string> = { size: '2000', sort: 'nombre,asc' };
    if (params.nombre) query['nombre.contains'] = params.nombre;
    if (params.activa != null) query['activa.equals'] = String(params.activa);
    return this.http.get<ObraSocialDTO[]>(this.base, { params: query });
  }

  /**
   * Conteo server-side para los KPIs de la cabecera. Con paginación no se pueden calcular
   * contando lo que llegó: eso daría el tamaño de la página, no del catálogo.
   */
  count(params: { activa?: boolean } = {}): Observable<number> {
    return this.http.get<number>(`${this.base}/count`, {
      params: buildParams({ 'activa.equals': params.activa }),
    });
  }

  getById(id: number): Observable<ObraSocialDTO> {
    return this.http.get<ObraSocialDTO>(`${this.base}/${id}`);
  }

  create(dto: Omit<ObraSocialDTO, 'id'>): Observable<ObraSocialDTO> {
    return this.http.post<ObraSocialDTO>(this.base, dto);
  }

  update(dto: ObraSocialDTO): Observable<ObraSocialDTO> {
    return this.http.put<ObraSocialDTO>(`${this.base}/${dto.id}`, dto);
  }

  /** Baja lógica (activa=false) — el backend nunca borra físicamente, preserva historial de coberturas. */
  deactivate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  importarPadron(file: File): Observable<ImportarPadronObraSocialResultDTO> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImportarPadronObraSocialResultDTO>(`${this.base}/importar-padron`, formData);
  }
}
