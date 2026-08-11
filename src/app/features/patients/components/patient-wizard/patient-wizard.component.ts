import {
  Component, signal, computed, output, inject, OnInit, DestroyRef
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { catchError, debounceTime, distinctUntilChanged, firstValueFrom, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PlanComercialDTO } from '../../../../data-access/dto/plan-comercial.dto';
import { PlanComercialApiService } from '../../../../data-access/api/plan-comercial.api';
import { PatientApiService } from '../../../../data-access/api/patient.api';
import {
  AltaAfiliadoCompletaRequest,
  AltaAfiliadoCompletaResponse,
  ValidacionDniAfiliadoDTO,
} from '../../../../data-access/dto/patient.dto';
import { PlanCardComponent } from '../../../../shared/components/plan-card/plan-card.component';
import { LocationPickerMapComponent } from '../../../../shared/components/map/location-picker-map/location-picker-map.component';
import { GeocodeResult } from '../../../../shared/map/geocoder-provider';
import { HttpGeocoderProvider } from '../../../../shared/map/providers/http-geocoder.provider';
import { UserFeedbackService } from '../../../../core/notifications/user-feedback.service';

type WizardStep = 'datos' | 'plan' | 'grupo' | 'confirmacion';

@Component({
  selector: 'emx-patient-wizard',
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe, PlanCardComponent, LocationPickerMapComponent],
  template: `
    <div class="wizard-overlay" (click)="onOverlayClick($event)">
      <div class="wizard-modal" role="dialog" aria-modal="true" aria-labelledby="wiz-title">

        <!-- Header -->
        <div class="wh">
          <h2 id="wiz-title" class="wh-title">Nuevo afiliado</h2>
          <button type="button" class="wh-close" (click)="close.emit()" aria-label="Cerrar">✕</button>
        </div>

        <!-- Stepper -->
        <div class="stepper">
          @for (s of steps; track s.key; let i = $index) {
            <div class="step" [class.active]="currentStep() === s.key" [class.done]="stepIndex() > i">
              <div class="step-dot">{{ stepIndex() > i ? '✓' : (i + 1) }}</div>
              <span class="step-lbl">{{ s.label }}</span>
            </div>
            @if (i < steps.length - 1) {
              <div class="step-line" [class.done]="stepIndex() > i"></div>
            }
          }
        </div>

        <!-- Body -->
        <div class="wb">
          @switch (currentStep()) {

            @case ('datos') {
              <form [formGroup]="datosForm" class="wform">
                <div class="row2">
                  <div class="ff">
                    <label>DNI *</label>
                    <input type="text" formControlName="dni" placeholder="30123456" (blur)="onTitularDniBlur()" />
                    @if (datosForm.get('dni')?.invalid && datosForm.get('dni')?.touched) {
                      <span class="ferr">DNI inválido (mínimo 7 caracteres)</span>
                    }
                    @if (validatingTitularDni()) {
                      <span class="finfo">Validando DNI…</span>
                    }
                    @if (titularDniError()) {
                      <span class="ferr">{{ titularDniError() }}</span>
                    }
                  </div>
                  <div class="ff">
                    <label>Tipo documento</label>
                    <select formControlName="tipoDocumento">
                      <option value="DNI">DNI</option>
                      <option value="PASAPORTE">Pasaporte</option>
                      <option value="CEDULA">Cédula</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                </div>
                <div class="row2">
                  <div class="ff">
                    <label>Nombre *</label>
                    <input type="text" formControlName="nombre" placeholder="Nombre" />
                    @if (datosForm.get('nombre')?.invalid && datosForm.get('nombre')?.touched) {
                      <span class="ferr">El nombre es requerido</span>
                    }
                  </div>
                  <div class="ff">
                    <label>Apellido *</label>
                    <input type="text" formControlName="apellido" placeholder="Apellido" />
                    @if (datosForm.get('apellido')?.invalid && datosForm.get('apellido')?.touched) {
                      <span class="ferr">El apellido es requerido</span>
                    }
                  </div>
                </div>
                <div class="row2">
                  <div class="ff">
                    <label>Fecha de nacimiento</label>
                    <input type="date" formControlName="fechaNacimiento" [max]="today" />
                  </div>
                  <div class="ff">
                    <label>Sexo</label>
                    <select formControlName="sexo">
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMENINO">Femenino</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                </div>
                <div class="row2">
                  <div class="ff">
                    <label>Teléfono</label>
                    <input type="tel" formControlName="telefono" placeholder="2944123456" />
                  </div>
                  <div class="ff">
                    <label>Email</label>
                    <input type="email" formControlName="email" placeholder="correo@ejemplo.com" />
                    @if (datosForm.get('email')?.errors?.['email'] && datosForm.get('email')?.touched) {
                      <span class="ferr">Email inválido</span>
                    }
                  </div>
                </div>
                <div class="ff full address-field">
                  <label>Dirección</label>
                  <input type="text" formControlName="direccion" placeholder="Calle, número, barrio o ciudad" />
                  @if (geocodeSearching()) {
                    <span class="geo-hint">Buscando ubicación…</span>
                  }
                  @if (geocodeResults().length > 0) {
                    <div class="geo-results">
                      @for (result of geocodeResults(); track result.address) {
                        <button
                          type="button"
                          class="geo-result"
                          (click)="selectGeocode(result)">
                          <span class="geo-result__title">{{ result.label }}</span>
                          <span class="geo-result__coords">{{ result.lat.toFixed(5) }}, {{ result.lng.toFixed(5) }}</span>
                        </button>
                      }
                    </div>
                  }
                  <div class="geo-map">
                    <emx-location-picker-map
                      [lat]="selectedLocation()?.lat ?? null"
                      [lng]="selectedLocation()?.lng ?? null"
                      (pointChanged)="setManualLocation($event)"
                    />
                  </div>
                  @if (selectedLocation(); as location) {
                    <span class="geo-hint geo-hint--ok">
                      Ubicación confirmada · {{ location.lat.toFixed(5) }}, {{ location.lng.toFixed(5) }}
                    </span>
                  } @else {
                    <span class="geo-hint geo-hint--warn">
                      Sin ubicación confirmada. Podés registrar igual, pero la próxima emergencia no va a arrancar con punto exacto.
                    </span>
                  }
                </div>
              </form>
            }

            @case ('plan') {
              <div class="plan-step">
                <p class="hint">Seleccioná el plan para el titular</p>
                @if (loadingPlans()) {
                  <div class="loading-msg">Cargando planes disponibles…</div>
                } @else if (plans().length === 0) {
                  <div class="empty-plans">
                    <p>🗂️</p>
                    <p>No hay planes disponibles para asignar</p>
                  </div>
                } @else {
                  <div class="plans-grid">
                    @for (plan of plans(); track plan.id) {
                      <emx-plan-card
                        [plan]="plan"
                        [selected]="selectedPlanId() === plan.id"
                        (selectPlan)="onSelectPlan($event)"
                      />
                    }
                  </div>
                }
                @if (planError()) {
                  <span class="ferr" style="display:block;margin-top:8px">Debés seleccionar un plan para continuar</span>
                }
              </div>
            }

            @case ('grupo') {
              <div class="grupo-step">
                <div class="grupo-hdr">
                  <p class="hint" style="margin:0">Dependientes (opcional)</p>
                  <button type="button" class="btn-sec btn-sm" (click)="addDependiente()">+ Agregar dependiente</button>
                </div>
                @if (dependientesForm.controls.length === 0) {
                  <p class="hint" style="margin-top:16px">Sin dependientes. El titular quedará como único miembro del grupo familiar.</p>
                }
                @for (dep of dependientesForm.controls; track $index; let i = $index) {
                  <div class="dep-row" [formGroup]="getDepGroup(i)">
                    <div class="dep-hdr">
                      <span class="dep-num">Dependiente {{ i + 1 }}</span>
                      <button type="button" class="btn-danger-sm" (click)="removeDependiente(i)">✕ Quitar</button>
                    </div>
                    <div class="row3">
                      <div class="ff">
                        <label>DNI</label>
                        <input type="text" formControlName="dni" placeholder="DNI" (blur)="onDependienteDniBlur(i)" />
                        @if (validatingDependienteDni()[i]) {
                          <span class="finfo">Validando DNI…</span>
                        }
                        @if (dependienteDniErrors()[i]) {
                          <span class="ferr">{{ dependienteDniErrors()[i] }}</span>
                        }
                      </div>
                      <div class="ff">
                        <label>Nombre *</label>
                        <input type="text" formControlName="nombre" placeholder="Nombre" />
                      </div>
                      <div class="ff">
                        <label>Apellido *</label>
                        <input type="text" formControlName="apellido" placeholder="Apellido" />
                      </div>
                    </div>
                    <div class="row2">
                      <div class="ff">
                        <label>Parentesco / Rol</label>
                        <select formControlName="rolFamiliar">
                          <option value="CO_TITULAR">Cónyuge / Co-titular</option>
                          <option value="DEPENDIENTE">Hijo/a — Dependiente</option>
                        </select>
                      </div>
                      <div class="ff">
                        <label>Fecha de nacimiento</label>
                        <input type="date" formControlName="fechaNacimiento" [max]="today" />
                      </div>
                    </div>
                  </div>
                }
              </div>
            }

            @case ('confirmacion') {
              <div class="confirm-step">
                <h3 class="confirm-title">Resumen del alta</h3>
                <div class="confirm-block">
                  <div class="cl">Titular</div>
                  <div class="cv">{{ datosForm.value.nombre }} {{ datosForm.value.apellido }} · DNI {{ datosForm.value.dni }}</div>
                </div>
                <div class="confirm-block">
                  <div class="cl">Plan</div>
                  <div class="cv">
                    {{ selectedPlan()?.name ?? '—' }}
                    @if (selectedPlan()?.pricing?.monthly) {
                      · &#36;{{ selectedPlan()!.pricing.monthly | number:'1.0-0' }}/mes
                    }
                  </div>
                </div>
                @if (datosForm.value.direccion) {
                  <div class="confirm-block">
                    <div class="cl">Domicilio de atención sugerido</div>
                    <div class="cv">{{ normalizedAddressPreview() }}</div>
                  </div>
                }
                @if (dependientesForm.controls.length > 0) {
                  <div class="confirm-block">
                    <div class="cl">Dependientes ({{ dependientesForm.controls.length }})</div>
                    @for (d of dependientesForm.value; track d.dni) {
                      <div class="cv dep-line">{{ d.nombre }} {{ d.apellido }} · {{ d.rolFamiliar === 'CO_TITULAR' ? 'Co-titular' : 'Dependiente' }}</div>
                    }
                  </div>
                }
                @if (submitError()) {
                  <div class="error-banner">{{ submitError() }}</div>
                }
              </div>
            }

          }
        </div>

        <!-- Footer -->
        <div class="wfooter">
          @if (stepIndex() > 0) {
            <button type="button" class="btn-sec" (click)="prevStep()" [disabled]="submitting()">← Atrás</button>
          }
          <span class="flex-1"></span>
          @if (currentStep() !== 'confirmacion') {
            <button type="button" class="btn-pri" (click)="nextStep()">Siguiente →</button>
          } @else {
            <button type="button" class="btn-pri" (click)="submit()" [disabled]="submitting()">
              {{ submitting() ? 'Registrando…' : 'Confirmar alta' }}
            </button>
          }
        </div>

      </div>
    </div>
  `,
  styles: [`
    .wizard-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(0,0,0,0.52);
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
    }
    .wizard-modal {
      background: var(--bg-elevated);
      border: 1px solid var(--border-glass);
      border-radius: 16px;
      width: 100%; max-width: 620px; max-height: 90vh;
      display: flex; flex-direction: column; overflow: hidden;
    }
    .wh {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 22px 14px;
      border-bottom: 1px solid var(--border-glass);
    }
    .wh-title { font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0; }
    .wh-close {
      background: none; border: none; cursor: pointer;
      color: var(--text-muted); font-size: 15px;
      padding: 4px 8px; border-radius: 6px; line-height: 1;
    }
    .wh-close:hover { background: var(--surface-glass); color: var(--text-primary); }
    .stepper {
      display: flex; align-items: center;
      padding: 14px 22px;
      border-bottom: 1px solid var(--border-glass);
      overflow-x: auto;
    }
    .step { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
    .step-dot {
      width: 22px; height: 22px; border-radius: 50%;
      border: 2px solid var(--border-glass);
      display: flex; align-items: center; justify-content: center;
      font-size: 10px; font-weight: 700; color: var(--text-muted);
      background: var(--surface-glass);
    }
    .step.active .step-dot { border-color: var(--accent-blue); color: var(--accent-blue); background: rgba(59,130,246,0.09); }
    .step.done .step-dot { border-color: #10b981; background: rgba(16,185,129,0.09); color: #10b981; }
    .step-lbl { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
    .step.active .step-lbl { color: var(--accent-blue); font-weight: 600; }
    .step-line { flex: 1; height: 2px; background: var(--border-glass); margin: 0 6px; min-width: 16px; }
    .step-line.done { background: #10b981; }
    .wb { flex: 1; overflow-y: auto; padding: 22px; }
    .wfooter {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 22px; border-top: 1px solid var(--border-glass);
    }
    .flex-1 { flex: 1; }
    .btn-pri {
      background: var(--accent-blue); color: #fff; border: none;
      border-radius: 8px; padding: 9px 20px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .btn-pri:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sec {
      background: var(--surface-glass); border: 1px solid var(--border-glass);
      color: var(--text-primary); border-radius: 8px; padding: 9px 18px;
      font-size: 13px; cursor: pointer;
    }
    .btn-sec:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-sm { padding: 5px 12px !important; font-size: 12px !important; }
    .wform { display: flex; flex-direction: column; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .row3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px; }
    .ff { display: flex; flex-direction: column; gap: 4px; }
    .ff.full { margin-bottom: 12px; }
    label { font-size: 12px; font-weight: 500; color: var(--text-muted); }
    input, select {
      background: var(--surface-glass); border: 1px solid var(--border-glass);
      border-radius: 8px; padding: 8px 11px; font-size: 13px;
      color: var(--text-primary); outline: none; width: 100%; box-sizing: border-box;
    }
    input:focus, select:focus { border-color: var(--accent-blue); }
    .ferr { font-size: 11px; color: #ef4444; }
    .finfo { font-size: 11px; color: #64748b; }
    .hint { font-size: 13px; color: var(--text-muted); margin-bottom: 14px; }
    .plan-step { }
    .plans-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(175px, 1fr)); gap: 10px; }
    .loading-msg { text-align: center; color: var(--text-muted); padding: 24px; font-size: 13px; }
    .empty-plans { text-align: center; padding: 32px; color: var(--text-muted); font-size: 13px; }
    .grupo-step { }
    .grupo-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .dep-row { border: 1px solid var(--border-glass); border-radius: 10px; padding: 12px; margin-bottom: 10px; }
    .dep-hdr { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .dep-num { font-size: 12px; font-weight: 600; color: var(--text-muted); }
    .btn-danger-sm { background: none; border: none; color: #ef4444; font-size: 12px; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
    .btn-danger-sm:hover { background: rgba(239,68,68,0.08); }
    .confirm-step { }
    .confirm-title { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px; }
    .confirm-block { margin-bottom: 14px; }
    .cl { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 3px; }
    .cv { font-size: 13px; color: var(--text-primary); }
    .dep-line { margin-left: 10px; font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .error-banner {
      background: rgba(239,68,68,0.09); border: 1px solid rgba(239,68,68,0.28);
      color: #ef4444; border-radius: 8px; padding: 10px 13px;
      font-size: 13px; margin-top: 12px;
    }
    .address-field { gap: 8px; }
    .geo-hint { font-size: 11px; color: var(--text-muted); }
    .geo-hint--ok { color: #059669; }
    .geo-hint--warn { color: #d97706; }
    .geo-results {
      display: flex; flex-direction: column; overflow: hidden;
      border: 1px solid rgba(148,163,184,.35); border-radius: 10px; background: #fff;
    }
    .geo-result {
      display: flex; flex-direction: column; align-items: flex-start; gap: 3px;
      width: 100%; text-align: left; padding: 10px 12px; cursor: pointer;
      border: none; border-bottom: 1px solid rgba(148,163,184,.18); background: #fff;
    }
    .geo-result:last-child { border-bottom: none; }
    .geo-result:hover { background: rgba(59,130,246,.08); }
    .geo-result__title { font-size: 12px; font-weight: 600; color: #0f172a; }
    .geo-result__coords { font-size: 11px; color: #64748b; }
    .geo-map {
      overflow: hidden; border-radius: 12px;
      border: 1px solid rgba(148,163,184,.35); background: #f8fafc;
      min-height: 210px;
    }
  `],
})
export class PatientWizardComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly patientApi = inject(PatientApiService);
  private readonly planApi = inject(PlanComercialApiService);
  private readonly geocoder = inject(HttpGeocoderProvider);
  private readonly feedback = inject(UserFeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly close = output<void>();
  readonly altaCompleted = output<AltaAfiliadoCompletaResponse>();

  readonly steps: { key: WizardStep; label: string }[] = [
    { key: 'datos', label: 'Datos básicos' },
    { key: 'plan', label: 'Plan' },
    { key: 'grupo', label: 'Grupo familiar' },
    { key: 'confirmacion', label: 'Confirmación' },
  ];

  readonly currentStep = signal<WizardStep>('datos');
  readonly stepIndex = computed(() => this.steps.findIndex(s => s.key === this.currentStep()));
  readonly plans = signal<PlanComercialDTO[]>([]);
  readonly loadingPlans = signal(false);
  readonly selectedPlanId = signal<string | null>(null);
  readonly selectedPlan = computed(() => this.plans().find(p => p.id === this.selectedPlanId()) ?? null);
  readonly submitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly planError = signal(false);
  readonly geocodeResults = signal<GeocodeResult[]>([]);
  readonly titularDniError = signal<string | null>(null);
  readonly validatingTitularDni = signal(false);
  readonly dependienteDniErrors = signal<Record<number, string>>({});
  readonly validatingDependienteDni = signal<Record<number, boolean>>({});
  readonly geocodeSearching = signal(false);
  readonly selectedLocation = signal<GeocodeResult | null>(null);
  readonly today = new Date().toISOString().slice(0, 10);
  readonly normalizedAddressPreview = computed(() => this.selectedLocation()?.address || this.datosForm?.value?.direccion || '—');

  datosForm!: FormGroup;
  readonly dependientesForm = this.fb.array<FormGroup>([]);

  ngOnInit(): void {
    this.datosForm = this.fb.group({
      dni:             ['', [Validators.required, Validators.minLength(7)]],
      tipoDocumento:   ['DNI'],
      nombre:          ['', Validators.required],
      apellido:        ['', Validators.required],
      fechaNacimiento: [''],
      sexo:            ['MASCULINO'],
      telefono:        [''],
      email:           ['', Validators.email],
      direccion:       [''],
    });

    this.datosForm.get('direccion')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((value) => {
        const query = String(value ?? '').trim();
        this.selectedLocation.set(null);
        if (query.length < 4) {
          this.geocodeSearching.set(false);
          this.geocodeResults.set([]);
          return of([] as GeocodeResult[]);
        }
        this.geocodeSearching.set(true);
        return this.geocoder.search(query).then((results) => results).catch(() => [] as GeocodeResult[]);
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((results) => {
      this.geocodeResults.set(results);
      this.geocodeSearching.set(false);
    });

    this.loadingPlans.set(true);
    this.planApi.getAll().subscribe({
      next: ps => {
        this.plans.set(ps.filter(p => p.active && p.modality !== 'institucional'));
        this.loadingPlans.set(false);
      },
      error: () => this.loadingPlans.set(false),
    });
  }

  onSelectPlan(plan: PlanComercialDTO): void {
    this.selectedPlanId.set(plan.id);
    this.planError.set(false);
  }

  addDependiente(): void {
    this.dependientesForm.push(
      this.fb.group({
        dni:             [''],
        nombre:          ['', Validators.required],
        apellido:        ['', Validators.required],
        tipoDocumento:   ['DNI'],
        rolFamiliar:     ['DEPENDIENTE'],
        sexo:            ['MASCULINO'],
        fechaNacimiento: [''],
      })
    );
  }

  removeDependiente(i: number): void {
    this.dependientesForm.removeAt(i);
    this.rebuildDependienteValidationState();
  }

  getDepGroup(i: number): FormGroup {
    return this.dependientesForm.at(i) as FormGroup;
  }

  selectGeocode(result: GeocodeResult): void {
    this.selectedLocation.set(result);
    this.geocodeResults.set([]);
    this.datosForm.get('direccion')?.setValue(result.address || result.label, { emitEvent: false });
  }

  setManualLocation(point: { lat: number; lng: number }): void {
    const currentAddress = String(this.datosForm.get('direccion')?.value ?? '').trim();
    this.selectedLocation.set({
      label: currentAddress || 'Ubicación manual',
      address: currentAddress || 'Ubicación manual',
      lat: point.lat,
      lng: point.lng,
      provider: 'manual',
    });
  }

  onTitularDniBlur(): void {
    void this.validateTitularDni();
  }

  onDependienteDniBlur(index: number): void {
    void this.validateDependienteDni(index);
  }

  private normalizeDni(value: unknown): string {
    return String(value ?? '').replace(/\D/g, '').trim();
  }

  private setDependienteError(index: number, message: string | null): void {
    this.dependienteDniErrors.update(current => {
      const next = { ...current };
      if (message) next[index] = message;
      else delete next[index];
      return next;
    });
  }

  private setDependienteValidating(index: number, validating: boolean): void {
    this.validatingDependienteDni.update(current => ({ ...current, [index]: validating }));
  }

  private rebuildDependienteValidationState(): void {
    const errors = this.dependienteDniErrors();
    const validating = this.validatingDependienteDni();
    const nextErrors: Record<number, string> = {};
    const nextValidating: Record<number, boolean> = {};
    this.dependientesForm.controls.forEach((_, idx) => {
      if (errors[idx]) nextErrors[idx] = errors[idx];
      if (validating[idx]) nextValidating[idx] = validating[idx];
    });
    this.dependienteDniErrors.set(nextErrors);
    this.validatingDependienteDni.set(nextValidating);
  }

  private async validateTitularDni(): Promise<boolean> {
    const dni = this.normalizeDni(this.datosForm.get('dni')?.value);
    this.titularDniError.set(null);

    if (!dni) return true;
    if (dni.length < 7) {
      this.titularDniError.set('Ingresá un DNI válido de 7 u 8 dígitos.');
      return false;
    }

    const duplicateInGroup = this.dependientesForm.controls.some(dep => this.normalizeDni(dep.get('dni')?.value) === dni);
    if (duplicateInGroup) {
      this.titularDniError.set('El DNI del titular está repetido dentro del grupo familiar.');
      return false;
    }

    this.validatingTitularDni.set(true);
    const result = await firstValueFrom(
      this.patientApi.validarDniAfiliado(dni).pipe(
        catchError(() => of(this.unavailableValidationResult(dni, 'No pudimos validar el DNI en este momento. Intentá nuevamente.')))
      )
    );
    this.validatingTitularDni.set(false);

    if (!result.disponible) {
      this.titularDniError.set(result.mensaje || 'Ese DNI ya existe en esta empresa.');
      return false;
    }
    return true;
  }

  private async validateDependienteDni(index: number): Promise<boolean> {
    const control = this.getDepGroup(index).get('dni');
    const dni = this.normalizeDni(control?.value);
    this.setDependienteError(index, null);

    if (!dni) return true;
    if (dni.length < 7) {
      this.setDependienteError(index, 'Ingresá un DNI válido de 7 u 8 dígitos.');
      return false;
    }

    const titularDni = this.normalizeDni(this.datosForm.get('dni')?.value);
    if (titularDni && titularDni === dni) {
      this.setDependienteError(index, 'Ese DNI coincide con el del titular.');
      return false;
    }

    const duplicateIndex = this.dependientesForm.controls.findIndex((dep, idx) => idx !== index && this.normalizeDni(dep.get('dni')?.value) === dni);
    if (duplicateIndex >= 0) {
      this.setDependienteError(index, 'Ese DNI ya fue cargado en otro familiar del grupo.');
      return false;
    }

    this.setDependienteValidating(index, true);
    const result = await firstValueFrom(
      this.patientApi.validarDniAfiliado(dni).pipe(
        catchError(() => of(this.unavailableValidationResult(dni, 'No pudimos validar el DNI del familiar en este momento. Intentá nuevamente.')))
      )
    );
    this.setDependienteValidating(index, false);

    if (!result.disponible) {
      this.setDependienteError(index, result.mensaje || 'Ese DNI ya existe en esta empresa.');
      return false;
    }
    return true;
  }

  private unavailableValidationResult(dni: string, mensaje: string): ValidacionDniAfiliadoDTO {
    return { dni, disponible: false, duplicadoPaciente: false, duplicadoInstitucional: false, mensaje };
  }

  private async validateGrupoDnis(): Promise<boolean> {
    const titularOk = await this.validateTitularDni();
    if (!titularOk) return false;

    for (let i = 0; i < this.dependientesForm.controls.length; i += 1) {
      const ok = await this.validateDependienteDni(i);
      if (!ok) return false;
    }

    return true;
  }

  async nextStep(): Promise<void> {
    const idx = this.stepIndex();
    if (idx === 0) {
      this.datosForm.markAllAsTouched();
      if (this.datosForm.invalid) return;
      const titularOk = await this.validateTitularDni();
      if (!titularOk) return;
    }
    if (idx === 1 && !this.selectedPlanId()) {
      this.planError.set(true);
      return;
    }
    if (idx === 2) {
      this.dependientesForm.markAllAsTouched();
      const depsOk = await this.validateGrupoDnis();
      if (!depsOk) return;
    }
    if (idx < this.steps.length - 1) {
      this.currentStep.set(this.steps[idx + 1].key);
    }
  }

  prevStep(): void {
    const idx = this.stepIndex();
    if (idx > 0) this.currentStep.set(this.steps[idx - 1].key);
  }

  async submit(): Promise<void> {
    if (this.submitting()) return;

    this.datosForm.markAllAsTouched();
    this.dependientesForm.markAllAsTouched();
    if (this.datosForm.invalid) return;

    const dnisOk = await this.validateGrupoDnis();
    if (!dnisOk) {
      this.submitError.set('Revisá los DNI cargados. Hay duplicados o conflictos con registros existentes.');
      return;
    }

    this.submitting.set(true);
    this.submitError.set(null);

    const v = this.datosForm.value;

    const req: AltaAfiliadoCompletaRequest = {
      nombre:          v.nombre,
      apellido:        v.apellido,
      dni:             this.normalizeDni(v.dni),
      tipoDocumento:   v.tipoDocumento ?? 'DNI',
      sexo:            v.sexo ?? 'MASCULINO',
      fechaNacimiento: v.fechaNacimiento || undefined,
      email:           v.email || undefined,
      telefono:        v.telefono || undefined,
      direccion:       this.selectedLocation()?.address || v.direccion || undefined,
      planComercialId: Number(this.selectedPlanId()),
      dependientes:    this.dependientesForm.value.map((d: { nombre?: string; apellido?: string; dni?: string; tipoDocumento?: string; sexo?: string; fechaNacimiento?: string; rolFamiliar?: string }) => ({
        nombre:          d.nombre || '',
        apellido:        d.apellido || '',
        dni:             this.normalizeDni(d.dni || ''),
        tipoDocumento:   (d.tipoDocumento as 'DNI' | 'PASAPORTE' | 'CEDULA' | 'OTRO') ?? 'DNI',
        sexo:            (d.sexo as 'MASCULINO' | 'FEMENINO' | 'OTRO') ?? 'MASCULINO',
        fechaNacimiento: d.fechaNacimiento || undefined,
        rolFamiliar:     (d.rolFamiliar as 'DEPENDIENTE' | 'TITULAR' | 'CO_TITULAR') ?? 'DEPENDIENTE',
      })),
    };

    this.patientApi.altaCompleta(req).subscribe({
      next: res => {
        this.submitting.set(false);
        this.altaCompleted.emit(res);
        this.close.emit();
      },
      error: err => {
        this.submitting.set(false);
        const msg = this.mapAltaError(err);
        this.submitError.set(msg);
        this.feedback.push({
          type: 'warning',
          title: 'Validación del alta',
          message: msg,
          ttlMs: 7000,
        });
      },
    });
  }

  private mapAltaError(err: unknown): string {
    const http = err as HttpErrorResponse | undefined;
    const body = http?.error;
    const code = body?.message ?? body?.properties?.message;
    const detail = body?.detail;

    if (code === 'error.dniDuplicado') {
      return 'Ya existe un afiliado o paciente con ese DNI en esta empresa.';
    }
    if (code === 'error.dniDuplicadoInstitucional') {
      return 'Ese DNI ya existe como beneficiario institucional activo en esta empresa.';
    }
    if (code === 'error.dniDuplicadoGrupo') {
      return 'Hay DNI repetidos dentro del grupo familiar que estás intentando crear.';
    }
    if (code === 'error.planNotFound') {
      return 'El plan comercial seleccionado no está disponible o ya no se encuentra activo.';
    }

    if (typeof detail === 'string' && detail && detail !== 'null') {
      return detail;
    }

    return 'No se pudo completar el alta. Revisá DNI, plan y grupo familiar antes de volver a intentar.';
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('wizard-overlay')) {
      this.close.emit();
    }
  }
}
