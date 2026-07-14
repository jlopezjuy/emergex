import { Component, input, output } from '@angular/core';
import { PreguntaEncuestaDetalle, RespuestaItem } from '../../../data-access/dto/survey.dto';

export type AnswerDraft = RespuestaItem;

export function emptyAnswer(questionId: number): AnswerDraft {
  return { preguntaId: questionId, valorTexto: null, valorNumerico: null, valorBooleano: null, valorFecha: null, noAplica: false, observacion: null, opcionIds: [] };
}

function isEmpty(answer: AnswerDraft): boolean {
  return !answer.noAplica && !answer.valorTexto?.trim() && (answer.valorNumerico === null || answer.valorNumerico === undefined) &&
    (answer.valorBooleano === null || answer.valorBooleano === undefined) && !answer.valorFecha && answer.opcionIds.length === 0;
}

export function validateSurveyAnswer(question: PreguntaEncuestaDetalle, answer: AnswerDraft): string | null {
  if (answer.noAplica) return question.permiteNoAplica ? null : 'Esta pregunta no admite “No aplica”.';
  if (question.obligatoria && isEmpty(answer)) return 'Esta pregunta es obligatoria.';
  if (isEmpty(answer)) return null;
  if (question.tipoRespuesta === 'NPS' && (answer.valorNumerico === null || answer.valorNumerico === undefined || answer.valorNumerico < 0 || answer.valorNumerico > 10)) return 'El NPS debe estar entre 0 y 10.';
  if ((question.tipoRespuesta === 'ESCALA' || question.tipoRespuesta === 'NUMERICA') && answer.valorNumerico !== null && answer.valorNumerico !== undefined) {
    const min = question.valorMinimo; const max = question.valorMaximo;
    if ((min !== null && min !== undefined && answer.valorNumerico < min) || (max !== null && max !== undefined && answer.valorNumerico > max)) return `El valor debe estar entre ${min ?? '−∞'} y ${max ?? '+∞'}.`;
  }
  if (question.tipoRespuesta === 'SELECCION_UNICA' && answer.opcionIds.length > 1) return 'Seleccione una sola opción.';
  return null;
}

