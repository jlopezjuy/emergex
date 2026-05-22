import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { forkJoin, interval, Observable, of, Subscription } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { StompSubscription } from '@stomp/stompjs';
import { EmergencyApiService } from '../../data-access/api/emergency.api';
import { WebsocketService } from '../websocket/websocket.service';
import {
  TicketAsistenciaDTO,
  TicketEstadoChangedEvent,
  AsignacionEstadoChangedEvent,
} from '../../data-access/dto/ticket.dto';
import { logError } from '../utils/logger';

const TERMINAL_STATES = new Set(['COMPLETADO', 'CERRADO', 'CANCELADO']);

@Injectable({ providedIn: 'root' })
export class EmergencyStore implements OnDestroy {
  private api = inject(EmergencyApiService);
  private ws = inject(WebsocketService);
  private tickerSub: Subscription | null = null;
  private ticketSub: StompSubscription | null = null;
  private asignacionSub: StompSubscription | null = null;

  readonly emergencies = signal<TicketAsistenciaDTO[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly selectedId = signal<number | null>(null);

  readonly selected = computed(() =>
    this.emergencies().find((e) => e.id === this.selectedId()),
  );

  loadActivos(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getActivos().pipe(
      switchMap((data) =>
        data.length > 0
          ? forkJoin(data.map((ticket) => this.withLatestGeo(ticket)))
          : of([]),
      ),
    ).subscribe({
      next: (data) => {
        this.emergencies.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar emergencias');
        this.loading.set(false);
        logError('[EmergencyStore]', err);
      },
    });
  }

  /** Tick elapsed seconds every second — safe to call multiple times */
  startTicker(): void {
    if (this.tickerSub) return;
    this.tickerSub = interval(1000).subscribe(() => {
      this.emergencies.update((list) =>
        list.map((e) => ({ ...e, elapsedSeconds: (e.elapsedSeconds ?? 0) + 1 })),
      );
    });
  }

  startTicketTracking(): void {
    if (this.ticketSub) return;

    this.ticketSub = this.ws.subscribe('/topic/tickets', (raw: unknown) => {
      const event = raw as TicketEstadoChangedEvent;
      if (!event?.ticketId) return;
      if (TERMINAL_STATES.has(event.estadoNuevo)) {
        this.emergencies.update((list) => list.filter((e) => e.id !== event.ticketId));
        if (this.selectedId() === event.ticketId) this.selectedId.set(null);
      } else {
        this.api.getById(event.ticketId).pipe(
          switchMap((ticket) => this.withLatestGeo(ticket)),
        ).subscribe({
          next: (ticket) => this.addOrUpdate(ticket),
          error: () => {},
        });
      }
    });

    this.asignacionSub = this.ws.subscribe('/topic/asignaciones', (raw: unknown) => {
      const event = raw as AsignacionEstadoChangedEvent;
      if (!event?.ticketId) return;
      this.api.getById(event.ticketId).pipe(
        switchMap((ticket) => this.withLatestGeo(ticket)),
      ).subscribe({
        next: (ticket) => this.addOrUpdate(ticket),
        error: () => {},
      });
    });
  }

  stopTicketTracking(): void {
    this.ticketSub?.unsubscribe();
    this.ticketSub = null;
    this.asignacionSub?.unsubscribe();
    this.asignacionSub = null;
  }

  ngOnDestroy(): void {
    this.tickerSub?.unsubscribe();
    this.stopTicketTracking();
  }

  selectEmergency(id: number | null): void {
    this.selectedId.set(id);
  }

  addOrUpdate(ticket: TicketAsistenciaDTO): void {
    this.emergencies.update((list) => {
      const idx = list.findIndex((e) => e.id === ticket.id);
      if (idx >= 0) {
        const copy = [...list];
        copy[idx] = ticket;
        return copy;
      }
      return [ticket, ...list];
    });

    if (ticket.latitud == null || ticket.longitud == null) {
      this.withLatestGeo(ticket).subscribe((enriched) => {
        if (enriched.latitud != null && enriched.longitud != null) {
          this.emergencies.update((list) =>
            list.map((e) => e.id === enriched.id ? { ...e, latitud: enriched.latitud, longitud: enriched.longitud } : e),
          );
        }
      });
    }
  }

  private withLatestGeo(ticket: TicketAsistenciaDTO): Observable<TicketAsistenciaDTO> {
    if (ticket.latitud != null && ticket.longitud != null) return of(ticket);
    if (!ticket.id || isNaN(ticket.id) || ticket.id <= 0) return of(ticket);
    return this.api.getLatestGeo('TICKET', ticket.id).pipe(
      map((geo) => ({ ...ticket, latitud: geo.latitud, longitud: geo.longitud })),
      catchError(() => of(ticket)),
    );
  }
}
