import { DateTime } from 'luxon';

export class DateUtils {
  public static readonly ZONE_AR = 'America/Argentina/Buenos_Aires';

  /**
   * Retorna una instancia de DateTime en la zona horaria de Argentina.
   */
  static now(): DateTime {
    return DateTime.now().setZone(this.ZONE_AR);
  }

  /**
   * Convierte un string ISO o timestamp en DateTime (Argentina).
   */
  static fromISO(iso: string): DateTime {
    if (!iso) return this.now();
    return DateTime.fromISO(iso).setZone(this.ZONE_AR);
  }

  /**
   * Convierte un Date de JS nativo en DateTime (Argentina).
   */
  static fromJSDate(date: Date): DateTime {
    if (!date) return this.now();
    return DateTime.fromJSDate(date).setZone(this.ZONE_AR);
  }

  /**
   * Convierte un DateTime de Luxon en un Date de JS nativo.
   */
  static toJSDate(dt: DateTime): Date {
    return dt.toJSDate();
  }

  /**
   * Formatea una fecha en formato legible estándar.
   */
  static format(date: DateTime | string | Date, formatStr: string = 'dd/MM/yyyy HH:mm'): string {
    if (!date) return '—';
    let dt: DateTime;
    if (date instanceof Date) {
      dt = this.fromJSDate(date);
    } else if (typeof date === 'string') {
      dt = this.fromISO(date);
    } else {
      dt = date;
    }
    return dt.toFormat(formatStr);
  }

  /**
   * Retorna la fecha actual en formato yyyy-MM-dd.
   */
  static todayYmd(): string {
    return this.now().toFormat('yyyy-MM-dd');
  }

  /**
   * Retorna la diferencia en segundos entre dos fechas (A - B).
   */
  static diffInSeconds(dateA: DateTime | string | Date, dateB: DateTime | string | Date): number {
    let dtA = this.toDateTime(dateA);
    let dtB = this.toDateTime(dateB);
    return Math.floor(dtA.diff(dtB, 'seconds').seconds);
  }

  /**
   * Helper privado para forzar conversión a DateTime.
   */
  private static toDateTime(val: DateTime | string | Date): DateTime {
    if (val instanceof Date) {
      return this.fromJSDate(val);
    }
    if (typeof val === 'string') {
      return this.fromISO(val);
    }
    return val;
  }
}
