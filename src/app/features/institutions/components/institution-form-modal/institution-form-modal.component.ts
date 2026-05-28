import { Component, input, output, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InstitutionType, InstitutionDTO } from '../../../../data-access/dto/institution.dto';

interface CommercialPlanItem {
  id: string;
  numericId: number;
  name: string;
  color: string;
  monthlyBase: number;
  tier: string;
}

export interface InstitutionForm {
  name: string;
  razonSocial: string;
  cuit: string;
  type: InstitutionType;
  plan: string;
  status: 'activa' | 'inactiva';
  email: string;
  phone: string;
  adminContact: string;
  opsContact: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
}

const INSTITUTION_TYPES: { id: InstitutionType; label: string; icon: string }[] = [
  { id: 'colegio',     label: 'Colegio / Escuela',       icon: '🏫' },
  { id: 'universidad', label: 'Universidad',             icon: '🏛️' },
  { id: 'empresa',     label: 'Empresa / Industria',     icon: '🏭' },
  { id: 'club',        label: 'Club / Deporte',          icon: '⚽' },
  { id: 'hospital',    label: 'Hospital / Clínica',      icon: '🏥' },
  { id: 'gobierno',    label: 'Gobierno / Municipio',    icon: '🏛️' },
  { id: 'ong',         label: 'ONG / Fundación',         icon: '🤝' },
  { id: 'otro',        label: 'Otro',                    icon: '📍' },
];

