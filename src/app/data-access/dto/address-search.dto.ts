/**
 * Contrato interno de direcciones. El frontend NO conoce Geoapify, GeoRef ni Nominatim:
 * el backend normaliza todo a esta forma, así cambiar de proveedor no toca la UI.
 */

/** Cuán confiable es el punto. Espeja el enum PrecisionDireccion del backend. */
export type PrecisionDireccion = 'EXACTA' | 'APROXIMADA' | 'MANUAL' | 'NO_CONFIRMADA';

export interface AddressCandidate {
  id: string;
  displayAddress: string;
  street?: string;
  houseNumber?: string;
  locality?: string;
  municipality?: string;
  department?: string;
  province?: string;
  country?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  precision: PrecisionDireccion;
  /** Score del ranking del backend (0..1), no la confianza cruda del proveedor. */
  confidence?: number;
  provider?: string;
  providerPlaceId?: string;
  /** El territorio fue validado contra GeoRef. */
  normalized?: boolean;
  withinOperationalArea?: boolean;
}

export interface AddressSearchResponse {
  candidates: AddressCandidate[];
  /** true si contestó un proveedor de respaldo: hay que avisarle al operador. */
  degraded: boolean;
  degradedReason?: string | null;
  providersConsulted?: string[];
}
