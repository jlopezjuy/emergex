import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmergencyApiService } from '../../data-access/api/emergency.api';
import { TrackingApiService } from '../../data-access/api/tracking.api';
import { SessionStore } from '../../core/stores/session.store';
import { TicketAsistenciaDTO } from '../../data-access/dto/ticket.dto';

/**
 * Componente standalone para la interfaz móvil de la tripulación en campo (PWA).
 * Permite gestionar asignaciones en tiempo real, cambiar estados operativos y transmitir telemetría GPS.
 */
@Component({
  selector: 'app-tripulacion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-950 text-slate-100 p-4 pb-20 font-sans">
      <!-- Encabezado Operativo -->
      <header class="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 shadow-2xl flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold tracking-tight text-white flex items-center gap-2">
            <span class="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>
            Terminal Tripulación
          </h1>
          <p class="text-xs text-slate-400 mt-0.5">Operador: {{ sessionStore.account()?.login }}</p>
        </div>
        <div class="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
          <span class="text-xs font-semibold text-slate-300">Movil Activo</span>
        </div>
      </header>

      <!-- Mensajes de Error/Informativos -->
      @if (errorMsg()) {
        <div class="bg-rose-950/60 border border-rose-800/80 text-rose-200 p-4 rounded-xl mb-6 flex justify-between items-center text-sm">
          <span>{{ errorMsg() }}</span>
          <button (click)="errorMsg.set(null)" class="text-rose-400 hover:text-white font-bold">&times;</button>
        </div>
      }

      @if (loading()) {
        <div class="flex flex-col items-center justify-center py-12 gap-3">
          <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs text-slate-400">Actualizando datos...</p>
        </div>
      } @else {
        <!-- Panel Principal: Si NO hay ticket activo -->
        @if (!ticketActivo()) {
          <div class="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-900/40 border border-slate-800/60 rounded-2xl border-dashed">
            <div class="w-16 h-16 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center text-2xl mb-4 text-slate-500">
              🛟
            </div>
            <h2 class="text-base font-semibold text-white">Sin asignaciones activas</h2>
            <p class="text-xs text-slate-400 max-w-[260px] mt-1.5 leading-relaxed">
              En este momento no poseés servicios asignados por el despacho operativo.
            </p>
            <button (click)="cargarDatos()" class="mt-6 px-4 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-white rounded-xl transition-all">
              Refrescar
            </button>
          </div>
        } @else {
          <!-- Detalle del Ticket Asignado Activo -->
          <div class="space-y-6">
            <!-- Card de Emergencia -->
            <div class="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
              <div class="p-4 border-b border-slate-800 flex items-center justify-between"
                   [ngClass]="{
                     'bg-rose-950/20': ticketActivo()?.nivelUrgencia === 'ROJO',
                     'bg-amber-950/20': ticketActivo()?.nivelUrgencia === 'AMARILLO',
                     'bg-emerald-950/20': ticketActivo()?.nivelUrgencia === 'VERDE'
                   }">
                <div>
                  <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Emergencia Asignada</span>
                  <h3 class="text-base font-extrabold text-white mt-0.5">{{ ticketActivo()?.codigo }}</h3>
                </div>
                <span class="px-3 py-1 text-[10px] font-black uppercase rounded-lg border tracking-wider"
                      [ngClass]="{
                        'bg-rose-500/10 border-rose-500/30 text-rose-400': ticketActivo()?.nivelUrgencia === 'ROJO',
                        'bg-amber-500/10 border-amber-500/30 text-amber-400': ticketActivo()?.nivelUrgencia === 'AMARILLO',
                        'bg-emerald-500/10 border-emerald-500/30 text-emerald-400': ticketActivo()?.nivelUrgencia === 'VERDE'
                      }">
                  {{ ticketActivo()?.nivelUrgencia }}
                </span>
              </div>

              <div class="p-4 space-y-4">
                <div>
                  <span class="text-[10px] font-bold text-slate-500 uppercase">Paciente</span>
                  <p class="text-sm font-semibold text-white mt-0.5">{{ ticketActivo()?.pacienteNombreSnapshot || 'Paciente no identificado' }}</p>
                </div>

                <div>
                  <span class="text-[10px] font-bold text-slate-500 uppercase">Dirección</span>
                  <p class="text-sm font-semibold text-white mt-0.5">{{ ticketActivo()?.direccion }}</p>
                </div>

                <div>
                  <span class="text-[10px] font-bold text-slate-500 uppercase">Síntomas / Motivo</span>
                  <p class="text-sm font-medium text-slate-300 mt-0.5 leading-relaxed">{{ ticketActivo()?.tipoEmergencia }}</p>
                </div>

                <!-- Telemetría GPS en tiempo real -->
                @if (gpsTransmitting()) {
                  <div class="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 flex items-center gap-3">
                    <span class="flex h-3 w-3 relative">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <div>
                      <p class="text-xs font-bold text-emerald-400">Transmitiendo coordenadas GPS</p>
                      <p class="text-[10px] text-emerald-500 mt-0.5">Lat: {{ simLat.toFixed(5) }}, Lon: {{ simLon.toFixed(5) }}</p>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Panel de Acciones según Estado del Ticket -->
            <div class="space-y-4">
              <!-- Estado: Asignación Recibida (Pendiente de Aceptación) -->
              @if (ticketActivo()?.estado === 'RECIBIDO') {
                <div class="grid grid-cols-2 gap-4">
                  <button (click)="aceptarAsignacion()" class="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-950/30">
                    Aceptar Servicio
                  </button>
                  <button (click)="showRechazoDialog.set(true)" class="py-3 px-4 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all">
                    Rechazar
                  </button>
                </div>
              }

              <!-- Estado: Aceptado / Despachado -->
              @if (ticketActivo()?.estado === 'DESPACHADO') {
                <button (click)="cambiarAEnCamino()" class="w-full py-4 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-indigo-950/30 flex items-center justify-center gap-2">
                  🚀 Iniciar Viaje (En Camino)
                </button>
              }

              <!-- Estado: En Camino -->
              @if (ticketActivo()?.estado === 'EN_CAMINO') {
                <button (click)="cambiarAEnSitio()" class="w-full py-4 px-4 bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-950/30 flex items-center justify-center gap-2">
                  📍 Llegué al Lugar (En Sitio)
                </button>
              }

              <!-- Estado: En Sitio (Atención médica en curso) -->
              @if (ticketActivo()?.estado === 'EN_SITIO') {
                <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4 shadow-xl">
                  <h4 class="text-xs font-bold uppercase tracking-wider text-slate-400">Registro de Atención</h4>
                  
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="text-[10px] font-bold text-slate-400 uppercase">Presión Sistólica (TA)</label>
                      <input type="number" [(ngModel)]="signos.presionSistolica" class="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. 120">
                    </div>
                    <div>
                      <label class="text-[10px] font-bold text-slate-400 uppercase">Presión Diastólica</label>
                      <input type="number" [(ngModel)]="signos.presionDiastolica" class="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. 80">
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="text-[10px] font-bold text-slate-400 uppercase">Frecuencia Cardíaca (FC)</label>
                      <input type="number" [(ngModel)]="signos.frecuenciaCardiaca" class="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. 75">
                    </div>
                    <div>
                      <label class="text-[10px] font-bold text-slate-400 uppercase">Saturación de O2</label>
                      <input type="number" [(ngModel)]="signos.saturacionO2" class="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. 98">
                    </div>
                  </div>

                  <div>
                    <label class="text-[10px] font-bold text-slate-400 uppercase">Diagnóstico / Resolución Médica</label>
                    <textarea [(ngModel)]="diagnostico" rows="3" class="w-full mt-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="Escriba el diagnóstico y resolución..."></textarea>
                  </div>

                  <button (click)="finalizarAtencion()" class="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-950/30">
                    💾 Guardar y Finalizar Atención
                  </button>
                </div>
              }
            </div>
          </div>
        }
      }

      <!-- Diálogo de Rechazo de Asignación -->
      @if (showRechazoDialog()) {
        <div class="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 class="text-sm font-bold uppercase tracking-wider text-slate-200 mb-2">Rechazar Asignación</h3>
            <p class="text-xs text-slate-400 mb-4 leading-relaxed">
              Es necesario reportar el motivo del rechazo del servicio para la auditoría operativa.
            </p>
            <input type="text" [(ngModel)]="motivoRechazo" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500 mb-4" placeholder="e.g. Sin insumos / Fuera de guardia">
            <div class="flex gap-4">
              <button (click)="rechazarAsignacion()" [disabled]="!motivoRechazo()" class="flex-1 py-2 px-4 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all">
                Confirmar
              </button>
              <button (click)="showRechazoDialog.set(false)" class="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: []
})
export class TripulacionComponent implements OnInit, OnDestroy {
  private emergencyApi = inject(EmergencyApiService);
  private trackingApi = inject(TrackingApiService);
  sessionStore = inject(SessionStore);

