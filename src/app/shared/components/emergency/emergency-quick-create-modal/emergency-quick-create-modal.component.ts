import { Component, output, inject, HostListener, signal, computed, OnDestroy, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, switchMap, catchError, of } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ModalShellComponent } from '../../modal-shell/modal-shell.component';
import { LocationPickerMapComponent } from '../../map/location-picker-map/location-picker-map.component';
import { AltaRapidaRequest } from '../../../../data-access/dto/ticket.dto';
import { environment } from '../../../../../environments/environment';
import { GeocodeResult } from '../../../map/geocoder-provider';
import { HttpGeocoderProvider } from '../../../map/providers/http-geocoder.provider';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { EmergencyApiService } from '../../../../data-access/api/emergency.api';
import { EmergencyStore } from '../../../../core/stores/emergency.store';
import { EmergencyModalService } from '../emergency-modal.service';
import { UserFeedbackService } from '../../../../core/notifications/user-feedback.service';

type TipoAsistencia = AltaRapidaRequest['tipoAsistencia'];
type NivelUrgencia  = AltaRapidaRequest['nivelUrgencia'];

interface PacienteResult {
  id: number;
  nombre: string;
  apellido: string;
  dni?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
}

const TIPOS_ASISTENCIA: { value: TipoAsistencia; label: string }[] = [
  { value: 'EMERGENCIA_DOMICILIARIA',     label: 'Emergencia domiciliaria' },
  { value: 'CONTROL_MEDICO_DOMICILIARIO', label: 'Control médico' },
  { value: 'ENFERMERIA_DOMICILIARIA',     label: 'Enfermería domiciliaria' },
  { value: 'TRASLADO_PROGRAMADO',         label: 'Traslado programado' },
  { value: 'VISITA_DOMICILIARIA',         label: 'Visita domiciliaria' },
  { value: 'ORIENTACION_TELEFONICA',      label: 'Orientación telefónica' },
];

