import { Injectable, computed, signal } from '@angular/core';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { DateTime } from 'luxon';
import { DateUtils } from '../utils/date.utils';

export type FeedbackType = 'info' | 'success' | 'warning' | 'error';

export interface FeedbackToast {
  id: string;
  type: FeedbackType;
  title: string;
  message: string;
  createdAt: DateTime;
  ttlMs: number;
}

@Injectable({ providedIn: 'root' })
export class UserFeedbackService {
  private readonly _toasts = signal<FeedbackToast[]>([]);
  readonly toasts = this._toasts.asReadonly();
  readonly hasToasts = computed(() => this._toasts().length > 0);

  push(input: {
    type?: FeedbackType;
    title: string;
    message: string;
    ttlMs?: number;
  }): void {
    const toast: FeedbackToast = {
      id: crypto.randomUUID(),
      type: input.type ?? 'info',
      title: input.title,
      message: input.message,
      createdAt: DateUtils.now(),
      ttlMs: input.ttlMs ?? this.defaultTtl(input.type ?? 'info'),
    };

    this._toasts.update(list => [toast, ...list].slice(0, 6));
    window.setTimeout(() => this.dismiss(toast.id), toast.ttlMs);
  }

  dismiss(id: string): void {
    this._toasts.update(list => list.filter(t => t.id !== id));
  }

  fromResponseHeaders(headers: HttpHeaders, status: number): void {
    const alertHeader = this.findHeaderValue(headers, '-alert');
    if (!alertHeader) return;

    const params = this.findHeaderValue(headers, '-params');
    const msg = params ? `${this.humanize(alertHeader)} · ${params}` : this.humanize(alertHeader);

    this.push({
      type: status >= 200 && status < 300 ? 'success' : 'info',
      title: status >= 200 && status < 300 ? 'Operación exitosa' : 'Información',
      message: msg,
    });
  }

  fromHttpError(error: HttpErrorResponse): void {
    if (error.status === 401 || error.status === 403) return;

    const backendHeaderError = this.findHeaderValue(error.headers, '-error');
    const backendHeaderAlert = this.findHeaderValue(error.headers, '-alert');
    const body = error.error;

    const fieldErrors = Array.isArray(body?.fieldErrors) ? body.fieldErrors : [];
    if (fieldErrors.length > 0) {
      this.push({
        type: 'warning',
        title: 'Validación',
        message: this.buildValidationMessage(fieldErrors),
        ttlMs: 8000,
      });
      return;
    }

    const semanticMessage = this.mapProblemMessage(body?.message ?? body?.properties?.message, body?.params ?? body?.properties?.params);
    const message =
      semanticMessage ||
      backendHeaderError ||
      backendHeaderAlert ||
      (typeof body?.detail === 'string' && body.detail !== 'null' ? body.detail : null) ||
      body?.title ||
      body?.message ||
      error.message ||
      'Ocurrió un error inesperado';

    this.push({
      type: this.mapErrorType(error.status),
      title: this.mapErrorTitle(error.status),
      message: this.humanize(message),
    });
  }

  private findHeaderValue(headers: HttpHeaders | null, suffix: '-alert' | '-error' | '-params'): string | null {
    if (!headers) return null;
    const key = headers.keys().find(h => h.toLowerCase().endsWith(suffix));
    return key ? headers.get(key) : null;
  }

  private mapErrorType(status: number): FeedbackType {
    if (status === 400 || status === 422) return 'warning';
    if (status === 404) return 'info';
    return 'error';
  }

  private mapErrorTitle(status: number): string {
    if (status === 400 || status === 422) return 'Validación';
    if (status === 404) return 'No encontrado';
    if (status >= 500) return 'Error de servidor';
    return 'Error';
  }

  private defaultTtl(type: FeedbackType): number {
    if (type === 'error') return 7000;
    if (type === 'warning') return 6000;
    return 4500;
  }

  private humanize(value: string): string {
    return value
      .replace(/^error\./i, '')
      .replace(/[._-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private mapProblemMessage(code?: string, params?: string): string | null {
    const key = String(code ?? '').trim();
    if (!key) return null;

    const map: Record<string, string> = {
      'error.dniDuplicado': 'Ya existe un afiliado o paciente con ese DNI en esta empresa.',
      'error.dniDuplicadoInstitucional': 'Ese DNI ya existe como beneficiario institucional activo en esta empresa.',
      'error.dniDuplicadoGrupo': 'Hay DNI repetidos dentro del grupo familiar cargado.',
      'error.planNotFound': 'El plan comercial seleccionado no está disponible.',
      'error.sujetoRequerido': 'Debés informar un paciente o una persona asistida transitoria antes de continuar.',
    };

    if (map[key]) return map[key];
    if (key === 'error.dniDuplicado' && params === 'paciente') return 'Ya existe un afiliado o paciente con ese DNI en esta empresa.';
    return null;
  }

  private buildValidationMessage(fieldErrors: Array<{ field?: string; message?: string }>): string {
    const maxItems = 3;
    const items = fieldErrors.slice(0, maxItems).map(e => {
      const label = this.fieldLabel(e.field ?? '');
      return `${label}: ${e.message ?? 'valor inválido'}`;
    });
    const extra = fieldErrors.length > maxItems ? ` (+${fieldErrors.length - maxItems} más)` : '';
    return `Revisá estos campos: ${items.join(' · ')}${extra}`;
  }

  private fieldLabel(field: string): string {
    const map: Record<string, string> = {
      saturacionOxigeno: 'SatO₂',
      presionSistolica: 'Presión sistólica',
      presionDiastolica: 'Presión diastólica',
      frecuenciaCardiaca: 'Frecuencia cardíaca',
      frecuenciaRespiratoria: 'Frecuencia respiratoria',
      temperatura: 'Temperatura',
      glucemia: 'Glucemia',
      glasgowOcular: 'Glasgow ocular',
      glasgowVerbal: 'Glasgow verbal',
      glasgowMotor: 'Glasgow motor',
      glasgowTotal: 'Glasgow total',
      ta: 'Tensión arterial',
      fc: 'Frecuencia cardíaca',
      fr: 'Frecuencia respiratoria',
      satO2: 'SatO₂',
      temp: 'Temperatura',
    };
    return map[field] ?? this.humanize(field || 'campo');
  }
}
