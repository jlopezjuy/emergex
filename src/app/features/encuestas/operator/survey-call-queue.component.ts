import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SurveyOperatorApiService } from '../../../data-access/api/survey-operator.api';
import { ContactoSummary, EstadoContactoEncuesta, surveyLabels } from '../../../data-access/dto/survey.dto';
import { DateUtils } from '../../../core/utils/date.utils';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { StatusBadgeComponent, BadgeVariant } from '../../../shared/components/status-badge/status-badge.component';

@Component({selector:'app-survey-call-queue',standalone:true,imports:[FormsModule,RouterLink,LoadingStateComponent,EmptyStateComponent,ErrorStateComponent,StatusBadgeComponent],templateUrl:'./survey-call-queue.component.html',styleUrls:['../survey-feature.css','./survey-call-queue.component.css']})
export class SurveyCallQueueComponent implements OnInit{
 private readonly api=inject(SurveyOperatorApiService);private readonly router=inject(Router);private readonly destroyRef=inject(DestroyRef);readonly rows=signal<ContactoSummary[]>([]);readonly loading=signal(false);readonly assigning=signal<number|null>(null);readonly error=signal<string|null>(null);readonly query=signal('');readonly state=signal<EstadoContactoEncuesta|''>('');readonly page=signal(0);readonly total=signal(0);readonly totalPages=signal(1);readonly labels=surveyLabels;
 readonly visible=computed(()=>{const q=this.query().trim().toLowerCase();return this.rows().filter(row=>(!q||row.nombre.toLowerCase().includes(q)||row.telefono.includes(q))&&(!this.state()||row.estado===this.state()));});
 readonly reprogrammedCount=computed(()=>this.rows().filter(row=>row.estado==='REPROGRAMADO').length);
 ngOnInit():void{this.load();}
 load(page=this.page()):void{this.loading.set(true);this.error.set(null);this.api.pending(page,20).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:r=>{this.rows.set(r.data);this.total.set(r.total);this.totalPages.set(r.totalPages);this.page.set(page);this.loading.set(false);},error:()=>{this.error.set('No se pudo cargar la bandeja operativa.');this.loading.set(false);}});}
 assign(row:ContactoSummary):void{this.assigning.set(row.id);this.api.assign(row.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({next:()=>{this.assigning.set(null);void this.router.navigate(['/encuestas/contactos',row.id]);},error:()=>this.assigning.set(null)});}
 date(value?:string|null):string{return value?DateUtils.format(value):'Sin programación';} badge(state:EstadoContactoEncuesta):BadgeVariant{return state==='REPROGRAMADO'?'urgent':state==='EN_PROCESO'?'cyan':state==='COMPLETADO'?'stable':'info';}
}
