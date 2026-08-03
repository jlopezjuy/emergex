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

// ─── Ambulance Icon Canvas Generator ──────────────────────────────────────────

function generateAmbulanceImageData(colorHex: string): ImageData {
  const size = 34;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;

  // Background badge with status color
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fillStyle = colorHex;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();

  // White Ambulance Vehicle Body
  ctx.fillStyle = '#FFFFFF';

  // Main Body
  ctx.beginPath();
  ctx.roundRect(cx - 9, cy - 5, 12, 9, 2);
  ctx.fill();

  // Front Cabin
  ctx.beginPath();
  ctx.roundRect(cx + 2, cy - 3, 6, 7, 1.5);
  ctx.fill();

  // Windshield
  ctx.fillStyle = colorHex;
  ctx.beginPath();
  ctx.fillRect(cx + 4, cy - 2, 3, 3);
  ctx.fill();

  // Wheels
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(cx - 5, cy + 4, 2.2, 0, Math.PI * 2);
  ctx.arc(cx + 5, cy + 4, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Medical Cross
  ctx.fillStyle = colorHex;
  ctx.fillRect(cx - 4, cy - 3.5, 2, 5);
  ctx.fillRect(cx - 5.5, cy - 2, 5, 2);

  return ctx.getImageData(0, 0, size, size);
}

// ─── Marker element factories ─────────────────────────────────────────────────

function createAmbEl(unit: UnidadMovilDTO, onClick: () => void): HTMLElement {
  const color = ambColor(unit.estado);
  const label = unit.identificador ?? (unit.id != null ? `U-${unit.id}` : 'AMB');

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:34px;height:24px;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;overflow:visible;';

  const badge = document.createElement('div');
  badge.style.cssText = `
    width:26px;height:22px;border-radius:4px;
    background:${color};display:flex;align-items:center;
    justify-content:center;box-shadow:0 0 10px ${color}55;
    border:1.5px solid rgba(255,255,255,0.25);
    transition:transform 0.15s;
  `;
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', '13');
  svg.setAttribute('height', '13');
  svg.setAttribute('viewBox', '0 0 13 13');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'white');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('opacity', '0.95');

  const rect = document.createElementNS(svgNS, 'rect');
  rect.setAttribute('x', '0.75');
  rect.setAttribute('y', '4.75');
  rect.setAttribute('width', '11.5');
  rect.setAttribute('height', '6.5');
  rect.setAttribute('rx', '1.25');

  const path = document.createElementNS(svgNS, 'path');
  path.setAttribute('d', 'M3.5 4.75V3.5a3 3 0 016 0v1.25');

  const line1 = document.createElementNS(svgNS, 'line');
  line1.setAttribute('x1', '6.5');
  line1.setAttribute('y1', '6.5');
  line1.setAttribute('x2', '6.5');
  line1.setAttribute('y2', '9.5');

  const line2 = document.createElementNS(svgNS, 'line');
  line2.setAttribute('x1', '5');
  line2.setAttribute('y1', '8');
  line2.setAttribute('x2', '8');
  line2.setAttribute('y2', '8');

  svg.appendChild(rect);
  svg.appendChild(path);
  svg.appendChild(line1);
  svg.appendChild(line2);
  badge.appendChild(svg);

  const lbl = document.createElement('div');
  lbl.style.cssText = `position:absolute;top:24px;left:50%;transform:translateX(-50%);font-family:monospace;font-size:9px;font-weight:700;color:${color};white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,0.9);pointer-events:none;`;
  lbl.textContent = label;

  wrap.appendChild(badge);
  wrap.appendChild(lbl);
  wrap.addEventListener('mouseenter', () => (badge.style.transform = 'scale(1.2)'));
  wrap.addEventListener('mouseleave', () => (badge.style.transform = 'scale(1)'));
  wrap.addEventListener('click', onClick);
  return wrap;
}

function createEmgEl(ticket: TicketAsistenciaDTO, onClick: () => void): HTMLElement {
  const color = emgColor(ticket.prioridad);
  const label = ticket.codigo ?? `E-${ticket.id}`;

  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:34px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none;overflow:visible;';

  const pulse = document.createElement('div');
  pulse.style.cssText = 'position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;';

  const ring1 = document.createElement('div');
  ring1.style.cssText = `position:absolute;width:28px;height:28px;border-radius:50%;background:${color};opacity:0;animation:emg-pulse 1.8s ease-out infinite;`;
  const ring2 = document.createElement('div');
  ring2.style.cssText = `position:absolute;width:28px;height:28px;border-radius:50%;background:${color};opacity:0;animation:emg-pulse 1.8s ease-out 0.6s infinite;`;

  const dot = document.createElement('div');
  dot.style.cssText = `position:relative;width:12px;height:12px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.45);box-shadow:0 0 12px ${color}99;z-index:1;`;

  const lbl = document.createElement('div');
  lbl.style.cssText = `position:absolute;top:28px;left:50%;transform:translateX(-50%);font-family:monospace;font-size:9px;font-weight:700;color:${color};white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,0.9);pointer-events:none;`;
  lbl.textContent = label;

  pulse.appendChild(ring1);
  pulse.appendChild(ring2);
  pulse.appendChild(dot);
  wrap.appendChild(pulse);
  wrap.appendChild(lbl);
  wrap.addEventListener('click', onClick);
  return wrap;
}

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

    const colors = ['#10B981', '#3B82F6', '#F59E0B', '#22D3EE', '#64748B', '#64748b'];
    colors.forEach((c) => {
      const imgName = `amb-icon-${c.replace('#', '').toUpperCase()}`;
      if (this.map && !this.map.hasImage(imgName)) {
        try {
          this.map.addImage(imgName, generateAmbulanceImageData(c));
        } catch {
          // ignore duplicate image registration
        }
      }
    });

    if (!this.map.getSource(this.AMB_SOURCE)) {
      this.map.addSource(this.AMB_SOURCE, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      this.map.addLayer({
        id: 'emx-amb-icons',
        type: 'symbol',
        source: this.AMB_SOURCE,
        layout: {
          'icon-image': ['get', 'iconName'],
          'icon-size': 1,
          'icon-allow-overlap': true,
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
          'text-offset': [0, 1.4],
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

  private updateMarkers(ambs: UnidadMovilDTO[], emgs: TicketAsistenciaDTO[]): void {
    if (!this.map) return;
    const ambFeatures = ambs
      .flatMap((unit) => {
        const lngLat = unitLngLat(unit);
        if (!lngLat || unit.id == null) return [];
        const color = ambColor(unit.estado);
        const iconName = `amb-icon-${color.replace('#', '').toUpperCase()}`;
        return [{
          type: 'Feature' as const,
          properties: {
            id: unit.id,
            label: unit.identificador ?? `U-${unit.id}`,
            color: color,
            iconName: iconName,
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

  private async fetchOSRMRoute(start: [number, number], end: [number, number]): Promise<{ geometry: any; distance: number; duration: number } | null> {
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

    const features: any[] = [];
    let selectedRouteInfo: { distance: string; duration: string } | null = null;

    for (const pair of activeRoutePairs) {
      const routeData = await this.fetchOSRMRoute(pair.start, pair.end);
      if (routeData) {
        features.push({
          type: 'Feature',
          geometry: routeData.geometry,
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