@Component({
  selector: 'app-survey-question', standalone: true,
  template: `<fieldset class="question" [attr.aria-describedby]="error() ? 'question-error-'+question().id : null"><legend><span>{{question().orden}}.</span> {{question().texto}} @if(question().obligatoria){<span class="required" aria-label="obligatoria">*</span>}</legend>@if(question().descripcionAyuda){<p class="help">{{question().descripcionAyuda}}</p>}
  @if(answer().noAplica){<div class="na">Respuesta marcada como “No aplica”.</div>}@else{@switch(question().tipoRespuesta){
    @case('TEXTO_CORTO'){<input [id]="'answer-'+question().id" class="input" type="text" [attr.aria-label]="question().texto" [disabled]="disabled()" [value]="answer().valorTexto??''" maxlength="1000" (input)="setText($event)"/>}
    @case('TEXTO_LARGO'){<textarea [id]="'answer-'+question().id" class="input" rows="4" maxlength="5000" [attr.aria-label]="question().texto" [disabled]="disabled()" [value]="answer().valorTexto??''" (input)="setText($event)"></textarea>}
    @case('NUMERICA'){<input [id]="'answer-'+question().id" class="input" type="number" [attr.aria-label]="question().texto" [disabled]="disabled()" [min]="question().valorMinimo??null" [max]="question().valorMaximo??null" [value]="answer().valorNumerico??''" (input)="setNumber($event)"/>}
    @case('FECHA'){<input [id]="'answer-'+question().id" class="input" type="date" [attr.aria-label]="question().texto" [disabled]="disabled()" [value]="answer().valorFecha??''" (input)="setDate($event)"/>}
    @case('SI_NO'){<div class="choice-row" role="radiogroup" [attr.aria-label]="question().texto"><label class="scale-choice"><input type="radio" [disabled]="disabled()" [name]="'question-'+question().id" value="true" [checked]="answer().valorBooleano===true" (change)="setBoolean(true)"/><span>Sí</span></label><label class="scale-choice"><input type="radio" [disabled]="disabled()" [name]="'question-'+question().id" value="false" [checked]="answer().valorBooleano===false" (change)="setBoolean(false)"/><span>No</span></label></div>}
    @case('NPS'){<div class="scale" role="radiogroup" aria-label="Escala NPS de 0 a 10">@for(value of npsValues;track value){<label class="scale-choice"><input type="radio" [disabled]="disabled()" [name]="'question-'+question().id" [value]="value" [checked]="answer().valorNumerico===value" (change)="setNumericValue(value)"/><span>{{value}}</span></label>}</div><div class="scale-labels"><span>Nada probable</span><span>Muy probable</span></div>}
    @case('ESCALA'){<div class="scale" role="radiogroup" [attr.aria-label]="question().texto">@for(value of scaleValues();track value){<label class="scale-choice"><input type="radio" [disabled]="disabled()" [name]="'question-'+question().id" [value]="value" [checked]="answer().valorNumerico===value" (change)="setNumericValue(value)"/><span>{{value}}</span></label>}</div><div class="scale-labels"><span>{{question().etiquetaMinima}}</span><span>{{question().etiquetaMaxima}}</span></div>}
    @case('SELECCION_UNICA'){<div class="options" role="radiogroup" [attr.aria-label]="question().texto">@for(option of question().opciones;track option.id){<label><input type="radio" [disabled]="disabled()" [name]="'question-'+question().id" [checked]="answer().opcionIds[0]===option.id" (change)="selectOne(option.id)"/>{{option.texto}}</label>}</div>}
    @case('SELECCION_MULTIPLE'){<div class="options">@for(option of question().opciones;track option.id){<label><input type="checkbox" [disabled]="disabled()" [checked]="answer().opcionIds.includes(option.id)" (change)="toggleOption(option.id)"/>{{option.texto}}</label>}</div>}
  }}
  @if(question().permiteNoAplica){<label class="no-apply"><input type="checkbox" [disabled]="disabled()" [checked]="answer().noAplica" (change)="toggleNoApply()"/> No aplica</label>}
  <label class="observation">Observación opcional<textarea class="input" rows="2" [disabled]="disabled()" [value]="answer().observacion??''" (input)="setObservation($event)"></textarea></label>
  @if(error()){<p class="error" role="alert" [id]="'question-error-'+question().id">{{error()}}</p>}
  </fieldset>`,
  styles:[`.question{border:1px solid var(--border-glass);border-radius:var(--r-panel);padding:14px;background:var(--surface-inset)}legend{font-size:14px;font-weight:600;color:var(--text-primary);padding:0 4px}.required,.error{color:var(--error-text)}.help,.scale-labels{color:var(--text-muted);font-size:11px}.input{width:100%;padding:8px 10px;border:1px solid var(--border-glass);border-radius:var(--r-btn);background:var(--bg-elevated);color:var(--text-primary)}.choice-row,.scale{display:flex;gap:6px;flex-wrap:wrap}.scale-choice{position:relative}.scale-choice input{position:absolute;opacity:0}.scale-choice span{display:grid;place-items:center;min-width:38px;min-height:38px;padding:0 8px;border:1px solid var(--border-glass);border-radius:8px;background:var(--surface-glass);color:var(--text-primary)}.scale-choice input:checked+span{background:var(--accent-blue);color:white;border-color:var(--accent-blue)}.scale-choice input:focus-visible+span{outline:2px solid var(--accent-blue);outline-offset:2px}.scale-choice input:disabled+span{opacity:.55;cursor:not-allowed}.scale-labels{display:flex;justify-content:space-between;margin-top:5px}.options{display:flex;flex-direction:column;gap:8px}.options label,.no-apply{display:flex;gap:8px;align-items:center;min-height:32px;color:var(--text-secondary)}.no-apply{margin-top:10px}.observation{display:flex;flex-direction:column;gap:4px;margin-top:10px;color:var(--text-muted);font-size:11px}.error{font-size:11px;margin-bottom:0}.na{padding:8px;background:var(--accent-blue-dim);color:var(--accent-blue);border-radius:8px}`],
})
export class SurveyQuestionComponent {
  readonly question = input.required<PreguntaEncuestaDetalle>(); readonly answer = input.required<AnswerDraft>(); readonly disabled = input(false); readonly error = input<string|null>(null); readonly answerChange = output<AnswerDraft>(); readonly npsValues=Array.from({length:11},(_,index)=>index);
  scaleValues():number[]{const min=this.question().valorMinimo??1;const max=this.question().valorMaximo??5;return Array.from({length:Math.max(0,max-min+1)},(_,index)=>min+index);}
  setText(event:Event):void{this.emit({valorTexto:(event.target as HTMLInputElement).value});} setNumber(event:Event):void{const value=(event.target as HTMLInputElement).value;this.emit({valorNumerico:value===''?null:Number(value)});} setDate(event:Event):void{this.emit({valorFecha:(event.target as HTMLInputElement).value||null});} setBoolean(value:boolean):void{this.emit({valorBooleano:value});} setNumericValue(value:number):void{this.emit({valorNumerico:value});}
  selectOne(id:number):void{this.emit({opcionIds:[id]});} toggleOption(id:number):void{const ids=this.answer().opcionIds;this.emit({opcionIds:ids.includes(id)?ids.filter(value=>value!==id):[...ids,id]});} toggleNoApply():void{const noAplica=!this.answer().noAplica;this.answerChange.emit(noAplica?{...emptyAnswer(this.question().id),noAplica:true}:{...this.answer(),noAplica:false});} setObservation(event:Event):void{this.emit({observacion:(event.target as HTMLTextAreaElement).value||null});}
  private emit(patch:Partial<AnswerDraft>):void{this.answerChange.emit({...this.answer(),...patch,noAplica:false});}
}
