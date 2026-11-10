import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SurveyAdminApiService } from '../../../data-access/api/survey-admin.api';
import {
  EncuestaDetalle,
  EncuestaVersionDetalle,
  EstadoEncuesta,
  OpcionRequest,
  PreguntaRequest,
  TipoEncuesta,
  TipoRespuestaEncuesta,
  UpdateEncuestaRequest,
  VersionRequest,
  surveyLabels,
} from '../../../data-access/dto/survey.dto';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent, BadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import { canCreateSurveyVersion, normalizeSurveyOptions, supportsSurveyOptions, surveyOptionsForRequest } from '../survey-rules';

interface OptionValue { codigo: string; texto: string; valor: string; orden: number; puntaje: number | null; permiteTextoAdicional: boolean; }
interface QuestionValue {
  codigo: string; texto: string; descripcionAyuda: string; tipoRespuesta: TipoRespuestaEncuesta; orden: number; obligatoria: boolean;
  valorMinimo: number | null; valorMaximo: number | null; etiquetaMinima: string; etiquetaMaxima: string; permiteNoAplica: boolean; opciones: OptionValue[];
}

@Component({
  selector: 'app-survey-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LoadingStateComponent, ErrorStateComponent, StatusBadgeComponent],
  templateUrl: './survey-detail.component.html',
  styleUrl: '../survey-feature.css',
})
export class SurveyDetailComponent implements OnInit {
  private readonly api = inject(SurveyAdminApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(UntypedFormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly detail = signal<EncuestaDetalle | null>(null);
  readonly version = signal<EncuestaVersionDetalle | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly builderError = signal<string | null>(null);
  readonly editError = signal<string | null>(null);
  readonly editRequested = signal(false);
  readonly showBuilder = signal(false);
  readonly showClone = signal(false);
  readonly confirmArchive = signal(false);
  readonly canCreateVersion = computed(() => { const survey=this.detail();return !!survey&&canCreateSurveyVersion(survey.estado); });
  readonly canEditDefinition = computed(() => this.detail()?.estado === 'BORRADOR');
  readonly labels = surveyLabels;
  readonly responseTypes: TipoRespuestaEncuesta[] = ['TEXTO_CORTO', 'TEXTO_LARGO', 'NUMERICA', 'ESCALA', 'NPS', 'SI_NO', 'SELECCION_UNICA', 'SELECCION_MULTIPLE', 'FECHA'];
  readonly surveyTypes: TipoEncuesta[] = ['SATISFACCION_GENERAL', 'POST_ASISTENCIA', 'CALIDAD_ATENCION', 'NPS', 'RECLAMOS_SUGERENCIAS', 'PERSONALIZADA'];

  readonly cloneForm = this.fb.group({ codigo: ['', [Validators.required, Validators.maxLength(80)]], nombre: ['', [Validators.required, Validators.maxLength(200)]] });
  readonly editForm = this.fb.nonNullable.group({
    id: [0],
    codigo: ['', [Validators.required, Validators.maxLength(80)]],
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    descripcion: ['', Validators.maxLength(1000)],
    objetivo: ['', Validators.maxLength(1000)],
    tipo: ['PERSONALIZADA' as TipoEncuesta, Validators.required],
  });
  readonly versionForm = this.fb.group({
    fechaInicio: [''], fechaFin: [''], anonima: [false], permiteObservaciones: [true], preguntas: this.fb.array([]),
  });

  get questions(): FormArray { return this.versionForm.controls['preguntas'] as FormArray; }
  options(questionIndex: number): FormArray { return this.questions.at(questionIndex).get('opciones') as FormArray; }

  ngOnInit(): void {
    this.editRequested.set(this.route.snapshot.routeConfig?.path?.endsWith('/editar') ?? this.router.url.endsWith('/editar'));
    this.load();
  }

  load(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.error.set('Identificador de encuesta inválido.'); this.loading.set(false); return; }
    this.loading.set(true);
    this.api.surveyDetail(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: detail => {
        this.detail.set(detail);
        this.editForm.reset({
          id: detail.id,
          codigo: detail.codigo,
          nombre: detail.nombre,
          descripcion: detail.descripcion ?? '',
          objetivo: detail.objetivo ?? '',
          tipo: detail.tipo,
        });
        if (!canCreateSurveyVersion(detail.estado)) this.showBuilder.set(false);
        if (detail.versionActual?.id) {
          this.api.versionDetail(id, detail.versionActual.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: version => { this.version.set(version); this.seedBuilder(version); this.loading.set(false); },
            error: () => { this.error.set('No se pudo cargar la versión vigente.'); this.loading.set(false); },
          });
        } else {
          this.seedBuilder(null);
          this.loading.set(false);
          this.showBuilder.set(!this.editRequested() && canCreateSurveyVersion(detail.estado));
        }
      },
      error: () => { this.error.set('No se pudo cargar la encuesta.'); this.loading.set(false); },
    });
  }

  action(kind: 'activate' | 'deactivate' | 'archive'): void {
    const id = this.detail()?.id;
    if (!id || this.saving()) return;
    this.saving.set(true);
    const request = kind === 'activate' ? this.api.activate(id) : kind === 'deactivate' ? this.api.deactivate(id) : this.api.archive(id);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.saving.set(false); this.confirmArchive.set(false); this.load(); }, error: () => this.saving.set(false) });
  }

  clone(): void {
    if (this.cloneForm.invalid || this.saving()) { this.cloneForm.markAllAsTouched(); return; }
    const id = this.detail()?.id;
    if (!id) return;
    this.saving.set(true);
    this.api.clone(id, this.cloneForm.getRawValue()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: survey => { this.saving.set(false); void this.router.navigate(['/encuestas', survey.id]); },
      error: () => this.saving.set(false),
    });
  }

  saveDefinition(): void {
    this.editError.set(null);
    const survey = this.detail();
    if (!survey || !this.canEditDefinition()) { this.editError.set('Sólo las encuestas en borrador pueden editarse.'); return; }
    if (this.editForm.invalid || this.saving()) { this.editForm.markAllAsTouched(); return; }
    const value = this.editForm.getRawValue();
    const request: UpdateEncuestaRequest = {
      id: survey.id,
      codigo: value.codigo,
      nombre: value.nombre,
      descripcion: value.descripcion || null,
      objetivo: value.objetivo || null,
      tipo: value.tipo,
    };
    this.saving.set(true);
    this.api.updateSurvey(survey.id, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.saving.set(false);
        this.editRequested.set(false);
        void this.router.navigate(['/encuestas', survey.id]);
        this.load();
      },
      error: () => { this.saving.set(false); this.editError.set('No se pudo actualizar la encuesta.'); },
    });
  }

  addQuestion(source?: Partial<QuestionValue>): void {
    const order = this.questions.length + 1;
    const type = source?.tipoRespuesta ?? 'TEXTO_CORTO';
    const optionArray = this.fb.array((supportsSurveyOptions(type) ? source?.opciones ?? [] : []).map(option => this.createOption(option)));
    if (!supportsSurveyOptions(type)) optionArray.disable({ emitEvent: false });
    this.questions.push(this.fb.group({
      codigo: [source?.codigo ?? `P${order}`, [Validators.required, Validators.maxLength(80)]],
      texto: [source?.texto ?? '', [Validators.required, Validators.maxLength(1000)]],
      descripcionAyuda: [source?.descripcionAyuda ?? '', Validators.maxLength(500)],
      tipoRespuesta: [type, Validators.required],
      orden: [source?.orden ?? order, [Validators.required, Validators.min(1)]],
      obligatoria: [source?.obligatoria ?? false], valorMinimo: [source?.valorMinimo ?? null], valorMaximo: [source?.valorMaximo ?? null],
      etiquetaMinima: [source?.etiquetaMinima ?? ''], etiquetaMaxima: [source?.etiquetaMaxima ?? ''],
      permiteNoAplica: [source?.permiteNoAplica ?? false], opciones: optionArray,
    }));
  }

  removeQuestion(index: number): void { this.questions.removeAt(index); this.reorder(); }
  addOption(questionIndex: number): void { this.options(questionIndex).push(this.createOption()); this.normalizeOptions(questionIndex); }
  removeOption(questionIndex: number, optionIndex: number): void { this.options(questionIndex).removeAt(optionIndex); this.normalizeOptions(questionIndex); }
  onQuestionTypeChange(questionIndex: number): void {
    const type = this.questions.at(questionIndex).get('tipoRespuesta')?.value as TipoRespuestaEncuesta;
    const optionArray = this.options(questionIndex);
    if (supportsSurveyOptions(type)) {
      optionArray.enable({ emitEvent: false });
      if (optionArray.length === 0) this.addOption(questionIndex);
    } else {
      optionArray.clear();
      optionArray.disable({ emitEvent: false });
    }
  }
  isSelection(index: number): boolean { const type = this.questions.at(index).get('tipoRespuesta')?.value; return type === 'SELECCION_UNICA' || type === 'SELECCION_MULTIPLE'; }
  isRange(index: number): boolean { const type = this.questions.at(index).get('tipoRespuesta')?.value; return type === 'ESCALA' || type === 'NPS' || type === 'NUMERICA'; }

  saveVersion(): void {
    this.builderError.set(null);
    if (!this.canCreateVersion()) { this.showBuilder.set(false); this.builderError.set('Una encuesta archivada no admite nuevas versiones.'); return; }
    if (this.versionForm.invalid || this.questions.length === 0) { this.versionForm.markAllAsTouched(); this.builderError.set('Agregá al menos una pregunta y completá los campos requeridos.'); return; }
    const raw = this.versionForm.getRawValue() as { fechaInicio: string; fechaFin: string; anonima: boolean; permiteObservaciones: boolean; preguntas: QuestionValue[] };
    for (const question of raw.preguntas) {
      if ((question.tipoRespuesta === 'SELECCION_UNICA' || question.tipoRespuesta === 'SELECCION_MULTIPLE') && question.opciones.length === 0) {
        this.builderError.set(`La pregunta ${question.codigo} requiere al menos una opción.`); return;
      }
      if (question.tipoRespuesta === 'ESCALA' && (question.valorMinimo === null || question.valorMaximo === null || question.valorMinimo >= question.valorMaximo)) {
        this.builderError.set(`La escala ${question.codigo} requiere un mínimo menor al máximo.`); return;
      }
      if (question.tipoRespuesta === 'NPS') { question.valorMinimo = 0; question.valorMaximo = 10; }
    }
    const request: VersionRequest = {
      fechaInicio: raw.fechaInicio || null, fechaFin: raw.fechaFin || null, anonima: raw.anonima, permiteObservaciones: raw.permiteObservaciones,
      preguntas: raw.preguntas.map((question): PreguntaRequest => {
        const options = surveyOptionsForRequest(question.tipoRespuesta, question.opciones);
        return {
          ...question,
          descripcionAyuda: question.descripcionAyuda || null,
          etiquetaMinima: question.etiquetaMinima || null,
          etiquetaMaxima: question.etiquetaMaxima || null,
          opciones: options.map((option): OpcionRequest => ({ ...option, valor: option.valor || null })),
        };
      }),
    };
    const id = this.detail()?.id;
    if (!id) return;
    this.saving.set(true);
    this.api.addVersion(id, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.saving.set(false); this.showBuilder.set(false); this.load(); }, error: () => this.saving.set(false) });
  }

  badge(estado: EstadoEncuesta): BadgeVariant { return estado === 'ACTIVA' ? 'stable' : estado === 'BORRADOR' ? 'info' : estado === 'ARCHIVADA' ? 'critical' : 'urgent'; }

  private seedBuilder(version: EncuestaVersionDetalle | null): void {
    this.questions.clear();
    this.versionForm.patchValue({ fechaInicio: version?.fechaInicio ?? '', fechaFin: version?.fechaFin ?? '', anonima: version?.anonima ?? false, permiteObservaciones: version?.permiteObservaciones ?? true });
    version?.preguntas.forEach(question => this.addQuestion({ ...question, descripcionAyuda: question.descripcionAyuda ?? '', etiquetaMinima: question.etiquetaMinima ?? '', etiquetaMaxima: question.etiquetaMaxima ?? '', opciones: question.opciones.map(option => ({ ...option, valor: option.valor ?? '', puntaje: option.puntaje ?? null })) }));
  }

  private createOption(source?: Partial<OptionValue>): UntypedFormGroup {
    return this.fb.group({ codigo: [source?.codigo ?? '', [Validators.required, Validators.maxLength(80)]], texto: [source?.texto ?? '', [Validators.required, Validators.maxLength(500)]], valor: [source?.valor ?? ''], orden: [source?.orden ?? 1, [Validators.required, Validators.min(1)]], puntaje: [source?.puntaje ?? null], permiteTextoAdicional: [source?.permiteTextoAdicional ?? false] });
  }
  private normalizeOptions(questionIndex: number): void {
    const optionArray = this.options(questionIndex);
    const normalized = normalizeSurveyOptions(optionArray.getRawValue() as OptionValue[]);
    normalized.forEach((option, index) => optionArray.at(index).patchValue({ codigo: option.codigo, orden: option.orden }));
  }
  private reorder(): void { this.questions.controls.forEach((control, index) => control.get('orden')?.setValue(index + 1)); }
}
