import { Component, inject, signal, computed, input, output, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmergencyApiService } from '../../../data-access/api/emergency.api';
import { SessionStore } from '../../../core/stores/session.store';
import { DateUtils } from '../../../core/utils/date.utils';
import { ClinicalUtils } from '../../../core/utils/clinical.utils';
import {
  TicketDetalleDTO,
  LogEstadoTicketDTO,
  AtencionFullDTO,
  HospitalDTO,
  DiagnosticoFrecuenteDTO,
  TelemedicinaSalaResponseDTO,
  CoberturaAsistenciaSnapshotDTO,
  ConsentimientoInformadoDTO,
  EpisodioClinicoDTO,
} from '../../../data-access/dto/ticket.dto';
import { UnidadMovilDTO } from '../../../data-access/dto/ambulancia.dto';

// Shared Components
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { GlassCardComponent } from '../../../shared/components/glass-card/glass-card.component';
import { DispatchModalComponent } from '../../../shared/components/emergency/dispatch-modal/dispatch-modal.component';
import { OperationsMapComponent } from '../../../shared/components/map/operations-map/operations-map.component';
import { SearchableSelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { StatusFlowBarComponent } from '../../../shared/components/emergency/status-flow-bar/status-flow-bar.component';
import { AddAssistedPersonModalComponent } from '../coverage-operations/add-assisted-person-modal.component';

// Feature Presentational Components
import { EmergencyHeaderComponent } from './components/emergency-header/emergency-header.component';
import { PatientCardComponent } from './components/patient-card/patient-card.component';
import { CoverageSnapshotCardComponent } from './components/coverage-snapshot-card/coverage-snapshot-card.component';
import { VitalSignsCardComponent } from './components/vital-signs-card/vital-signs-card.component';
import { ClinicalItemListComponent } from './components/clinical-item-list/clinical-item-list.component';
import { OperativeTimelineComponent } from './components/operative-timeline/operative-timeline.component';
import { AssignedUnitCardComponent } from './components/assigned-unit-card/assigned-unit-card.component';
import { TelemedicinePanelComponent } from './components/telemedicine-panel/telemedicine-panel.component';
import { ClinicalEvolutionTimelineComponent } from './components/clinical-evolution-timeline/clinical-evolution-timeline.component';

// Feature Modals
import { CancelEmergencyModalComponent } from './modals/cancel-emergency-modal/cancel-emergency-modal.component';
import { HospitalDeliveryModalComponent } from './modals/hospital-delivery-modal/hospital-delivery-modal.component';
import { ClinicalDataModalComponent } from './modals/clinical-data-modal/clinical-data-modal.component';
import { CloseEmergencyModalComponent } from './modals/close-emergency-modal/close-emergency-modal.component';

// Models
import { ALL_STEPS, StatusStep } from './models/status-step.model';
import { ClinicalEvent } from './models/clinical-event.model';

@Component({
  selector: 'app-emergency-detail',
  standalone: true,
  imports: [
    LoadingStateComponent,
    ErrorStateComponent,
    GlassCardComponent,
    DispatchModalComponent,
    AddAssistedPersonModalComponent,
    OperationsMapComponent,
    StatusFlowBarComponent,
    EmergencyHeaderComponent,
    PatientCardComponent,
    CoverageSnapshotCardComponent,
    VitalSignsCardComponent,
    ClinicalItemListComponent,
    OperativeTimelineComponent,
    AssignedUnitCardComponent,
    TelemedicinePanelComponent,
    ClinicalEvolutionTimelineComponent,
    CancelEmergencyModalComponent,
    HospitalDeliveryModalComponent,
    ClinicalDataModalComponent,
    CloseEmergencyModalComponent,
  ],
  templateUrl: './emergency-detail.component.html',
  styleUrl: './emergency-detail.component.scss',
})
export class EmergencyDetailComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private emergencyApi = inject(EmergencyApiService);
  private session = inject(SessionStore);

  // ── Input / output signals ────────────────────────────────────
  readonly ticketIdInput = input<number | undefined>(undefined, { alias: 'ticketId' });
  readonly ticketClosed = output<void>();

  // ── Core signals ──────────────────────────────────────────────
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly detalle = signal<TicketDetalleDTO | null>(null);
  readonly episodios = signal<EpisodioClinicoDTO[]>([]);
  readonly timeline = signal<LogEstadoTicketDTO[]>([]);
  readonly reversedTimeline = computed(() => [...this.timeline()].reverse());
  readonly tracking = signal<any | null>(null);

  // ── Modal visibility signals ──────────────────────────────────
  readonly showDispatch = signal(false);
  readonly showIdentifyPersonModal = signal(false);
  readonly showCancelDialog = signal(false);
  readonly showCloseDialog = signal(false);
  readonly showEntregaModal = signal(false);
  readonly clinicalModal = signal<'SIGNOS' | 'PROCEDIMIENTO' | 'MEDICACION' | null>(null);

  // ── Notes signals ─────────────────────────────────────────────
  readonly noteText = signal('');
  readonly notaError = signal<string | null>(null);
  readonly notaOk = signal(false);

  // ── Telemedicina signals ──────────────────────────────────────
  readonly telemedicinaSala = signal<TelemedicinaSalaResponseDTO | null>(null);
  readonly iniciandoTelemedicina = signal(false);
  readonly telemedicinaError = signal<string | null>(null);

  // ── Catalogs & Snapshots ──────────────────────────────────────
  readonly hospitales = signal<HospitalDTO[]>([]);
  readonly diagnosticosFrecuentes = signal<DiagnosticoFrecuenteDTO[]>([]);
  readonly coberturaSnapshot = signal<CoberturaAsistenciaSnapshotDTO | null>(null);
  readonly clinicalAtencion = signal<AtencionFullDTO | null>(null);
  readonly consentimientos = signal<ConsentimientoInformadoDTO[]>([]);
  readonly activeTab = signal<'general' | 'clinico'>('general');

  readonly Number = Number;

  readonly diagnosticosFrecuentesOptions = computed<SearchableSelectOption[]>(() =>
    this.diagnosticosFrecuentes().map((d) => ({
      value: d.id,
      label: d.categoria ? `${d.nombre} — ${d.categoria}` : d.nombre,
    }))
  );

  readonly ticket = computed(() => this.detalle()?.ticket ?? null);

  readonly signos = computed(() => {
    const clinical = this.clinicalAtencion()?.signos ?? [];
    return clinical.length > 0 ? clinical : (this.detalle()?.signos ?? []);
  });

  readonly procedimientos = computed(() =>
    (this.clinicalAtencion()?.notas ?? [])
      .filter((n) => n.motivoConsulta === 'PROCEDIMIENTO')
      .map((n) => ({ id: n.id, descripcion: n.procedimientoRealizado ?? n.evolucion, ejecutadoPor: 'Operador', timestamp: n.fecha }))
  );

  readonly medicacion = computed(() =>
    (this.clinicalAtencion()?.notas ?? [])
      .filter((n) => n.motivoConsulta === 'MEDICACION')
      .map((n) => ({
        id: n.id,
        medicamento: ClinicalUtils.extractMedicationPart(n.evolucion, 'Medicamento'),
        dosis: ClinicalUtils.extractMedicationPart(n.evolucion, 'Dosis'),
        via: ClinicalUtils.extractMedicationPart(n.evolucion, 'Vía'),
        administradoPor: 'Operador',
        timestamp: n.fecha,
      }))
  );

  readonly mapTickets = computed(() => {
    const t = this.ticket();
    return t?.latitud != null && t.longitud != null ? [t] : [];
  });

  readonly mapAmbulances = computed((): UnidadMovilDTO[] => {
    const t = this.ticket();
    const pos = this.tracking()?.ultimaPosicionAmbulancia;
    if (!t?.ambulanciaId || pos?.latitud == null || pos?.longitud == null) return [];
    return [{
      id: t.ambulanciaId,
      identificador: t.unidadAsignada ?? `AMB-${t.ambulanciaId}`,
      tipo: 'AMBULANCIA',
      estado: t.estado === 'EN_SITIO' ? 'EN_SITIO' : t.estado === 'TRASLADO' ? 'TRASLADO' : 'EN_RUTA',
      latitud: Number(pos.latitud),
      longitud: Number(pos.longitud),
      ticketActivo: t.id,
    } as UnidadMovilDTO];
  });

  readonly timelineNotes = computed(() =>
    this.timeline().filter((e) => !!e.notas)
  );

  readonly isClosedOrCancelled = computed(() => {
    const estado = this.ticket()?.estado;
    return estado === 'CERRADO' || estado === 'CANCELADO' || estado === 'COMPLETADO';
  });

  readonly canIdentifyAnonymousPatient = computed(() => {
    const name = this.ticket()?.pacienteDescripcion ?? this.ticket()?.pacienteNombreSnapshot ?? '';
    return !this.isClosedOrCancelled() && name.includes('A IDENTIFICAR (ÁREA PROTEGIDA)');
  });

  readonly statusSteps = computed((): StatusStep[] => {
    const timelineStates = new Set(this.timeline().map((event) => event.estado));
    const ticket = this.ticket();
    const huboTraslado =
      timelineStates.has('TRASLADO') ||
      timelineStates.has('ENTREGADO') ||
      !!ticket?.horaInicioTraslado ||
      !!ticket?.horaFinTraslado;

    return ALL_STEPS.filter((step) => {
      if ((step.id === 'TRASLADO' || step.id === 'ENTREGADO') && !huboTraslado) return false;
      return true;
    });
  });

  readonly activeStepIndex = computed((): number => {
    const estado = this.ticket()?.estado ?? '';
    const steps = this.statusSteps();
    const idx = steps.findIndex((s) => s.id === estado);
    return idx >= 0 ? idx : Math.max(steps.length - 1, 0);
  });

  // ── Action guards ─────────────────────────────────────────────
  readonly canDispatch = computed(() => {
    const t = this.ticket();
    const canByRole = this.session.isDespachante() || this.session.isOperador() || this.session.isAdministrador() || this.session.isPropietario() || this.session.isAdmin();
    if (!canByRole) return false;
    if (t?.estado === 'HOSPITALIZACION_PENDIENTE') return true;
    return !t?.ambulanciaId && (t?.estado === 'RECIBIDO' || t?.estado === 'EN_ESPERA');
  });

  readonly canMarkEnCamino = computed(() => {
    const t = this.ticket();
    return !!t?.ambulanciaId && (t.estado === 'RECIBIDO' || t.estado === 'DESPACHADO');
  });

  readonly canMarkEnSitio = computed(() => {
    const t = this.ticket();
    return !!t?.ambulanciaId && (t.estado === 'RECIBIDO' || t.estado === 'DESPACHADO' || t.estado === 'EN_CAMINO');
  });

  readonly canStartTransfer = computed(() => {
    const t = this.ticket();
    return t?.estado === 'EN_SITIO' && !t.horaInicioTraslado;
  });

  readonly canFinishTransfer = computed(() => {
    const t = this.ticket();
    return t?.estado === 'EN_SITIO' && !!t.horaInicioTraslado && !t.horaFinTraslado;
  });

  readonly canClose = computed(() => {
    const estado = this.ticket()?.estado;
    return estado !== 'CERRADO' && estado !== 'COMPLETADO' && estado !== 'CANCELADO';
  });

  readonly trasladoEnCurso = computed(() => {
    const t = this.ticket();
    return !!t?.horaInicioTraslado && !t.horaFinTraslado;
  });

  readonly canEditClinical = computed(() => {
    const estado = this.ticket()?.estado;
    const canByRole = this.session.isMedicoCampo() || this.session.isProfesional() || this.session.isDespachante() || this.session.isAdministrador() || this.session.isAdmin();
    return canByRole && (estado === 'EN_SITIO' || estado === 'EN_CAMINO' || estado === 'DESPACHADO');
  });

  readonly canStartTelemedicine = computed(() => {
    const t = this.ticket();
    if (!t) return false;
    const esTipoTelemedicina = t.tipoAsistencia === 'ORIENTACION_TELEFONICA' || t.canal === 'VIDEOLLAMADA';
    const habilitadoEmpresa = t.empresaHabilitaTelemedicina !== false;
    const estadoAbierto = t.estado !== 'CERRADO' && t.estado !== 'COMPLETADO' && t.estado !== 'CANCELADO';
    return estadoAbierto && (esTipoTelemedicina || habilitadoEmpresa);
  });

  readonly canCreateOperationalNotes = computed(() => {
    return this.session.isDespachante() ||
           this.session.isOperador() ||
           this.session.isAdministrador() ||
           this.session.isPropietario() ||
           this.session.isAdmin();
  });

  readonly transportDeparture = computed((): string => {
    const ev = this.timeline().find((e) => e.estado === 'EN_CAMINO');
    return ev ? this.formatDate(ev.fecha) : '—';
  });

  readonly firmas: { rol: string }[] = [
    { rol: 'Operador' },
    { rol: 'Médico de campo' },
    { rol: 'Receptor' },
  ];

  readonly clinicalEvolution = computed((): ClinicalEvent[] => {
    const events: ClinicalEvent[] = [];

    // 1. Signos vitales
    for (const sv of this.signos()) {
      const date = sv.timestamp || sv.fechaHora;
      if (date) {
        const details = [];
        if (sv.presionSistolica != null && sv.presionDiastolica != null) details.push(`PA: ${sv.presionSistolica}/${sv.presionDiastolica} mmHg`);
        if (sv.frecuenciaCardiaca != null) details.push(`FC: ${sv.frecuenciaCardiaca} bpm`);
        if (sv.frecuenciaRespiratoria != null) details.push(`FR: ${sv.frecuenciaRespiratoria} rpm`);
        if (sv.saturacionO2 != null) details.push(`SpO₂: ${sv.saturacionO2}%`);
        if (sv.temperatura != null) details.push(`Temp: ${sv.temperatura}°C`);
        if (sv.glucemia != null) details.push(`Glucemia: ${sv.glucemia} mg/dL`);
        if (sv.glasgowTotal != null) details.push(`Glasgow: ${sv.glasgowTotal}/15 (O:${sv.glasgowOcular} V:${sv.glasgowVerbal} M:${sv.glasgowMotor})`);
        if (sv.avpu) details.push(`AVPU: ${sv.avpu}`);

        events.push({
          type: 'SIGNOS',
          date: date,
          title: 'Control de Signos Vitales',
          details: details,
          description: sv.observacion || sv.observaciones,
          badgeClass: 'badge--stable',
          rawData: sv,
        });
      }
    }

    // 2. Procedimientos
    for (const p of this.procedimientos()) {
      const date = p.timestamp;
      if (date) {
        events.push({
          type: 'PROCEDIMIENTO',
          date: date,
          title: 'Procedimiento Clínico',
          description: p.descripcion,
          details: [`Ejecutado por: ${p.ejecutadoPor}`],
          badgeClass: 'badge--urgent',
        });
      }
    }

    // 3. Medicación
    for (const m of this.medicacion()) {
      const date = m.timestamp;
      if (date) {
        events.push({
          type: 'MEDICACION',
          date: date,
          title: 'Administración de Medicación',
          description: m.medicamento,
          details: [`Dosis: ${m.dosis}`, `Vía: ${m.via}`, `Administrado por: ${m.administradoPor}`],
          badgeClass: 'badge--critical',
        });
      }
    }

    // 4. Consentimientos
    for (const c of this.consentimientos()) {
      const date = c.fechaFirma;
      if (date) {
        events.push({
          type: 'CONSENTIMIENTO',
          date: date,
          title: `Consentimiento: ${c.tipoConsentimiento.replace(/_/g, ' ')}`,
          description: `Profesional Responsable: ${c.profesionalResponsable}`,
          details: [
            `Estado: ${c.estado}`,
            `Número Acto: ${c.numeroActo}`,
            c.firmaDigital ? `Firma Digital: ${c.firmaDigital}` : 'Firma transmitida desde app móvil',
            `Testigo: ${c.testigo || 'No requerido'}`,
            `Observación: ${c.observacion || 'Ninguna'}`,
          ],
          badgeClass: 'badge--stable',
          rawData: c,
        });
      }
    }

    // 5. Resolución Médica (Cierre)
    const resolucion = this.detalle()?.resolucion;
    if (resolucion) {
      const date = resolucion.fechaResolucion || this.ticket()?.horaCierre;
      if (date) {
        const detalleClinico = resolucion.detalleClinico;
        const diagnostico = detalleClinico?.diagnosticoFrecuenteNombre || detalleClinico?.diagnosticoLibre;
        events.push({
          type: 'RESOLUCION',
          date: date,
          title: `Resolución del Caso: ${resolucion.tipoResolucion?.replace(/_/g, ' ') || 'Finalizado'}`,
          description: resolucion.impresionClinica,
          details: [
            resolucion.tratamientoRealizado ? `Tratamiento: ${resolucion.tratamientoRealizado}` : '',
            resolucion.requiereTraslado ? `Traslado requerido a: ${resolucion.hospitalDestino || 'Por determinar'}` : 'No requiere traslado',
            diagnostico ? `Diagnóstico: ${diagnostico}` : '',
            detalleClinico?.antecedentes ? `Antecedentes: ${detalleClinico.antecedentes}` : '',
            detalleClinico?.consultoFamiliarEmpleado
              ? `Consultó con familiar/empleado${detalleClinico.consultadoNombre ? ': ' + detalleClinico.consultadoNombre : ''}`
              : '',
          ].filter(Boolean),
          badgeClass: 'badge--stable',
        });
      }
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });

  get ticketId(): number {
    return this.ticketIdInput() ?? Number(this.route.snapshot.paramMap.get('id'));
  }

  ngOnInit(): void {
    this.load();
    this.loadHospitales();
    this.loadDiagnosticosFrecuentes();

    if (this.route.snapshot.queryParamMap.get('accion') === 'cerrar') {
      this.cerrar();
    }
  }

  loadHospitales(): void {
    this.emergencyApi.getHospitales().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => this.hospitales.set(data),
      error: () => {},
    });
  }

  loadDiagnosticosFrecuentes(): void {
    this.emergencyApi.getDiagnosticosFrecuentes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => this.diagnosticosFrecuentes.set(data),
      error: () => {},
    });
  }

  onPersonIdentified(): void {
    this.showIdentifyPersonModal.set(false);
    this.load();
  }

  load(): void {
    const id = this.ticketId;
    this.loading.set(true);
    this.error.set(null);

    this.emergencyApi.getDetalle(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.detalle.set(data as TicketDetalleDTO);
        this.emergencyApi.getEpisodios(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (episodios) => this.episodios.set(episodios),
          error: () => this.episodios.set([]),
        });
        this.loadClinicalAtencion();
        this.loadTicketGeo(id);
        this.loadTracking(id);

        const pacId = data.ticket?.pacienteId;
        if (pacId) {
          this.emergencyApi.getConsentimientos(pacId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (list) => this.consentimientos.set(list),
            error: () => this.consentimientos.set([]),
          });
        }

        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error al cargar el detalle del ticket');
        this.loading.set(false);
      },
    });

    this.emergencyApi.getTimeline(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => this.timeline.set(data),
      error: () => this.timeline.set([]),
    });

    this.emergencyApi.getCoberturaSnapshot(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((snap) => {
      this.coberturaSnapshot.set(snap);
    });
  }

  private loadTicketGeo(id: number): void {
    if (!id || isNaN(id) || id <= 0) return;
    this.emergencyApi.getLatestGeo('TICKET', id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (geo) => {
        this.detalle.update((current) => {
          if (!current?.ticket) return current;
          return {
            ...current,
            ticket: {
              ...current.ticket,
              latitud: geo.latitud,
              longitud: geo.longitud,
            },
          };
        });
      },
      error: () => void 0,
    });
  }

  private loadTracking(id: number): void {
    this.emergencyApi.getTracking(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (tracking) => this.tracking.set(tracking),
      error: () => this.tracking.set(null),
    });
  }

  loadClinicalAtencion(): void {
    this.emergencyApi.getAtencionesPorTicket(this.ticketId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        const first = items?.[0];
        if (!first?.atencionId) {
          this.clinicalAtencion.set(null);
          return;
        }
        this.emergencyApi.getAtencionDetalle(first.atencionId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (detalle) => this.clinicalAtencion.set(detalle),
          error: () => this.clinicalAtencion.set(null),
        });
      },
      error: () => this.clinicalAtencion.set(null),
    });
  }

  iniciarTeleconsulta(): void {
    this.iniciandoTelemedicina.set(true);
    this.telemedicinaError.set(null);
    this.emergencyApi.iniciarTelemedicina(this.ticketId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (sala) => {
        this.telemedicinaSala.set(sala);
        this.iniciandoTelemedicina.set(false);
      },
      error: (err) => {
        this.iniciandoTelemedicina.set(false);
        this.telemedicinaError.set(
          err?.error?.detail ?? err?.error?.title ?? 'Error al iniciar la sala de telemedicina'
        );
      },
    });
  }

  abrirSalaTelemedicina(): void {
    const sala = this.telemedicinaSala();
    if (sala?.urlSala) {
      window.open(sala.urlSala, '_blank');
    }
  }

  goBack(): void {
    window.history.back();
  }

  openDispatch(): void {
    this.showDispatch.set(true);
  }

  onDispatched(): void {
    this.showDispatch.set(false);
    this.load();
  }

  openClinicalModal(kind: 'SIGNOS' | 'PROCEDIMIENTO' | 'MEDICACION'): void {
    this.clinicalModal.set(kind);
  }

  onClinicalModalSaved(): void {
    this.clinicalModal.set(null);
    this.load();
  }

  agregarNota(): void {
    const nota = this.noteText().trim();
    if (!nota) return;
    this.notaError.set(null);
    this.notaOk.set(false);
    if (!this.canCreateOperationalNotes()) {
      this.notaError.set('La API actual no expone un endpoint para agregar notas operativas desde esta pantalla.');
      return;
    }
    this.emergencyApi.agregarNota(this.ticketId, nota).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.noteText.set('');
        this.notaOk.set(true);
        setTimeout(() => this.notaOk.set(false), 3000);
        this.load();
      },
      error: () => {
        this.notaError.set('No se pudo guardar la nota');
      },
    });
  }

  marcarEnCamino(): void {
    this.emergencyApi.enCamino(this.ticketId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Error al marcar en camino'),
    });
  }

  marcarEnSitio(): void {
    this.emergencyApi.enSitio(this.ticketId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Error al marcar en sitio'),
    });
  }

  iniciarTraslado(): void {
    this.emergencyApi.iniciarTraslado(this.ticketId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Error al iniciar traslado'),
    });
  }

  finalizarTraslado(): void {
    this.showEntregaModal.set(true);
  }

  onEntregaConfirmed(): void {
    this.showEntregaModal.set(false);
    this.load();
  }

  cerrar(): void {
    this.showCloseDialog.set(true);
  }

  onCloseConfirmed(): void {
    this.showCloseDialog.set(false);
    if (this.ticketIdInput() != null) {
      this.ticketClosed.emit();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  cancelar(): void {
    this.showCancelDialog.set(true);
  }

  onCancelConfirmed(): void {
    this.showCancelDialog.set(false);
    if (this.ticketIdInput() != null) {
      this.ticketClosed.emit();
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return DateUtils.format(iso, 'dd/MM HH:mm');
  }

  formatTime(iso?: string): string {
    if (!iso) return '—';
    return DateUtils.format(iso, 'HH:mm');
  }
}
