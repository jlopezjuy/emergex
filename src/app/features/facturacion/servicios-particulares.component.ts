import { Component, inject, signal, computed, effect } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import {
  ServicioParticularApiService,
  RegistrarServicioParticularDto,
  ServicioParticularResponse,
} from '../../data-access/api/servicio-particular.api';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPO_TRASLADO_OPTIONS = [
  { value: 'SIMPLE', label: 'Simple' },
  { value: 'PROGRAMADO', label: 'Programado' },
  { value: 'URGENTE', label: 'Urgente' },
];

const FORMA_PAGO_OPTIONS = [
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
];

const TIPO_FACTURA_OPTIONS = [
  { value: 'FACTURA_B', label: 'Factura B' },
  { value: 'FACTURA_C', label: 'Factura C' },
];

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-servicios-particulares',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div style="padding:20px;display:flex;flex-direction:column;gap:20px">

      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="eyebrow" style="color:var(--accent-blue)">SERVICIOS PARTICULARES</div>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <div class="glass" style="padding:20px;border-radius:12px;border:1px solid var(--border-glass);display:flex;flex-direction:column;gap:16px">

          <h4 style="margin:0;font-size:14px;font-weight:600">Registrar servicio particular</h4>

          <!-- tipo de servicio -->
          <div style="display:flex;flex-direction:column;gap:4px">
            <label class="eyebrow">Tipo de servicio <span style="color:var(--accent-red)">*</span></label>
            <select class="form-input" formControlName="tipoServicio">
              <option value="" disabled>Seleccioná un tipo...</option>
              <option value="TRASLADO">Traslado</option>
              <option value="ATENCION">Atención</option>
              <option value="EVENTO_PUNTUAL">Evento puntual</option>
            </select>
            @if (form.get('tipoServicio')?.invalid && form.get('tipoServicio')?.touched) {
              <span style="font-size:11px;color:var(--accent-red)">Requerido</span>
            }
          </div>

          <!-- tipo de traslado (solo visible cuando tipoServicio === TRASLADO) -->
          @if (showTipoTraslado()) {
            <div style="display:flex;flex-direction:column;gap:4px">
              <label class="eyebrow">Tipo de traslado <span style="color:var(--accent-red)">*</span></label>
              <select class="form-input" formControlName="tipoTraslado">
                <option value="" disabled>Seleccioná un tipo...</option>
                @for (opt of tipoTrasladoOptions; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
              @if (form.get('tipoTraslado')?.invalid && form.get('tipoTraslado')?.touched) {
                <span style="font-size:11px;color:var(--accent-red)">Requerido para traslados</span>
              }
            </div>
          }

          <!-- persona -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div style="display:flex;flex-direction:column;gap:4px">
              <label class="eyebrow">Nombre</label>
              <input class="form-input" type="text" formControlName="nombre" placeholder="Nombre"/>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <label class="eyebrow">Apellido</label>
              <input class="form-input" type="text" formControlName="apellido" placeholder="Apellido"/>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <label class="eyebrow">DNI</label>
              <input class="form-input" type="text" formControlName="dni" placeholder="Sin DNI"/>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <label class="eyebrow">CUIL</label>
              <input class="form-input" type="text" formControlName="cuil" placeholder="Sin CUIL"/>
            </div>
          </div>

          <!-- billing -->
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
            <div style="display:flex;flex-direction:column;gap:4px">
              <label class="eyebrow">Importe <span style="color:var(--accent-red)">*</span></label>
              <input class="form-input" type="number" step="0.01" min="0.01" formControlName="importe" placeholder="0.00"/>
              @if (form.get('importe')?.invalid && form.get('importe')?.touched) {
                <span style="font-size:11px;color:var(--accent-red)">Importe requerido (mín. 0.01)</span>
              }
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <label class="eyebrow">Forma de pago <span style="color:var(--accent-red)">*</span></label>
              <select class="form-input" formControlName="formaPago">
                <option value="" disabled>Seleccioná...</option>
                @for (opt of formaPagoOptions; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
              @if (form.get('formaPago')?.invalid && form.get('formaPago')?.touched) {
                <span style="font-size:11px;color:var(--accent-red)">Requerido</span>
              }
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <label class="eyebrow">Tipo factura <span style="color:var(--accent-red)">*</span></label>
              <select class="form-input" formControlName="tipoFactura">
                <option value="" disabled>Seleccioná...</option>
                @for (opt of tipoFacturaOptions; track opt.value) {
                  <option [value]="opt.value">{{ opt.label }}</option>
                }
              </select>
              @if (form.get('tipoFactura')?.invalid && form.get('tipoFactura')?.touched) {
                <span style="font-size:11px;color:var(--accent-red)">Requerido</span>
              }
            </div>
          </div>

          <!-- fecha y n° factura -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div style="display:flex;flex-direction:column;gap:4px">
              <label class="eyebrow">Fecha del servicio <span style="color:var(--accent-red)">*</span></label>
              <input class="form-input" type="date" formControlName="fechaServicio"/>
              @if (form.get('fechaServicio')?.invalid && form.get('fechaServicio')?.touched) {
                <span style="font-size:11px;color:var(--accent-red)">Requerido</span>
              }
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <label class="eyebrow">N° Factura</label>
              <input class="form-input" type="text" formControlName="numeroFactura" placeholder="Autogenerado si vacío"/>
            </div>
          </div>

          <!-- descripcion y observaciones -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div style="display:flex;flex-direction:column;gap:4px">
              <label class="eyebrow">Descripción</label>
              <textarea class="form-input" rows="2" formControlName="descripcion" placeholder="Descripción del servicio..." style="resize:none"></textarea>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <label class="eyebrow">Observaciones</label>
              <textarea class="form-input" rows="2" formControlName="observaciones" placeholder="Observaciones..." style="resize:none"></textarea>
            </div>
          </div>

          <!-- feedback -->
          @if (error()) {
            <div style="padding:10px 12px;border-radius:8px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);font-size:12.5px;color:var(--accent-red)">
              {{ error() }}
            </div>
          }

          @if (lastResult()) {
            <div style="padding:12px 14px;border-radius:8px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3)">
              <div style="font-size:13px;font-weight:600;color:var(--accent-emerald)">Servicio registrado</div>
              <div class="mono micro" style="color:var(--text-muted);margin-top:4px">
                Factura: {{ lastResult()!.numeroFactura }} · {{ '$' + lastResult()!.importe }} · {{ lastResult()!.estado }}
              </div>
            </div>
          }

          <!-- actions -->
          <div style="display:flex;justify-content:flex-end;gap:8px">
            @if (lastResult()) {
              <button type="button" class="btn btn--ghost btn--sm" (click)="resetForm()">Nuevo registro</button>
            } @else {
              <button type="submit" class="btn btn--primary" [disabled]="loading() || form.invalid">
                @if (loading()) { Registrando... } @else { Registrar servicio }
              </button>
            }
          </div>

        </div>
      </form>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .form-input {
      height: 36px; border-radius: var(--r-btn); border: 1px solid var(--border-glass);
      background: rgba(255,255,255,0.04); color: var(--text-primary);
      font-size: 12.5px; font-family: var(--font-sans);
      padding: 0 10px; outline: none; width: 100%; box-sizing: border-box; transition: border-color 0.15s;
    }
    .form-input:focus { border-color: rgba(59,130,246,0.5); }
    textarea.form-input { height: auto; padding: 8px 10px; }
    select.form-input { appearance: none; cursor: pointer; }
  `],
})
export class ServiciosParticularesComponent {
  private api = inject(ServicioParticularApiService);
  private fb = inject(FormBuilder);

  readonly tipoTrasladoOptions = TIPO_TRASLADO_OPTIONS;
  readonly formaPagoOptions = FORMA_PAGO_OPTIONS;
  readonly tipoFacturaOptions = TIPO_FACTURA_OPTIONS;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastResult = signal<ServicioParticularResponse | null>(null);

  readonly form: FormGroup = this.fb.group({
    tipoServicio:   ['', Validators.required],
    tipoTraslado:   [''],
    nombre:         [''],
    apellido:       [''],
    dni:            [''],
    cuil:           [''],
    importe:        [null, [Validators.required, Validators.min(0.01)]],
    formaPago:      ['', Validators.required],
    tipoFactura:    ['', Validators.required],
    fechaServicio:  ['', Validators.required],
    numeroFactura:  [''],
    descripcion:    [''],
    observaciones:  [''],
  });

  readonly showTipoTraslado = computed(() => {
    const val = this.form.get('tipoServicio')?.value;
    return val === 'TRASLADO';
  });

  constructor() {
    // When tipoServicio changes, update tipoTraslado validation
    effect(() => {
      const ctrl = this.form.get('tipoTraslado');
      if (this.showTipoTraslado()) {
        ctrl?.setValidators(Validators.required);
      } else {
        ctrl?.clearValidators();
        ctrl?.setValue('');
      }
      ctrl?.updateValueAndValidity();
    });
  }

  onSubmit(): void {
    if (this.form.invalid || this.loading()) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const raw = this.form.value;
    const dto: RegistrarServicioParticularDto = {
      tipoServicio:  raw.tipoServicio,
      nombre:        raw.nombre || undefined,
      apellido:      raw.apellido || undefined,
      dni:           raw.dni || undefined,
      cuil:          raw.cuil || undefined,
      importe:       Number(raw.importe),
      formaPago:     raw.formaPago,
      tipoFactura:   raw.tipoFactura,
      fechaServicio: raw.fechaServicio,
      tipoTraslado:  raw.tipoTraslado || undefined,
      numeroFactura: raw.numeroFactura || undefined,
      descripcion:   raw.descripcion || undefined,
      observaciones: raw.observaciones || undefined,
    };

    this.api.registrar(dto).pipe(
      catchError(err => {
        const msg = err?.error?.detail ?? err?.error?.title ?? 'Error al registrar el servicio.';
        this.error.set(msg);
        this.loading.set(false);
        return of(null);
      })
    ).subscribe(res => {
      this.loading.set(false);
      if (res) {
        this.lastResult.set(res);
        this.form.disable();
      }
    });
  }

  resetForm(): void {
    this.lastResult.set(null);
    this.error.set(null);
    this.form.enable();
    this.form.reset();
  }
}
