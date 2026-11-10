import { Pipe, PipeTransform } from '@angular/core';
import { formatFecha } from '../../core/i18n/formato';

/** Formats an ISO date as "dd/mm/aaaa". Use it for every date shown in a table or document. */
@Pipe({ name: 'fecha', standalone: true })
export class FechaPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatFecha(valor);
  }
}
