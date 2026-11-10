export interface GeocodeResult {
  label: string;
  address: string;
  lat: number;
  lng: number;
  confidence?: number;
  provider?: string;
}

export interface GeocodeContext {
  country?: string;
  province?: string;
  city?: string;
}

export interface GeocoderProvider {
  search(query: string, context?: GeocodeContext): Promise<GeocodeResult[]>;
}
