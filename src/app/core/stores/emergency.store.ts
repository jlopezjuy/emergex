import { Injectable, inject, signal, computed, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { EmergencyApiService } from '../../data-access/api/emergency.api';
import { TicketAsistenciaDTO } from '../../data-access/dto/ticket.dto';

@Injectable({ providedIn: 'root' })
export class EmergencyStore implements OnDestroy {
  private api = inject(EmergencyApiService);
  private tickerSub: Subscription | null = null;

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
    this.api.getActivos().subscribe({
      next: (data) => {
        this.emergencies.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar emergencias');
        this.loading.set(false);
        console.error('[EmergencyStore]', err);
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

  ngOnDestroy(): void {
    this.tickerSub?.unsubscribe();
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
  }
}
