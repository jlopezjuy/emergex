import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SurveyAdminApiService } from '../../../data-access/api/survey-admin.api';
import { EncuestaSummary, FrecuenciaEncuesta, PlanRequest, PlanSummary, surveyLabels } from '../../../data-access/dto/survey.dto';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-survey-plans',
  standalone: true,
  imports: [ReactiveFormsModule, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent, StatusBadgeComponent],
  templateUrl: './survey-plans.component.html',
  styleUrl: '../survey-feature.css',
})
export class SurveyPlansComponent implements OnInit {
  private readonly api = inject(SurveyAdminApiService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  readonly plans = signal<PlanSummary[]>([]);
  readonly surveys = signal<EncuestaSummary[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly showForm = signal(false);
  readonly page = signal(0);
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly labels = surveyLabels;
  readonly frequencies: FrecuenciaEncuesta[] = ['SEMANAL', 'MENSUAL', 'MANUAL'];

  readonly form = this.fb.nonNullable.group({
    id: this.fb.control<number | null>(null), nombre: ['', Validators.required], activo: [true], frecuencia: ['SEMANAL' as FrecuenciaEncuesta, Validators.required],
    diaSemana: this.fb.control<number | null>(1), diaMes: this.fb.control<number | null>(null), cantidadClientes: [15, [Validators.required, Validators.min(1)]],
    diasSinRepetirCliente: [60, [Validators.required, Validators.min(0)]], soloClientesConTelefono: [true], soloClientesActivos: [true],
    requiereAsistenciaPrevia: [{ value: false, disabled: true }], diasDesdeUltimaAsistencia: this.fb.control<number | null>({ value: null, disabled: true }),
    estrategiaSeleccion: ['ALEATORIA' as const], encuestaId: [0, Validators.min(1)],
  });

  ngOnInit(): void { this.load(); this.api.listSurveys({ size: 100, sort: 'nombre,asc' }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(result => this.surveys.set(result.data)); }

  load(page = this.page()): void {
    this.loading.set(true); this.error.set(null);
    this.api.listPlans({ page, size: 20, sort: 'id,desc' }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => { this.plans.set(result.data); this.total.set(result.total); this.totalPages.set(result.totalPages); this.page.set(page); this.loading.set(false); },
      error: () => { this.error.set('No se pudieron cargar los planes.'); this.loading.set(false); },
    });
  }

  newPlan(): void { this.form.reset({ id: null, nombre: '', activo: true, frecuencia: 'SEMANAL', diaSemana: 1, diaMes: null, cantidadClientes: 15, diasSinRepetirCliente: 60, soloClientesConTelefono: true, soloClientesActivos: true, requiereAsistenciaPrevia: false, diasDesdeUltimaAsistencia: null, estrategiaSeleccion: 'ALEATORIA', encuestaId: 0 }); this.showForm.set(true); }

  edit(id: number): void {
    this.saving.set(true);
    this.api.planDetail(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: plan => {
        this.saving.set(false);
        if (!plan) return;
        this.form.patchValue({ ...plan, estrategiaSeleccion: 'ALEATORIA', encuestaId: plan.encuesta.id });
        this.showForm.set(true);
      },
      error: () => this.saving.set(false),
    });
  }

  save(): void {
    if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); return; }
    const value = this.form.getRawValue();
    if (value.frecuencia === 'SEMANAL' && (value.diaSemana === null || value.diaSemana < 1 || value.diaSemana > 7)) return;
    if (value.frecuencia === 'MENSUAL' && (value.diaMes === null || value.diaMes < 1 || value.diaMes > 31)) return;
    const request: PlanRequest = { ...value, diaSemana: value.frecuencia === 'SEMANAL' ? value.diaSemana : null, diaMes: value.frecuencia === 'MENSUAL' ? value.diaMes : null };
    this.saving.set(true);
    this.api.savePlan(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.saving.set(false); this.showForm.set(false); this.load(value.id ? this.page() : 0); }, error: () => this.saving.set(false) });
  }
}
