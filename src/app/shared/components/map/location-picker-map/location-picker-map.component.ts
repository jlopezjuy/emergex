import { Component, ElementRef, afterNextRender, effect, input, output, viewChild, OnDestroy, NgZone, inject } from '@angular/core';
import { Map as MapLibreMap, Marker, NavigationControl } from 'maplibre-gl';

const JUJUY_CENTER: [number, number] = [-65.2995, -24.1858];

@Component({
  selector: 'emx-location-picker-map',
  standalone: true,
  template: `<div #mapEl class="location-map"></div>`,
  styles: [`
    :host { display:block; width:100%; height:100%; min-height:180px; }
    .location-map { width:100%; height:100%; min-height:180px; border-radius:0.75rem; overflow:hidden; }
    ::ng-deep .maplibregl-ctrl-attrib { display:none !important; }
  `],
})
export class LocationPickerMapComponent implements OnDestroy {
  lat = input<number | null>(null);
  lng = input<number | null>(null);
  zoom = input(15);
  pointChanged = output<{ lat: number; lng: number }>();

  private zone = inject(NgZone);
  private mapEl = viewChild.required<ElementRef<HTMLDivElement>>('mapEl');
  private map: MapLibreMap | null = null;
  private marker: Marker | null = null;

  constructor() {
    afterNextRender(() => this.initMap());
    effect(() => {
      const lat = this.lat();
      const lng = this.lng();
      if (!this.map || lat == null || lng == null) return;
      this.setMarker(lng, lat, true);
    });
  }

  private initMap(): void {
    this.zone.runOutsideAngular(() => {
      this.map = new MapLibreMap({
        container: this.mapEl().nativeElement,
        style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
        center: this.lng() != null && this.lat() != null ? [this.lng()!, this.lat()!] : JUJUY_CENTER,
        zoom: this.lng() != null && this.lat() != null ? this.zoom() : 11,
        attributionControl: false,
      });
      this.map.addControl(new NavigationControl({ showCompass: true, showZoom: true }), 'bottom-right');
      this.map.on('click', (event) => {
        this.setMarker(event.lngLat.lng, event.lngLat.lat, false);
        this.zone.run(() => this.pointChanged.emit({ lat: event.lngLat.lat, lng: event.lngLat.lng }));
      });
      this.map.on('load', () => {
        if (this.lat() != null && this.lng() != null) this.setMarker(this.lng()!, this.lat()!, true);
      });
    });
  }

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

  ngOnDestroy(): void {
    this.marker?.remove();
    this.map?.remove();
    this.map = null;
  }
}
