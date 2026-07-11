import {
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  afterNextRender,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Map as MapLibreMap, Marker, NavigationControl } from 'maplibre-gl';

const JUJUY_CENTER: [number, number] = [-65.2995, -24.1858];

@Component({
  selector: 'emx-location-polygon-map',
  standalone: true,
  template: `
    <div style="position:relative; width:100%; height:100%">
      <div #mapEl style="width:100%;height:100%;border-radius:0.75rem;overflow:hidden"></div>

      <!-- Overlay buttons -->
      @if (!drawingActive() && vertices().length === 0) {
        <button
          type="button"
          (click)="startDrawing()"
          style="position:absolute;top:10px;right:10px;z-index:10;
            padding:5px 10px;border-radius:6px;font-size:11.5px;font-weight:500;
            background:rgba(15,23,42,0.85);border:1px solid rgba(148,163,184,0.4);
            color:#e2e8f0;cursor:pointer;display:flex;align-items:center;gap:5px;
            backdrop-filter:blur(4px);">
          ✏ Dibujar perímetro
        </button>
      }

      @if (drawingActive()) {
        <div style="position:absolute;top:10px;right:10px;z-index:10;display:flex;flex-direction:column;gap:4px">
          <button
            type="button"
            [disabled]="vertices().length < 3"
            (click)="closePolygon()"
            style="padding:5px 10px;border-radius:6px;font-size:11.5px;font-weight:500;
              background:rgba(16,185,129,0.85);border:1px solid rgba(16,185,129,0.6);
              color:white;cursor:pointer;display:flex;align-items:center;gap:5px;
              backdrop-filter:blur(4px);"
            [style.opacity]="vertices().length < 3 ? '0.45' : '1'"
            [style.cursor]="vertices().length < 3 ? 'not-allowed' : 'pointer'">
            ✓ Cerrar
          </button>
          <button
            type="button"
            (click)="cancelDrawing()"
            style="padding:5px 10px;border-radius:6px;font-size:11.5px;font-weight:500;
              background:rgba(15,23,42,0.85);border:1px solid rgba(148,163,184,0.35);
              color:#94a3b8;cursor:pointer;display:flex;align-items:center;gap:5px;
              backdrop-filter:blur(4px);">
            Esc Cancelar
          </button>
        </div>
      }

      @if (!drawingActive() && vertices().length >= 3) {
        <div style="position:absolute;top:10px;right:10px;z-index:10;display:flex;flex-direction:column;gap:4px;align-items:flex-end">
          <button
            type="button"
            (click)="startDrawing()"
            style="padding:5px 10px;border-radius:6px;font-size:11.5px;font-weight:500;
              background:rgba(15,23,42,0.85);border:1px solid rgba(148,163,184,0.4);
              color:#e2e8f0;cursor:pointer;display:flex;align-items:center;gap:5px;
              backdrop-filter:blur(4px);">
            ✏ Editar perímetro
          </button>
          <button
            type="button"
            (click)="clearPolygon()"
            style="padding:4px 10px;border-radius:6px;font-size:11px;font-weight:500;
              background:transparent;border:none;
              color:#94a3b8;cursor:pointer;text-decoration:underline;">
            ✕ Limpiar perímetro
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display:block; width:100%; height:100%; min-height:200px; }
    ::ng-deep .maplibregl-ctrl-attrib { display:none !important; }
  `],
})
export class LocationPolygonMapComponent implements OnDestroy {
  lat    = input<number | null>(null);
  lng    = input<number | null>(null);
  zoom   = input<number>(14);
  polygon = input<[number, number][] | null>(null);

  pointChanged   = output<{ lat: number; lng: number }>();
  polygonChanged = output<[number, number][]>();

  readonly drawingActive = signal(false);
  readonly vertices      = signal<[number, number][]>([]);

  private zone    = inject(NgZone);
  private mapEl   = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');
  private map:    MapLibreMap | null = null;
  private marker: Marker | null = null;
  private resizeObserver: ResizeObserver | null = null;

  // Flag to suppress the two extra click events fired before dblclick
  private dblClickPending = false;

  constructor() {
    afterNextRender(() => this.initMap());

    // Sync lat/lng input → update marker
    effect(() => {
      const lat = this.lat();
      const lng = this.lng();
      if (!this.map || lat == null || lng == null) return;
      this.setMarker(lng, lat, true);
    });

    // Sync polygon input → redraw
    effect(() => {
      const poly = this.polygon();
      if (!this.map) return;
      if (poly && poly.length >= 3) {
        this.vertices.set([...poly]);
        this.drawingActive.set(false);
        this.zone.runOutsideAngular(() => this.updatePolySource());
      }
    });
  }

  // ── Map init ──────────────────────────────────────────────────────────────

