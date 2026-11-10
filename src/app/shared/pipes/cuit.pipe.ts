import { Pipe, PipeTransform } from '@angular/core';
import { formatCuit } from '../../core/i18n/formato';

/** Shows a CUIT as "30-66778899-4". */
@Pipe({ name: 'cuit', standalone: true })
export class CuitPipe implements PipeTransform {
  transform(valor: string | null | undefined): string {
    return formatCuit(valor);
  }
}