  // States
  misTickets = signal<TicketAsistenciaDTO[]>([]);
  loading = signal<boolean>(false);
  errorMsg = signal<string | null>(null);
  showRechazoDialog = signal<boolean>(false);
  motivoRechazo = signal<string>('');

  // Signos vitales y diagnóstico
  signos = {
    presionSistolica: undefined as number | undefined,
    presionDiastolica: undefined as number | undefined,
    frecuenciaCardiaca: undefined as number | undefined,
    saturacionO2: undefined as number | undefined,
  };
  diagnostico = '';

  // Telemetría GPS
  gpsTransmitting = signal<boolean>(false);
  simLat = -34.60372;
  simLon = -58.38159;
  private trackingInterval: ReturnType<typeof setInterval> | null = null;

  // Computed: Obtener el primer ticket activo
  ticketActivo = computed(() => {
    return this.misTickets().find(t => t.estado !== 'COMPLETADO' && t.estado !== 'CANCELADO');
  });

  ngOnInit() {
    this.cargarDatos();
  }

  ngOnDestroy() {
    this.detenerGps();
  }

  cargarDatos() {
    this.loading.set(true);
    this.emergencyApi.getMisActivos().subscribe({
      next: (tickets) => {
        this.misTickets.set(tickets);
        this.loading.set(false);
        this.evaluarTransmisionGps();
      },
      error: (_err) => {
        this.errorMsg.set('No se pudo recuperar las asignaciones activas.');
        this.loading.set(false);
      }
    });
  }

