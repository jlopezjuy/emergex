import { Component, signal, computed, inject, OnInit, DestroyRef } from '@angular/core';
import { environment } from '../../../environments/environment';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

interface Channel {
  id: string;
  name: string;
  freq: string;
  active: boolean;
  signal: number; // 1–3
}

interface LogEntry {
  id: number;
  type: 'DESPACHO' | 'ESTADO' | 'PRE-AVISO' | 'RUTA' | 'ACUSE' | 'ALERTA' | 'SOLICITUD';
  time: string;
  unit: string;
  msg: string;
}

const CHANNELS: Channel[] = [
  { id: 'ops',     name: 'CANAL OPS',     freq: '156.800 MHz', active: true,  signal: 3 },
  { id: 'alpha',   name: 'CANAL ALPHA',   freq: '157.050 MHz', active: true,  signal: 2 },
  { id: 'bravo',   name: 'CANAL BRAVO',   freq: '157.150 MHz', active: false, signal: 1 },
  { id: 'charlie', name: 'CANAL CHARLIE', freq: '157.250 MHz', active: true,  signal: 3 },
  { id: 'medico',  name: 'CANAL MÉDICO',  freq: '157.350 MHz', active: true,  signal: 2 },
  { id: 'admin',   name: 'CANAL ADMIN',   freq: '157.450 MHz', active: false, signal: 1 },
];

const LOG_ENTRIES: LogEntry[] = [
  { id: 1,  type: 'DESPACHO',  time: '14:32:07', unit: 'U-07', msg: 'Despacho hacia Av. Corrientes 1842 — Caso 0047' },
  { id: 2,  type: 'ESTADO',    time: '14:31:44', unit: 'U-03', msg: 'En sitio — paciente estabilizado' },
  { id: 3,  type: 'PRE-AVISO', time: '14:30:59', unit: 'U-07', msg: 'Pre-aviso Clínica San Martín — TCE moderado' },
  { id: 4,  type: 'RUTA',      time: '14:30:12', unit: 'U-12', msg: 'Salida base — destino Av. Rivadavia 4500' },
  { id: 5,  type: 'ACUSE',     time: '14:29:30', unit: 'U-07', msg: 'Acuse recibo Despacho 0047 — ETA 6 min' },
  { id: 6,  type: 'ALERTA',    time: '14:28:55', unit: 'U-03', msg: '¡Alerta! PCR en curso — solicito soporte ALS' },
  { id: 7,  type: 'SOLICITUD', time: '14:27:40', unit: 'U-01', msg: 'Solicitud oxígeno adicional BASE 04' },
  { id: 8,  type: 'ESTADO',    time: '14:26:15', unit: 'U-12', msg: 'Disponible — de regreso a base' },
  { id: 9,  type: 'RUTA',      time: '14:25:00', unit: 'U-09', msg: 'En traslado — Hospital General — ETA 12 min' },
  { id: 10, type: 'DESPACHO',  time: '14:23:45', unit: 'U-01', msg: 'Despacho hacia Callao y Corrientes — Caso 0046' },
];

/** Map log type → CSS modifier suffix for .log-row__type */
function logTypeCssClass(type: LogEntry['type']): string {
  switch (type) {
    case 'DESPACHO':  return 'log-row__type--dispatch';
    case 'ALERTA':    return 'log-row__type--alert';
    case 'PRE-AVISO': return 'log-row__type--preavis';
    case 'SOLICITUD': return 'log-row__type--request';
    default:          return '';
  }
}

/** Map log type → left-border row modifier */
function logRowCssClass(type: LogEntry['type']): string {
  switch (type) {
    case 'DESPACHO': return 'log-row--dispatch';
    case 'ALERTA':   return 'log-row--alert';
    case 'SOLICITUD': return 'log-row--request';
    default:         return '';
  }
}

