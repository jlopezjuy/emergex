import {
  Component,
  input,
  output,
  effect,
  afterNextRender,
  viewChild,
  ElementRef,
  OnDestroy,
  NgZone,
  inject,
  signal,
  computed,
} from '@angular/core';
import { LngLatBounds, Map as MapLibreMap, NavigationControl, GeoJSONSource, Popup } from 'maplibre-gl';
import type { FeatureCollection, LineString, Point } from 'geojson';
import { UnidadMovilDTO } from '../../../../data-access/dto/ambulancia.dto';
import { TicketAsistenciaDTO } from '../../../../data-access/dto/ticket.dto';
import { ThemeService } from '../../../../core/theme/theme.service';
import {
  LADO_SPRITE,
  crearLienzo,
  dibujarAmbulancia,
  dibujarInsigniaEstacionada,
  nombreIcono,
  rumboABucket,
  rumboDeBucket,
} from './ambulance-icon';
import { resolverRumbo } from './rumbo-unidad';

// ─── San Salvador de Jujuy default center ─────────────────────────────────────

const SSJ: [number, number] = [-65.2995, -24.1858];

function unitLngLat(unit: UnidadMovilDTO): [number, number] | null {
  return unit.longitud != null && unit.latitud != null
    ? [unit.longitud, unit.latitud]
    : null;
}