@Component({
  selector: 'app-institution-form-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="qc-overlay" (click)="onClose()" role="presentation">
      <div class="qc-modal qc-modal--wide glass-strong" (click)="$event.stopPropagation()">
        <div class="qc-head">
          <div>
            <div class="eyebrow" style="color:var(--accent-blue)">● {{ editingInst() ? 'EDITAR INSTITUCIÓN' : 'ALTA DE INSTITUCIÓN' }}</div>
            <h2 style="margin:4px 0 0;font-size:20px;font-weight:600;letter-spacing:-0.01em">
              {{ editingInst() ? form().name : 'Nueva institución corporativa' }}
            </h2>
          </div>
          <button class="qc-close-btn" (click)="onClose()">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
          </button>
        </div>

        <!-- Tabs -->
        <div class="us-tabs">
          <button class="us-tab" [attr.data-active]="formTab() === 'general'" (click)="formTab.set('general')">
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="2" y="3" width="14" height="12" rx="1"/><line x1="6" y1="7" x2="12" y2="7"/><line x1="6" y1="10" x2="10" y2="10"/></svg>
            Datos generales
          </button>
          <button class="us-tab" [attr.data-active]="formTab() === 'contacto'" (click)="formTab.set('contacto')">
            <svg width="13" height="13" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="9" cy="7" r="3"/><path d="M3 16c0-3.31 2.69-6 6-6s6 2.69 6 6"/></svg>
            Contacto y ubicación
          </button>
        </div>

        <div class="qc-body" style="max-height:60vh;overflow-y:auto;padding:16px 20px">
          @if (formTab() === 'general') {
            <div style="display:flex;flex-direction:column;gap:14px">

              <div class="qc-row">
                <div class="qc-field" style="flex:2">
                  <label class="eyebrow">Nombre de fantasía <span style="color:var(--accent-red)">*</span></label>
                  <input class="qc-input"
                    [style.border-color]="formTouched() && !form().name.trim() ? 'var(--accent-red)' : ''"
                    placeholder="Ej. Colegio Santa Ana"
                    [(ngModel)]="form().name" (ngModelChange)="patchForm({ name: $event })" autofocus/>
                  @if (formTouched() && !form().name.trim()) {
                    <div style="font-size:10.5px;color:var(--accent-red);margin-top:3px">Campo obligatorio</div>
                  }
                </div>
                <div class="qc-field" style="flex:1">
                  <label class="eyebrow">CUIT <span style="color:var(--accent-red)">*</span></label>
                  <input class="qc-input"
                    [style.border-color]="(formTouched() && !form().cuit.trim()) || (form().cuit.trim().length > 0 && !isValidCuit(form().cuit)) ? 'var(--accent-red)' : ''"
                    placeholder="30-58741236-9"
                    [(ngModel)]="form().cuit" (ngModelChange)="patchForm({ cuit: formatCuit($event) })"/>
                  @if (formTouched() && !form().cuit.trim()) {
                    <div style="font-size:10.5px;color:var(--accent-red);margin-top:3px">Campo obligatorio</div>
                  } @else if (form().cuit.trim().length > 0 && !isValidCuit(form().cuit)) {
                    <div style="font-size:10.5px;color:var(--accent-red);margin-top:3px">CUIT inválido (algoritmo incorrecto)</div>
                  }
                </div>
              </div>

              <div class="qc-field">
                <label class="eyebrow">Razón social <span style="color:var(--accent-red)">*</span></label>
                <input class="qc-input"
                  [style.border-color]="formTouched() && !form().razonSocial.trim() ? 'var(--accent-red)' : ''"
                  placeholder="Ej. Asociación Civil Educativa Santa Ana"
                  [(ngModel)]="form().razonSocial" (ngModelChange)="patchForm({ razonSocial: $event })"/>
                @if (formTouched() && !form().razonSocial.trim()) {
                  <div style="font-size:10.5px;color:var(--accent-red);margin-top:3px">Campo obligatorio</div>
                }
              </div>

              <div class="qc-field">
                <label class="eyebrow">Tipo de institución</label>
                <div class="type-grid">
                  @for (t of institutionTypes; track t.id) {
                    <button type="button" class="type-pill"
                      [attr.data-active]="form().type === t.id"
                      (click)="patchForm({ type: t.id })">
                      {{ t.icon }} {{ t.label }}
                    </button>
                  }
                </div>
              </div>

              <div class="qc-field">
                <label class="eyebrow">Plan comercial</label>
                <select class="qc-input" [(ngModel)]="form().plan" (ngModelChange)="patchForm({ plan: $event })">
                  @for (p of commercialPlans(); track p.id) {
                    <option [value]="p.id">{{ p.name }}</option>
                  }
                </select>
                @let selPlan = getPlan(form().plan);
                @if (selPlan) {
                  <div class="mono micro" style="color:var(--text-muted);margin-top:3px">Tarifa base: {{ fmtCurrency(selPlan.monthlyBase) }}/mes</div>
                }
              </div>

              <div class="qc-field">
                <label class="eyebrow">Estado</label>
                <div style="display:flex;align-items:center;gap:10px">
                  <button type="button" class="toggle-sw"
                    [attr.data-on]="form().status === 'activa'"
                    (click)="patchForm({ status: form().status === 'activa' ? 'inactiva' : 'activa' })">
                    <div class="toggle-sw__track"
                      [style.background]="form().status === 'activa' ? 'rgba(16,185,129,0.25)' : 'rgba(148,163,184,0.32)'"
                      [style.border-color]="form().status === 'activa' ? 'rgba(16,185,129,0.55)' : 'rgba(148,163,184,0.32)'"
                      [style.box-shadow]="form().status === 'activa' ? '0 0 8px rgba(16,185,129,0.35)' : 'none'"
                    >
                      <div class="toggle-sw__thumb"
                        [style.transform]="form().status === 'activa' ? 'translateX(18px)' : 'translateX(0)'"
                        [style.background]="form().status === 'activa' ? 'var(--accent-emerald)' : 'white'"
                      ></div>
                    </div>
                  </button>
                  <span style="font-size:12.5px" [style.color]="form().status === 'activa' ? 'var(--accent-emerald)' : 'var(--text-muted)'">
                    {{ form().status === 'activa' ? 'Activa' : 'Inactiva' }}
                  </span>
                </div>
              </div>
            </div>
          }

          @if (formTab() === 'contacto') {
            <div class="contact-grid">
              <!-- Izquierda -->
              <div style="display:flex;flex-direction:column;gap:12px">
                <div class="qc-row">
                  <div class="qc-field" style="flex:1">
                    <label class="eyebrow">Email</label>
                    <input class="qc-input" type="email" placeholder="admin@institucion.com.ar"
                      [style.border-color]="form().email && !isValidEmail(form().email) ? 'var(--accent-red)' : ''"
                      [(ngModel)]="form().email" (ngModelChange)="patchForm({ email: $event })"/>
                    @if (form().email && !isValidEmail(form().email)) {
                      <div style="font-size:10.5px;color:var(--accent-red);margin-top:3px">Email inválido</div>
                    }
                  </div>
                  <div class="qc-field" style="flex:1">
                    <label class="eyebrow">Teléfono</label>
                    <input class="qc-input" placeholder="+54 388 4221-0000"
                      [style.border-color]="form().phone && !isValidPhone(form().phone) ? 'var(--accent-red)' : ''"
                      [(ngModel)]="form().phone" (ngModelChange)="patchForm({ phone: $event })"/>
                    @if (form().phone && !isValidPhone(form().phone)) {
                      <div style="font-size:10.5px;color:var(--accent-red);margin-top:3px">Mínimo 8 dígitos</div>
                    }
                  </div>
                </div>
                <div class="qc-field">
                  <label class="eyebrow">Contacto administrativo</label>
                  <input class="qc-input" placeholder="Nombre del referente admin" [(ngModel)]="form().adminContact" (ngModelChange)="patchForm({ adminContact: $event })"/>
                </div>
                <div class="qc-field">
                  <label class="eyebrow">Contacto operativo</label>
                  <input class="qc-input" placeholder="Nombre del referente operativo" [(ngModel)]="form().opsContact" (ngModelChange)="patchForm({ opsContact: $event })"/>
                </div>
                <div class="qc-field">
                  <label class="eyebrow">Dirección</label>
                  <input class="qc-input" placeholder="Calle y número" [(ngModel)]="form().address" (ngModelChange)="patchForm({ address: $event })"/>
                </div>
                <div class="qc-row">
                  <div class="qc-field" style="flex:1">
                    <label class="eyebrow">Latitud</label>
                    <input class="qc-input mono" type="number" step="0.0001" [value]="form().lat" (input)="patchForm({ lat: +$any($event.target).value })"/>
                  </div>
                  <div class="qc-field" style="flex:1">
                    <label class="eyebrow">Longitud</label>
                    <input class="qc-input mono" type="number" step="0.0001" [value]="form().lng" (input)="patchForm({ lng: +$any($event.target).value })"/>
                  </div>
                </div>
              </div>

              <!-- Derecha: Mini-map -->
              <div style="display:flex;flex-direction:column;gap:8px">
                <div class="eyebrow">Georreferenciación</div>
                <div class="mini-map">
                  <svg viewBox="0 0 100 100" (click)="onMapClick($event)">
                    <rect width="100" height="100" fill="rgba(2,6,23,0.90)"/>
                    <rect x="5" y="60" width="12" height="8" rx="1" fill="rgba(16,185,129,0.18)"/>
                    <line x1="10" y1="0" x2="10" y2="100" stroke="rgba(255,255,255,0.06)" stroke-width="0.3"/>
                    <line x1="50" y1="0" x2="50" y2="100" stroke="rgba(255,255,255,0.06)" stroke-width="0.3"/>
                    <line x1="90" y1="0" x2="90" y2="100" stroke="rgba(255,255,255,0.06)" stroke-width="0.3"/>
                    <line x1="0" y1="30" x2="100" y2="30" stroke="rgba(255,255,255,0.06)" stroke-width="0.3"/>
                    <line x1="0" y1="70" x2="100" y2="70" stroke="rgba(255,255,255,0.06)" stroke-width="0.3"/>
                    <circle [attr.cx]="form().lat" [attr.cy]="form().lng" r="4.5" fill="rgba(59,130,246,0.3)" stroke="var(--accent-blue)" stroke-width="1.2"/>
                    <circle [attr.cx]="form().lat" [attr.cy]="form().lng" r="1.5" fill="var(--accent-blue)"/>
                  </svg>
                  <div class="mini-map__hint">Click en el mapa para posicionar domicilio comercial.</div>
                </div>
              </div>
            </div>
          }
        </div>

        <div class="qc-foot">
          <div class="qc-hint text-slate-400">
            <span class="kbd">Esc</span> cerrar &nbsp;·&nbsp;
            Tab: <strong [style.color]="formTab() === 'general' ? 'var(--accent-blue)' : 'var(--text-muted)'">General</strong>
            · <strong [style.color]="formTab() === 'contacto' ? 'var(--accent-blue)' : 'var(--text-muted)'">Contacto</strong>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn--ghost" (click)="onClose()">Cancelar</button>
            <button class="btn btn--primary"
              [disabled]="loadingSave() || !canSubmit()"
              [style.opacity]="(!canSubmit() && formTouched()) || loadingSave() ? '0.6' : '1'"
              (click)="onSave()">
              @if (loadingSave()) {
                <span style="width:12px;height:12px;border:1.5px solid currentColor;border-top-color:transparent;border-radius:50%;display:inline-block;animation:spin 0.65s linear infinite"></span>
              } @else {
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              }
              {{ loadingSave() ? 'Guardando…' : 'Guardar institución' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrl: './institution-form-modal.component.scss'
})
export class InstitutionFormModalComponent implements OnInit {
  readonly editingInst    = input<any | null>(null);
  readonly commercialPlans = input<CommercialPlanItem[]>([]);
  readonly loadingSave     = input<boolean>(false);
  readonly initialForm     = input.required<InstitutionForm>();

  readonly close = output<void>();
  readonly save  = output<InstitutionForm>();

  readonly formTab = signal<'general' | 'contacto'>('general');
  readonly form    = signal<InstitutionForm>(null as any);
  readonly formTouched = signal(false);

  readonly institutionTypes = INSTITUTION_TYPES;

  ngOnInit(): void {
    this.form.set(JSON.parse(JSON.stringify(this.initialForm())));
    this.formTab.set('general');
    this.formTouched.set(false);
  }

  onClose(): void {
    this.close.emit();
  }

  onSave(): void {
    this.formTouched.set(true);
    if (this.canSubmit()) {
      this.save.emit(this.form());
    }
  }

  patchForm(patch: Partial<InstitutionForm>): void {
    this.form.update(f => ({ ...f, ...patch }));
  }

  onMapClick(e: MouseEvent): void {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    this.patchForm({ lat: x, lng: y });
  }

  isValidCuit(cuit: string): boolean {
    const raw = cuit.replace(/\D/g, '');
    if (raw.length !== 11) return false;
    const coefficients = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(raw[i]) * coefficients[i];
    }
    const rem = sum % 11;
    const dv = rem === 0 ? 0 : rem === 1 ? 9 : 11 - rem;
    return parseInt(raw[10]) === dv;
  }

  isValidEmail(email: string): boolean {
    if (!email) return true;
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  }

  isValidPhone(phone: string): boolean {
    if (!phone) return true;
    const raw = phone.replace(/[^\d+]/g, '');
    return raw.length >= 8 && raw.length <= 15;
  }

  readonly canSubmit = computed(() => {
    const f = this.form();
    if (!f) return false;
    const hasGeneral = f.name.trim().length > 0 && f.cuit.trim().length > 0 && f.razonSocial.trim().length > 0;
    if (!hasGeneral) return false;
    return this.isValidCuit(f.cuit) && this.isValidEmail(f.email) && this.isValidPhone(f.phone);
  });

  getPlan(planId: string): CommercialPlanItem | undefined {
    return this.commercialPlans().find(p => p.id === planId || p.name === planId);
  }

  fmtCurrency(n: number): string {
    return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 });
  }

  formatCuit(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 10) return digits.slice(0, 2) + '-' + digits.slice(2);
    return digits.slice(0, 2) + '-' + digits.slice(2, 10) + '-' + digits.slice(10);
  }
}
