import { Injectable, inject, signal } from '@angular/core';
import { WebsocketService } from '../websocket/websocket.service';
import { UnidadMovilDTO, GeoPosicionDTO } from '../../data-access/dto/ambulancia.dto';

@Injectable({ providedIn: 'root' })
export class FleetStore {
  private ws = inject(WebsocketService);

  readonly ambulances = signal<UnidadMovilDTO[]>([]);

  setAmbulances(list: UnidadMovilDTO[]): void {
    this.ambulances.set(list);
  }

  startLocationTracking(): void {
    this.ws.subscribe('/topic/geo/posiciones', (raw: unknown) => {
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
}
