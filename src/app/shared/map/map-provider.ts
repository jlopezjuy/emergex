export interface MapPoint {
  lat: number;
  lng: number;
  label?: string;
  type?: 'EMERGENCY' | 'AMBULANCE' | 'HOSPITAL' | 'DESTINATION';
}

export interface MapRoute {
  from: MapPoint;
  to: MapPoint;
  status?: string;
}

export interface MapRenderOptions {
  center?: MapPoint;
  zoom?: number;
  theme?: 'light' | 'dark';
}

export interface MapProvider {
  render(container: HTMLElement, options: MapRenderOptions): void;
  setCenter(point: MapPoint, zoom?: number): void;
  setMarkers(points: MapPoint[]): void;
  setRoutes(routes: MapRoute[]): void;
  destroy(): void;
}
