import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, from, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { EstadoInstitucion, InstitutionType, InstitutionDTO } from '../../../../data-access/dto/institution.dto';
import { GeocodeResult } from '../../../../shared/map/geocoder-provider';
import { HttpGeocoderProvider } from '../../../../shared/map/providers/http-geocoder.provider';
import { LocationPolygonMapComponent } from '../../../../shared/components/map/location-polygon-map/location-polygon-map.component';

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
  status: EstadoInstitucion;
  email: string;
  phone: string;
  adminContact: string;
  opsContact: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  polygon?: [number, number][];  // lng, lat pairs, open ring
}

const INSTITUTION_TYPES: { id: InstitutionType; label: string; icon: string }[] = [
  { id: 'COLEGIO_SECUNDARIO', label: 'Colegio Secundario',  icon: '🏫' },
  { id: 'ESCUELA',            label: 'Escuela Primaria',    icon: '🏫' },
  { id: 'JARDIN',             label: 'Jardín de Infantes',  icon: '👶' },
  { id: 'UNIVERSIDAD',        label: 'Universidad',         icon: '🏛️' },
  { id: 'EMPRESA',            label: 'Empresa',             icon: '🏭' },
  { id: 'SHOPPING',           label: 'Shopping / Centro',   icon: '🛍️' },
  { id: 'CLUB',               label: 'Club',                icon: '⚽' },
  { id: 'GIMNASIO',           label: 'Gimnasio',            icon: '💪' },
  { id: 'GERIATRICO',         label: 'Geriátrico',          icon: '👵' },
  { id: 'ORGANISMO_PUBLICO',  label: 'Organismo Público',   icon: '🏛️' },
  { id: 'EVENTO',             label: 'Evento',              icon: '📅' },
  { id: 'OTRO',               label: 'Otro',                icon: '📍' },
];

