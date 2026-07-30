import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ContratoActivoDTO } from '../dto/contrato-cobertura-catalogo.dto';

interface ContratoCoberturaBackend {
  id: number;
  nombre?: string;
  modalidadCobertura: ContratoActivoDTO['modalidadCobertura'];
  obraSocial?: { id: number };
}

/** Catálogo liviano de contratos de cobertura activos, para selectores de alta rápida. */
@Injectable({ providedIn: 'root' })
export class ContratoCoberturaCatalogoApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v2/contratos-cobertura`;

  getActivos(): Observable<ContratoActivoDTO[]> {
    return this.http
      .get<ContratoCoberturaBackend[]>(this.base, {
        params: { 'estadoContrato.equals': 'ACTIVO', size: '200' },
      })
      .pipe(
        map((list) =>
          list.map((b) => ({
            id: b.id,
            nombre: b.nombre ?? `Contrato #${b.id}`,
            modalidadCobertura: b.modalidadCobertura,
            obraSocialId: b.obraSocial?.id,
          })),
        ),
      );
  }
}
