import { Pipe, PipeTransform } from '@angular/core';
import { etiquetaEstado } from '../../core/i18n/formato';

/** Shows a technical state or movement type as plain Spanish ("PENDIENTE_AFIP" -> "Pendiente ARCA"). */
@Pipe({ name: 'estado', standalone: true })
export class EstadoPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return etiquetaEstado(valor);
  }
}
