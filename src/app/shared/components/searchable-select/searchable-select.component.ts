import { Component, EventEmitter, HostListener, Input, Output, computed, effect, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface SearchableSelectOption {
  value: string | number;
  label: string;
}

let nextListboxId = 0;

/**
 * Combobox buscable/filtrable — reemplazo visual de un <select> nativo con muchas
 * opciones. Filtra client-side (sin HTTP) sobre `options` ya cargado; replica el
 * look & feel del autocomplete de pacientes de emergency-quick-create-modal
 * (misma disposición input + dropdown, mismas clases, mismo cierre al click afuera).
 *
 * Implementa ControlValueAccessor para ser un drop-in de formControlName/[formControl],
 * y además admite [value]/(valueChange) para casos sin Reactive Forms (p. ej. el
 * diagnóstico de cierre en emergency-detail, que se maneja con un signal suelto).
 */
@Component({
  selector: 'emx-searchable-select',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
  template: `
    <div class="relative" (click)="$event.stopPropagation()">
      <div class="relative">
        <input
          type="text"
          [attr.id]="inputId"
          [value]="query()"
          [placeholder]="placeholder"
          [disabled]="disabled()"
          autocomplete="off"
          role="combobox"
          [attr.aria-expanded]="dropdownOpen()"
          aria-autocomplete="list"
          [attr.aria-controls]="listboxId"
          class="rounded-btn px-3 py-2 text-sm w-full focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          [class.pr-8]="query().length > 0"
          style="background: var(--surface-glass); border: 1px solid var(--border-strong); color: var(--text-primary);"
          (focus)="dropdownOpen.set(true)"
          (input)="onInput($any($event.target).value)"
        />
        @if (query().length > 0 && !disabled()) {
          <button
            type="button"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-xs px-1 rounded focus:ring-2 focus:ring-[var(--accent-cyan)] focus:outline-none"
            style="color: var(--text-muted);"
            aria-label="Limpiar selección"
            (click)="clear()"
          >✕</button>
        }
      </div>

      @if (dropdownOpen() && filteredOptions().length > 0) {
        <div
          [attr.id]="listboxId"
          role="listbox"
          class="absolute left-0 right-0 top-full mt-1 rounded-btn z-[200]"
          style="background: #ffffff; border: 1px solid rgba(148,163,184,0.45); box-shadow: 0 14px 34px rgba(15,23,42,0.18); max-height: 15rem; overflow-y: auto;"
        >
          @for (opt of filteredOptions(); track opt.value) {
            <button
              type="button"
              role="option"
              [attr.aria-selected]="hoveredValue() === opt.value"
              class="w-full text-left px-3 py-2.5 text-sm focus:outline-none focus:bg-slate-100"
              style="color: #0f172a; border-bottom: 1px solid rgba(148,163,184,0.22);"
              [style.background]="hoveredValue() === opt.value ? 'rgba(59,130,246,0.10)' : '#ffffff'"
              (mouseenter)="hoveredValue.set(opt.value)"
              (mouseleave)="hoveredValue.set(null)"
              (click)="selectOption(opt)"
            >{{ opt.label }}</button>
          }
        </div>
      }
    </div>
  `,
})
export class SearchableSelectComponent implements ControlValueAccessor {
  @Input() placeholder = 'Seleccionar...';
  @Input() inputId: string | null = null;

  private readonly _options = signal<SearchableSelectOption[]>([]);
  @Input()
  set options(opts: SearchableSelectOption[] | null | undefined) {
    this._options.set(opts ?? []);
  }
  get options(): SearchableSelectOption[] {
    return this._options();
  }

  // Binding directo sin Reactive Forms (ver emergency-detail: closeDiagnosticoFrecuenteId
  // es un signal suelto, no un FormControl).
  @Input()
  set value(val: string | number | null | undefined) {
    this.rawValue.set(val ?? null);
  }
  get value(): string | number | null {
    return this.rawValue();
  }
  @Output() readonly valueChange = new EventEmitter<string | number | null>();

  readonly listboxId = `searchable-select-listbox-${nextListboxId++}`;

  private readonly rawValue = signal<string | number | null>(null);
  readonly disabled = signal(false);
  readonly dropdownOpen = signal(false);
  readonly query = signal('');
  readonly hoveredValue = signal<string | number | null>(null);

  private readonly selectedOption = computed(() => {
    const val = this.rawValue();
    if (val === null) return null;
    return this._options().find(o => o.value === val) ?? null;
  });

  readonly filteredOptions = computed(() => {
    const q = this.normalize(this.query());
    const opts = this._options();
    if (!q) return opts;
    return opts.filter(o => this.normalize(o.label).includes(q));
  });

  private onChange: (value: string | number | null) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    // Mientras el dropdown está cerrado, el texto del input siempre refleja la
    // opción seleccionada (evita dejar visible un texto tipeado sin confirmar).
    effect(() => {
      const opt = this.selectedOption();
      if (!this.dropdownOpen()) {
        this.query.set(opt?.label ?? '');
      }
    });
  }

  private normalize(text: string): string {
    return text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase();
  }

  onInput(text: string): void {
    this.query.set(text);
    this.dropdownOpen.set(true);
    if (text === '') {
      this.emitValue(null);
    }
  }

  selectOption(option: SearchableSelectOption): void {
    this.dropdownOpen.set(false);
    this.emitValue(option.value);
    this.onTouched();
  }

  clear(): void {
    this.dropdownOpen.set(false);
    this.emitValue(null);
    this.onTouched();
  }

  private emitValue(val: string | number | null): void {
    this.rawValue.set(val);
    this.onChange(val);
    this.valueChange.emit(val);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.dropdownOpen.set(false);
  }

  writeValue(val: string | number | null | undefined): void {
    this.rawValue.set(val ?? null);
  }

  registerOnChange(fn: (value: string | number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
