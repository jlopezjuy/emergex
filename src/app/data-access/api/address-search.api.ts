import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AddressCandidate, AddressSearchResponse } from '../dto/address-search.dto';

const EMPTY_RESPONSE: AddressSearchResponse = { candidates: [], degraded: false, degradedReason: null };

export const SHARED_LOCATION_FALLBACK_ERROR =
  'No se pudo leer la ubicación compartida. Marcá el punto en el mapa manualmente.';

/** El 422 trae el motivo en `detail` (ProblemDetail); cualquier otro error usa el genérico. */
function sharedLocationErrorMessage(err: HttpErrorResponse): string {
  const detail = (err?.error as { detail?: unknown } | null)?.detail;
  return err?.status === 422 && typeof detail === 'string' && detail.trim() ? detail : SHARED_LOCATION_FALLBACK_ERROR;
}

/**
 * Cliente del buscador de direcciones. Es una fachada fina sobre /api/v1/geo/direcciones:
 * toda la lógica de proveedores, ranking y validación territorial vive en el backend, que es
 * donde está la API key y donde puede auditarse.
 */
@Injectable({ providedIn: 'root' })
export class AddressSearchApiService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/v1/geo/direcciones`;

  /** Sugerencias mientras se tipea. Rápido: un solo proveedor, sin validación territorial. */
  autocomplete(query: string): Observable<AddressSearchResponse> {
    return this.http
      .get<AddressSearchResponse>(`${this.baseUrl}/autocomplete`, { params: { q: query } })
      .pipe(catchError(() => of(this.unavailable())));
  }

  /** Búsqueda deliberada: todos los proveedores + validación contra GeoRef. */
  resolve(query: string): Observable<AddressSearchResponse> {
    return this.http
      .get<AddressSearchResponse>(`${this.baseUrl}/resolver`, { params: { q: query } })
      .pipe(catchError(() => of(this.unavailable())));
  }

  /** Dirección aproximada de un punto, para cuando el operador arrastra el marcador. */
  reverse(lat: number, lng: number): Observable<AddressCandidate | null> {
    return this.http
      .get<AddressCandidate>(`${this.baseUrl}/reverse`, { params: { lat, lon: lng } })
      .pipe(catchError(() => of(null)));
  }

  /**
   * Coordenadas de una ubicación que el llamante compartió (enlace de WhatsApp, URL de Google
   * Maps, `geo:` o coordenadas sueltas). Va por POST para que la ubicación de una persona no
   * quede en los logs de acceso. Si no se reconoce, el error lleva el motivo del backend.
   */
  resolveSharedLocation(texto: string): Observable<AddressCandidate> {
    return this.http
      .post<AddressCandidate>(`${this.baseUrl}/ubicacion-compartida`, { texto })
      .pipe(catchError((err: HttpErrorResponse) => throwError(() => new Error(sharedLocationErrorMessage(err)))));
  }

  /**
   * Un error de red no puede tumbar el alta de una emergencia: se devuelve lista vacía
   * marcada como degradada, para que la UI lo muestre y el operador siga con el pin manual.
   */
  private unavailable(): AddressSearchResponse {
    return {
      ...EMPTY_RESPONSE,
      degraded: true,
      degradedReason: 'No se pudo consultar el buscador de direcciones. Ubicá el punto en el mapa manualmente.',
    };
  }
}
