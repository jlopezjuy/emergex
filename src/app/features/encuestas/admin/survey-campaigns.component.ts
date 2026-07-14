import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SurveyAdminApiService } from '../../../data-access/api/survey-admin.api';
import { CampaniaGenerationSummary, CampaniaSummary, EncuestaSummary, EstadoCampaniaEncuesta, PlanSummary, surveyLabels } from '../../../data-access/dto/survey.dto';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent, BadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import { validateCampaignPeriod } from '../survey-rules';

@Component({ selector: 'app-survey-campaigns', standalone: true, imports: [ReactiveFormsModule, RouterLink, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent, StatusBadgeComponent], templateUrl: './survey-campaigns.component.html', styleUrl: '../survey-feature.css' })
export class SurveyCampaignsComponent implements OnInit {
  private readonly api = inject(SurveyAdminApiService); private readonly fb = inject(FormBuilder); private readonly destroyRef = inject(DestroyRef);
  readonly campaigns = signal<CampaniaSummary[]>([]); readonly surveys = signal<EncuestaSummary[]>([]); readonly plans = signal<PlanSummary[]>([]);
  readonly loading = signal(false); readonly generating = signal(false); readonly error = signal<string | null>(null); readonly showGenerate = signal(false); readonly generation = signal<CampaniaGenerationSummary | null>(null);
  readonly generationError = signal<string | null>(null);
  readonly page = signal(0); readonly total = signal(0); readonly totalPages = signal(1); readonly labels = surveyLabels;
  readonly states: EstadoCampaniaEncuesta[] = ['BORRADOR', 'GENERADA', 'EN_PROCESO', 'FINALIZADA', 'CANCELADA'];
  readonly filters = this.fb.nonNullable.group({ estado: ['' as EstadoCampaniaEncuesta | ''], encuestaId: [0], desde: [''], hasta: [''] });
  readonly generateForm = this.fb.nonNullable.group({ planId: [0, Validators.min(1)], fechaDesde: [''], fechaHasta: [''], seed: [''] });
  ngOnInit(): void { this.load(); this.api.listSurveys({ size: 100, sort: 'nombre,asc' }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(r => this.surveys.set(r.data)); this.api.listPlans({ size: 100, sort: 'nombre,asc' }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(r => this.plans.set(r.data)); }
  load(page = this.page()): void { const f = this.filters.getRawValue(); this.loading.set(true); this.error.set(null); this.api.queryCampaigns({ page, size: 20, sort: 'fechaGeneracion,desc', estado: f.estado || undefined, encuestaId: f.encuestaId || undefined, desde: f.desde || undefined, hasta: f.hasta || undefined }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: r => { this.campaigns.set(r.data); this.total.set(r.total); this.totalPages.set(r.totalPages); this.page.set(page); this.loading.set(false); }, error: () => { this.error.set('No se pudieron cargar las campañas.'); this.loading.set(false); } }); }
  clear(): void { this.filters.reset(); this.load(0); }
  generate(): void { if (this.generateForm.invalid || this.generating()) { this.generateForm.markAllAsTouched(); return; } const f = this.generateForm.getRawValue(); const plan=this.plans().find(candidate=>candidate.id===f.planId);if(!plan){this.generationError.set('Seleccioná un plan disponible.');return;}const periodError=validateCampaignPeriod(plan.frecuencia,f.fechaDesde,f.fechaHasta);this.generationError.set(periodError);if(periodError)return;this.generating.set(true);this.generation.set(null);this.api.generateCampaign(f.planId, { fechaDesde: f.fechaDesde || null, fechaHasta: f.fechaHasta || null, seed: f.seed || null }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: result => { this.generation.set(result); this.generating.set(false); this.load(0); }, error: () => this.generating.set(false) }); }
  badge(state: EstadoCampaniaEncuesta): BadgeVariant { return state === 'EN_PROCESO' ? 'cyan' : state === 'FINALIZADA' ? 'stable' : state === 'CANCELADA' ? 'critical' : state === 'GENERADA' ? 'info' : 'urgent'; }
  progress(row: CampaniaSummary): number { return row.cantidadObjetivo ? Math.min(100, Math.round((row.cantidadSeleccionada / row.cantidadObjetivo) * 100)) : 0; }
}
