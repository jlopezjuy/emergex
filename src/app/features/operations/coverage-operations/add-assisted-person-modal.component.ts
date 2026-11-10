import {
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, debounceTime, distinctUntilChanged, switchMap, catchError, of, map } from 'rxjs';
import { Subject } from 'rxjs';

import { EmergencyApiService } from '../../../data-access/api/emergency.api';
import { MiembrosInstitucionApiService, MiembroInstitucionDTO } from '../../../data-access/api/miembros-institucion.api';
import { CrearTicketRequest, RegistrarPersonaTicketRequest } from '../../../data-access/dto/ticket.dto';

type TipoPersona = 'transitoria' | 'miembro';
type NivelUrgencia = 'ROJO' | 'AMARILLO' | 'VERDE';

@Component({
  selector: 'app-add-assisted-person-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" (click)="onBackdropClick($event)">
      <div class="modal-shell" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <!-- Header -->
        <div class="modal-header">
          <h2 id="modal-title" class="modal-title">{{ mode() === 'identify' ? 'Identificar persona atendida' : 'Agregar otra persona al operativo' }}</h2>
          <button class="btn-close" (click)="closed.emit()" aria-label="Cerrar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M3 3l10 10M13 3L3 13"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <!-- Tipo de persona — solo si es institución -->
          @if (isInstitutionalOperation()) {
            <div class="field-group">
              <label class="field-label">Tipo de persona</label>
              <div class="segmented-control">
                <button
                  type="button"
                  class="seg-btn"
                  [class.seg-btn--active]="tipoPersona() === 'transitoria'"
                  (click)="tipoPersona.set('transitoria')"
                >
                  Ocasional / Transitoria
                </button>
                <button
                  type="button"
                  class="seg-btn"
                  [class.seg-btn--active]="tipoPersona() === 'miembro'"
                  (click)="setTipoMiembro()"
                >
                  Miembro del padrón
                </button>
              </div>
            </div>
          }

          <!-- Búsqueda de miembro -->
          @if (tipoPersona() === 'miembro' && isInstitutionalOperation()) {
            <div class="field-group">
              <label class="field-label">Buscar miembro</label>
              <input
                type="text"
                class="field-input"
                placeholder="Nombre, apellido o DNI..."
                [ngModel]="memberSearch()"
                (ngModelChange)="onMemberSearch($event)"
              />
              @if (searchingMembers()) {
                <p class="field-hint">Buscando...</p>
              } @else if (memberResults().length > 0) {
                <div class="member-results">
                  @for (m of memberResults(); track m.id) {
                    <div
                      class="member-result-item"
                      [class.member-result-item--selected]="selectedMemberId() === m.id"
                      (click)="selectMember(m)"
                    >
                      <span class="member-name">{{ m.nombre }} {{ m.apellido }}</span>
                      <span class="member-meta">
                        @if (m.rol) { {{ m.rol }} · }
                        @if (m.dni) { DNI {{ m.dni }} }
                      </span>
                    </div>
                  }
                </div>
              } @else if (memberSearch().length >= 2) {
                <p class="field-hint">Sin resultados.</p>
              }
              @if (selectedMemberId() != null) {
                <div class="selected-member-chip">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--accent-emerald)" stroke-width="1.5">
                    <path d="M2 6l3 3 5-5"/>
                  </svg>
                  {{ selectedMemberName() }} seleccionado/a
                  <button type="button" class="chip-clear" (click)="clearMember()">×</button>
                </div>
              }
            </div>
          }

          <!-- Datos de persona transitoria -->
          @if (tipoPersona() === 'transitoria' || !isInstitutionalOperation()) {
            <div class="fields-row">
              <div class="field-group">
                <label class="field-label">Nombre *</label>
                <input
                  type="text"
                  class="field-input"
                  placeholder="Nombre"
                  [ngModel]="nombre()"
                  (ngModelChange)="nombre.set($event)"
                />
              </div>
              <div class="field-group">
                <label class="field-label">Apellido *</label>
                <input
                  type="text"
                  class="field-input"
                  placeholder="Apellido"
                  [ngModel]="apellido()"
                  (ngModelChange)="apellido.set($event)"
                />
              </div>
            </div>
            <div class="fields-row">
              <div class="field-group">
                <label class="field-label">DNI</label>
                <input
                  type="text"
                  class="field-input"
                  placeholder="Sin puntos"
                  [ngModel]="dni()"
                  (ngModelChange)="dni.set($event)"
                />
              </div>
              <div class="field-group">
                <label class="field-label">Teléfono</label>
                <input
                  type="text"
                  class="field-input"
                  placeholder="Opcional"
                  [ngModel]="telefono()"
                  (ngModelChange)="telefono.set($event)"
                />
              </div>
            </div>
          }

          <!-- Nivel de urgencia -->
          <div class="field-group">
            <label class="field-label">Nivel de urgencia</label>
            <div class="urgencia-selector">
              @for (nivel of niveles; track nivel.value) {
                <button
                  type="button"
                  class="urgencia-btn"
                  [class.urgencia-btn--active]="nivelUrgencia() === nivel.value"
                  [attr.data-nivel]="nivel.value.toLowerCase()"
                  (click)="nivelUrgencia.set(nivel.value)"
                >
                  <span class="urgencia-dot"></span>
                  {{ nivel.label }}
                </button>
              }
            </div>
          </div>

          <!-- Descripción síntomas -->
          <div class="field-group">
            <label class="field-label">Descripción / motivo</label>
            <textarea
              class="field-input field-textarea"
              placeholder="Síntomas o motivo de la asistencia (opcional)"
              rows="3"
              [ngModel]="descripcionSintomas()"
              (ngModelChange)="descripcionSintomas.set($event)"
            ></textarea>
          </div>

          <!-- Error -->
          @if (error()) {
            <div class="error-banner">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--accent-red)" stroke-width="1.5">
                <circle cx="7" cy="7" r="6"/>
                <path d="M7 4v3.5M7 10h.01"/>
              </svg>
              {{ error() }}
            </div>
          }
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button
            type="button"
            class="btn-cancel"
            [disabled]="isSubmitting()"
            (click)="closed.emit()"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn-submit"
            [disabled]="isSubmitting() || !canSubmit()"
            (click)="submit()"
          >
            @if (isSubmitting()) {
              <div class="spinner"></div>
              Guardando...
            } @else {
              {{ mode() === 'identify' ? 'Confirmar identidad' : 'Registrar persona' }}
            }
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }

    .modal-shell {
      background: var(--bg-elevated);
      border: 1px solid var(--border-glass);
      border-radius: 12px;
      width: 100%;
      max-width: 520px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-glass);
      flex-shrink: 0;
    }

    .modal-title {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .btn-close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid var(--border-glass);
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-close:hover {
      background: var(--surface-glass);
      color: var(--text-primary);
    }

    .modal-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 20px;
      border-top: 1px solid var(--border-glass);
      flex-shrink: 0;
    }

    /* ── Fields ── */
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .fields-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .field-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary);
      letter-spacing: 0.2px;
    }

    .field-input {
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid var(--border-glass);
      background: var(--surface-glass);
      color: var(--text-primary);
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s;
    }

    .field-input:focus {
      border-color: rgba(6, 182, 212, 0.5);
    }

    .field-textarea {
      resize: vertical;
      min-height: 72px;
    }

    .field-hint {
      font-size: 11px;
      color: var(--text-muted);
      margin: 0;
    }

    /* ── Segmented control ── */
    .segmented-control {
      display: flex;
      border-radius: 6px;
      border: 1px solid var(--border-glass);
      overflow: hidden;
      background: var(--surface-glass);
    }

    .seg-btn {
      flex: 1;
      padding: 7px 12px;
      font-size: 12px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }

    .seg-btn:not(:last-child) {
      border-right: 1px solid var(--border-glass);
    }

    .seg-btn--active {
      background: rgba(6, 182, 212, 0.12);
      color: var(--accent-cyan);
      font-weight: 600;
    }

    /* ── Member results ── */
    .member-results {
      border: 1px solid var(--border-glass);
      border-radius: 6px;
      overflow: hidden;
      max-height: 180px;
      overflow-y: auto;
    }

    .member-result-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 8px 12px;
      cursor: pointer;
      transition: background 0.12s;
      border-bottom: 1px solid var(--border-glass);
    }

    .member-result-item:last-child {
      border-bottom: none;
    }

    .member-result-item:hover {
      background: var(--surface-glass);
    }

    .member-result-item--selected {
      background: rgba(6, 182, 212, 0.08);
    }

    .member-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-primary);
    }

    .member-meta {
      font-size: 11px;
      color: var(--text-muted);
    }

    .selected-member-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 10px;
      border-radius: 6px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: var(--accent-emerald);
      font-size: 12px;
      font-weight: 600;
    }

    .chip-clear {
      margin-left: auto;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 0 2px;
    }

    .chip-clear:hover {
      color: var(--accent-red);
    }

    /* ── Urgencia selector ── */
    .urgencia-selector {
      display: flex;
      gap: 8px;
    }

    .urgencia-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px;
      border-radius: 6px;
      border: 1px solid var(--border-glass);
      background: var(--surface-glass);
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .urgencia-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }

    .urgencia-btn[data-nivel="rojo"] { color: var(--accent-red); }
    .urgencia-btn[data-nivel="amarillo"] { color: var(--accent-amber); }
    .urgencia-btn[data-nivel="verde"] { color: var(--accent-emerald); }

    .urgencia-btn--active[data-nivel="rojo"] {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.4);
    }
    .urgencia-btn--active[data-nivel="amarillo"] {
      background: rgba(245, 158, 11, 0.12);
      border-color: rgba(245, 158, 11, 0.4);
    }
    .urgencia-btn--active[data-nivel="verde"] {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.4);
    }

    /* ── Error ── */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      border-radius: 6px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      color: var(--accent-red);
      font-size: 13px;
    }

    /* ── Buttons ── */
    .btn-cancel {
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid var(--border-glass);
      background: transparent;
      color: var(--text-secondary);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-cancel:hover:not(:disabled) {
      background: var(--surface-glass);
    }

    .btn-cancel:disabled { opacity: 0.5; cursor: default; }

    .btn-submit {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      border-radius: 6px;
      border: none;
      background: var(--accent-emerald);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }

    .btn-submit:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-submit:disabled { opacity: 0.5; cursor: default; }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class AddAssistedPersonModalComponent {
  // Inputs
  tipo = input.required<'evento' | 'institucion' | 'contexto' | 'incidente'>();
  contextoId = input.required<number>();
  institucionId = input<number | undefined>(undefined);
  eventoLatitud = input<number | undefined>(undefined);
  eventoLongitud = input<number | undefined>(undefined);
  existingContextoCoberturaId = input<number | undefined>(undefined);
  contextoDireccion = input<string | undefined>(undefined);
  ticketId = input<number | undefined>(undefined);
  mode = input<'add' | 'identify'>('add');

  /**
   * Siniestro/accidente masivo al que pertenece el operativo. Cuando el tipo es
   * {@code incidente}, el nuevo ticket se vincula explícitamente a este incidente
   * (asignación del operador, sin geocerca automática).
   */
  incidenteEventoId = input<number | undefined>(undefined);

  // Outputs
  added = output<void>();
  closed = output<void>();

  private emergencyApi = inject(EmergencyApiService);
  private miembrosApi = inject(MiembrosInstitucionApiService);
  private destroyRef = inject(DestroyRef);

  readonly niveles: { value: NivelUrgencia; label: string }[] = [
    { value: 'ROJO', label: 'Rojo' },
    { value: 'AMARILLO', label: 'Amarillo' },
    { value: 'VERDE', label: 'Verde' },
  ];

  // Form signals
  readonly tipoPersona = signal<TipoPersona>('transitoria');
  readonly nombre = signal('');
  readonly apellido = signal('');
  readonly dni = signal('');
  readonly telefono = signal('');
  readonly nivelUrgencia = signal<NivelUrgencia>('VERDE');
  readonly descripcionSintomas = signal('');
  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);

  // Member search
  readonly memberSearch = signal('');
  readonly memberResults = signal<MiembroInstitucionDTO[]>([]);
  readonly selectedMemberId = signal<number | null>(null);
  readonly selectedMemberName = signal<string>('');
  readonly searchingMembers = signal(false);

  private memberSearch$ = new Subject<string>();

  constructor() {
    this.memberSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          if (query.length < 2 || this.institucionId() == null) {
            this.memberResults.set([]);
            this.searchingMembers.set(false);
            return of([]);
          }
          this.searchingMembers.set(true);
          return this.miembrosApi.search(query, this.institucionId()!).pipe(
            catchError(() => of([])),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(results => {
        this.memberResults.set(results);
        this.searchingMembers.set(false);
      });
  }

  setTipoMiembro(): void {
    this.tipoPersona.set('miembro');
  }

  isInstitutionalOperation(): boolean {
    return this.ticketId() != null || this.tipo() === 'institucion';
  }

  onMemberSearch(query: string): void {
    this.memberSearch.set(query);
    this.memberSearch$.next(query);
  }

  selectMember(m: MiembroInstitucionDTO): void {
    this.selectedMemberId.set(m.id);
    this.selectedMemberName.set(`${m.nombre} ${m.apellido}`);
    this.memberResults.set([]);
  }

  clearMember(): void {
    this.selectedMemberId.set(null);
    this.selectedMemberName.set('');
    this.memberSearch.set('');
  }

  canSubmit(): boolean {
    if (this.tipoPersona() === 'miembro') {
      return this.selectedMemberId() != null;
    }
    return this.nombre().trim().length > 0 && this.apellido().trim().length > 0;
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.closed.emit();
    }
  }

  submit(): void {
    if (!this.canSubmit()) return;

    const req: CrearTicketRequest = {
      tipoAsistencia: 'EMERGENCIA_DOMICILIARIA',
      nivelUrgencia: this.nivelUrgencia(),
      descripcionSintomas: this.descripcionSintomas().trim() || 'Asistencia en operativo',
      ...(this.contextoDireccion() ? { direccion: this.contextoDireccion() } : {}),
    };

    if (this.ticketId() == null && this.existingContextoCoberturaId() != null) {
      req.contextoCoberturaId = this.existingContextoCoberturaId();
    } else if (this.ticketId() == null) {
      // Primera persona: vincular al contexto
      if (this.institucionId() != null) {
        req.institucionId = this.institucionId();
      }
      // Siniestro/accidente masivo: vincular el ticket al incidente.
      if (this.incidenteEventoId() != null) {
        req.incidenteEventoId = this.incidenteEventoId();
      }
      if (this.eventoLatitud() != null) {
        req.latitud = this.eventoLatitud();
      }
      if (this.eventoLongitud() != null) {
        req.longitud = this.eventoLongitud();
      }
    }

    // Sujeto
    if (this.tipoPersona() === 'miembro' && this.selectedMemberId() != null) {
      req.miembroInstitucionId = this.selectedMemberId()!;
    } else {
      req.noAfiliado = true;
      req.pacienteNombre = this.nombre().trim();
      req.pacienteApellido = this.apellido().trim();
      if (this.dni().trim()) req.pacienteDni = this.dni().trim();
      if (this.telefono().trim()) req.pacienteTelefono = this.telefono().trim();
    }

    this.isSubmitting.set(true);
    this.error.set(null);

    const personaReq: RegistrarPersonaTicketRequest = this.tipoPersona() === 'miembro' && this.selectedMemberId() != null
      ? { miembroInstitucionId: this.selectedMemberId()!, motivoApertura: req.descripcionSintomas }
      : {
          noAfiliado: true,
          nombre: this.nombre().trim(),
          apellido: this.apellido().trim(),
          dni: this.dni().trim() || undefined,
          telefono: this.telefono().trim() || undefined,
          motivoApertura: req.descripcionSintomas,
        };
    let request$: Observable<void>;
    if (this.ticketId() != null) {
      const personRequest$ = this.mode() === 'identify'
        ? this.emergencyApi.identificarPersona(this.ticketId()!, personaReq)
        : this.emergencyApi.agregarPersona(this.ticketId()!, personaReq);
      request$ = personRequest$.pipe(map(() => undefined));
    } else {
      request$ = this.emergencyApi.crear(req).pipe(map(() => undefined));
    }

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.added.emit();
        },
        error: () => {
          this.isSubmitting.set(false);
          this.error.set('Error al crear la asistencia. Verificá los datos e intentá de nuevo.');
        },
      });
  }
}