@Component({
  selector: 'app-institution-form-modal',
  standalone: true,
  imports: [FormsModule, LocationPolygonMapComponent],
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
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  @for (opt of statusOpts; track opt.value) {
                    <button type="button"
                      style="padding:5px 12px;border-radius:6px;border:1px solid;font-size:12px;font-weight:500;cursor:pointer;transition:all .15s"
                      [style.background]="form().status === opt.value ? opt.bg : 'rgba(255,255,255,0.04)'"
                      [style.color]="form().status === opt.value ? opt.color : 'var(--text-muted)'"
                      [style.border-color]="form().status === opt.value ? opt.color + '88' : 'var(--border-glass)'"
                      (click)="patchForm({ status: opt.value })">
                      {{ opt.label }}
                    </button>
                  }
                </div>
              </div>
            </div>
          }

          @if (formTab() === 'contacto') {
            <div class="contact-grid">
              <!-- Left column -->
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

                <!-- Address with geocoding dropdown -->
                <div class="qc-field" style="position:relative">
                  <label class="eyebrow">Dirección</label>
                  <input class="qc-input" placeholder="Calle y número"
                    [value]="form().address"
                    (input)="onAddressInput($any($event.target).value)"/>
                  @if (geocodeSearching()) {
                    <div style="font-size:10.5px;color:var(--text-muted);margin-top:3px">Buscando ubicación...</div>
                  }
                  @if (geocodeResults().length > 0) {
                    <div style="position:absolute;left:0;right:0;top:100%;z-index:200;
                      border-radius:8px;overflow:hidden;
                      border:1px solid rgba(148,163,184,0.35);background:#fff;
                      box-shadow:0 14px 34px rgba(15,23,42,0.18);">
                      @for (result of geocodeResults(); track result.address) {
                        <button type="button"
                          style="display:block;width:100%;text-align:left;padding:8px 12px;font-size:12px;
                            color:#0f172a;border-bottom:1px solid rgba(148,163,184,0.18);
                            background:transparent;border-left:none;border-right:none;cursor:pointer;"
                          (click)="selectGeocode(result)">
                          <span style="font-weight:500">{{ result.label }}</span>
                          <span style="display:block;margin-top:2px;font-size:10.5px;color:#64748b">{{ result.lat.toFixed(5) }}, {{ result.lng.toFixed(5) }}</span>
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>

              <!-- Right column: real map -->
              <div style="display:flex;flex-direction:column;gap:8px">
                <div class="eyebrow">Georreferenciación y perímetro</div>
                <div style="height:260px; border-radius:0.75rem; overflow:hidden; border:1px solid rgba(148,163,184,0.3)">
                  <emx-location-polygon-map
                    [lat]="form().lat || null"
                    [lng]="form().lng || null"
                    [polygon]="form().polygon ?? null"
                    (pointChanged)="onPointChanged($event)"
                    (polygonChanged)="onPolygonChanged($event)"
                  />
                </div>
                @if (selectedLocation() || (form().lat && form().lng)) {
                  <div style="font-size:10.5px;color:var(--accent-emerald);margin-top:4px">
                    Ubicación confirmada · {{ (selectedLocation()?.lat ?? form().lat).toFixed(5) }}, {{ (selectedLocation()?.lng ?? form().lng).toFixed(5) }}
                  </div>
                }
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
export class InstitutionFormModalComponent implements OnInit, OnDestroy {
  readonly editingInst    = input<any | null>(null);
  readonly commercialPlans = input<CommercialPlanItem[]>([]);
  readonly loadingSave     = input<boolean>(false);
  readonly initialForm     = input.required<InstitutionForm>();

  readonly close = output<void>();
  readonly save  = output<InstitutionForm>();

  readonly formTab     = signal<'general' | 'contacto'>('general');
  readonly form        = signal<InstitutionForm>(null as any);
  readonly formTouched = signal(false);

  // Geocoding state
  readonly geocodeResults   = signal<GeocodeResult[]>([]);
  readonly geocodeSearching = signal(false);
  readonly selectedLocation = signal<GeocodeResult | null>(null);

  private geocode$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  private geocoder = inject(HttpGeocoderProvider);

  readonly institutionTypes = INSTITUTION_TYPES;

  readonly statusOpts = [
    { value: 'ACTIVA' as EstadoInstitucion,               label: 'Activa',     color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.12)' },
    { value: 'PENDIENTE_ACTIVACION' as EstadoInstitucion, label: 'Pendiente',  color: 'var(--accent-blue)',    bg: 'rgba(59,130,246,0.12)' },
    { value: 'SUSPENDIDA' as EstadoInstitucion,           label: 'Suspendida', color: 'var(--accent-amber)',   bg: 'rgba(245,158,11,0.12)' },
    { value: 'BAJA' as EstadoInstitucion,                 label: 'Baja',       color: 'var(--text-muted)',     bg: 'rgba(148,163,184,0.1)' },
  ];

  ngOnInit(): void {
    this.form.set(JSON.parse(JSON.stringify(this.initialForm())));
    this.formTab.set('general');
    this.formTouched.set(false);

    // Geocoding pipeline
    this.geocode$.pipe(
      debounceTime(650),
      distinctUntilChanged(),
      switchMap(query => {
        const q = query.trim();
        this.selectedLocation.set(null);
        if (q.length < 4) {
          this.geocodeResults.set([]);
          this.geocodeSearching.set(false);
          return of([]);
        }
        this.geocodeSearching.set(true);
        return from(this.geocoder.search(q)).pipe(catchError(() => of([])));
      }),
      takeUntil(this.destroy$),
    ).subscribe((results: GeocodeResult[]) => {
      this.geocodeResults.set(results);
      this.geocodeSearching.set(false);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

  // ── Geocoding ─────────────────────────────────────────────────────────────

  onAddressInput(value: string): void {
    this.patchForm({ address: value });
    this.geocode$.next(value);
  }

  selectGeocode(result: GeocodeResult): void {
    this.selectedLocation.set(result);
    this.geocodeResults.set([]);
    this.patchForm({ address: result.address || result.label, lat: result.lat, lng: result.lng });
  }

  // ── Map callbacks ─────────────────────────────────────────────────────────

  onPointChanged(point: { lat: number; lng: number }): void {
    this.patchForm({ lat: point.lat, lng: point.lng });
  }

  onPolygonChanged(polygon: [number, number][]): void {
    this.patchForm({ polygon });
  }

  // ── Validation ────────────────────────────────────────────────────────────

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
