import { Component, input, output, signal, computed, OnInit } from '@angular/core';
import { PatientRow, PatientForm, Dependent, emptyForm } from '../../patients.component';
import { PlanComercialDTO } from '../../../../data-access/dto/plan-comercial.dto';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-patient-form-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './patient-form-modal.component.html',
  styleUrl: './patient-form-modal.component.scss',
})
export class PatientFormModalComponent implements OnInit {
  // ── Inputs ──
  readonly editingRow      = input<PatientRow | null>(null);
  readonly plans           = input<PlanComercialDTO[]>([]);
  readonly savingForm      = input<boolean>(false);
  readonly formError       = input<string | null>(null);
  readonly initialForm     = input.required<PatientForm>();
  /** Parent feeds back the result of the async DNI check */
  readonly dniAlreadyExists = input<boolean | null>(null);

  // ── Outputs ──
  readonly close    = output<void>();
  readonly save     = output<PatientForm>();
  /** Emitted when the DNI field loses focus (alta nueva only) */
  readonly checkDni = output<string>();

  // ── Constants ──
  readonly parentescos = ['Cónyuge', 'Hijo/a', 'Padre/Madre', 'Hermano/a', 'Otro'];
  readonly genderOptions: { v: 'M' | 'F' | 'X'; l: string }[] = [
    { v: 'M', l: 'Masculino' },
    { v: 'F', l: 'Femenino'  },
    { v: 'X', l: 'Otro'      },
  ];

  // ── Internal State ──
  readonly formTab    = signal<'titular' | 'group'>('titular');
  readonly form       = signal<PatientForm>(emptyForm());
  /** Current wizard step (only relevant for alta nueva, i.e. !editingRow()) */
  readonly wizardStep = signal<1 | 2 | 3 | 4>(1);

  ngOnInit(): void {
    // Clona el formulario inicial al estado interno
    this.form.set(JSON.parse(JSON.stringify(this.initialForm())));
    this.wizardStep.set(1);
  }

  // ── Form Actions ──
  onClose(): void {
    this.close.emit();
  }

  onSave(): void {
    if (this.canSubmit()) {
      this.save.emit(this.form());
    }
  }

  // ── Wizard navigation (alta nueva only) ──

  /** Returns true when the current wizard step passes its local validation */
  readonly canGoNext = computed<boolean>(() => {
    const f = this.form();
    const step = this.wizardStep();
    if (step === 1) {
      return (
        f.nombre.trim().length > 0 &&
        f.apellido.trim().length > 0 &&
        f.dni.trim().length >= 6 &&
        f.birth.length > 0 &&
        this.dniAlreadyExists() !== true
      );
    }
    if (step === 2) {
      return f.planId.length > 0;
    }
    // Steps 3 & 4 are always passable
    return true;
  });

  wizardNext(): void {
    if (!this.canGoNext()) return;
    const current = this.wizardStep();
    if (current < 4) {
      this.wizardStep.set((current + 1) as 1 | 2 | 3 | 4);
    }
  }

  wizardBack(): void {
    const current = this.wizardStep();
    if (current > 1) {
      this.wizardStep.set((current - 1) as 1 | 2 | 3 | 4);
    }
  }

  /** Emits the DNI for the parent to check asynchronously. Only meaningful in alta nueva. */
  onDniBlur(dni: string): void {
    if (this.editingRow()) return;
    if (dni.trim().length >= 6) {
      this.checkDni.emit(dni.trim());
    }
  }

  /** Returns the selected plan object from the plans list */
  get selectedPlan(): PlanComercialDTO | undefined {
    return this.plans().find(p => p.id === this.form().planId);
  }

  patchForm(patch: Partial<PatientForm>): void {
    this.form.update(f => ({ ...f, ...patch }));
  }

  onFullNameInput(val: string): void {
    const parts = val.trim().split(' ');
    const nombre = parts[0] ?? '';
    const apellido = parts.slice(1).join(' ') ?? '';
    this.patchForm({ nombre, apellido });
  }

  onFullNameDepInput(id: string, val: string): void {
    const parts = val.trim().split(' ');
    const name = parts[0] ?? '';
    const apellido = parts.slice(1).join(' ') ?? '';
    this.updateDep(id, 'name', name);
    this.updateDep(id, 'apellido', apellido);
  }

  getPlanColor(tier?: string): string {
    const t = tier?.toLowerCase() ?? 'basico';
    if (t === 'premium') return '#10b981'; // Emerald
    if (t === 'medio' || t === 'familiar') return '#3b82f6'; // Blue
    if (t === 'joven' || t === 'cyan') return '#06b6d4'; // Cyan
    if (t === 'empresa' || t === 'amber' || t === 'corporativo') return '#f59e0b'; // Amber
    return '#94a3b8'; // Slate
  }

  fmtCurrency(n: number): string {
    return '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 0 });
  }

  canSubmit(): boolean {
    const f = this.form();
    const needsPlan = !this.editingRow();
    return (
      f.nombre.trim().length > 0 &&
      f.apellido.trim().length > 0 &&
      f.dni.trim().length > 0 &&
      f.birth.length > 0 &&
      (!needsPlan || f.planId.length > 0)
    );
  }

  // ── Dependent management ──
  addDep(): void {
    const dep: Dependent = { id: `d${Date.now()}`, name: '', apellido: '', dni: '', parentesco: 'Hijo/a', gender: 'M' };
    this.form.update(f => ({ ...f, deps: [...f.deps, dep] }));
  }

  updateDep(id: string, field: keyof Dependent, value: string): void {
    this.form.update(f => ({
      ...f,
      deps: f.deps.map(d => d.id === id ? { ...d, [field]: value } : d)
    }));
  }

  removeDep(id: string): void {
    this.form.update(f => ({
      ...f,
      deps: f.deps.filter(d => d.id !== id)
    }));
  }

  formatDni(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.slice(0, digits.length - 3) + '.' + digits.slice(-3);
    return digits.slice(0, digits.length - 6) + '.' + digits.slice(-6, -3) + '.' + digits.slice(-3);
  }

  formatPhone(raw: string): string {
    // Keep +, digits, spaces and hyphens; strip everything else
    return raw.replace(/[^\d\s+\-()]/g, '').slice(0, 20);
  }
}