const NIVELES_URGENCIA: { value: NivelUrgencia; label: string; sublabel: string; color: string; bg: string }[] = [
  { value: 'ROJO',    label: 'Crítica',  sublabel: 'Riesgo de vida inmediato', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  { value: 'AMARILLO', label: 'Urgente', sublabel: 'Atención < 10 min',        color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  { value: 'VERDE',   label: 'Normal',   sublabel: 'Estable, sin urgencia',    color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  { value: 'AZUL',    label: 'Guardia',  sublabel: 'Consulta de guardia',      color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
];

@Component({
  selector: 'emx-emergency-quick-create-modal',
  standalone: true,
  imports: [ReactiveFormsModule, ModalShellComponent, LocationPickerMapComponent],
  template: `
    <emx-modal-shell title="Nueva Emergencia" [closeOnBackdropClick]="false" (closed)="close()">
      <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-5">

        <!-- Tipo de asistencia -->
        <div class="flex flex-col gap-2">
          <label class="eyebrow">Tipo de asistencia *</label>
          <div class="flex flex-wrap gap-1.5">
            @for (t of tiposAsistencia; track t.value) {
              <button
                type="button"
                class="px-2.5 py-1 rounded-btn text-xs font-medium transition-all"
                [style.border]="f['tipoAsistencia'].value === t.value
                  ? '1px solid var(--accent-cyan)'
                  : '1px solid var(--border-glass)'"
                [style.background]="f['tipoAsistencia'].value === t.value
                  ? 'rgba(6,182,212,0.15)'
                  : 'var(--surface-glass)'"
                [style.color]="f['tipoAsistencia'].value === t.value
                  ? 'var(--accent-cyan)'
                  : 'var(--text-secondary)'"
                (click)="f['tipoAsistencia'].setValue(t.value)"
              >{{ t.label }}</button>
            }
          </div>
          @if (f['tipoAsistencia'].invalid && f['tipoAsistencia'].touched) {
            <span class="text-xs" style="color: var(--accent-red);">Seleccioná un tipo</span>
          }
        </div>

        <!-- Paciente -->
        <div class="flex flex-col gap-2">
          <label class="eyebrow">Paciente</label>

          <label class="flex items-center gap-2 text-sm cursor-pointer" style="color: var(--text-secondary);">
            <input type="checkbox" formControlName="noAfiliado" class="rounded" />
            Paciente no registrado
          </label>

          @if (!f['noAfiliado'].value) {
            <!-- Autocomplete de paciente registrado -->
            <div class="relative" (click)="$event.stopPropagation()">
              @if (selectedPaciente()) {
                <!-- Paciente seleccionado -->
                <div
                  class="flex items-center justify-between rounded-btn px-3 py-2 text-sm"
                  style="background: rgba(6,182,212,0.08); border: 1px solid rgba(6,182,212,0.4); color: var(--text-primary);"
                >
                  <span>
                    <span class="font-medium">{{ selectedPaciente()!.apellido }}, {{ selectedPaciente()!.nombre }}</span>
                    @if (selectedPaciente()!.dni) {
                      <span class="ml-2 text-xs" style="color: var(--text-muted);">DNI {{ selectedPaciente()!.dni }}</span>
                    }
                  </span>
                  <button
                    type="button"
                    class="ml-2 text-xs px-1.5 py-0.5 rounded"
                    style="color: var(--text-muted); background: var(--surface-glass);"
                    (click)="clearPaciente()"
                  >✕</button>
                </div>
              } @else {
                <!-- Input de búsqueda -->
                <input
                  type="text"
                  formControlName="pacienteBusqueda"
                  placeholder="Buscar por nombre, apellido o DNI..."
                  autocomplete="off"
                  class="rounded-btn px-3 py-2 text-sm w-full"
                  style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
                  (focus)="dropdownOpen.set(true)"
                />

                <!-- Dropdown de resultados -->
                @if (dropdownOpen() && (searchResults().length > 0 || searching())) {
                  <div
                    class="absolute left-0 right-0 top-full mt-1 rounded-btn z-[200]"
                    style="background: #ffffff; border: 1px solid rgba(148,163,184,0.45); box-shadow: 0 14px 34px rgba(15,23,42,0.18); overflow: hidden;"
                  >
                    @if (searching()) {
                      <div class="px-3 py-2.5 text-xs" style="color: #64748b;">Buscando...</div>
                    } @else {
                      @for (p of searchResults(); track p.id) {
                        <button
                          type="button"
                          class="w-full text-left px-3 py-2.5 text-sm"
                          style="color: #0f172a; border-bottom: 1px solid rgba(148,163,184,0.22);"
                          [style.background]="hoveredId() === p.id ? 'rgba(59,130,246,0.10)' : '#ffffff'"
                          (mouseenter)="hoveredId.set(p.id)"
                          (mouseleave)="hoveredId.set(null)"
                          (click)="selectPaciente(p)"
                        >
                          <span class="font-medium">{{ p.apellido }}, {{ p.nombre }}</span>
                          @if (p.dni) {
                            <span class="ml-2 text-xs" style="color: #64748b;">DNI {{ p.dni }}</span>
                          }
                        </button>
                      }
                    }
                  </div>
                }
              }
            </div>
            @if (f['pacienteId'].invalid && f['pacienteId'].touched) {
              <span class="text-xs" style="color: var(--accent-red);">Seleccioná un paciente registrado</span>
            }
          } @else {
            <!-- Datos de paciente no afiliado -->
            <div class="grid grid-cols-2 gap-2">
              <input
                type="text"
                formControlName="pacienteNombre"
                placeholder="Nombre"
                class="rounded-btn px-3 py-2 text-sm"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
              />
              <input
                type="text"
                formControlName="pacienteApellido"
                placeholder="Apellido"
                class="rounded-btn px-3 py-2 text-sm"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
              />
              <input
                type="text"
                formControlName="pacienteDni"
                placeholder="DNI"
                class="rounded-btn px-3 py-2 text-sm"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
              />
              <input
                type="tel"
                formControlName="pacienteTelefono"
                placeholder="Teléfono"
                class="rounded-btn px-3 py-2 text-sm"
                style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
              />
            </div>
            <div class="flex flex-col gap-1">
              @if (f['pacienteNombre'].invalid && f['pacienteNombre'].touched) {
                <span class="text-xs" style="color: var(--accent-red);">El nombre es obligatorio para paciente no registrado</span>
              }
              @if (f['pacienteTelefono'].invalid && f['pacienteTelefono'].touched) {
                <span class="text-xs" style="color: var(--accent-red);">El teléfono es obligatorio para paciente no registrado</span>
              }
            </div>
          }
        </div>

        <!-- Dirección (oculta para ORIENTACION_TELEFONICA) -->
        @if (f['tipoAsistencia'].value !== 'ORIENTACION_TELEFONICA') {
          <div class="flex flex-col gap-1.5">
            <label class="eyebrow">Dirección *</label>
            <input
              type="text"
              formControlName="direccion"
              placeholder="Av. Independencia 842, Centro"
              class="rounded-btn px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
            />
            @if (f['direccion'].invalid && f['direccion'].touched) {
              <span class="text-xs" style="color: var(--accent-red);">Campo requerido</span>
            }
            @if (geocodeSearching()) {
              <span class="text-xs" style="color: var(--text-muted);">Buscando ubicación...</span>
            }
            @if (geocodeResults().length > 0) {
              <div class="flex flex-col rounded-btn overflow-hidden" style="border:1px solid rgba(148,163,184,.35); background:#fff;">
                @for (result of geocodeResults(); track result.address) {
                  <button
                    type="button"
                    class="text-left px-3 py-2 text-xs"
                    style="color:#0f172a; border-bottom:1px solid rgba(148,163,184,.18);"
                    (click)="selectGeocode(result)"
                  >
                    <span class="font-medium">{{ result.label }}</span>
                    <span class="block mt-0.5" style="color:#64748b;">{{ result.lat.toFixed(5) }}, {{ result.lng.toFixed(5) }}</span>
                  </button>
                }
              </div>
            }
            <div class="rounded-btn overflow-hidden" style="border:1px solid rgba(148,163,184,.35); background:#f8fafc;">
              <emx-location-picker-map
                [lat]="selectedLocation()?.lat ?? null"
                [lng]="selectedLocation()?.lng ?? null"
                (pointChanged)="setManualLocation($event)"
              />
            </div>
            @if (selectedLocation()) {
              <span class="text-xs" style="color: var(--accent-emerald);">
                Ubicación confirmada · {{ selectedLocation()!.lat.toFixed(5) }}, {{ selectedLocation()!.lng.toFixed(5) }}
              </span>
            } @else {
              <span class="text-xs" style="color: var(--accent-amber);">Sin ubicación confirmada. Podés registrar igual, pero el mapa no tendrá punto exacto.</span>
            }
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="eyebrow">Nota de dirección</label>
            <input
              type="text"
              formControlName="notaDireccion"
              placeholder="Piso, depto, referencia..."
              class="rounded-btn px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="eyebrow">Teléfono de contacto</label>
            <input
              type="tel"
              formControlName="telefonoContacto"
              placeholder="Ej: 0388-15912345"
              class="rounded-btn px-3 py-2 text-sm w-full"
              style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
            />
          </div>
        }

        <!-- Nivel de urgencia -->
        <div class="flex flex-col gap-2">
          <label class="eyebrow">Nivel de urgencia *</label>
          <div class="flex gap-2">
            @for (opt of nivelesUrgencia; track opt.value) {
              <button
                type="button"
                class="flex-1 flex flex-col items-center gap-0.5 px-3 py-3 rounded-btn border transition-all"
                [style.border-color]="f['nivelUrgencia'].value === opt.value ? opt.color : 'var(--border-glass)'"
                [style.background]="f['nivelUrgencia'].value === opt.value ? opt.bg : 'transparent'"
                (click)="f['nivelUrgencia'].setValue(opt.value)"
              >
                <span class="w-2.5 h-2.5 rounded-full" [style.background]="opt.color"></span>
                <span class="text-xs font-bold mt-1" [style.color]="opt.color">{{ opt.label }}</span>
                <span class="text-xs text-center leading-tight" style="color: var(--text-muted);">{{ opt.sublabel }}</span>
              </button>
            }
          </div>
          @if (f['nivelUrgencia'].invalid && f['nivelUrgencia'].touched) {
            <span class="text-xs" style="color: var(--accent-red);">Seleccioná un nivel</span>
          }
        </div>

        <!-- Descripción / síntomas -->
        <div class="flex flex-col gap-1.5">
          <label class="eyebrow">Descripción / síntomas *</label>
          <textarea
            formControlName="descripcionSintomas"
            rows="2"
            placeholder="Describí los síntomas o motivo de la llamada..."
            class="rounded-btn px-3 py-2 text-sm w-full resize-none"
            style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
          ></textarea>
          @if (f['descripcionSintomas'].invalid && f['descripcionSintomas'].touched) {
            <span class="text-xs" style="color: var(--accent-red);">Campo requerido</span>
          }
        </div>

        <!-- Observación -->
        <div class="flex flex-col gap-1.5">
          <label class="eyebrow">Observación</label>
          <textarea
            formControlName="observacion"
            rows="2"
            placeholder="Información adicional para el equipo..."
            class="rounded-btn px-3 py-2 text-sm w-full resize-none"
            style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
          ></textarea>
        </div>
      </form>

      <!-- Footer -->
      <div footer class="flex items-center gap-2">
        <span class="flex-1 flex gap-2 text-xs" style="color: var(--text-muted);">
          <span class="font-mono px-1 rounded" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">Esc</span>
          cancelar
          <span class="font-mono px-1 rounded ml-2" style="background: var(--surface-glass); border: 1px solid var(--border-glass);">Enter</span>
          registrar
        </span>
        <button type="button" class="btn btn--ghost btn--sm" (click)="close()">Cancelar</button>
        <button
          type="button"
          class="btn btn--primary btn--sm"
          [disabled]="form.invalid || submitting()"
          (click)="submit()"
        >
          @if (submitting()) {
            <span>Guardando...</span>
          } @else {
            <span>Registrar y despachar</span>
          }
        </button>
      </div>
    </emx-modal-shell>
  `,
})
export class EmergencyQuickCreateModalComponent implements OnDestroy {
  private destroyRef = inject(DestroyRef);
  created = output<AltaRapidaRequest>();
  closed  = output<void>();

  private fb             = inject(FormBuilder);
  private http           = inject(HttpClient);
  private geocoder       = inject(HttpGeocoderProvider);
  private emergencyApi   = inject(EmergencyApiService);
  private emergencyStore = inject(EmergencyStore);
  private modalService   = inject(EmergencyModalService);
  private feedback       = inject(UserFeedbackService);

  readonly submitting = signal(false);

  readonly tiposAsistencia = TIPOS_ASISTENCIA;
  readonly nivelesUrgencia = NIVELES_URGENCIA;

  // ── Autocomplete state ──
  readonly selectedPaciente = signal<PacienteResult | null>(null);
  readonly searchResults    = signal<PacienteResult[]>([]);
  readonly searching        = signal(false);
  readonly dropdownOpen     = signal(false);
  readonly hoveredId        = signal<number | null>(null);
  readonly geocodeResults   = signal<GeocodeResult[]>([]);
  readonly geocodeSearching = signal(false);
  readonly selectedLocation = signal<GeocodeResult | null>(null);

  private destroy$ = new Subject<void>();
  private search$  = new Subject<string>();
  private geocode$ = new Subject<string>();

  form = this.fb.group({
    tipoAsistencia:     ['EMERGENCIA_DOMICILIARIA' as TipoAsistencia | '', Validators.required],
    nivelUrgencia:      ['' as NivelUrgencia  | '', Validators.required],
    descripcionSintomas: ['', [Validators.required, Validators.minLength(1)]],
    direccion:          [''],
    notaDireccion:      [''],
    telefonoContacto:   [''],
    noAfiliado:         [false],
    pacienteBusqueda:   [''],
    pacienteId:         [null as number | null],
    pacienteNombre:     [''],
    pacienteApellido:   [''],
    pacienteDni:        [''],
    pacienteTelefono:   [''],
    observacion:        [''],
  });

  constructor() {
    this.applyConditionalValidators();

    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(query => {
        if (!query || query.length < 2) {
          this.searchResults.set([]);
          this.searching.set(false);
          return of([]);
        }
        this.searching.set(true);
        return this.http
          .get<PacienteResult[]>(`${environment.apiUrl}/api/pacientes/search`, { params: { query } })
          .pipe(catchError(() => of([])));
      }),
      takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => {
      this.searchResults.set(results);
      this.searching.set(false);
    });

    this.f['pacienteBusqueda'].valueChanges
      .pipe(takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.search$.next(v ?? ''));

    this.f['noAfiliado'].valueChanges
      .pipe(takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.handleNoAfiliadoToggle(Boolean(value)));

    this.geocode$.pipe(
      debounceTime(650),
      distinctUntilChanged(),
      switchMap(query => {
        const q = (query ?? '').trim();
        this.selectedLocation.set(null);
        if (q.length < 4) {
          this.geocodeResults.set([]);
          this.geocodeSearching.set(false);
          return of([]);
        }
        this.geocodeSearching.set(true);
        return this.geocoder.search(q).catch(() => []);
      }),
      takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef)
    ).subscribe(results => {
      this.geocodeResults.set(results);
      this.geocodeSearching.set(false);
    });

    this.f['direccion'].valueChanges
      .pipe(takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef))
      .subscribe(v => this.geocode$.next(v ?? ''));

    this.f['tipoAsistencia'].valueChanges
      .pipe(takeUntil(this.destroy$), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applyConditionalValidators());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get f() { return this.form.controls; }

  selectPaciente(p: PacienteResult): void {
    this.selectedPaciente.set(p);
    this.dropdownOpen.set(false);
    this.searchResults.set([]);
    this.f['pacienteBusqueda'].setValue('', { emitEvent: false });
    this.f['pacienteId'].setValue(p.id);
    this.f['pacienteId'].markAsTouched();

    if (p.direccion) {
      const dir = p.ciudad ? `${p.direccion}, ${p.ciudad}` : p.direccion;
      this.f['direccion'].setValue(dir);
      this.resolvePacienteAddress(dir);
    }

    if (!this.f['telefonoContacto'].value && p.telefono) {
      this.f['telefonoContacto'].setValue(p.telefono);
    }
  }

  clearPaciente(): void {
    this.selectedPaciente.set(null);
    this.searchResults.set([]);
    this.f['pacienteId'].setValue(null);
    this.f['pacienteBusqueda'].setValue('', { emitEvent: false });
  }

  private resolvePacienteAddress(address: string): void {
    const query = address.trim();
    if (query.length < 4) return;

    this.geocodeSearching.set(true);
    this.geocoder.search(query).then((results) => {
      if (results && results.length > 0) {
        this.geocodeSearching.set(false);
        this.geocodeResults.set(results);
        this.selectGeocode(results[0]);
      } else {
        // Fallback: si no hay resultados y es una dirección compleja con comas,
        // tomamos el primer segmento (calle y número) y buscamos en San Salvador de Jujuy.
        const parts = query.split(',');
        if (parts.length > 1) {
          const streetPart = parts[0].trim();
          const fallbackQuery = `${streetPart}, San Salvador de Jujuy`;
          this.geocoder.search(fallbackQuery).then((fallbackResults) => {
            this.geocodeSearching.set(false);
            if (fallbackResults && fallbackResults.length > 0) {
              this.geocodeResults.set(fallbackResults);
              this.selectGeocode(fallbackResults[0]);
            }
          }).catch(() => {
            this.geocodeSearching.set(false);
          });
        } else {
          this.geocodeSearching.set(false);
        }
      }
    }).catch(() => {
      this.geocodeSearching.set(false);
    });
  }

  selectGeocode(result: GeocodeResult): void {
    this.selectedLocation.set(result);
    this.geocodeResults.set([]);
    this.f['direccion'].setValue(result.address || result.label, { emitEvent: false });
  }

  setManualLocation(point: { lat: number; lng: number }): void {
    const currentAddress = this.f['direccion'].value ?? '';
    this.selectedLocation.set({
      label: currentAddress || 'Ubicación manual',
      address: currentAddress || 'Ubicación manual',
      lat: point.lat,
      lng: point.lng,
      provider: 'manual',
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.dropdownOpen.set(false);
  }

  @HostListener('document:keydown.enter')
  onEnter(): void {
    this.submit();
  }

  close(): void {
    this.modalService.close();
    this.closed.emit();
  }

  submit(): void {
    this.applyConditionalValidators();

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);

    const val  = this.form.value;
    const tipo = val.tipoAsistencia as TipoAsistencia;

    const req: AltaRapidaRequest = {
      tipoAsistencia:      tipo,
      nivelUrgencia:       val.nivelUrgencia as NivelUrgencia,
      descripcionSintomas: val.descripcionSintomas!,
      coberturaAlMomentoId: null,
    };

    if (tipo !== 'ORIENTACION_TELEFONICA') {
      if (val.direccion)       req.direccion        = val.direccion;
      if (val.notaDireccion)   req.notaDireccion    = val.notaDireccion;
      if (val.telefonoContacto) req.telefonoContacto = val.telefonoContacto;
      const loc = this.selectedLocation();
      if (loc) {
        req.latitud = loc.lat;
        req.longitud = loc.lng;
        req.direccionNormalizada = loc.address;
        req.geocodingProvider = loc.provider;
      }
    }

    if (val.noAfiliado) {
      req.noAfiliado = true;
      if (val.pacienteNombre)   req.pacienteNombre   = val.pacienteNombre;
      if (val.pacienteApellido) req.pacienteApellido = val.pacienteApellido;
      if (val.pacienteDni)      req.pacienteDni      = val.pacienteDni;
      if (val.pacienteTelefono) req.pacienteTelefono = val.pacienteTelefono;
    } else {
      const p = this.selectedPaciente();
      if (p) req.pacienteId = p.id;
    }

    if (val.observacion) req.observacion = val.observacion;

    this.emergencyApi.altaRapida(req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ticket) => {
          this.emergencyStore.addOrUpdate(ticket);
          this.created.emit(req);
          this.feedback.push({
            type: 'success',
            title: 'Emergencia registrada',
            message: `Ticket ${ticket.codigo ?? 'generado'} creado correctamente.`,
          });
          this.submitting.set(false);
          this.close();
        },
        error: (err) => {
          console.error('[EmergencyQuickCreateModal] error creating quick ticket:', err);
          if (err instanceof HttpErrorResponse) {
            this.feedback.fromHttpError(err);
          } else {
            this.feedback.push({
              type: 'error',
              title: 'No se pudo registrar la emergencia',
              message: 'Ocurrió un error inesperado al crear el ticket.',
            });
          }
          this.submitting.set(false);
        }
      });
  }

  private handleNoAfiliadoToggle(noAfiliado: boolean): void {
    if (noAfiliado) {
      this.clearPaciente();
      this.dropdownOpen.set(false);
      this.searchResults.set([]);
    } else {
      this.form.patchValue(
        {
          pacienteNombre: '',
          pacienteApellido: '',
          pacienteDni: '',
          pacienteTelefono: '',
        },
        { emitEvent: false }
      );
    }

    this.applyConditionalValidators();
  }

  private applyConditionalValidators(): void {
    const noAfiliado = Boolean(this.f['noAfiliado'].value);
    const tipoAsistencia = this.f['tipoAsistencia'].value;
    const direccionValidators =
      tipoAsistencia === 'ORIENTACION_TELEFONICA' ? [] : [Validators.required];

    this.f['direccion'].setValidators(direccionValidators);
    this.f['direccion'].updateValueAndValidity({ emitEvent: false });

    if (noAfiliado) {
      this.f['pacienteId'].clearValidators();
      this.f['pacienteNombre'].setValidators([Validators.required]);
      this.f['pacienteTelefono'].setValidators([Validators.required]);
    } else {
      this.f['pacienteId'].setValidators([Validators.required]);
      this.f['pacienteNombre'].clearValidators();
      this.f['pacienteTelefono'].clearValidators();
    }

    this.f['pacienteId'].updateValueAndValidity({ emitEvent: false });
    this.f['pacienteNombre'].updateValueAndValidity({ emitEvent: false });
    this.f['pacienteTelefono'].updateValueAndValidity({ emitEvent: false });
  }
}
