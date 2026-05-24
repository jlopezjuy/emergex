import { Component, input, output, signal, OnInit } from '@angular/core';
import { PatientRow, PatientForm, Dependent, emptyForm } from '../../patients.component';
import { PlanDTO } from '../../../../data-access/dto/plan.dto';
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
  readonly editingRow  = input<PatientRow | null>(null);
  readonly plans       = input<PlanDTO[]>([]);
  readonly savingForm  = input<boolean>(false);
  readonly formError   = input<string | null>(null);
  readonly initialForm = input.required<PatientForm>();

  // ── Outputs ──
  readonly close = output<void>();
  readonly save  = output<PatientForm>();

  // ── Constants ──
  readonly parentescos = ['Cónyuge', 'Hijo/a', 'Padre/Madre', 'Hermano/a', 'Otro'];
  readonly genderOptions: { v: 'M' | 'F' | 'X'; l: string }[] = [
    { v: 'M', l: 'Masculino' },
    { v: 'F', l: 'Femenino'  },
    { v: 'X', l: 'Otro'      },
  ];

  // ── Internal State ──
  readonly formTab = signal<'titular' | 'group'>('titular');
  readonly form = signal<PatientForm>(emptyForm());

  ngOnInit(): void {
    // Clona el formulario inicial al estado interno
    this.form.set(JSON.parse(JSON.stringify(this.initialForm())));
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
}
