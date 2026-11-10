import { DEFAULT_CURRENCY_CODE, LOCALE_ID, Provider } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsAr from '@angular/common/locales/es-AR';

/**
 * Locale unico de la aplicacion.
 *
 * Sin esto Angular formatea con en-US y conviven "$ 0.00" y "$71.293,38" en la misma
 * sesion: en un modulo financiero, dos formatos hacen dudar de cada cifra. Se expone como
 * provider compartido para que los tests formateen igual que produccion.
 */
export const LOCALE_AR = 'es-AR';

registerLocaleData(localeEsAr, LOCALE_AR);

export const LOCALE_AR_PROVIDERS: Provider[] = [
  { provide: LOCALE_ID, useValue: LOCALE_AR },
  { provide: DEFAULT_CURRENCY_CODE, useValue: 'ARS' },
];
