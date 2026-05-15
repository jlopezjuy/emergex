import { Component, input, output, computed } from '@angular/core';
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
  styles: [`
    @keyframes pulse-ring {
      0% { r: 6; opacity: 0.8; }
      100% { r: 18; opacity: 0; }
    }
  `],
  template: `
    <svg
      viewBox="0 0 1000 700"
      class="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- ═══════════════════════════════════════════════════ -->
      <!-- CAPA 1 — Fondo                                     -->
      <!-- ═══════════════════════════════════════════════════ -->
      <rect width="1000" height="700" fill="var(--bg-map)"/>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- CAPA 2 — Grid secundario                           -->
      <!-- ═══════════════════════════════════════════════════ -->
      <!-- 14 verticales -->
      <line x1="71"  y1="0" x2="71"  y2="700" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="143" y1="0" x2="143" y2="700" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="214" y1="0" x2="214" y2="700" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="286" y1="0" x2="286" y2="700" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="357" y1="0" x2="357" y2="700" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="429" y1="0" x2="429" y2="700" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="500" y1="0" x2="500" y2="700" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="571" y1="0" x2="571" y2="700" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="643" y1="0" x2="643" y2="700" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="714" y1="0" x2="714" y2="700" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="786" y1="0" x2="786" y2="700" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="857" y1="0" x2="857" y2="700" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="929" y1="0" x2="929" y2="700" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="964" y1="0" x2="964" y2="700" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <!-- 10 horizontales -->
      <line x1="0" y1="70"  x2="1000" y2="70"  stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="0" y1="140" x2="1000" y2="140" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="0" y1="210" x2="1000" y2="210" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="0" y1="280" x2="1000" y2="280" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="0" y1="350" x2="1000" y2="350" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="0" y1="420" x2="1000" y2="420" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="0" y1="490" x2="1000" y2="490" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="0" y1="560" x2="1000" y2="560" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="0" y1="630" x2="1000" y2="630" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>
      <line x1="0" y1="665" x2="1000" y2="665" stroke="var(--border-glass)" stroke-width="0.5" opacity="0.06"/>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- CAPA 3 — Áreas verdes (parques)                    -->
      <!-- ═══════════════════════════════════════════════════ -->
      <ellipse cx="180" cy="160" rx="70" ry="45" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.2)" stroke-width="0.5"/>
      <ellipse cx="750" cy="520" rx="90" ry="55" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.2)" stroke-width="0.5"/>
      <ellipse cx="500" cy="350" rx="50" ry="30" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.2)" stroke-width="0.5"/>
      <ellipse cx="860" cy="130" rx="60" ry="40" fill="rgba(16,185,129,0.06)" stroke="rgba(16,185,129,0.2)" stroke-width="0.5"/>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- CAPA 4 — Cuerpo de agua (río)                      -->
      <!-- ═══════════════════════════════════════════════════ -->
      <path d="M0 400 Q200 380 400 410 Q600 440 800 420 Q900 415 1000 425"
        fill="none" stroke="rgba(34,211,238,0.15)" stroke-width="18"/>
      <path d="M0 400 Q200 380 400 410 Q600 440 800 420 Q900 415 1000 425"
        fill="none" stroke="rgba(34,211,238,0.25)" stroke-width="2"/>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- CAPA 5 — Distritos (6 zonas)                       -->
      <!-- ═══════════════════════════════════════════════════ -->
      <!-- ZONA NORTE (top-left) -->
      <polygon points="0,0 500,0 500,350 0,350"
        fill="transparent" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="4 4"/>
      <text x="166" y="175" text-anchor="middle" font-family="monospace" font-size="9"
        fill="rgba(100,116,139,0.4)" letter-spacing="2">ZONA NORTE</text>

      <!-- ZONA NORESTE (top-right) -->
      <polygon points="500,0 1000,0 1000,350 500,350"
        fill="transparent" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="4 4"/>
      <text x="750" y="175" text-anchor="middle" font-family="monospace" font-size="9"
        fill="rgba(100,116,139,0.4)" letter-spacing="2">ZONA NORESTE</text>

      <!-- ZONA CENTRO (center strip) -->
      <polygon points="300,280 700,280 700,420 300,420"
        fill="transparent" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="4 4"/>
      <text x="500" y="355" text-anchor="middle" font-family="monospace" font-size="9"
        fill="rgba(100,116,139,0.4)" letter-spacing="2">ZONA CENTRO</text>

      <!-- ZONA SUR (bottom-left) -->
      <polygon points="0,350 500,350 500,700 0,700"
        fill="transparent" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="4 4"/>
      <text x="166" y="530" text-anchor="middle" font-family="monospace" font-size="9"
        fill="rgba(100,116,139,0.4)" letter-spacing="2">ZONA SUR</text>

      <!-- ZONA SURESTE (bottom-right) -->
      <polygon points="500,350 1000,350 1000,700 500,700"
        fill="transparent" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="4 4"/>
      <text x="750" y="530" text-anchor="middle" font-family="monospace" font-size="9"
        fill="rgba(100,116,139,0.4)" letter-spacing="2">ZONA SURESTE</text>

      <!-- ZONA OESTE (left-center) -->
      <polygon points="0,250 200,250 200,450 0,450"
        fill="transparent" stroke="rgba(255,255,255,0.06)" stroke-width="1" stroke-dasharray="4 4"/>
      <text x="100" y="355" text-anchor="middle" font-family="monospace" font-size="9"
        fill="rgba(100,116,139,0.4)" letter-spacing="2">ZONA OESTE</text>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- CAPA 6 — Calles primarias (double-stroke)          -->
      <!-- ═══════════════════════════════════════════════════ -->
      <!-- Av. Principal N-S -->
      <path d="M500 0 L500 700" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="4"/>
      <path d="M500 0 L500 700" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>

      <!-- Av. Diagonal SW-NE -->
      <path d="M0 700 Q300 400 700 0" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="4"/>
      <path d="M0 700 Q300 400 700 0" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>

      <!-- Av. Este-Oeste -->
      <path d="M0 350 Q400 320 1000 350" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="4"/>
      <path d="M0 350 Q400 320 1000 350" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>

      <!-- Av. Norte parcial -->
      <path d="M0 150 Q250 140 500 150" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="3"/>
      <path d="M0 150 Q250 140 500 150" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>

      <!-- Av. Sur parcial -->
      <path d="M500 550 Q750 540 1000 550" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="3"/>
      <path d="M500 550 Q750 540 1000 550" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>

      <!-- Av. Circunvalación NE -->
      <path d="M700 0 Q900 200 1000 500" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="3"/>
      <path d="M700 0 Q900 200 1000 500" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>

      <!-- Av. Transversal -->
      <path d="M0 500 Q300 480 600 500 Q800 515 1000 500" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="3"/>
      <path d="M0 500 Q300 480 600 500 Q800 515 1000 500" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>

      <!-- Av. Diagonal SE-NW -->
      <path d="M1000 700 Q700 400 300 0" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="3"/>
      <path d="M1000 700 Q700 400 300 0" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5"/>

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- CAPA 7 — Trails animados (ambulancia → emergencia) -->
      <!-- ═══════════════════════════════════════════════════ -->
      @for (trail of ambulanceTrails(); track trail.ambId) {
        <line
          [attr.x1]="trail.x1"
          [attr.y1]="trail.y1"
          [attr.x2]="trail.x2"
          [attr.y2]="trail.y2"
          stroke="var(--accent-cyan)"
          stroke-width="1"
          stroke-opacity="0.4"
          stroke-dasharray="6 4"
        >
          <animate attributeName="stroke-dashoffset" from="10" to="0" dur="0.8s" repeatCount="indefinite"/>
        </line>
      }

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- CAPA 8 — Marcadores de emergencia (doble pulso)    -->
      <!-- ═══════════════════════════════════════════════════ -->
      @for (t of mappedTickets(); track t.ticket.id ?? $index) {
        <g
          [attr.transform]="'translate(' + t.x + ',' + t.y + ')'"
          class="cursor-pointer"
          (click)="selectEmergency.emit(t.ticket.id)"
        >
          <!-- Anillo externo (stagger 0.5s) -->
          <circle r="12" [attr.fill]="priorityColor(t.ticket.prioridad)" fill-opacity="0.1">
            <animate attributeName="r" from="6" to="20" dur="1.6s" begin="0.5s" repeatCount="indefinite"/>
            <animate attributeName="fill-opacity" from="0.4" to="0" dur="1.6s" begin="0.5s" repeatCount="indefinite"/>
          </circle>
          <!-- Anillo interior -->
          <circle r="12" [attr.fill]="priorityColor(t.ticket.prioridad)" fill-opacity="0.15">
            <animate attributeName="r" from="6" to="18" dur="1.6s" repeatCount="indefinite"/>
            <animate attributeName="fill-opacity" from="0.5" to="0" dur="1.6s" repeatCount="indefinite"/>
          </circle>
          <!-- Dot central -->
          <circle r="6" [attr.fill]="priorityColor(t.ticket.prioridad)"/>
          <!-- Label código -->
          <text y="-12" text-anchor="middle" font-size="8" font-family="monospace"
            [attr.fill]="priorityColor(t.ticket.prioridad)">
            {{ t.ticket.codigo ?? ('E' + t.ticket.id) }}
          </text>
        </g>
      }

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- CAPA 9 — Marcadores de ambulancia                  -->
      <!-- ═══════════════════════════════════════════════════ -->
      @for (a of mappedAmbulances(); track a.unit.id ?? $index) {
        <g
          [attr.transform]="'translate(' + a.x + ',' + a.y + ')'"
          class="cursor-pointer"
          (click)="selectAmbulance.emit(a.unit.id)"
        >
          <!-- Rect redondeado -->
          <rect x="-10" y="-8" width="20" height="16" rx="3"
            [attr.fill]="ambColor(a.unit.estado)" fill-opacity="0.9"/>
          <!-- Cruz médica -->
          <path d="M-1,-4 h2 v3 h3 v2 h-3 v3 h-2 v-3 h-3 v-2 h3 z" fill="white" opacity="0.9"/>
          <!-- ID -->
          <text y="20" text-anchor="middle" font-size="7" font-family="monospace"
            fill="var(--text-secondary)">
            {{ a.unit.identificador ?? ('AMB-' + a.unit.id) }}
          </text>
        </g>
      }

      <!-- ═══════════════════════════════════════════════════ -->
      <!-- CAPA 10 — UI Overlay                               -->
      <!-- ═══════════════════════════════════════════════════ -->

      <!-- Coordenadas (superior izquierda) -->
      <text x="12" y="16" font-family="monospace" font-size="8" fill="var(--text-dim)">
        LAT -34.603 · LNG -58.381 · Z 12
      </text>

      <!-- Brújula (superior derecha) -->
      <g transform="translate(940, 60)">
        <circle r="16" fill="var(--bg-elevated)" stroke="var(--border-glass)" stroke-width="1"/>
        <line x1="0" y1="-11" x2="0" y2="11" stroke="var(--text-dim)" stroke-width="0.8"/>
        <line x1="-11" y1="0" x2="11" y2="0" stroke="var(--text-dim)" stroke-width="0.8"/>
        <polygon points="0,-11 -3,-4 3,-4" fill="var(--accent-red)"/>
        <text x="0" y="-14" text-anchor="middle" font-size="8" font-family="monospace" fill="var(--accent-red)">N</text>
      </g>

      <!-- Scale bar (inferior derecha) -->
      <g transform="translate(840, 680)">
        <rect x="0" y="-3" width="80" height="3" fill="var(--text-dim)"/>
        <rect x="0" y="-3" width="1" height="6" fill="var(--text-dim)"/>
        <rect x="80" y="-3" width="1" height="6" fill="var(--text-dim)"/>
        <text x="40" y="-6" text-anchor="middle" font-size="8" font-family="monospace" fill="var(--text-dim)">2 km</text>
      </g>

      <!-- Leyenda (inferior izquierda) -->
      <g transform="translate(12, 640)">
        <rect x="0" y="-6" width="140" height="55" rx="4"
          fill="var(--bg-elevated)" fill-opacity="0.85"
          stroke="var(--border-glass)" stroke-width="0.5"/>
        <!-- DISPONIBLE -->
        <circle cx="12" cy="8" r="4" fill="var(--accent-emerald)"/>
        <text x="22" y="12" font-size="8" font-family="monospace" fill="var(--text-secondary)">DISPONIBLE</text>
        <!-- EN_RUTA -->
        <circle cx="12" cy="21" r="4" fill="var(--accent-blue)"/>
        <text x="22" y="25" font-size="8" font-family="monospace" fill="var(--text-secondary)">EN_RUTA</text>
        <!-- EN_SITIO -->
        <circle cx="12" cy="34" r="4" fill="var(--accent-amber)"/>
        <text x="22" y="38" font-size="8" font-family="monospace" fill="var(--text-secondary)">EN_SITIO</text>
        <!-- TRASLADO -->
        <circle cx="80" cy="8" r="4" fill="var(--accent-cyan)"/>
        <text x="90" y="12" font-size="8" font-family="monospace" fill="var(--text-secondary)">TRASLADO</text>
        <!-- Emergencia -->
        <circle cx="80" cy="21" r="4" fill="var(--accent-red)"/>
        <text x="90" y="25" font-size="8" font-family="monospace" fill="var(--text-secondary)">EMERGENCIA</text>
      </g>
    </svg>
  `,
})
export class OperationsMapComponent {
  ambulances = input<UnidadMovilDTO[]>([]);
  emergencies = input<TicketAsistenciaDTO[]>([]);
  selectedEmergencyId = input<number | null>(null);

