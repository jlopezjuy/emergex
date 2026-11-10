import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { SurveyAdminApiService } from '../../../data-access/api/survey-admin.api';
import { CampaniaEncuestaDetalle, ContactoCampaniaResumen, EstadoCampaniaEncuesta, EstadoContactoEncuesta, MetricasCampania, surveyLabels } from '../../../data-access/dto/survey.dto';
import { DateUtils } from '../../../core/utils/date.utils';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent, BadgeVariant } from '../../../shared/components/status-badge/status-badge.component';
import { canFinishSurveyCampaign, isSurveyContactOperable } from '../survey-rules';

@Component({ selector: 'app-survey-campaign-detail', standalone: true, imports: [ReactiveFormsModule, RouterLink, LoadingStateComponent, EmptyStateComponent, ErrorStateComponent, StatusBadgeComponent], templateUrl: './survey-campaign-detail.component.html', styleUrl: '../survey-feature.css' })
export class SurveyCampaignDetailComponent implements OnInit {
  private readonly api = inject(SurveyAdminApiService); private readonly route = inject(ActivatedRoute); private readonly fb = inject(FormBuilder); private readonly destroyRef = inject(DestroyRef);
  readonly detail = signal<CampaniaEncuestaDetalle | null>(null); readonly metrics = signal<MetricasCampania | null>(null); readonly contacts = signal<ContactoCampaniaResumen[]>([]);
  readonly loading = signal(true); readonly loadingContacts = signal(false); readonly changing = signal(false); readonly error = signal<string | null>(null); readonly confirmCancel = signal(false);
  readonly page = signal(0); readonly total = signal(0); readonly totalPages = signal(1); readonly labels = surveyLabels;
  readonly states: EstadoContactoEncuesta[] = ['PENDIENTE','ASIGNADO','EN_PROCESO','COMPLETADO','SIN_RESPUESTA','RECHAZADO','REPROGRAMADO','TELEFONO_INVALIDO','NO_DESEA_PARTICIPAR','CANCELADO'];
  readonly filters = this.fb.nonNullable.group({ estado: ['' as EstadoContactoEncuesta | ''], texto: [''], asignado: ['' as ''|'true'|'false'], reprogramado: [false] });
  readonly progress = computed(() => { const d=this.detail(); return d?.cantidadSeleccionada ? Math.round((d.completados/d.cantidadSeleccionada)*100) : 0; });
  readonly canFinish = computed(() => { const campaign=this.detail(); return !!campaign&&canFinishSurveyCampaign(campaign.estado,campaign.pendientes); });
  ngOnInit(): void { this.load(); }
  load(): void { const id=Number(this.route.snapshot.paramMap.get('id')); if(!id){this.error.set('Campaña inválida.');this.loading.set(false);return;} this.loading.set(true); forkJoin({detail:this.api.campaignDetail(id),metrics:this.api.campaignMetrics(id)}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:r=>{this.detail.set(r.detail);this.metrics.set(r.metrics);this.loading.set(false);this.loadContacts(0);},error:()=>{this.error.set('No se pudo cargar la campaña.');this.loading.set(false);}}); }
  loadContacts(page=this.page()):void{const id=this.detail()?.id;if(!id)return;const f=this.filters.getRawValue();this.loadingContacts.set(true);this.api.campaignContacts(id,{page,size:20,sort:'prioridad,desc',estado:f.estado||undefined,texto:f.texto.trim()||undefined,asignado:f.asignado===''?undefined:f.asignado==='true',reprogramado:f.reprogramado||undefined}).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:r=>{this.contacts.set(r.data);this.total.set(r.total);this.totalPages.set(r.totalPages);this.page.set(page);this.loadingContacts.set(false);},error:()=>this.loadingContacts.set(false)});}
  change(action:'start'|'finish'|'cancel'):void{const id=this.detail()?.id;if(!id||this.changing()||(action==='finish'&&!this.canFinish()))return;this.changing.set(true);const request=action==='start'?this.api.startCampaign(id):action==='finish'?this.api.finishCampaign(id):this.api.cancelCampaign(id);request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:()=>{this.changing.set(false);this.confirmCancel.set(false);this.load();},error:()=>this.changing.set(false)});}
  contactBadge(state:EstadoContactoEncuesta):BadgeVariant{return state==='COMPLETADO'?'stable':state==='RECHAZADO'||state==='TELEFONO_INVALIDO'||state==='NO_DESEA_PARTICIPAR'?'critical':state==='REPROGRAMADO'?'urgent':state==='EN_PROCESO'?'cyan':'info';}
  campaignBadge(state:EstadoCampaniaEncuesta):BadgeVariant{return state==='EN_PROCESO'?'cyan':state==='FINALIZADA'?'stable':state==='CANCELADA'?'critical':'info';}
  canManageContact(state:EstadoContactoEncuesta):boolean{return this.detail()?.estado==='EN_PROCESO'&&isSurveyContactOperable(state);}
  date(value?:string|null):string{return value?DateUtils.format(value):'—';}
}
