import { Pipe, PipeTransform } from '@angular/core';
import { formatMoneda } from '../../core/i18n/formato';

/** Formats an amount as "$ 30.500,00". Use it for every amount on screen. */
@Pipe({ name: 'moneda', standalone: true })
export class MonedaPipe implements PipeTransform {
  transform(valor: number | string | null | undefined): string {
    return formatMoneda(valor);
  }
}
