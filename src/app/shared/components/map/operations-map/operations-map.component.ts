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
import { LngLatBounds, Map as MapLibreMap, Marker, NavigationControl, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, LineString } from 'geojson';
import { UnidadMovilDTO } from '../../../../data-access/dto/ambulancia.dto';
import { TicketAsistenciaDTO } from '../../../../data-access/dto/ticket.dto';
import { ThemeService } from '../../../../core/theme/theme.service';

// ─── San Salvador de Jujuy mock coordinates ───────────────────────────────────

const SSJ: [number, number] = [-65.2995, -24.1858];

function mockLngLat(id: number | undefined, spread: number): [number, number] {
  const n = id ?? 0;
  const lng = SSJ[0] + (((n * 17 + 7) % 100) / 100 - 0.5) * spread;
  const lat = SSJ[1] + (((n * 31 + 13) % 100) / 100 - 0.5) * spread * 0.7;
  return [lng, lat];
}

function unitLngLat(unit: UnidadMovilDTO): [number, number] {
  return unit.longitud != null && unit.latitud != null
    ? [unit.longitud, unit.latitud]
    : mockLngLat(unit.id, 0.12);
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

// ─── Marker element factories ─────────────────────────────────────────────────

function createAmbEl(unit: UnidadMovilDTO, onClick: () => void): HTMLElement {
  const color = ambColor(unit.estado);
  const label = unit.identificador ?? (unit.id != null ? `U-${unit.id}` : 'AMB');

  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;';

  const badge = document.createElement('div');
  badge.style.cssText = `
    width:26px;height:22px;border-radius:4px;
    background:${color};display:flex;align-items:center;
    justify-content:center;box-shadow:0 0 10px ${color}55;
    border:1.5px solid rgba(255,255,255,0.25);
    transition:transform 0.15s;
  `;
  badge.innerHTML = `<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="white" stroke-width="1.5" opacity="0.95">
    <rect x="0.75" y="4.75" width="11.5" height="6.5" rx="1.25"/>
    <path d="M3.5 4.75V3.5a3 3 0 016 0v1.25"/>
    <line x1="6.5" y1="6.5" x2="6.5" y2="9.5"/>
    <line x1="5" y1="8" x2="8" y2="8"/>
  </svg>`;

  const lbl = document.createElement('div');
  lbl.style.cssText = `font-family:monospace;font-size:9px;font-weight:700;color:${color};margin-top:2px;white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,0.9);`;
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
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;user-select:none;';

  const pulse = document.createElement('div');
  pulse.style.cssText = 'position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center;';

  const ring1 = document.createElement('div');
  ring1.style.cssText = `position:absolute;width:28px;height:28px;border-radius:50%;background:${color};opacity:0;animation:emg-pulse 1.8s ease-out infinite;`;
  const ring2 = document.createElement('div');
  ring2.style.cssText = `position:absolute;width:28px;height:28px;border-radius:50%;background:${color};opacity:0;animation:emg-pulse 1.8s ease-out 0.6s infinite;`;

  const dot = document.createElement('div');
  dot.style.cssText = `position:relative;width:12px;height:12px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.45);box-shadow:0 0 12px ${color}99;z-index:1;`;

  const lbl = document.createElement('div');
  lbl.style.cssText = `font-family:monospace;font-size:9px;font-weight:700;color:${color};margin-top:1px;white-space:nowrap;text-shadow:0 1px 4px rgba(0,0,0,0.9);`;
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
  `],
  template: `
    <div #mapEl class="map-root"></div>

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

  selectAmbulance = output<number>();
  selectEmergency = output<number>();

  protected readonly legend = LEGEND;
  protected readonly zoom = signal('11.0');
  protected readonly centerLat = signal(SSJ[1].toFixed(4));
  protected readonly centerLng = signal(SSJ[0].toFixed(4));

  private readonly zone = inject(NgZone);
  private readonly themeService = inject(ThemeService);
  private mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');
  private map: MapLibreMap | null = null;
  private ambMarkers: Marker[] = [];
  private emgMarkers: Marker[] = [];
  private mapReady = false;
  private lastFitSignature = '';
  private lastFocusSignature = '';
  private readonly ROUTES_SOURCE = 'emx-routes';

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

    this.map.on('load', () => this.setupMapLayers());
    });
  }

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

    this.map.addSource(this.ROUTES_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });

    this.map.addLayer({
      id: 'emx-routes-line',
      type: 'line',
      source: this.ROUTES_SOURCE,
      paint: {
        'line-color': '#22D3EE',
        'line-width': 1.2,
        'line-opacity': 0.45,
        'line-dasharray': [5, 4],
      },
    });

    this.mapReady = true;
    this.updateMarkers(this.ambulances(), this.emergencies());
    this.updateRoutes(this.ambulances(), this.emergencies());
    this.fitToVisibleData(this.ambulances(), this.emergencies());
    this.syncViewportSignals();
  }

  private updateMarkers(ambs: UnidadMovilDTO[], emgs: TicketAsistenciaDTO[]): void {
    if (!this.map) return;

    this.ambMarkers.forEach((m) => m.remove());
    this.ambMarkers = ambs.map((unit) => {
      const [lng, lat] = unitLngLat(unit);
      const el = createAmbEl(unit, () => {
        if (unit.id != null) this.zone.run(() => this.selectAmbulance.emit(unit.id!));
      });
      return new Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(this.map!);
    });

    this.emgMarkers.forEach((m) => m.remove());
    this.emgMarkers = emgs.flatMap((ticket) => {
      const lngLat = ticketLngLat(ticket);
      if (!lngLat) return [];
      const el = createEmgEl(ticket, () => {
        if (ticket.id != null) this.zone.run(() => this.selectEmergency.emit(ticket.id!));
      });
      return [new Marker({ element: el, anchor: 'bottom' }).setLngLat(lngLat).addTo(this.map!)];
    });
    this.fitToVisibleData(ambs, emgs);
  }

  private fitToVisibleData(ambs: UnidadMovilDTO[], emgs: TicketAsistenciaDTO[]): void {
    if (!this.map || !this.autoFit()) return;
    const coords: [number, number][] = [
      ...ambs.filter((a) => a.longitud != null && a.latitud != null).map((a) => [a.longitud!, a.latitud!] as [number, number]),
      ...emgs.filter((e) => e.longitud != null && e.latitud != null).map((e) => [e.longitud!, e.latitud!] as [number, number]),
    ];
    if (coords.length === 0) return;
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

  private updateRoutes(ambs: UnidadMovilDTO[], emgs: TicketAsistenciaDTO[]): void {
    if (!this.map || !this.map.getSource(this.ROUTES_SOURCE)) return;

    const ticketMap = new Map(emgs.map((e) => [e.id, e]));
    const features = ambs
      .filter((a) => a.ticketActivo != null)
      .flatMap((a) => {
        const ticket = ticketMap.get(a.ticketActivo!);
        if (!ticket) return [];
        const ticketPosition = ticketLngLat(ticket);
        if (!ticketPosition) return [];
        return [{
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [unitLngLat(a), ticketPosition],
          },
          properties: {},
        }];
      });

    const geojson: FeatureCollection<LineString> = {
      type: 'FeatureCollection',
      features,
    };

    (this.map.getSource(this.ROUTES_SOURCE) as GeoJSONSource).setData(geojson);
  }

  ngOnDestroy(): void {
    this.ambMarkers.forEach((m) => m.remove());
    this.emgMarkers.forEach((m) => m.remove());
    this.map?.remove();
    this.map = null;
  }
}