function ticketLngLat(ticket: TicketAsistenciaDTO): [number, number] | null {
  return ticket.longitud != null && ticket.latitud != null
    ? [ticket.longitud, ticket.latitud]
    : null;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function ambColor(estado?: string): string {
  switch (estado) {
    case 'DISPONIBLE':    return '#10B981';
    case 'EN_SERVICIO':   return '#3B82F6';
    case 'EN_TALLER':     return '#64748B';
    case 'FUERA_SERVICIO': return '#EF4444';
    case 'EN_RUTA':       return '#3B82F6';
    case 'EN_SITIO':      return '#F59E0B';
    case 'TRASLADO':      return '#22D3EE';
    case 'MANTENIMIENTO': return '#64748B';
    default:              return '#64748B';
  }
}

function emgColor(prioridad?: string): string {
  switch (prioridad) {
    case 'CRITICA': return '#EF4444';
    case 'URGENTE': return '#F59E0B';
    default:        return '#10B981';
  }
}

// ─── Ambulance icons ──────────────────────────────────────────────────────────

/** Densidad con la que se rasterizan los íconos: 2× se ve nítido en pantallas comunes y retina. */
const DENSIDAD_ICONO = 2;

/** Escala del ícono en el mapa: el sprite ya viene dibujado al tamaño final. */
const ESCALA_ICONO = 1;

function imagenDe(lado: number, dibujar: (ctx: CanvasRenderingContext2D) => void): ImageData {
  const { ctx } = crearLienzo(lado, DENSIDAD_ICONO);
  dibujar(ctx);
  return ctx.getImageData(0, 0, Math.round(lado * DENSIDAD_ICONO), Math.round(lado * DENSIDAD_ICONO));
}

/** Sprite de la ambulancia para un estado y una dirección: cada rumbo es un dibujo distinto. */
function generateAmbulanceImageData(colorEstado: string, enMovimiento: boolean, bucket: number): ImageData {
  return imagenDe(LADO_SPRITE, (ctx) =>
    dibujarAmbulancia(ctx, DENSIDAD_ICONO, rumboDeBucket(bucket), { colorEstado, enMovimiento }),
  );
}

function generateParkedBadgeImageData(): ImageData {
  return imagenDe(16, (ctx) => dibujarInsigniaEstacionada(ctx, DENSIDAD_ICONO));
}

// ─── Marker element factories ─────────────────────────────────────────────────

// Inject pulse keyframes once
let keyframesInjected = false;
function ensureKeyframes(): void {
  if (keyframesInjected) return;
  keyframesInjected = true;
  const style = document.createElement('style');
  style.textContent = `@keyframes emg-pulse{0%{transform:scale(.5);opacity:.6}100%{transform:scale(2.4);opacity:0}}`;
  document.head.appendChild(style);
}

function formatDistance(m: number): string {
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

function formatDuration(s: number): string {
  const mins = s / 60;
  if (mins >= 1) return `${Math.round(mins)} min`;
  return `${Math.round(s)} seg`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const LEGEND = [
  { color: '#EF4444', label: 'Emergencia crítica' },
  { color: '#F59E0B', label: 'Emergencia urgente' },
  { color: '#10B981', label: 'Unidad disponible' },
  { color: '#3B82F6', label: 'Unidad en ruta' },
  { color: '#22D3EE', label: 'En traslado' },
];

@Component({
  selector: 'emx-operations-map',
  standalone: true,
  host: { '[class.is-dark]': 'isDark()' },
  styles: [`
    :host {
      display: block; position: relative;
      width: 100%; height: 100%;
    }
    .map-root { width: 100%; height: 100%; }

    /* MapLibre controls — dark */
    :host.is-dark ::ng-deep .maplibregl-ctrl-group {
      background: rgba(6,16,31,0.88) !important;
      border: 1px solid rgba(255,255,255,0.08) !important;
      backdrop-filter: blur(12px);
      border-radius: 6px !important;
      overflow: hidden;
    }
    :host.is-dark ::ng-deep .maplibregl-ctrl-group button {
      background: transparent !important;
      border: none !important;
      color: rgba(255,255,255,0.7) !important;
    }
    :host.is-dark ::ng-deep .maplibregl-ctrl-group button:hover {
      background: rgba(255,255,255,0.06) !important;
    }
    :host.is-dark ::ng-deep .maplibregl-ctrl-group button+button {
      border-top: 1px solid rgba(255,255,255,0.06) !important;
    }
    :host.is-dark ::ng-deep .maplibregl-ctrl svg path,
    :host.is-dark ::ng-deep .maplibregl-ctrl svg line,
    :host.is-dark ::ng-deep .maplibregl-ctrl svg polygon {
      fill: rgba(255,255,255,0.7) !important;
      stroke: rgba(255,255,255,0.7) !important;
    }

    /* MapLibre controls — light */
    :host:not(.is-dark) ::ng-deep .maplibregl-ctrl-group {
      background: rgba(255,255,255,0.92) !important;
      border: 1px solid rgba(0,0,0,0.1) !important;
      backdrop-filter: blur(12px);
      border-radius: 6px !important;
      overflow: hidden;
      box-shadow: 0 1px 6px rgba(0,0,0,0.12) !important;
    }
    :host:not(.is-dark) ::ng-deep .maplibregl-ctrl-group button {
      background: transparent !important;
      border: none !important;
      color: rgba(30,41,59,0.8) !important;
    }
    :host:not(.is-dark) ::ng-deep .maplibregl-ctrl-group button:hover {
      background: rgba(0,0,0,0.05) !important;
    }
    :host:not(.is-dark) ::ng-deep .maplibregl-ctrl-group button+button {
      border-top: 1px solid rgba(0,0,0,0.06) !important;
    }
    :host:not(.is-dark) ::ng-deep .maplibregl-ctrl svg path,
    :host:not(.is-dark) ::ng-deep .maplibregl-ctrl svg line,
    :host:not(.is-dark) ::ng-deep .maplibregl-ctrl svg polygon {
      fill: rgba(30,41,59,0.7) !important;
      stroke: rgba(30,41,59,0.7) !important;
    }

    ::ng-deep .maplibregl-attrib-empty,
    ::ng-deep .maplibregl-ctrl-attrib { display: none !important; }

    /* Legend — dark */
    :host.is-dark .map-legend {
      background: rgba(6,16,31,0.88);
      border: 1px solid rgba(255,255,255,0.07);
    }
    :host.is-dark .map-legend-row { color: rgba(148,163,184,0.9); }
    :host.is-dark .map-coords { color: rgba(100,116,139,0.8); text-shadow: 0 1px 4px rgba(0,0,0,0.8); }

    /* Legend — light */
    :host:not(.is-dark) .map-legend {
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(0,0,0,0.08);
      box-shadow: 0 1px 6px rgba(0,0,0,0.1);
    }
    :host:not(.is-dark) .map-legend-row { color: rgba(51,65,85,0.85); }
    :host:not(.is-dark) .map-coords { color: rgba(71,85,105,0.8); text-shadow: none; }

    /* Legend shared */
    .map-legend {
      position: absolute; bottom: 32px; left: 12px;
      backdrop-filter: blur(12px);
      border-radius: 6px; padding: 8px 10px;
      pointer-events: none;
    }
    .map-legend-row {
      display: flex; align-items: center; gap: 6px;
      font-family: monospace; font-size: 9px;
      text-transform: uppercase; letter-spacing: .04em;
      line-height: 1.8;
    }
    .map-legend-dot {
      width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    }

    /* Coords */
    .map-coords {
      position: absolute; top: 8px; right: 12px;
      font-family: monospace; font-size: 9px;
      pointer-events: none;
    }

    /* Route Info Card */
    .route-info-card {
      position: absolute;
      top: 12px;
      left: 12px;
      backdrop-filter: blur(12px);
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(6, 16, 31, 0.88);
      font-family: monospace;
      pointer-events: none;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    }
    :host:not(.is-dark) .route-info-card {
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }
    .route-info-title {
      font-size: 8px;
      color: rgba(148, 163, 184, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    :host:not(.is-dark) .route-info-title {
      color: rgba(71, 85, 105, 0.7);
    }
    .route-info-value {
      font-size: 11px;
      font-weight: 700;
      color: #22D3EE;
    }
    :host:not(.is-dark) .route-info-value {
      color: #0369a1;
    }
    .map-status {
      position: absolute;
      top: 12px;
      right: 12px;
      padding: 6px 10px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.02em;
      backdrop-filter: blur(10px);
      z-index: 10;
    }
    :host.is-dark .map-status {
      background: rgba(6, 16, 31, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.09);
      color: rgba(148, 163, 184, 0.95);
    }
    :host:not(.is-dark) .map-status {
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid rgba(0, 0, 0, 0.08);
      color: rgba(51, 65, 85, 0.9);
    }
  `],
  template: `
    <div #mapEl class="map-root"></div>

    @if (showDataStatus() && !hasGeodata()) {
      <div class="map-status">Sin datos en tiempo real · mostrando mapa base</div>
    }

    @if (activeRouteInfo()) {
      <div class="route-info-card">
        <span class="route-info-title">Ruta real</span>
        <span class="route-info-value">{{ activeRouteInfo()?.distance }} · {{ activeRouteInfo()?.duration }}</span>
      </div>
    }

    @if (showLegend()) {
      <div class="map-legend">
        @for (item of legend; track item.label) {
          <div class="map-legend-row">
            <div class="map-legend-dot" [style.background]="item.color"></div>
            {{ item.label }}
          </div>
        }
      </div>
    }

    <!-- Coordinates overlay -->
    @if (showCoords()) {
      <div class="map-coords">
        LAT {{ centerLat() }} · LNG {{ centerLng() }} · ZOOM {{ zoom() }}×
      </div>
    }
  `,
})
export class OperationsMapComponent implements OnDestroy {
  ambulances = input<UnidadMovilDTO[]>([]);
  emergencies = input<TicketAsistenciaDTO[]>([]);
  selectedEmergencyId = input<number | null>(null);
  focusRequest = input(0);
  autoFit = input(false);
  showLegend = input(true);
  showCoords = input(true);
  showDataStatus = input(true);

  selectAmbulance = output<number>();
  selectEmergency = output<number>();

  protected readonly legend = LEGEND;
  protected readonly zoom = signal('11.0');
  protected readonly centerLat = signal(SSJ[1].toFixed(4));
  protected readonly centerLng = signal(SSJ[0].toFixed(4));
  protected readonly hasGeodata = signal(true);
  readonly activeRouteInfo = signal<{ distance: string; duration: string } | null>(null);

  private readonly zone = inject(NgZone);
  private readonly themeService = inject(ThemeService);
  private mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');
  private map: MapLibreMap | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private mapReady = false;
  private lastFitSignature = '';
  private lastFocusSignature = '';
  private readonly ROUTES_SOURCE = 'emx-routes';
  private readonly AMB_SOURCE = 'emx-amb-points';
  private readonly EMG_SOURCE = 'emx-emg-points';

  protected readonly isDark = computed(() => this.themeService.theme() === 'dark');

  private styleUrl(): string {
    return this.isDark()
      ? 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
  }

  constructor() {
    afterNextRender(() => this.initMap());

    effect(() => {
      const url = this.styleUrl();
      if (this.map) {
        this.zone.runOutsideAngular(() => {
          this.mapReady = false;
          this.map!.setStyle(url);
          this.map!.once('style.load', () => this.setupMapLayers());
        });
      }
    });

    effect(() => {
      const ambs = this.ambulances();
      const emgs = this.emergencies();
      if (this.mapReady) {
        this.zone.runOutsideAngular(() => {
          this.updateMarkers(ambs, emgs);
          this.updateRoutes(ambs, emgs);
        });
      }
    });

    effect(() => {
      const selectedId = this.selectedEmergencyId();
      const focusRequest = this.focusRequest();
      const emgs = this.emergencies();
      if (this.mapReady && selectedId != null) {
        this.zone.runOutsideAngular(() => this.focusEmergency(selectedId, emgs, focusRequest));
      }
    });
  }

  private initMap(): void {
    ensureKeyframes();

    this.zone.runOutsideAngular(() => {
      this.map = new MapLibreMap({
        container: this.mapEl().nativeElement,
        style: this.styleUrl(),
        center: SSJ,
        zoom: 11,
        attributionControl: false,
      });

      this.map.addControl(
        new NavigationControl({ showCompass: true, showZoom: true }),
        'bottom-right',
      );

      this.map.on('move', () => this.syncViewportSignals());

      this.map.on('load', () => {
        this.setupMapLayers();
        this.map?.resize();
        requestAnimationFrame(() => this.map?.resize());
      });
    });

    this.setupResizeHandling();
  }

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

  private syncViewportSignals(): void {
    if (!this.map) return;
    const center = this.map.getCenter();
    const z = this.map.getZoom().toFixed(1);
    this.zone.run(() => {
      this.zoom.set(z);
      this.centerLat.set(center.lat.toFixed(4));
      this.centerLng.set(center.lng.toFixed(4));
    });
  }

  private setupMapLayers(): void {
    if (!this.map) return;

    // Los sprites de las ambulancias se registran a demanda (ver `asegurarIcono`): son 16 por estado.
    if (!this.map.hasImage('amb-parked-badge')) {
      this.map.addImage('amb-parked-badge', generateParkedBadgeImageData(), { pixelRatio: DENSIDAD_ICONO });
    }

    if (!this.map.getSource(this.AMB_SOURCE)) {
      this.map.addSource(this.AMB_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      this.map.addLayer({
        id: 'emx-amb-motion-rings',
        type: 'circle',
        source: this.AMB_SOURCE,
        filter: ['==', ['get', 'isMoving'], true],
        paint: {
          'circle-radius': 25,
          'circle-color': '#0284c7',
          'circle-opacity': 0.3,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#38bdf8',
          'circle-stroke-opacity': 0.95,
        },
      });
      this.map.addLayer({
        id: 'emx-amb-icons',
        type: 'symbol',
        source: this.AMB_SOURCE,
        layout: {
          'icon-image': ['get', 'iconName'],
          'icon-size': ESCALA_ICONO,
          // No se rota: cada rumbo tiene su propio sprite (ver `rumboABucket`).
          'icon-allow-overlap': true,
          'icon-anchor': 'center',
        },
      });
      // La "P" de estacionada no rota: tiene que leerse siempre derecha.
      this.map.addLayer({
        id: 'emx-amb-parked-badges',
        type: 'symbol',
        source: this.AMB_SOURCE,
        filter: ['==', ['get', 'isMoving'], false],
        layout: {
          'icon-image': 'amb-parked-badge',
          'icon-size': ESCALA_ICONO,
          'icon-offset': [21, -21],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-anchor': 'center',
        },
      });
      this.map.addLayer({
        id: 'emx-amb-labels',
        type: 'symbol',
        source: this.AMB_SOURCE,
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 10,
          'text-anchor': 'top',
          'text-offset': [0, 2.7],
          'text-allow-overlap': false,
          'text-optional': true,
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': 'rgba(255,255,255,0.9)',
          'text-halo-width': 0.6,
        },
      });
    }

    if (!this.map.getSource(this.EMG_SOURCE)) {
      this.map.addSource(this.EMG_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      this.map.addLayer({
        id: 'emx-emg-outer',
        type: 'circle',
        source: this.EMG_SOURCE,
        paint: {
          'circle-radius': 16,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.25,
        },
      });
      this.map.addLayer({
        id: 'emx-emg-inner',
        type: 'circle',
        source: this.EMG_SOURCE,
        paint: {
          'circle-radius': 6,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255,255,255,0.7)',
        },
      });
      this.map.addLayer({
        id: 'emx-emg-labels',
        type: 'symbol',
        source: this.EMG_SOURCE,
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 10,
          'text-anchor': 'top',
          'text-offset': [0, 1.2],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': 'rgba(255,255,255,0.9)',
          'text-halo-width': 0.6,
        },
      });
    }

    if (!this.map.getSource(this.ROUTES_SOURCE)) {
      this.map.addSource(this.ROUTES_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
    }
    if (!this.map.getLayer('emx-routes-line')) {
      this.map.addLayer({
        id: 'emx-routes-line',
        type: 'line',
        source: this.ROUTES_SOURCE,
        paint: {
          'line-color': '#22D3EE',
          'line-width': 2.8,
          'line-opacity': 0.75,
        },
      });
    }

    this.map.on('click', 'emx-amb-icons', this.handleAmbClick);
    this.map.on('click', 'emx-amb-labels', this.handleAmbClick);
    this.map.on('click', 'emx-emg-inner', (ev) => {
      const feature = ev.features?.[0];
      const id = feature?.properties?.['id'];
      if (id != null) this.zone.run(() => this.selectEmergency.emit(Number(id)));
    });

    this.map.on('mouseenter', 'emx-amb-icons', () => { if (this.map) this.map.getCanvas().style.cursor = 'pointer'; });
    this.map.on('mouseleave', 'emx-amb-icons', () => { if (this.map) this.map.getCanvas().style.cursor = ''; });
    this.map.on('mouseenter', 'emx-amb-labels', () => { if (this.map) this.map.getCanvas().style.cursor = 'pointer'; });
    this.map.on('mouseleave', 'emx-amb-labels', () => { if (this.map) this.map.getCanvas().style.cursor = ''; });
    this.map.on('mouseenter', 'emx-emg-inner', () => { if (this.map) this.map.getCanvas().style.cursor = 'pointer'; });
    this.map.on('mouseleave', 'emx-emg-inner', () => { if (this.map) this.map.getCanvas().style.cursor = ''; });

    this.mapReady = true;
    this.updateMarkers(this.ambulances(), this.emergencies());
    this.updateRoutes(this.ambulances(), this.emergencies());
    this.fitToVisibleData(this.ambulances(), this.emergencies());
    this.syncViewportSignals();
  }

  private activePopup: Popup | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleAmbClick = (ev: any): void => {
    const feature = ev.features?.[0];
    if (!feature || !this.map) return;
    const id = feature.properties?.['id'];
    if (id == null) return;

    const unitId = Number(id);
    const unit = this.ambulances().find((a) => a.id === unitId);
    const coords = (feature.geometry as Point).coordinates.slice() as [number, number];

    if (this.activePopup) {
      this.activePopup.remove();
    }

    const color = ambColor(unit?.estado);
    const label = unit?.identificador ?? (unitId ? `U-${unitId}` : 'AMB');
    const patente = unit?.patente ?? 'AG-256-DN';
    const estado = unit?.estado ?? 'DISPONIBLE';

    const popupHtml = `
      <div style="padding:14px 16px;font-family:Inter,system-ui,sans-serif;min-width:210px;color:#0f172a;background:#ffffff;border-radius:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:12px">
          <strong style="font-size:16px;font-weight:700;color:#0f172a">${label}</strong>
          <span style="font-size:10px;padding:3px 8px;border-radius:6px;background:${color};color:#ffffff;font-weight:700;font-family:monospace;letter-spacing:0.04em;text-transform:uppercase">${estado}</span>
        </div>
        <div style="font-size:13px;color:#64748b;margin-bottom:6px">Patente: <strong style="color:#334155">${patente}</strong></div>
        <div style="font-size:12px;font-family:ui-monospace,monospace;color:#64748b;margin-bottom:14px">GPS: ${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}</div>
        <button id="emx-map-btn-${unitId}" style="width:100%;padding:10px;font-size:13px;font-weight:700;color:#ffffff;background:#0284c7;border:none;border-radius:6px;cursor:pointer;box-shadow:0 1px 3px rgba(0,0,0,0.12)">
          Ver Detalles de Unidad
        </button>
      </div>
    `;

    this.activePopup = new Popup({ offset: 14, closeButton: true })
      .setLngLat(coords)
      .setHTML(popupHtml)
      .addTo(this.map);

    setTimeout(() => {
      const btn = document.getElementById(`emx-map-btn-${unitId}`);
      if (btn) {
        btn.onclick = () => {
          this.activePopup?.remove();
          this.zone.run(() => this.selectAmbulance.emit(unitId));
        };
      }
    }, 50);
  };

  private lastPositionsMap = new Map<number, { lat: number; lng: number; lastMoveTime: number }>();

  /**
   * Registra en el mapa el sprite de este estado y esta dirección si todavía no está, y devuelve su
   * nombre. Se hace a demanda porque son 16 direcciones por color y movimiento, y la mayoría de las
   * combinaciones nunca se usan.
   */
  private asegurarIcono(color: string, enMovimiento: boolean, bucket: number): string {
    const nombre = nombreIcono(color, enMovimiento, bucket);
    if (this.map && !this.map.hasImage(nombre)) {
      try {
        // Respaldo inmediato (dibujo 2D con volumen): el sprite 3D tarda un instante en estar listo.
        this.map.addImage(nombre, generateAmbulanceImageData(color, enMovimiento, bucket), { pixelRatio: DENSIDAD_ICONO });
        void this.mejorarIcono(nombre, color, enMovimiento, bucket);
      } catch {
        // ya registrado por otra actualización en curso
      }
    }
    return nombre;
  }

  /** `true` una vez que se comprobó que el navegador no puede renderizar en 3D: no se reintenta. */
  private render3dNoDisponible = false;

  /**
   * Reemplaza en el lugar el sprite de respaldo por el renderizado en 3D (three.js). La librería se
   * carga recién acá, en un chunk aparte. Si no hay WebGL o falla, el respaldo se queda como está.
   */
  private async mejorarIcono(nombre: string, color: string, enMovimiento: boolean, bucket: number): Promise<void> {
    if (this.render3dNoDisponible) return;
    try {
      const { renderizarAmbulancia3D } = await import('./ambulance-3d');
      const imagen = renderizarAmbulancia3D({ colorEstado: color, enMovimiento, rumbo: rumboDeBucket(bucket), densidad: DENSIDAD_ICONO });
      if (this.map?.hasImage(nombre)) this.map.updateImage(nombre, imagen);
    } catch (error) {
      this.render3dNoDisponible = true;
      console.warn('No se pudo renderizar la ambulancia en 3D; se usa el dibujo 2D.', error);
    }
  }

  /** Última posición y último rumbo mostrados por unidad, para deducir y conservar el rumbo. */
  private readonly ultimaPosicion = new Map<number, [number, number]>();
  private readonly ultimoRumbo = new Map<number, number>();

  /**
   * Hacia dónde mira la unidad, en grados desde el norte en sentido horario. Prefiere el rumbo del
   * GPS (`direccion`); si no viene, lo deduce del desplazamiento; y si está quieta conserva el
   * último, así al frenar no vuelve sola a mirar al norte.
   */
  private rumboDe(unit: UnidadMovilDTO, actual: [number, number]): number {
    const id = unit.id as number;
    const rumbo = resolverRumbo({
      direccion: unit.direccion,
      previa: this.ultimaPosicion.get(id),
      actual,
      ultimo: this.ultimoRumbo.get(id),
    });
    this.ultimaPosicion.set(id, actual);
    this.ultimoRumbo.set(id, rumbo);
    return rumbo;
  }

  private isUnitMoving(unit: UnidadMovilDTO): boolean {
    if (unit.id == null) return false;
    if (unit.velocidad != null && unit.velocidad > 0) return true;
    if (unit.enMovimiento === true) return true;
    if (unit.estado === 'EN_RUTA' || unit.estado === 'TRASLADO') return true;

    if (unit.latitud != null && unit.longitud != null) {
      const now = Date.now();
      const prev = this.lastPositionsMap.get(unit.id);
      if (prev) {
        const dLat = Math.abs(unit.latitud - prev.lat);
        const dLng = Math.abs(unit.longitud - prev.lng);
        const hasMoved = dLat > 0.00003 || dLng > 0.00003;

        if (hasMoved) {
          this.lastPositionsMap.set(unit.id, { lat: unit.latitud, lng: unit.longitud, lastMoveTime: now });
          return true;
        }

        // Mantener resaltado de movimiento continuo si se movió en los últimos 15 minutos
        return (now - prev.lastMoveTime) < 900000;
      } else {
        this.lastPositionsMap.set(unit.id, { lat: unit.latitud, lng: unit.longitud, lastMoveTime: 0 });
      }
    }
    return false;
  }

  private updateMarkers(ambs: UnidadMovilDTO[], emgs: TicketAsistenciaDTO[]): void {
    if (!this.map) return;
    const ambFeatures = ambs
      .flatMap((unit) => {
        const lngLat = unitLngLat(unit);
        if (!lngLat || unit.id == null) return [];
        const isMoving = this.isUnitMoving(unit);
        const color = ambColor(unit.estado);
        const heading = this.rumboDe(unit, lngLat);
        const iconName = this.asegurarIcono(color, isMoving, rumboABucket(heading));
        return [{
          type: 'Feature' as const,
          properties: {
            id: unit.id,
            label: unit.identificador ?? `U-${unit.id}`,
            color: color,
            iconName: iconName,
            isMoving: isMoving,
            heading,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: lngLat,
          },
        }];
      });
    const emgFeatures = emgs
      .flatMap((ticket) => {
        const lngLat = ticketLngLat(ticket);
        if (!lngLat || ticket.id == null) return [];
        return [{
          type: 'Feature' as const,
          properties: {
            id: ticket.id,
            label: ticket.codigo ?? `E-${ticket.id}`,
            color: emgColor(ticket.prioridad),
          },
          geometry: {
            type: 'Point' as const,
            coordinates: lngLat,
          },
        }];
      });

    (this.map.getSource(this.AMB_SOURCE) as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: ambFeatures as FeatureCollection<Point>['features'],
    });
    (this.map.getSource(this.EMG_SOURCE) as GeoJSONSource | undefined)?.setData({
      type: 'FeatureCollection',
      features: emgFeatures as FeatureCollection<Point>['features'],
    });
    this.fitToVisibleData(ambs, emgs);
  }

  private fitToVisibleData(ambs: UnidadMovilDTO[], emgs: TicketAsistenciaDTO[]): void {
    const coords: [number, number][] = [
      ...ambs.filter((a) => a.longitud != null && a.latitud != null).map((a) => [a.longitud!, a.latitud!] as [number, number]),
      ...emgs.filter((e) => e.longitud != null && e.latitud != null).map((e) => [e.longitud!, e.latitud!] as [number, number]),
    ];
    this.hasGeodata.set(coords.length > 0);
    if (!this.map || !this.autoFit()) return;
    if (coords.length === 0) {
      this.lastFitSignature = '';
      return;
    }
    const signature = coords
      .map(([lng, lat]) => `${lng.toFixed(5)},${lat.toFixed(5)}`)
      .sort()
      .join('|');
    if (signature === this.lastFitSignature) return;
    if (this.lastFitSignature) {
      this.lastFitSignature = signature;
      return;
    }
    this.lastFitSignature = signature;
    if (coords.length === 1) {
      this.map.flyTo({ center: coords[0], zoom: 14, essential: true });
      return;
    }
    const bounds = coords.reduce((acc, coord) => acc.extend(coord), new LngLatBounds(coords[0], coords[0]));
    this.map.fitBounds(bounds, { padding: 36, maxZoom: 14, duration: 600 });
  }

  private focusEmergency(ticketId: number, emgs: TicketAsistenciaDTO[], focusRequest: number): void {
    if (!this.map) return;
    const ticket = emgs.find((e) => e.id === ticketId);
    if (!ticket) return;
    const position = ticketLngLat(ticket);
    if (!position) return;

    const signature = `${focusRequest}:${ticketId}:${position[0].toFixed(5)},${position[1].toFixed(5)}`;
    if (signature === this.lastFocusSignature) return;
    this.lastFocusSignature = signature;

    this.map.flyTo({
      center: position,
      zoom: Math.max(this.map.getZoom(), 15),
      essential: true,
      duration: 650,
    });
  }

  private async fetchOSRMRoute(start: [number, number], end: [number, number]): Promise<{ geometry: GeoJSON.Geometry; distance: number; duration: number } | null> {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&overview=full`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        return {
          geometry: data.routes[0].geometry,
          distance: data.routes[0].distance,
          duration: data.routes[0].duration,
        };
      }
    } catch (e) {
      console.error('Error fetching OSRM route:', e);
    }
    return null;
  }

  private async updateRoutes(ambs: UnidadMovilDTO[], emgs: TicketAsistenciaDTO[]): Promise<void> {
    if (!this.map || !this.map.getSource(this.ROUTES_SOURCE)) return;

    const ticketMap = new Map(emgs.map((e) => [e.id, e]));
    const activeRoutePairs = ambs
      .filter((a) => a.ticketActivo != null)
      .flatMap((a) => {
        const ticket = ticketMap.get(a.ticketActivo!);
        if (!ticket) return [];
        const ticketPosition = ticketLngLat(ticket);
        if (!ticketPosition) return [];
        const unitPosition = unitLngLat(a);
        if (!unitPosition) return [];
        return [{ unit: a, ticket, start: unitPosition, end: ticketPosition }];
      });

    if (activeRoutePairs.length === 0) {
      this.activeRouteInfo.set(null);
      (this.map.getSource(this.ROUTES_SOURCE) as GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [],
      });
      return;
    }

    const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    let selectedRouteInfo: { distance: string; duration: string } | null = null;

    for (const pair of activeRoutePairs) {
      const routeData = await this.fetchOSRMRoute(pair.start, pair.end);
      if (routeData) {
        features.push({
          type: 'Feature',
          geometry: routeData.geometry as GeoJSON.LineString,
          properties: {},
        });
        if (pair.ticket.id === this.selectedEmergencyId()) {
          selectedRouteInfo = {
            distance: formatDistance(routeData.distance),
            duration: formatDuration(routeData.duration),
          };
        }
      } else {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [pair.start, pair.end],
          },
          properties: {},
        });
      }
    }

    this.activeRouteInfo.set(selectedRouteInfo);

    const geojson: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features,
    };

    if (this.map && this.map.getSource(this.ROUTES_SOURCE)) {
      (this.map.getSource(this.ROUTES_SOURCE) as GeoJSONSource).setData(geojson);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('resize', this.handleWindowResize);
    this.map?.remove();
    this.map = null;
  }
}
