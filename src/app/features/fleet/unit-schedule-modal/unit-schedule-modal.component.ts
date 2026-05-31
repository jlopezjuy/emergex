import { Component, input, output, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { catchError, of } from 'rxjs';
import { FleetApiService } from '../../../data-access/api/fleet.api';
import { UnidadMovilDTO, GuardiaDTO, TripulacionGuardiaDTO, LogTurnoDTO, ProfesionalDisponibleDTO } from '../../../data-access/dto/ambulancia.dto';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { StaffApiService } from '../../../data-access/api/staff.api';
import { DateUtils } from '../../../core/utils/date.utils';
import { DateTime } from 'luxon';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

type TabId = 'tripulacion' | 'turnos' | 'calendario';
type RolTripulacionUi = 'MEDICO' | 'ENFERMERO' | 'PARAMEDICO' | 'CHOFER';

type TurnoConfigUi = {
  uiId: string;
  label: string;
  horaInicio: string;
  horaFin: string;
  vigenciaDesde: string;
  vigenciaHasta?: string;
  diasActivos: boolean[];
  tripulacion: TripulacionGuardiaDTO[];
};

const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const DIA_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

@Component({
  selector: 'emx-unit-schedule-modal',
  standalone: true,
  imports: [LoadingStateComponent, EmptyStateComponent],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(2,6,23,0.75); backdrop-filter: blur(4px);" (click)="closed.emit()">
      <div class="glass-strong rounded-card w-full max-h-[92vh] flex flex-col overflow-hidden" style="max-width:920px; min-width:320px;" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between px-6 py-4 border-b" style="border-color: var(--border-glass);">
          <div>
            <div class="eyebrow" style="color:var(--accent-blue)">CONFIGURACIÓN · UNIDAD</div>
            <div class="flex items-center gap-2 mt-1">
              <h2 class="font-semibold text-2xl" style="color:var(--text-primary)">{{ unit().identificador ?? ('U-' + unit().id) }}</h2>
              <span class="badge badge--stable">{{ unit().tipo ?? 'AMBULANCIA' }}</span>
            </div>
          </div>
          <button type="button" class="action-icon" (click)="closed.emit()">✕</button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-4">
          <div class="flex gap-1 mb-4 border-b" style="border-color: var(--border-glass);">
            @for (tab of tabs; track tab.id) {
              <button type="button" class="px-3 py-2 text-xs font-semibold"
                [style.color]="activeTab() === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)'"
                [style.border-bottom]="activeTab() === tab.id ? '2px solid var(--accent-cyan)' : '2px solid transparent'"
                (click)="setTab(tab.id)">{{ tab.label }}</button>
            }
          </div>

          @if (activeTab() === 'tripulacion') {
            @if (loadingGuardias()) { <emx-loading-state /> } @else {
              <div class="flex items-center justify-between mb-3">
                <div class="eyebrow">TRIPULACIÓN DEL TURNO · {{ selectedTurno()!.tripulacion.length }} MIEMBROS</div>
                <button type="button" class="btn btn--ghost btn--sm" (click)="showCrewPicker.update(v => !v)">+ Agregar miembro</button>
              </div>

              <div class="mb-3">
                <label class="eyebrow">Turno configurado</label>
                <select class="qc-input mt-1" [value]="selectedTurno()!.uiId" (change)="seleccionarTurno($event)">
                  @for (t of turnosUi(); track t.uiId) {
                    <option [value]="t.uiId">{{ t.label }} · {{ t.horaInicio }}–{{ t.horaFin }}</option>
                  }
                </select>
              </div>

              @if (showCrewPicker()) {
                <div class="us-picker mb-3">
                  @for (p of profesionalesDisponibles(); track p.profesionalId) {
                    <button type="button" class="us-picker__row" (click)="agregarTripulanteSimple(p)">
                      <span class="flex-1">{{ p.profesionalNombre }}</span>
                      <span class="cert-chip">{{ p.especialidad ?? 'Profesional' }}</span>
                      <span style="color:var(--accent-emerald);font-weight:700">+</span>
                    </button>
                  }
                </div>
              }

              @if (!selectedTurno()) {
                <emx-empty-state message="Agregá un turno antes de configurar tripulación" />
              } @else if (selectedTurno()!.tripulacion.length === 0) {
                <emx-empty-state message="Sin tripulación en este turno" />
              } @else {
                <ul class="flex flex-col gap-2">
                  @for (m of selectedTurno()!.tripulacion; track $index; let i = $index) {
                    <li class="us-crew-card">
                      <span class="flex-1" style="color: var(--text-primary);">{{ nombreTripulante(m) }}</span>
                      <select
                        class="qc-input"
                        style="width:160px;height:30px"
                        (change)="cambiarRolTripulante(selectedTurno()!.uiId, i, selectValue($event))"
                      >
                        @for (rol of rolesTripulacion; track rol) {
                          <option [value]="rol" [selected]="rol === (m.rol ?? 'PARAMEDICO')">{{ rol }}</option>
                        }
                      </select>
                      <button type="button" class="us-remove" (click)="quitarTripulante(m.profesionalId)">✕</button>
                    </li>
                  }
                </ul>
              }
            }
          }

          @if (activeTab() === 'turnos') {
            <div class="flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div class="eyebrow">TURNOS DEFINIDOS · {{ turnosUi().length }}</div>
                <button type="button" class="btn btn--ghost btn--sm" (click)="crearTurnoRapido()">+ Nuevo turno</button>
              </div>

              @for (t of turnosUi(); track t.uiId) {
                <div class="us-shift-card" style="border-left-color: var(--accent-blue)">
                  <div class="us-shift-card__head">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="qc-prio-dot" style="background: var(--accent-blue)"></span>
                      <input class="qc-input" style="width:130px;height:30px" [value]="t.label" (change)="actualizarTurno(t.uiId, 'label', inputValue($event))" />
                      <input type="time" class="qc-input" style="width:110px;height:30px" [value]="t.horaInicio" (change)="actualizarTurno(t.uiId, 'horaInicio', inputValue($event))" />
                      <span class="mono micro" style="color: var(--text-muted)">→</span>
                      <input type="time" class="qc-input" style="width:110px;height:30px" [value]="t.horaFin" (change)="actualizarTurno(t.uiId, 'horaFin', inputValue($event))" />
                      <span class="mono micro" style="color: var(--text-muted)">{{ horasTurno(t) }}h</span>
                    </div>
                    <button type="button" class="us-remove" (click)="eliminarTurno(t.uiId)">🗑</button>
                  </div>

                  <div class="eyebrow mt-3">RANGO OPERATIVO</div>
                  <div class="flex gap-2 mt-2 flex-wrap">
                    <input type="date" class="qc-input" style="width:160px" [value]="t.vigenciaDesde" (change)="actualizarTurno(t.uiId, 'vigenciaDesde', inputValue($event))" />
                    <input type="date" class="qc-input" style="width:160px" [value]="t.vigenciaHasta ?? ''" (change)="actualizarTurno(t.uiId, 'vigenciaHasta', inputValue($event))" />
                  </div>

                  <div class="eyebrow mt-3">DÍAS ACTIVOS</div>
                  <div class="us-dow mt-2">
                    @for (d of diaLabels; track $index) {
                      <button type="button" class="us-dow__btn"
                        [style.border-color]="t.diasActivos[$index] ? 'var(--accent-blue)' : 'var(--border-glass)'"
                        [style.background]="t.diasActivos[$index] ? 'rgba(59,130,246,0.15)' : 'rgba(2,6,23,0.35)'"
                        [style.color]="t.diasActivos[$index] ? 'var(--accent-blue)' : 'var(--text-secondary)'"
                        (click)="toggleDiaTurno(t.uiId, $index)">{{ d }}</button>
                    }
                  </div>

                  <div class="eyebrow mt-3">LÍDER DE TURNO</div>
                  <div class="rounded px-3 py-2 text-sm mt-1" style="border:1px solid var(--border-glass)">{{ getLiderTurno(t) }}</div>

                  <div class="flex items-center justify-between mt-3">
                    <div class="eyebrow">TRIPULACIÓN · {{ t.tripulacion.length }} MIEMBROS</div>
                    <button type="button" class="btn btn--ghost btn--sm" (click)="configurarTripulacionTurno(t.uiId)">
                      + Configurar tripulación
                    </button>
                  </div>
                  @if (t.tripulacion.length > 0) {
                    <div class="flex flex-wrap gap-2 mt-2">
                      @for (m of t.tripulacion; track m.profesionalId) {
                        <span class="cert-chip">{{ nombreTripulante(m) }} · {{ m.rol }}</span>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }

          @if (activeTab() === 'calendario') {
            @if (loadingLogs()) { <emx-loading-state /> }
            <div class="flex flex-col gap-4">
              <div class="flex items-center justify-between">
                <button type="button" class="btn btn--ghost btn--sm" (click)="prevMonth()">‹</button>
                <div class="text-center">
                  <div class="font-semibold" style="color:var(--text-primary);">{{ calMonthLabel() }}</div>
                  <div class="eyebrow">Disponibilidad · Unidad {{ unit().identificador }}</div>
                </div>
                <button type="button" class="btn btn--ghost btn--sm" (click)="nextMonth()">›</button>
              </div>
              <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:3px;">
                @for (d of diaLabels; track $index) { <div class="eyebrow" style="text-align:center; padding:4px 0;">{{ d }}</div> }
              </div>
              <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:3px;">
                @for (day of calCells(); track $index; let i = $index) {
                  @if (day === null) { <div style="min-height:52px; border-radius:6px;"></div> }
                  @else {
                    <div style="min-height:52px; border-radius:6px; border:1px solid; padding:4px 5px; display:flex; flex-direction:column; justify-content:space-between"
                      [style.background]="cellStyle(dayOfWeekForCell(i)).bg"
                      [style.border-color]="isToday(day) ? 'var(--accent-blue)' : cellStyle(dayOfWeekForCell(i)).border">
                      <span class="font-mono" style="font-size:11px">{{ day }}</span>
                      <span class="font-mono" style="font-size:8px; color:white; padding:2px 5px; border-radius:3px; align-self:flex-end;" [style.background]="cellStyle(dayOfWeekForCell(i)).tagBg">{{ cellStyle(dayOfWeekForCell(i)).tag }}</span>
                    </div>
                  }
                }
              </div>
            </div>
          }
        </div>

        <div class="px-6 py-4 border-t flex justify-between gap-2" style="border-color: var(--border-glass);">
          <div>
            <div class="eyebrow"><span class="kbd">Esc</span> cerrar · los cambios se aplican al guardar</div>
            @if (saveError()) {
              <div class="text-xs mt-1" style="color: var(--accent-red);">{{ saveError() }}</div>
            }
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn btn--ghost btn--sm" (click)="closed.emit()">Cancelar</button>
            <button type="button" class="btn btn--primary btn--sm" [disabled]="saving()" (click)="guardarConfiguracion()">{{ saving() ? 'Guardando…' : 'Guardar configuración' }}</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class UnitScheduleModalComponent implements OnInit {
    private destroyRef = inject(DestroyRef);
  unit = input.required<UnidadMovilDTO>();
  closed = output<void>();
  saved = output<void>();

  private fleetApi = inject(FleetApiService);
  private staffApi = inject(StaffApiService);

  readonly activeTab = signal<TabId>('tripulacion');
  readonly tabs: { id: TabId; label: string }[] = [
    { id: 'tripulacion', label: 'Tripulación' },
    { id: 'turnos', label: 'Turnos' },
    { id: 'calendario', label: 'Calendario' },
  ];
  readonly diaLabels = DIA_LABELS;
  readonly rolesTripulacion: RolTripulacionUi[] = ['MEDICO', 'ENFERMERO', 'PARAMEDICO', 'CHOFER'];

  readonly loadingGuardias = signal(false);
  readonly turnosUi = signal<TurnoConfigUi[]>([]);
  readonly selectedTurnoId = signal<string | null>(null);
  readonly selectedTurno = computed(() => this.turnosUi().find((t) => t.uiId === this.selectedTurnoId()) ?? this.turnosUi()[0] ?? null);
  readonly showCrewPicker = signal(false);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly profesionalesDisponibles = signal<ProfesionalDisponibleDTO[]>([]);

  readonly loadingLogs = signal(false);
  readonly logsTurnos = signal<LogTurnoDTO[]>([]);
  readonly calMonth = signal<DateTime>(DateUtils.now().startOf('month'));

  readonly calCells = computed((): (number | null)[] => {
    const m = this.calMonth();
    const first = m.startOf('month');
    const startDay = first.weekday - 1; // Lunes = 0 en indexación de 0 a 6
    const daysInMonth = m.daysInMonth ?? 30;
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  });

  readonly calMonthLabel = computed(() => {
    const m = this.calMonth();
    const names = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${names[m.month - 1]} ${m.year}`;
  });

  ngOnInit(): void {
    this.loadGuardias();
    this.loadLogsTurnos();
    this.loadProfesionales();
  }

  setTab(id: TabId): void {
    this.activeTab.set(id);
  }

  loadProfesionales(): void {
    this.staffApi.getDisponibles().pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef)).subscribe((list) => {
      this.profesionalesDisponibles.set((list ?? []).map((p) => ({
        profesionalId: p.id,
        profesionalNombre: `${p.apellido}, ${p.nombre}`.replace(/^,\s*/, '').trim(),
        especialidad: p.especialidad ?? null,
      })));
    });
  }

  loadGuardias(): void {
    this.loadingGuardias.set(true);
    this.fleetApi.getGuardias(this.unit().id).pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef)).subscribe((guardias) => {
      const turnos = this.agruparGuardias(guardias ?? []);
      this.turnosUi.set(turnos.length ? turnos : [this.nuevoTurno('Matutino', '06:00', '18:00')]);
      this.selectedTurnoId.set(this.turnosUi()[0]?.uiId ?? null);
      this.loadingGuardias.set(false);
    });
  }

  agruparGuardias(guardias: GuardiaDTO[]): TurnoConfigUi[] {
    const map = new Map<string, TurnoConfigUi>();
    for (const g of guardias.filter((x) => x.estado !== 'CANCELADA')) {
      const key = `${g.horaInicio}|${g.horaFin}|${g.vigenciaDesde}|${g.vigenciaHasta ?? ''}`;
      const item = map.get(key) ?? {
        uiId: `g-${map.size}-${Date.now()}`,
        label: this.inferirLabel(g.horaInicio, g.horaFin),
        horaInicio: (g.horaInicio ?? '06:00').slice(0, 5),
        horaFin: (g.horaFin ?? '18:00').slice(0, 5),
        vigenciaDesde: this.normalizeDateOnly(g.vigenciaDesde) ?? this.todayIsoDate(),
        vigenciaHasta: this.normalizeDateOnly(g.vigenciaHasta),
        diasActivos: [false, false, false, false, false, false, false],
        tripulacion: g.tripulacion ?? [],
      };
      if (item.tripulacion.length === 0 && (g.tripulacion ?? []).length > 0) {
        item.tripulacion = g.tripulacion ?? [];
      }
      const idx = DIAS.indexOf(g.diaSemana ?? '');
      if (idx >= 0) item.diasActivos[idx] = true;
      map.set(key, item);
    }
    return [...map.values()];
  }

  inferirLabel(inicio?: string, fin?: string): string {
    if ((inicio ?? '').startsWith('18') || (fin ?? '').startsWith('06')) return 'Nocturno';
    return 'Matutino';
  }

  nuevoTurno(label: string, horaInicio: string, horaFin: string): TurnoConfigUi {
    const nocturno = label.toLowerCase().includes('noct');
    return {
      uiId: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label,
      horaInicio,
      horaFin,
      vigenciaDesde: this.todayIsoDate(),
      vigenciaHasta: undefined,
      diasActivos: nocturno ? [false, false, false, false, true, true, true] : [true, true, true, true, true, false, false],
      tripulacion: [],
    };
  }

  seleccionarTurno(event: Event): void {
    this.selectedTurnoId.set((event.target as HTMLSelectElement).value);
  }

  configurarTripulacionTurno(uiId: string): void {
    this.selectedTurnoId.set(uiId);
    this.showCrewPicker.set(true);
    this.activeTab.set('tripulacion');
  }

  crearTurnoRapido(): void {
    const nocturno = this.turnosUi().length % 2 === 1;
    const turno = nocturno ? this.nuevoTurno('Nocturno', '18:00', '06:00') : this.nuevoTurno('Matutino', '06:00', '18:00');
    this.turnosUi.update((list) => [...list, turno]);
    this.selectedTurnoId.set(turno.uiId);
  }

  eliminarTurno(uiId: string): void {
    this.turnosUi.update((list) => list.filter((x) => x.uiId !== uiId));
    if (this.selectedTurnoId() === uiId) this.selectedTurnoId.set(this.turnosUi()[0]?.uiId ?? null);
  }

  actualizarTurno(uiId: string, field: keyof Pick<TurnoConfigUi, 'label' | 'horaInicio' | 'horaFin' | 'vigenciaDesde' | 'vigenciaHasta'>, value: string): void {
    this.turnosUi.update((list) => list.map((t) => t.uiId === uiId ? { ...t, [field]: value || undefined } : t));
  }

  toggleDiaTurno(uiId: string, idx: number): void {
    this.turnosUi.update((list) => list.map((t) => {
      if (t.uiId !== uiId) return t;
      const dias = [...t.diasActivos];
      dias[idx] = !dias[idx];
      return { ...t, diasActivos: dias };
    }));
  }

  agregarTripulanteSimple(p: ProfesionalDisponibleDTO): void {
    const turno = this.selectedTurno();
    if (!turno?.uiId || !p.profesionalId) return;
    const trip: TripulacionGuardiaDTO = {
      profesionalId: p.profesionalId,
      profesionalNombre: p.profesionalNombre,
      especialidad: p.especialidad,
      rol: this.inferirRol(p),
      activo: true,
    };
    this.turnosUi.update((list) => list.map((t) => {
      if (t.uiId !== turno.uiId || t.tripulacion.some((m) => m.profesionalId === p.profesionalId)) return t;
      return { ...t, tripulacion: [...t.tripulacion, trip] };
    }));
    this.showCrewPicker.set(false);
  }

  quitarTripulante(profesionalId?: number): void {
    const turno = this.selectedTurno();
    if (!turno?.uiId || !profesionalId) return;
    this.turnosUi.update((list) => list.map((t) => t.uiId === turno.uiId ? { ...t, tripulacion: t.tripulacion.filter((m) => m.profesionalId !== profesionalId) } : t));
  }

  cambiarRolTripulante(uiId: string, tripulanteIndex: number, rol: string): void {
    this.saveError.set(null);
    this.turnosUi.update((list) => list.map((t) => t.uiId === uiId ? {
      ...t,
      tripulacion: t.tripulacion.map((m, idx) => idx === tripulanteIndex ? { ...m, rol } : m),
    } : t));
  }

  selectValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  guardarConfiguracion(): void {
    this.saveError.set(null);
    const errores = this.validarConfiguracion();
    if (errores.length > 0) {
      this.saveError.set(errores[0]);
      return;
    }
    const guardias: GuardiaDTO[] = [];
    for (const t of this.turnosUi()) {
      t.diasActivos.forEach((activo, idx) => {
        if (!activo) return;
        guardias.push({
          ambulanciaId: this.unit().id,
          diaSemana: DIAS[idx],
          horaInicio: t.horaInicio,
          horaFin: t.horaFin,
          estado: 'ACTIVA',
          vigenciaDesde: t.vigenciaDesde,
          vigenciaHasta: t.vigenciaHasta || undefined,
          tripulacion: t.tripulacion.map((m) => ({ ...m, activo: true })),
        });
      });
    }
    this.saving.set(true);
    this.fleetApi.guardarGuardias(this.unit().id, guardias).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
              this.saving.set(false);
              this.saved.emit();
              this.closed.emit();
            },
            error: () => {
              this.saving.set(false);
              this.saveError.set('No se pudo guardar. Revisá dotación mínima y solapamientos.');
            },
          });
  }

  validarConfiguracion(): string[] {
    const errores: string[] = [];
    for (const t of this.turnosUi()) {
      if (!t.diasActivos.some(Boolean)) continue;
      const roles = t.tripulacion.map((m) => m.rol);
      const tieneChofer = roles.includes('CHOFER');
      const tieneMedico = roles.includes('MEDICO');
      const tieneEnfermeroOParamedico = roles.includes('ENFERMERO') || roles.includes('PARAMEDICO');
      const tipo = (this.unit().tipo ?? 'AMBULANCIA').toUpperCase();
      if (tipo.includes('AMBULANCIA') && (!tieneChofer || !tieneMedico || !tieneEnfermeroOParamedico)) {
        errores.push(`${t.label}: dotación mínima AMBULANCIA = CHOFER + MEDICO + ENFERMERO/PARAMEDICO.`);
      } else if (tipo.includes('TRASLADO') && !tieneChofer) {
        errores.push(`${t.label}: dotación mínima TRASLADO = CHOFER.`);
      } else if (tipo.includes('UTILITARIO') && (!tieneChofer || (!tieneMedico && !tieneEnfermeroOParamedico))) {
        errores.push(`${t.label}: dotación mínima UTILITARIO = CHOFER + MEDICO/PARAMEDICO.`);
      }
    }
    return errores;
  }

  loadLogsTurnos(): void {
    this.loadingLogs.set(true);
    this.fleetApi.getLogsTurnos(this.unit().id).pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
      this.logsTurnos.set(data);
      this.loadingLogs.set(false);
    });
  }

  inferirRol(p: ProfesionalDisponibleDTO): RolTripulacionUi {
    const e = (p.especialidad ?? '').toLowerCase();
    if (e.includes('enfer')) return 'ENFERMERO';
    if (e.includes('med')) return 'MEDICO';
    return 'PARAMEDICO';
  }

  getLiderTurno(t: TurnoConfigUi): string {
    const first = t.tripulacion[0];
    if (!first) return 'Sin asignar';
    return `${this.nombreTripulante(first)} · ${first.rol ?? 'Soporte'}`;
  }

  nombreTripulante(m: TripulacionGuardiaDTO): string {
    return m.nombre ?? m.profesionalNombre ?? (m.profesionalId ? `Prof. ${m.profesionalId}` : 'Profesional');
  }

  horasTurno(t: TurnoConfigUi): number {
    const [ih, im] = t.horaInicio.split(':').map(Number);
    const [fh, fm] = t.horaFin.split(':').map(Number);
    let min = (fh * 60 + fm) - (ih * 60 + im);
    if (min <= 0) min += 1440;
    return Math.round(min / 60);
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  todayIsoDate(): string {
    return DateUtils.todayYmd();
  }

  private normalizeDateOnly(value?: string): string | undefined {
    if (!value) return undefined;
    return value.length >= 10 ? value.slice(0, 10) : value;
  }

  prevMonth(): void {
    this.calMonth.update((m) => m.minus({ months: 1 }));
  }

  nextMonth(): void {
    this.calMonth.update((m) => m.plus({ months: 1 }));
  }

  cellShiftKind(dayOfWeek: number): 'MAT' | 'NOC' {
    return dayOfWeek >= 5 ? 'NOC' : 'MAT';
  }

  cellStyle(dayOfWeek: number): { bg: string; border: string; tag: string; tagBg: string } {
    const kind = this.cellShiftKind(dayOfWeek);
    if (kind === 'MAT') return { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', tag: 'MAT', tagBg: 'var(--accent-blue)' };
    return { bg: 'rgba(34,211,238,0.12)', border: 'rgba(34,211,238,0.35)', tag: 'NOC', tagBg: 'var(--accent-cyan)' };
  }

  isToday(day: number | null): boolean {
    if (!day) return false;
    const today = DateUtils.now();
    const m = this.calMonth();
    return day === today.day && m.month === today.month && m.year === today.year;
  }

  dayOfWeekForCell(cellIndex: number): number {
    return cellIndex % 7;
  }
}