  aceptarAsignacion() {
    const active = this.ticketActivo();
    if (!active) return;

    this.loading.set(true);
    // Para el flujo Acceptance: el PatchMapping del backend `/asignaciones/{id}/aceptar` requiere el ID de la asignación.
    // Buscamos las asignaciones activas de este ticket.
    this.trackingApi.aceptarAsignacion(active.id).subscribe({
      next: () => {
        // Al aceptar, el estado en el backend cambia a DESPACHADO. Refrescamos.
        this.cargarDatos();
      },
      error: () => {
        // En caso de que no se encuentre la asignación directamente por ID de ticket, realizamos el cambio de estado directamente a DESPACHADO
        this.emergencyApi.enCamino(active.id).subscribe({
          next: () => this.cargarDatos(),
          error: () => {
            this.errorMsg.set('Ocurrió un error al aceptar el servicio.');
            this.loading.set(false);
          }
        });
      }
    });
  }

  rechazarAsignacion() {
    const active = this.ticketActivo();
    if (!active) return;

    this.loading.set(true);
    this.showRechazoDialog.set(false);
    this.trackingApi.rechazarAsignacion(active.id, { motivo: this.motivoRechazo() }).subscribe({
      next: () => {
        this.motivoRechazo.set('');
        this.cargarDatos();
      },
      error: () => {
        this.errorMsg.set('No se pudo procesar el rechazo de la asignación.');
        this.loading.set(false);
      }
    });
  }

  cambiarAEnCamino() {
    const active = this.ticketActivo();
    if (!active) return;

    this.loading.set(true);
    this.emergencyApi.enCamino(active.id).subscribe({
      next: () => this.cargarDatos(),
      error: () => {
        this.errorMsg.set('Error al cambiar estado a En Camino.');
        this.loading.set(false);
      }
    });
  }

  cambiarAEnSitio() {
    const active = this.ticketActivo();
    if (!active) return;

    this.loading.set(true);
    this.emergencyApi.enSitio(active.id).subscribe({
      next: () => this.cargarDatos(),
      error: () => {
        this.errorMsg.set('Error al cambiar estado a En Sitio.');
        this.loading.set(false);
      }
    });
  }

  finalizarAtencion() {
    const active = this.ticketActivo();
    if (!active) return;

    this.loading.set(true);
    const req = {
      resolucionSintomas: this.diagnostico,
      diagnosticoCierre: this.diagnostico,
      presionSistolica: this.signos.presionSistolica,
      presionDiastolica: this.signos.presionDiastolica,
      frecuenciaCardiaca: this.signos.frecuenciaCardiaca,
      saturacionO2: this.signos.saturacionO2,
    };

    this.emergencyApi.cerrar(active.id, req as Parameters<typeof this.emergencyApi.cerrar>[1]).subscribe({
      next: () => {
        this.diagnostico = '';
        this.signos = { presionSistolica: undefined, presionDiastolica: undefined, frecuenciaCardiaca: undefined, saturacionO2: undefined };
        this.cargarDatos();
      },
      error: () => {
        this.errorMsg.set('No se pudo completar el cierre de la atención.');
        this.loading.set(false);
      }
    });
  }

  // Telemetría GPS Simulado
  private evaluarTransmisionGps() {
    const active = this.ticketActivo();
    if (active && (active.estado === 'EN_CAMINO' || active.estado === 'EN_SITIO')) {
      this.iniciarGps();
    } else {
      this.detenerGps();
    }
  }

  private iniciarGps() {
    if (this.gpsTransmitting()) return;
    this.gpsTransmitting.set(true);

    this.trackingInterval = setInterval(() => {
      // Simular ligeras variaciones de latitud/longitud
      this.simLat += (Math.random() - 0.5) * 0.0001;
      this.simLon += (Math.random() - 0.5) * 0.0001;

      const active = this.ticketActivo();
      if (active && active.ambulanciaId) {
        const payload = {
          latitud: this.simLat,
          longitud: this.simLon,
          timestamp: new Date().toISOString()
        };
        // Enviar ubicación de ambulancia
        this.trackingApi.upsertUbicacionConIdempotency(active.ambulanciaId, payload).subscribe();

        // Enviar heartbeat
        this.trackingApi.registrarHeartbeat({
          ambulanciaId: active.ambulanciaId,
          latitud: this.simLat,
          longitud: this.simLon
        }).subscribe();
      }
    }, 15000); // Cada 15 segundos
  }

  private detenerGps() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    this.gpsTransmitting.set(false);
  }
}
