import { Component, input, output, computed, ElementRef, viewChild, AfterViewInit, signal } from '@angular/core';
import { UnidadMovilDTO } from '../../../../data-access/dto/ambulancia.dto';
import { TicketAsistenciaDTO } from '../../../../data-access/dto/ticket.dto';

interface MapUnit {
  unit: UnidadMovilDTO;
  x: number;
  y: number;
}

interface MapTicket {
  ticket: TicketAsistenciaDTO;
  x: number;
  y: number;
}

@Component({
  selector: 'emx-operations-map',
  standalone: true,
  template: `
    <div
      class="relative w-full h-full overflow-hidden rounded-panel"
      style="background: var(--bg-map);"
      #mapContainer
    >
      <!-- Grid overlay -->
      <svg class="absolute inset-0 w-full h-full pointer-events-none" style="opacity: 0.08;">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(34,211,238,1)" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>

      <!-- Connections: ambulance → ticket -->
      <svg class="absolute inset-0 w-full h-full pointer-events-none">
        @for (a of mappedAmbulances(); track a.unit.id || $index) {
          @if (a.unit.ticketActivo) {
            @for (t of mappedTickets(); track t.ticket.id || $index) {
              @if (t.ticket.id === a.unit.ticketActivo) {
                <line
                  [attr.x1]="a.x + '%'"
                  [attr.y1]="a.y + '%'"
                  [attr.x2]="t.x + '%'"
                  [attr.y2]="t.y + '%'"
                  stroke="rgba(59,130,246,0.35)"
                  stroke-width="1"
                  stroke-dasharray="4 3"
                />
              }
            }
          }
        }
      </svg>

      <!-- Ticket markers -->
      @for (t of mappedTickets(); track t.ticket.id || $index) {
        <div
          class="absolute cursor-pointer transition-transform hover:scale-125"
          [style.left.%]="t.x"
          [style.top.%]="t.y"
          style="transform: translate(-50%, -50%);"
          [title]="t.ticket.codigo + ' — ' + t.ticket.tipoEmergencia"
          (click)="selectEmergency.emit(t.ticket.id)"
        >
          <!-- Diamond shape -->
          <div
            class="w-4 h-4 rotate-45 border-2"
            [style.background]="ticketColor(t.ticket.prioridad)"
            [style.border-color]="ticketColor(t.ticket.prioridad)"
            [style.box-shadow]="'0 0 10px ' + ticketColor(t.ticket.prioridad)"
            [class]="t.ticket.prioridad === 'CRITICA' ? 'animate-pulse' : ''"
          ></div>
        </div>
      }

      <!-- Ambulance markers -->
      @for (a of mappedAmbulances(); track a.unit.id || $index) {
        <div
          class="absolute cursor-pointer transition-transform hover:scale-110"
          [style.left.%]="a.x"
          [style.top.%]="a.y"
          style="transform: translate(-50%, -50%);"
          [title]="a.unit.identificador + ' — ' + a.unit.estado"
          (click)="selectAmbulance.emit(a.unit.id)"
        >
          <div
            class="w-5 h-5 rounded-full border-2 flex items-center justify-center"
            [style.background]="ambulanceColor(a.unit.estado)"
            [style.border-color]="ambulanceColor(a.unit.estado)"
            [style.box-shadow]="'0 0 8px ' + ambulanceColor(a.unit.estado)"
          >
            <span class="font-mono text-white" style="font-size: 5px; font-weight: 700; line-height: 1;">
              {{ a.unit.identificador?.replace('U-', '') }}
            </span>
          </div>
          @if (a.unit.eta) {
            <div
              class="absolute -top-4 left-1/2 -translate-x-1/2 font-mono text-white rounded px-1"
              style="font-size: 8px; background: rgba(0,0,0,0.7); white-space: nowrap;"
            >{{ a.unit.eta }}m</div>
          }
        </div>
      }

      <!-- Legend -->
      <div
        class="absolute bottom-3 left-3 glass rounded-panel px-3 py-2 flex flex-col gap-1"
        style="font-size: 10px;"
      >
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full" style="background: #10B981;"></div>
          <span style="color: var(--text-secondary);">Disponible</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full" style="background: #3B82F6;"></div>
          <span style="color: var(--text-secondary);">En ruta</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full" style="background: #F59E0B;"></div>
          <span style="color: var(--text-secondary);">En sitio</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="w-2.5 h-2.5 rounded-full" style="background: #22D3EE;"></div>
          <span style="color: var(--text-secondary);">Traslado</span>
        </div>
        <div class="flex items-center gap-1.5 mt-1 pt-1" style="border-top: 1px solid var(--border-hairline);">
          <div class="w-2.5 h-2.5 rotate-45" style="background: #EF4444;"></div>
          <span style="color: var(--text-secondary);">Emergencia</span>
        </div>
      </div>
    </div>
  `,
})
export class OperationsMapComponent {
  ambulances = input<UnidadMovilDTO[]>([]);
  emergencies = input<TicketAsistenciaDTO[]>([]);
  selectedEmergencyId = input<number | null>(null);

  selectAmbulance = output<number>();
  selectEmergency = output<number>();

  // Coordinate normalization
  // Buenos Aires area approx: lat -34.4 to -34.75, lng -58.3 to -58.65
  private LAT_MIN = -34.75;
  private LAT_MAX = -34.40;
  private LNG_MIN = -58.65;
  private LNG_MAX = -58.30;

  private normalizeX = (lng?: number): number => {
    if (lng == null) return 50;
    const pct = ((lng - this.LNG_MIN) / (this.LNG_MAX - this.LNG_MIN)) * 100;
    return Math.max(5, Math.min(95, pct));
  };

  private normalizeY = (lat?: number): number => {
    if (lat == null) return 50;
    // Invert: higher lat = lower Y
    const pct = ((this.LAT_MAX - lat) / (this.LAT_MAX - this.LAT_MIN)) * 100;
    return Math.max(5, Math.min(95, pct));
  };

  mappedAmbulances = computed((): MapUnit[] =>
    this.ambulances().map((u) => ({
      unit: u,
      x: this.normalizeX(u.longitud),
      y: this.normalizeY(u.latitud),
    })),
  );

  mappedTickets = computed((): MapTicket[] =>
    this.emergencies()
      .filter((t) => t.latitud != null && t.longitud != null)
      .map((t) => ({
        ticket: t,
        x: this.normalizeX(t.longitud),
        y: this.normalizeY(t.latitud),
      })),
  );

  ticketColor(prioridad?: string): string {
    switch (prioridad) {
      case 'CRITICA': return '#EF4444';
      case 'URGENTE': return '#F59E0B';
      case 'NORMAL': return '#10B981';
      default: return '#64748B';
    }
  }

  ambulanceColor(estado?: string): string {
    switch (estado) {
      case 'DISPONIBLE': return '#10B981';
      case 'EN_RUTA': return '#3B82F6';
      case 'EN_SITIO': return '#F59E0B';
      case 'TRASLADO': return '#22D3EE';
      case 'MANTENIMIENTO': return '#64748B';
      default: return '#64748B';
    }
  }
}
