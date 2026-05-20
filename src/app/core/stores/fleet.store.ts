import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import { StompSubscription } from '@stomp/stompjs';
import { WebsocketService } from '../websocket/websocket.service';
import { UnidadMovilDTO, GeoPosicionDTO } from '../../data-access/dto/ambulancia.dto';

@Injectable({ providedIn: 'root' })
export class FleetStore implements OnDestroy {
  private ws = inject(WebsocketService);
  private locationSub: StompSubscription | null = null;

  readonly ambulances = signal<UnidadMovilDTO[]>([]);

  setAmbulances(list: UnidadMovilDTO[]): void {
    this.ambulances.set(list);
  }

  startLocationTracking(): void {
    if (this.locationSub) return;
    this.locationSub = this.ws.subscribe('/topic/geo/posiciones', (raw: unknown) => {
      const geoDto = raw as GeoPosicionDTO;
      this.ambulances.update((list) =>
        list.map((a) =>
          a.id === geoDto.ambulanciaId
            ? { ...a, latitud: geoDto.latitud, longitud: geoDto.longitud }
            : a,
        ),
      );
    });
  }

  stopLocationTracking(): void {
    this.locationSub?.unsubscribe();
    this.locationSub = null;
  }

  ngOnDestroy(): void {
    this.stopLocationTracking();
  }
}
