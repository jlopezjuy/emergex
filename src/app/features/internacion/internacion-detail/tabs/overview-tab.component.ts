import { Component, input, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { InternacionApiService } from '../../../../data-access/api/internacion.api';
import { InternacionDomiciliariaDTO, InternacionTimelineItemDTO } from '../../../../data-access/dto/internacion.dto';

@Component({
  selector: 'emx-overview-tab',
  standalone: true,
  imports: [DatePipe],
  template: `
    <div class="grid grid-cols-3 gap-6">
      <!-- Main: Timeline -->
      <div class="col-span-2 space-y-6">
        <!-- Quick Actions -->
        <div class="flex gap-3">
          <button
            class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary)"
          >
            <span class="text-lg leading-none">+</span> Registrar Evento
          </button>
          <button
            class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary)"
          >
            <span class="text-lg leading-none">📝</span> Agregar Nota
          </button>
          <button
            class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-primary)"
          >
            <span class="text-lg leading-none">📅</span> Generar Visitas
          </button>
        </div>

        <!-- Timeline -->
        <div
          class="rounded-xl p-6"
          style="background: var(--surface-glass); border: 1px solid var(--border-glass)"
        >
          <h3 class="text-base font-semibold mb-4" style="color: var(--text-primary)">
            Línea de Tiempo
          </h3>

          @if (loading()) {
            <p class="text-center py-6" style="color: var(--text-muted)">Cargando...</p>
          } @else if (timeline().length === 0) {
            <p class="text-center py-6" style="color: var(--text-muted)">
              No hay eventos registrados aún
            </p>
          } @else {
            <div class="relative">
              @for (item of timeline(); track $index; let last = $last) {
                <div class="flex gap-4" [class.pb-6]="!last">
                  <!-- Dot + line -->
                  <div class="flex flex-col items-center shrink-0" style="width: 24px">
                    <div
                      class="w-3 h-3 rounded-full mt-1.5"
                      [style.background]="timelineColor(item.tipo)"
                    ></div>
                    @if (!last) {
                      <div class="w-px flex-1 mt-1" style="background: var(--border-glass)"></div>
                    }
                  </div>
                  <!-- Content -->
                  <div>
                    <div class="flex items-center gap-2 mb-0.5">
                      <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                            [style.background]="timelineColor(item.tipo) + '33'"
                            [style.color]="timelineColor(item.tipo)">
                        {{ item.tipo }}
                      </span>
                      <span class="text-xs" style="color: var(--text-muted)">
                        {{ item.fecha | date:'dd/MM HH:mm' }}
                      </span>
                    </div>
                    <p class="text-sm" style="color: var(--text-primary)">{{ item.descripcion }}</p>
                    @if (item.profesional) {
                      <p class="text-xs mt-1" style="color: var(--text-secondary)">
                        {{ item.profesional }}
                      </p>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Sidebar: Contactos Útiles -->
      <div class="col-span-1">
        <div
          class="rounded-xl p-5 sticky top-6"
          style="background: var(--surface-glass); border: 1px solid var(--border-glass)"
        >
          <h3 class="text-base font-semibold mb-4" style="color: var(--text-primary)">
            Contactos Útiles
          </h3>

          @if (contactos(); as c) {
            <div class="space-y-4">
              @if (c['Familiar Responsable']) {
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs uppercase tracking-wider" style="color: var(--text-muted)">Familiar</div>
                    <div class="text-sm font-medium" style="color: var(--text-primary)">{{ c['Familiar Responsable'] }}</div>
                  </div>
                  <span class="text-sm" style="color: var(--accent-blue)">📞</span>
                </div>
              }
              @if (c['Teléfono Emergencia']) {
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs uppercase tracking-wider" style="color: var(--text-muted)">Emergencia</div>
                    <div class="text-sm font-medium" style="color: var(--text-primary)">{{ c['Teléfono Emergencia'] }}</div>
                  </div>
                  <span class="text-sm" style="color: var(--accent-blue)">📞</span>
                </div>
              }
              <!-- Dynamic contacts -->
              @for (entry of contactEntries(); track entry[0]) {
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-xs uppercase tracking-wider" style="color: var(--text-muted)">{{ entry[0] }}</div>
                    <div class="text-sm font-medium" style="color: var(--text-primary)">{{ entry[1] }}</div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="text-sm" style="color: var(--text-muted)">Cargando...</p>
          }
        </div>
      </div>
    </div>
  `,
})
export class OverviewTabComponent implements OnInit {
  internacion = input.required<InternacionDomiciliariaDTO>();
  private api = inject(InternacionApiService);

  timeline = signal<InternacionTimelineItemDTO[]>([]);
  contactos = signal<Record<string, string> | null>(null);
  loading = signal(false);

  contactEntries = signal<[string, string][]>([]);

  ngOnInit(): void {
    const id = this.internacion().id;
    this.loading.set(true);

    this.api.getTimeline(id).subscribe({
      next: (data) => {
        this.timeline.set(data ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.api.getContactosUtiles(id).subscribe({
      next: (data) => {
        this.contactos.set(data);
        // Extract non-standard entries
        const entries = Object.entries(data ?? {}).filter(
          ([k]) => k !== 'Familiar Responsable' && k !== 'Teléfono Emergencia'
        );
        this.contactEntries.set(entries);
      },
    });
  }

  timelineColor(tipo: string): string {
    const map: Record<string, string> = {
      CAMBIO_ESTADO: 'var(--accent-blue)',
      EVALUACION: '#a855f7',
      PRESCRIPCION: 'var(--accent-cyan)',
      VISITA: 'var(--accent-emerald)',
      EVENTO_CRITICO: 'var(--accent-red)',
      TRASLADO: 'var(--accent-amber)',
      CIERRE: 'var(--text-muted)',
    };
    return map[tipo] ?? 'var(--text-secondary)';
  }
}