  selectAmbulance = output<number>();
  selectEmergency = output<number>();

  // Coordinate conversion — Buenos Aires area approx:
  // lat -34.4 to -34.75, lng -58.3 to -58.65
  private LAT_MIN = -34.75;
  private LAT_MAX = -34.40;
  private LNG_MIN = -58.65;
  private LNG_MAX = -58.30;

  private geoToPixel(lat?: number, lng?: number): { x: number; y: number } {
    const x = lng == null
      ? 500
      : Math.max(20, Math.min(980, ((lng - this.LNG_MIN) / (this.LNG_MAX - this.LNG_MIN)) * 1000));
    const y = lat == null
      ? 350
      : Math.max(20, Math.min(680, ((this.LAT_MAX - lat) / (this.LAT_MAX - this.LAT_MIN)) * 700));
    return { x, y };
  }

  mappedAmbulances = computed((): MapUnit[] =>
    this.ambulances().map((u) => ({
      unit: u,
      ...this.geoToPixel(u.latitud, u.longitud),
    })),
  );

  mappedTickets = computed((): MapTicket[] =>
    this.emergencies()
      .filter((t) => t.latitud != null && t.longitud != null)
      .map((t) => ({
        ticket: t,
        ...this.geoToPixel(t.latitud, t.longitud),
      })),
  );

  ambulanceTrails = computed(() => {
    const ticketMap = new Map(
      this.mappedTickets().map((mt) => [mt.ticket.id, mt]),
    );
    return this.mappedAmbulances()
      .filter((ma) => ma.unit.ticketActivo != null)
      .flatMap((ma) => {
        const target = ticketMap.get(ma.unit.ticketActivo!);
        if (!target) return [];
        return [{
          ambId: ma.unit.id,
          x1: ma.x,
          y1: ma.y,
          x2: target.x,
          y2: target.y,
        }];
      });
  });

  priorityColor(prioridad?: string): string {
    switch (prioridad) {
      case 'CRITICA': return 'var(--accent-red)';
      case 'URGENTE': return 'var(--accent-amber)';
      default: return 'var(--accent-emerald)';
    }
  }

  ambColor(estado?: string): string {
    switch (estado) {
      case 'DISPONIBLE': return 'var(--accent-emerald)';
      case 'EN_RUTA': return 'var(--accent-blue)';
      case 'EN_SITIO': return 'var(--accent-amber)';
      case 'TRASLADO': return 'var(--accent-cyan)';
      case 'MANTENIMIENTO': return 'var(--text-muted)';
      default: return 'var(--text-muted)';
    }
  }
}
