import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ImportarPadronObraSocialResultDTO, ObraSocialDTO } from '../dto/obra-social.dto';

@Injectable({ providedIn: 'root' })
export class ObrasSocialesApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/obra-socials`;

  /**
   * Tope de filas que pide getAll. La UI no pagina: filtra y cuenta sobre lo que trae, así que
   * si el catálogo supera este número la pantalla miente en silencio (KPIs mal y obras sociales
   * que el buscador no encuentra). Pasó de verdad: con size=500 y 834 filas cargadas, SWISS
   * MEDICAL quedaba en la posición alfabética 810 y era inhallable.
   *
   * 2000 es además el máximo que admite Spring Data por defecto
   * (spring.data.web.pageable.max-page-size); pedir más se recorta sin avisar.
   *
   * El universo real es acotado —RNAS 365 + RNEMP 568— así que 2000 da margen de sobra. Si
   * alguna vez se acerca, la salida no es subir el número: es paginar y buscar server-side
   * (el endpoint ya soporta nombre.contains).
   */
  static readonly MAX_CATALOGO = 2000;

  /** Catálogo global (sin tenant): trae activas e inactivas, sin paginar en UI. */
  getAll(params: { nombre?: string; activa?: boolean } = {}): Observable<ObraSocialDTO[]> {
    const query: Record<string, string> = { size: String(ObrasSocialesApiService.MAX_CATALOGO), sort: 'nombre,asc' };
    if (params.nombre) query['nombre.contains'] = params.nombre;
    if (params.activa != null) query['activa.equals'] = String(params.activa);
    return this.http.get<ObraSocialDTO[]>(this.base, { params: query });
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
