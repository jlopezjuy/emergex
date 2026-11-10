import { DateUtils } from '../../core/utils/date.utils';

export function localDateYmd(date?: Date): string {
  if (date) {
    return DateUtils.fromJSDate(date).toFormat('yyyy-MM-dd');
  }
  return DateUtils.todayYmd();
}

export function addDaysLocalYmd(days: number, from?: Date): string {
  const dt = from ? DateUtils.fromJSDate(from) : DateUtils.now();
  return dt.plus({ days }).toFormat('yyyy-MM-dd');
}