  private initMap(): void {
    this.zone.runOutsideAngular(() => {
      const lat = this.lat();
      const lng = this.lng();
      const hasCoords = lat != null && lng != null;

      this.map = new MapLibreMap({
        container: this.mapEl().nativeElement,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: hasCoords ? [lng!, lat!] : JUJUY_CENTER,
        zoom: hasCoords ? this.zoom() : 11,
        attributionControl: false,
      });

      this.map.addControl(new NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');

      this.map.on('load', () => {
        this.addSources();
        if (lat != null && lng != null) this.setMarker(lng!, lat!, false);

        // Restore polygon from input on load
        const poly = this.polygon();
        if (poly && poly.length >= 3) {
          this.vertices.set([...poly]);
          this.drawingActive.set(false);
          this.updatePolySource();
        }

        this.map?.resize();
        requestAnimationFrame(() => this.map?.resize());
      });

      // Click handler
      this.map.on('click', (event) => {
        if (this.dblClickPending) return;

        if (this.drawingActive()) {
          const verts = [...this.vertices(), [event.lngLat.lng, event.lngLat.lat] as [number, number]];
          this.vertices.set(verts);
          this.updatePolySource();
        } else {
          const { lng: eLng, lat: eLat } = event.lngLat;
          this.setMarker(eLng, eLat, false);
          this.zone.run(() => this.pointChanged.emit({ lat: eLat, lng: eLng }));
        }
      });

      // Double-click: close polygon
      this.map.on('dblclick', (event) => {
        if (!this.drawingActive()) return;
        event.preventDefault();

        // Suppress the two synthetic clicks that fire before dblclick
        this.dblClickPending = true;
        setTimeout(() => { this.dblClickPending = false; }, 50);

        // Remove last vertex (it was added by the second click before dblclick fired)
        const verts = this.vertices();
        if (verts.length > 0) {
          this.vertices.set(verts.slice(0, -1));
        }

        this.zone.run(() => this.closePolygon());
      });
    });

    this.setupResizeHandling();
  }

  private addSources(): void {
    if (!this.map) return;

    // Polygon fill + outline
    this.map.addSource('institution-poly', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    this.map.addLayer({
      id: 'institution-poly-fill',
      type: 'fill',
      source: 'institution-poly',
      paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.12 },
    });
    this.map.addLayer({
      id: 'institution-poly-outline',
      type: 'line',
      source: 'institution-poly',
      paint: { 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [3, 2] },
    });

    // Vertex circles
    this.map.addSource('institution-verts', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    this.map.addLayer({
      id: 'institution-verts-layer',
      type: 'circle',
      source: 'institution-verts',
      paint: {
        'circle-radius': 5,
        'circle-color': '#3b82f6',
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2,
      },
    });
  }

  private updatePolySource(): void {
    if (!this.map) return;
    const verts = this.vertices();
    const drawing = this.drawingActive();

    const polySource = this.map.getSource('institution-poly') as import('maplibre-gl').GeoJSONSource | undefined;
    const vertSource = this.map.getSource('institution-verts') as import('maplibre-gl').GeoJSONSource | undefined;
    if (!polySource || !vertSource) return;

    const vertFeatures: GeoJSON.Feature[] = verts.map(([lng, lat]) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [lng, lat] },
      properties: {},
    }));

    if (verts.length === 0) {
      polySource.setData({ type: 'FeatureCollection', features: [] });
      vertSource.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    if (drawing || verts.length < 3) {
      // Render as LineString while drawing
      const lineCoords = verts.length >= 2 ? verts : [];
      polySource.setData({
        type: 'FeatureCollection',
        features: lineCoords.length >= 2
          ? [{
              type: 'Feature' as const,
              geometry: { type: 'LineString' as const, coordinates: lineCoords },
              properties: {},
            }]
          : [],
      });
    } else {
      // Closed polygon
      const ring = [...verts, verts[0]]; // close the ring visually
      polySource.setData({
        type: 'FeatureCollection',
        features: [{
          type: 'Feature' as const,
          geometry: { type: 'Polygon' as const, coordinates: [ring] },
          properties: {},
        }],
      });
    }

    vertSource.setData({ type: 'FeatureCollection', features: vertFeatures });
  }

  // ── Drawing controls (called from template — run in Angular zone) ─────────

  startDrawing(): void {
    this.vertices.set([]);
    this.drawingActive.set(true);
    this.zone.runOutsideAngular(() => this.updatePolySource());
  }

  closePolygon(): void {
    const verts = this.vertices();
    if (verts.length < 3) return;
    this.drawingActive.set(false);
    this.zone.runOutsideAngular(() => this.updatePolySource());
    this.polygonChanged.emit([...verts]); // open ring, no closing coord
  }

  cancelDrawing(): void {
    this.drawingActive.set(false);
    this.vertices.set([]);
    this.zone.runOutsideAngular(() => this.updatePolySource());
  }

  clearPolygon(): void {
    this.vertices.set([]);
    this.drawingActive.set(false);
    this.zone.runOutsideAngular(() => this.updatePolySource());
    this.polygonChanged.emit([]);
  }

  // ── Marker ────────────────────────────────────────────────────────────────

  private setMarker(lng: number, lat: number, fly: boolean): void {
    if (!this.map) return;
    if (!this.marker) {
      const el = document.createElement('div');
      el.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 0 8px rgba(239,68,68,.18),0 8px 20px rgba(15,23,42,.25);';
      this.marker = new Marker({ element: el, draggable: true }).setLngLat([lng, lat]).addTo(this.map);
      this.marker.on('dragend', () => {
        const pos = this.marker!.getLngLat();
        this.zone.run(() => this.pointChanged.emit({ lat: pos.lat, lng: pos.lng }));
      });
    } else {
      this.marker.setLngLat([lng, lat]);
    }
    if (fly) this.map.flyTo({ center: [lng, lat], zoom: this.zoom(), essential: true });
  }

  // ── Resize handling ───────────────────────────────────────────────────────

  private setupResizeHandling(): void {
    const container = this.mapEl().nativeElement;
    this.zone.runOutsideAngular(() => {
      this.resizeObserver = new ResizeObserver(() => this.map?.resize());
      this.resizeObserver.observe(container);
      window.addEventListener('resize', this.handleWindowResize, { passive: true });
    });
  }

  private readonly handleWindowResize = (): void => {
    this.map?.resize();
  };

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('resize', this.handleWindowResize);
    this.marker?.remove();
    this.map?.remove();
    this.map = null;
  }
}
