export interface GlasgowDTO {
  o: number; // Ocular (1-4)
  v: number; // Verbal (1-5)
  m: number; // Motor (1-6)
}

export interface TriageDTO {
  nivel: 'red' | 'amber' | 'green';
  motivo: string;
}

export interface MedicamentoPrescritoDTO {
  id?: string;
  nombre: string;
  sub: string; // ATC / familia
  dosis: string;
  duracion: string;
  riesgoAlergia?: boolean;
}

export interface EpisodioClinicoDTO {
  id: string;
  pacienteId: number;
  pacienteNombre: string;
  pacienteDni: string;
  pacienteEdad: number;
  pacienteSexo: string;
  cobertura: string;
  grupoSanguineo: string;
  ultimaAtencion?: string;
  tallaPeso: string;
  imc: number;
  imcEstado: string;
  antecedentes: string;
  notas: string;
  avpu: 'A' | 'V' | 'P' | 'U';
  glasgow: GlasgowDTO;
  diagnosticos: Array<{ code: string; l: string }>;
  receta: MedicamentoPrescritoDTO[];
  firmado: boolean;
  firmaProfesional?: string;
  vitals: {
    fc: string;
    ta: string;
    temp: string;
    spo2: string;
    glucemia: string;
    dolor: string;
  };
}
