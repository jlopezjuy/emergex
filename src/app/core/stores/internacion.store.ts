import { Injectable, inject, signal, computed } from '@angular/core';
import { InternacionApiService } from '../../data-access/api/internacion.api';
import { InternacionDomiciliariaDTO, EstadoInternacion } from '../../data-access/dto/internacion.dto';

const ESTADOS_ACTIVOS: EstadoInternacion[] = [
  'ADMITIDA',
  'EVALUADA',
  'ACTIVA',
  'SUSPENDIDA_POR_TRASLADO',
];

@Injectable({ providedIn: 'root' })
export class InternacionStore {
  private api = inject(InternacionApiService);

  readonly activas = signal<InternacionDomiciliariaDTO[]>([]);
  readonly seleccionada = signal<InternacionDomiciliariaDTO | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly countActivas = computed(() => this.activas().length);

  readonly countPorEstado = computed(() => {
    const map = new Map<string, number>();
    for (const i of this.activas()) {
      const e = i.estado;
      map.set(e, (map.get(e) ?? 0) + 1);
    }
    return map;
  });

  readonly activasFiltradas = computed(() =>
    this.activas().filter((i) => ESTADOS_ACTIVOS.includes(i.estado)),
  );

  cargarActivas(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getActivas().subscribe({
      next: (data) => {
        this.activas.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Error al cargar internaciones activas');
        this.loading.set(false);
        console.error('[InternacionStore]', err);
      },
    });
  }

  seleccionarInternacion(id: number): void {
    const found = this.activas().find((i) => i.id === id);
    if (found) {
      this.seleccionada.set(found);
    }
  }

  actualizarEnLista(internacion: InternacionDomiciliariaDTO): void {
    this.activas.update((list) =>
      list.map((i) => (i.id === internacion.id ? internacion : i)),
    );
    if (this.seleccionada()?.id === internacion.id) {
      this.seleccionada.set(internacion);
    }
  }

  agregarALista(internacion: InternacionDomiciliariaDTO): void {
    this.activas.update((list) => [internacion, ...list]);
  }
}