/** Signal bar heights in px for 3 bars at signal level 1–3 */
function barHeights(signalLevel: number): number[] {
  // 3 bars; bar i is visible if signalLevel >= i+1
  return [4, 8, 12].map((h, i) => signalLevel >= i + 1 ? h : 4);
}

function barOpacity(signalLevel: number, barIndex: number): number {
  return signalLevel >= barIndex + 1 ? 1 : 0.2;
}

@Component({
  selector: 'app-communications',
  standalone: true,
  imports: [NgClass, NgFor, NgIf],
  template: `
    <div style="display:flex; flex-direction:column; height:100%; overflow:hidden; background:var(--bg-deep);">

      <!-- Page header -->
      <div style="flex-shrink:0; padding:16px 20px; border-bottom:1px solid var(--border-hairline); display:flex; align-items:center; gap:12px;">
        <!-- Icon + title -->
        <div style="width:32px;height:32px;border-radius:8px;background:rgba(34,211,238,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--accent-cyan)" stroke-width="1.5">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1z" opacity=".3"/>
            <path d="M8 4a4 4 0 100 8A4 4 0 008 4z" opacity=".5"/>
            <circle cx="8" cy="8" r="1.5"/>
            <path d="M2 8h2M12 8h2M8 2v2M8 12v2"/>
          </svg>
        </div>
        <div>
          <h1 style="font-size:17px;font-weight:600;color:var(--text-primary);margin:0 0 2px;">Comunicaciones</h1>
          <p style="font-size:10px;font-family:var(--font-mono);color:var(--text-muted);margin:0;">CANALES DE RADIO · TELEMETRÍA · LOG OPERACIONAL</p>
        </div>
        <!-- KPI chips -->
        <div style="display:flex;align-items:center;gap:0;border-radius:8px;overflow:hidden;border:1px solid var(--border-glass);background:var(--bg-elevated);margin-left:12px;">
          @for (kpi of commKpis; track kpi.label) {
            <div style="padding:8px 16px;text-align:center;border-right:1px solid var(--border-glass);" [style.borderRight]="$last ? 'none' : '1px solid var(--border-glass)'">
              <div style="font-size:9px;font-family:var(--font-mono);color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px;">{{ kpi.label }}</div>
              <div style="font-size:16px;font-weight:700;font-family:var(--font-mono);" [style.color]="kpi.color">{{ kpi.value }}</div>
            </div>
          }
        </div>
      </div>

      <!-- Full-height 3-column layout -->
      <div style="display:flex; flex:1; overflow:hidden;">

      <!-- ════════════════════════════════════════════════
           LEFT — Channel list (220px)
           ════════════════════════════════════════════════ -->
      <aside style="
        width: 220px;
        flex-shrink: 0;
        border-right: 1px solid var(--border-hairline);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      ">
        <!-- Header -->
        <div style="
          padding: 14px 14px 10px;
          border-bottom: 1px solid var(--border-hairline);
          flex-shrink: 0;
        ">
          <div class="eyebrow" style="margin-bottom:6px;">Canales Radio</div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="dot-live"></span>
            <span style="font-size:11px; color:var(--accent-emerald); font-family:var(--font-mono); font-weight:600; letter-spacing:0.1em;">LIVE</span>
          </div>
        </div>

        <!-- Channel rows -->
        <div style="overflow-y:auto; flex:1;">
          <button
            *ngFor="let ch of channels"
            class="channel"
            [attr.data-active]="activeChannelId() === ch.id ? 'true' : null"
            (click)="selectChannel(ch.id)"
            style="width:100%; display:flex; flex-direction:column; gap:6px;"
          >
            <!-- Top row: dot + name + signal bars -->
            <div class="channel__head">
              <div style="display:flex; align-items:center; gap:7px; overflow:hidden;">
                <span [class]="ch.active ? 'dot-live' : 'dot-off'"></span>
                <span style="
                  font-family:var(--font-mono);
                  font-size:11.5px;
                  font-weight:600;
                  color:var(--text-primary);
                  white-space:nowrap;
                  overflow:hidden;
                  text-overflow:ellipsis;
                ">{{ ch.name }}</span>
              </div>
              <!-- Signal bars -->
              <div class="channel__traffic">
                <span
                  *ngFor="let bar of getBarHeights(ch.signal); let i = index"
                  [style.height.px]="bar"
                  [style.opacity]="getBarOpacity(ch.signal, i)"
                  style="background:var(--accent-cyan); border-radius:1px; width:3px;"
                ></span>
              </div>
            </div>
            <!-- Bottom row: frequency -->
            <div class="channel__meta">
              <span style="font-size:10.5px; color:var(--text-muted); font-family:var(--font-mono);">{{ ch.freq }}</span>
            </div>
          </button>
        </div>
      </aside>

      <!-- ════════════════════════════════════════════════
           CENTER — PTT + active channel info
           ════════════════════════════════════════════════ -->
      <main style="
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0;
        padding: 32px 24px;
        overflow: hidden;
      ">
        <!-- Active channel info -->
        <div style="
          width: 100%;
          max-width: 480px;
          text-align: center;
          margin-bottom: 40px;
        ">
          <div class="eyebrow" style="margin-bottom:8px;">Canal activo</div>
          <div style="
            font-family: var(--font-mono);
            font-size: 20px;
            font-weight: 700;
            color: var(--text-primary);
            letter-spacing: 0.06em;
            margin-bottom: 4px;
          ">{{ activeChannel()?.name }}</div>
          <div style="display:flex; align-items:center; justify-content:center; gap:10px; margin-top:6px;">
            <span style="font-size:12px; color:var(--text-muted); font-family:var(--font-mono);">
              {{ activeChannel()?.freq }}
            </span>
            <span class="badge badge--stable" style="font-size:9.5px; padding:2px 8px;">EN SERVICIO</span>
          </div>
        </div>

        <!-- PTT button -->
        <div style="width:100%; max-width:480px;">
          <button
            class="ptt-btn"
            [attr.data-active]="pressing() ? 'true' : null"
            [style.background]="pressing() ? 'rgba(239,68,68,0.28)' : ''"
            [style.box-shadow]="pressing() ? 'var(--glow-red), inset 0 0 0 1px rgba(239,68,68,0.5)' : ''"
            [style.transform]="pressing() ? 'scale(0.98)' : 'scale(1)'"
            (mousedown)="startPTT()"
            (mouseup)="stopPTT()"
            (mouseleave)="stopPTT()"
            (touchstart)="startPTT()"
            (touchend)="stopPTT()"
          >
            <div class="ptt-btn__ring"></div>
            <div class="ptt-btn__inner">
              <!-- Mic icon -->
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="2" width="6" height="11" rx="3"/>
                <path d="M5 10a7 7 0 0014 0"/>
                <line x1="12" y1="19" x2="12" y2="22"/>
                <line x1="8"  y1="22" x2="16" y2="22"/>
              </svg>
              <span style="
                font-family: var(--font-mono);
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.14em;
                text-transform: uppercase;
                color: var(--accent-red);
              ">{{ pressing() ? 'TRANSMITIENDO...' : 'PULSAR PARA HABLAR' }}</span>
            </div>
          </button>

          <!-- Keyboard hint -->
          <div style="
            text-align: center;
            margin-top: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
          ">
            <span class="eyebrow">Atajo</span>
            <kbd class="kbd">barra espaciadora</kbd>
          </div>
        </div>

        <!-- Transmitting info (visible while pressing) -->
        <div *ngIf="pressing()" style="
          margin-top: 28px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: var(--r-btn);
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.22);
        ">
          <span class="dot-live" style="background:var(--accent-red); box-shadow:var(--glow-red);"></span>
          <span style="font-size:12px; color:var(--text-secondary);">
            Transmitiendo: <strong style="color:var(--accent-cyan); font-family:var(--font-mono);">U-07</strong>
            — Av. Independencia 842, Centro
          </span>
        </div>
      </main>

      <!-- ════════════════════════════════════════════════
           RIGHT — Operational log (320px)
           ════════════════════════════════════════════════ -->
      <aside style="
        width: 320px;
        flex-shrink: 0;
        border-left: 1px solid var(--border-hairline);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      ">
        <!-- Log header -->
        <div class="log-head">
          <div>
            <div class="eyebrow" style="margin-bottom:4px;">Bitácora Operativa</div>
            <div class="log-head__live">
              <span class="dot-live"></span>
              <span style="font-size:11px; color:var(--text-muted); font-family:var(--font-mono);">Último: 14:32:07</span>
            </div>
          </div>
          <span class="badge badge--info" style="font-size:9px;">{{ logEntries().length }} entradas</span>
        </div>

        <!-- Log list — scrollable -->
        <div class="log-list" style="flex:1; overflow-y:auto;">
          <div
            *ngFor="let entry of logEntries()"
            class="log-row"
            [ngClass]="getLogRowClass(entry.type)"
          >
            <!-- Type badge -->
            <span class="log-row__type" [ngClass]="getLogTypeClass(entry.type)">
              {{ entry.type }}
            </span>
            <!-- Time -->
            <span class="log-row__t" style="font-family:var(--font-mono); font-size:10.5px;">
              {{ entry.time }}
            </span>
            <!-- Unit -->
            <span class="log-row__from">{{ entry.unit }}</span>
            <!-- Message -->
            <span class="log-row__msg" style="font-size:11.5px; line-height:1.45;">
              {{ entry.msg }}
            </span>
          </div>
        </div>
      </aside>

      </div><!-- end 3-column -->
    </div><!-- end page wrapper -->
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    .ptt-btn {
      transition: background 0.1s ease, box-shadow 0.1s ease, transform 0.08s ease;
    }
  `],
})
export class CommunicationsComponent implements OnInit {
    private destroyRef = inject(DestroyRef);
  private http = inject(HttpClient);

