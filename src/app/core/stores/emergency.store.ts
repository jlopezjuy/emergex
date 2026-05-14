import { Injectable, inject, signal, computed } from '@angular/core';
import { interval } from 'rxjs';
import { EmergencyApiService } from '../../data-access/api/emergency.api';
import { TicketAsistenciaDTO } from '../../data-access/dto/ticket.dto';

@Injectable({ providedIn: 'root' })
export class EmergencyStore {
  private api = inject(EmergencyApiService);

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

  /** Tick elapsed seconds every second */
  startTicker(): void {
    interval(1000).subscribe(() => {
      this.emergencies.update((list) =>
        list.map((e) => ({ ...e, elapsedSeconds: (e.elapsedSeconds ?? 0) + 1 })),
      );
    });
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
