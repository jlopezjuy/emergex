import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { GeocodeContext, GeocodeResult, GeocoderProvider } from '../geocoder-provider';

@Injectable({ providedIn: 'root' })
export class HttpGeocoderProvider implements GeocoderProvider {
  private http = inject(HttpClient);

  search(query: string, _context?: GeocodeContext): Promise<GeocodeResult[]> {
    return firstValueFrom(
      this.http.get<any[]>(`${environment.apiUrl}/api/v1/geo/geocode`, { params: { q: query } }).pipe(
        map((items) => (items ?? []).map((item) => ({
          label: item.label ?? item.address,
          address: item.address ?? item.label,
          lat: Number(item.latitud),
          lng: Number(item.longitud),
          confidence: item.confidence != null ? Number(item.confidence) : undefined,
          provider: item.provider,
        } satisfies GeocodeResult)).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng))),
      ),
    );
  }
}