  readonly channels = CHANNELS;

  readonly commKpis = [
    { label: 'Canales activos',   value: CHANNELS.filter(c => c.active).length, color: 'var(--accent-cyan)' },
    { label: 'Operadores online', value: '—',   color: 'var(--text-primary)' },
    { label: 'TX hoy',            value: '—',   color: 'var(--text-primary)' },
    { label: 'Latencia',          value: '—',   color: 'var(--accent-emerald)' },
  ];

  activeChannelId = signal<string>('ops');
  pressing = signal<boolean>(false);
  logEntries = signal<LogEntry[]>([]);

  activeChannel = computed(() =>
    this.channels.find(ch => ch.id === this.activeChannelId()) ?? null
  );

  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiUrl}/api/v1/notificaciones/log`).pipe(
      catchError(() => of([])), takeUntilDestroyed(this.destroyRef)
    ).subscribe((items: any[]) => {
      const entries: LogEntry[] = (items ?? []).map((item, idx) => ({
        id:   item.id   ?? idx,
        type: item.type ?? item.tipo ?? 'ESTADO',
        time: item.time ?? item.hora ?? '',
        unit: item.unit ?? item.unidad ?? '',
        msg:  item.msg  ?? item.mensaje ?? '',
      }));
      this.logEntries.set(entries);
    });
  }

  selectChannel(id: string): void {
    this.activeChannelId.set(id);
  }

  startPTT(): void {
    this.pressing.set(true);
  }

  stopPTT(): void {
    this.pressing.set(false);
  }

  getBarHeights(signalLevel: number): number[] {
    return barHeights(signalLevel);
  }

  getBarOpacity(signalLevel: number, barIndex: number): number {
    return barOpacity(signalLevel, barIndex);
  }

  getLogTypeClass(type: LogEntry['type']): string {
    return logTypeCssClass(type);
  }

  getLogRowClass(type: LogEntry['type']): string {
    return logRowCssClass(type);
  }
}
