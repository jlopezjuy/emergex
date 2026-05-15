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
} from '@angular/core';
import { Map as MapLibreMap, Marker, NavigationControl, GeoJSONSource } from 'maplibre-gl';
import type { FeatureCollection, LineString } from 'geojson';
import { UnidadMovilDTO } from '../../../../data-access/dto/ambulancia.dto';
import { TicketAsistenciaDTO } from '../../../../data-access/dto/ticket.dto';

// ─── CDMX mock coordinates ────────────────────────────────────────────────────

const CDMX: [number, number] = [-99.1332, 19.4326];

function mockLngLat(id: number | undefined, spread: number): [number, number] {
  const n = id ?? 0;
  const lng = CDMX[0] + (((n * 17 + 7) % 100) / 100 - 0.5) * spread;
  const lat = CDMX[1] + (((n * 31 + 13) % 100) / 100 - 0.5) * spread * 0.7;
  return [lng, lat];
}

function unitLngLat(unit: UnidadMovilDTO): [number, number] {
  return unit.longitud != null && unit.latitud != null
    ? [unit.longitud, unit.latitud]
    : mockLngLat(unit.id, 0.12);
}

function ticketLngLat(ticket: TicketAsistenciaDTO): [number, number] {
  return ticket.longitud != null && ticket.latitud != null
    ? [ticket.longitud, ticket.latitud]
    : mockLngLat((ticket.id ?? 0) + 50, 0.1);
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
  styles: [`
    :host {
      display: block; position: relative;
      width: 100%; height: 100%;
    }
    .map-root { width: 100%; height: 100%; }

    /* MapLibre dark-theme overrides */
    ::ng-deep .maplibregl-ctrl-group {
      background: rgba(6,16,31,0.88) !important;
      border: 1px solid rgba(255,255,255,0.08) !important;
      backdrop-filter: blur(12px);
      border-radius: 6px !important;
      overflow: hidden;
    }
    ::ng-deep .maplibregl-ctrl-group button {
      background: transparent !important;
      border: none !important;
      color: rgba(255,255,255,0.7) !important;
    }
    ::ng-deep .maplibregl-ctrl-group button:hover {
      background: rgba(255,255,255,0.06) !important;
    }
    ::ng-deep .maplibregl-ctrl-group button+button {
      border-top: 1px solid rgba(255,255,255,0.06) !important;
    }
    ::ng-deep .maplibregl-ctrl svg path,
    ::ng-deep .maplibregl-ctrl svg line,
    ::ng-deep .maplibregl-ctrl svg polygon {
      fill: rgba(255,255,255,0.7) !important;
      stroke: rgba(255,255,255,0.7) !important;
    }
    ::ng-deep .maplibregl-attrib-empty,
    ::ng-deep .maplibregl-ctrl-attrib { display: none !important; }

    /* Legend */
    .map-legend {
      position: absolute; bottom: 32px; left: 12px;
      background: rgba(6,16,31,0.88);
      border: 1px solid rgba(255,255,255,0.07);
      backdrop-filter: blur(12px);
      border-radius: 6px; padding: 8px 10px;
      pointer-events: none;
    }
    .map-legend-row {
      display: flex; align-items: center; gap: 6px;
      font-family: monospace; font-size: 9px;
      color: rgba(148,163,184,0.9);
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
      color: rgba(100,116,139,0.8);
      pointer-events: none;
      text-shadow: 0 1px 4px rgba(0,0,0,0.8);
    }
  `],
  template: `
    <div #mapEl class="map-root"></div>

    <!-- Legend overlay -->
    <div class="map-legend">
      @for (item of legend; track item.label) {
        <div class="map-legend-row">
          <div class="map-legend-dot" [style.background]="item.color"></div>
          {{ item.label }}
        </div>
      }
    </div>

    <!-- Coordinates overlay -->
    <div class="map-coords">
      LAT {{ zoom() ? '19.4326' : '—' }} · LNG {{ zoom() ? '-99.1332' : '—' }} · ZOOM {{ zoom() }}×
    </div>
  `,
})
export class OperationsMapComponent implements OnDestroy {
  ambulances = input<UnidadMovilDTO[]>([]);
  emergencies = input<TicketAsistenciaDTO[]>([]);
  selectedEmergencyId = input<number | null>(null);

  selectAmbulance = output<number>();
  selectEmergency = output<number>();

  protected readonly legend = LEGEND;
  protected readonly zoom = signal('11.0');

  private readonly zone = inject(NgZone);
  private mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');
  private map: MapLibreMap | null = null;
  private ambMarkers: Marker[] = [];
  private emgMarkers: Marker[] = [];
  private mapReady = false;
  private readonly ROUTES_SOURCE = 'emx-routes';

  constructor() {
    afterNextRender(() => this.initMap());

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
  }

  private initMap(): void {
    ensureKeyframes();

    this.zone.runOutsideAngular(() => {
      this.map = new MapLibreMap({
        container: this.mapEl().nativeElement,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: CDMX,
        zoom: 11,
        attributionControl: false,
      });

      this.map.addControl(
        new NavigationControl({ showCompass: true, showZoom: true }),
        'bottom-right',
      );

      // Sync zoom display
      this.map.on('zoom', () => {
        const z = this.map!.getZoom().toFixed(1);
        this.zone.run(() => this.zoom.set(z));
      });

      this.map.on('load', () => {
        // Add routes source + layer
        this.map!.addSource(this.ROUTES_SOURCE, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });

        this.map!.addLayer({
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
      });
    });
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
    this.emgMarkers = emgs.map((ticket) => {
      const [lng, lat] = ticketLngLat(ticket);
      const el = createEmgEl(ticket, () => {
        if (ticket.id != null) this.zone.run(() => this.selectEmergency.emit(ticket.id!));
      });
      return new Marker({ element: el, anchor: 'bottom' }).setLngLat([lng, lat]).addTo(this.map!);
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
        return [{
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: [unitLngLat(a), ticketLngLat(ticket)],
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
