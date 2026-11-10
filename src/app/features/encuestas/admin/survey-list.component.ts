import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SurveyAdminApiService } from '../../../data-access/api/survey-admin.api';
import { EncuestaDTO, EstadoEncuesta, TipoEncuesta, surveyLabels } from '../../../data-access/dto/survey.dto';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent, BadgeVariant } from '../../../shared/components/status-badge/status-badge.component';

@Component({
  selector: 'app-survey-list',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent, StatusBadgeComponent],
  templateUrl: './survey-list.component.html',
  styleUrl: '../survey-feature.css',
})
export class SurveyListComponent implements OnInit {
  private readonly api = inject(SurveyAdminApiService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly rows = signal<EncuestaDTO[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly showCreate = signal(false);
  readonly page = signal(0);
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly labels = surveyLabels;
  readonly estados: EstadoEncuesta[] = ['BORRADOR', 'ACTIVA', 'INACTIVA', 'ARCHIVADA'];
  readonly tipos: TipoEncuesta[] = ['SATISFACCION_GENERAL', 'POST_ASISTENCIA', 'CALIDAD_ATENCION', 'NPS', 'RECLAMOS_SUGERENCIAS', 'PERSONALIZADA'];

  readonly filters = this.fb.nonNullable.group({ nombre: [''], estado: ['' as EstadoEncuesta | ''], tipo: ['' as TipoEncuesta | ''] });
  readonly createForm = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(80)]],
    nombre: ['', [Validators.required, Validators.maxLength(200)]],
    descripcion: ['', Validators.maxLength(1000)],
    objetivo: ['', Validators.maxLength(1000)],
    tipo: ['PERSONALIZADA' as TipoEncuesta, Validators.required],
  });

  ngOnInit(): void {
    this.showCreate.set(this.router.url.endsWith('/nueva'));
    this.load();
  }

  load(page = this.page()): void {
    this.loading.set(true);
    this.error.set(null);
    const value = this.filters.getRawValue();
    this.api.querySurveys({ page, size: 20, sort: 'fechaActualizacion,desc', nombre: value.nombre.trim() || undefined, estado: value.estado || undefined, tipo: value.tipo || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => { this.rows.set(result.data); this.total.set(result.total); this.totalPages.set(result.totalPages); this.page.set(page); this.loading.set(false); },
        error: () => { this.error.set('No se pudieron cargar las encuestas.'); this.loading.set(false); },
      });
  }

  clearFilters(): void { this.filters.reset(); this.load(0); }

  create(): void {
    if (this.createForm.invalid || this.saving()) { this.createForm.markAllAsTouched(); return; }
    this.saving.set(true);
    const value = this.createForm.getRawValue();
    this.api.createSurvey({ ...value, descripcion: value.descripcion || null, objetivo: value.objetivo || null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: created => { this.saving.set(false); void this.router.navigate(['/encuestas', created.id]); },
        error: () => this.saving.set(false),
      });
  }

  badge(estado: EstadoEncuesta): BadgeVariant {
    return estado === 'ACTIVA' ? 'stable' : estado === 'BORRADOR' ? 'info' : estado === 'ARCHIVADA' ? 'critical' : 'urgent';
  }
}
