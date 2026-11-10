export interface ParsedTa {
  sistolica?: number;
  diastolica?: number;
}

export interface SignoVitalInput {
  presionSistolica?: number;
  presionDiastolica?: number;
  frecuenciaCardiaca?: number;
  frecuenciaRespiratoria?: number;
  saturacionOxigeno?: number;
  temperatura?: number;
  glucemia?: number;
}

export class VitalSignsUtils {
  static toNumber(value: string | number | undefined | null): number | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (!value.trim()) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  static parseTa(value: string): ParsedTa {
    if (!value || !value.trim()) return {};
    const parts = value.split('/');
    if (parts.length !== 2) {
      throw new Error('Ingresá la presión arterial como sistólica/diastólica. Ej: 120/80');
    }
    const [sistolica, diastolica] = parts.map((part) => this.toNumber(part));
    return { sistolica, diastolica };
  }

  static validarRango(value: number | undefined, min: number, max: number, label: string): void {
    if (value === undefined) return;
    if (value < min || value > max) {
      throw new Error(`${label} fuera de rango (${min}-${max}). Revisá el dato antes de guardar.`);
    }
  }

  static validarSignosVitales(signo: SignoVitalInput): void {
    this.validarRango(signo.presionSistolica, 60, 300, 'PA sistólica');
    this.validarRango(signo.presionDiastolica, 30, 200, 'PA diastólica');
    this.validarRango(signo.frecuenciaCardiaca, 30, 220, 'frecuencia cardíaca');
    this.validarRango(signo.frecuenciaRespiratoria, 8, 60, 'frecuencia respiratoria');
    this.validarRango(signo.saturacionOxigeno, 70, 100, 'SpO₂');
    this.validarRango(signo.temperatura, 30, 45, 'temperatura');
    this.validarRango(signo.glucemia, 20, 600, 'glucemia');
  }

  static vitalColor(value: number | undefined, normalMin: number, normalMax: number): string {
    if (value === undefined) return 'var(--text-muted)';
    if (value >= normalMin && value <= normalMax) return 'var(--accent-emerald)';
    const criticalDelta = (normalMax - normalMin) * 0.3;
    if (value < normalMin - criticalDelta || value > normalMax + criticalDelta) return 'var(--accent-red)';
    return 'var(--accent-amber)';
  }
}
