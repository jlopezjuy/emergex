import { Account } from '../../core/auth/models/account.model';
import { inicialesDe, nombreDeCuenta } from '../../core/auth/account-display';
import { ScheduleItemDTO } from '../../data-access/api/clinical.api';

/**
 * Datos del profesional que se muestran en el Portal Clínico (cabecera, firma y receta).
 * Salen siempre de la cuenta autenticada: antes eran los de una profesional de ejemplo y se
 * mostraban (e incluso se firmaban) para cualquier usuario clínico (QA-ROL-039).
 */
export interface PerfilClinico {
  nombre: string;
  iniciales: string;
  matricula: string;
  especialidad: string;
  centro: string;
}

export interface KpisDelDia {
  atendidos: number;
  totalHoy: number;
  pendientes: number;
  demoraPromedioMin: number | null;
}

export const SIN_MATRICULA = 'Matrícula no cargada';

export function perfilClinico(cuenta: Account | null): PerfilClinico {
  const prof = cuenta?.profesional;
  const nombreProfesional = [prof?.nombre, prof?.apellido].filter(Boolean).join(' ').trim();
  const nombre = nombreProfesional || nombreDeCuenta(cuenta, 'Profesional');
  const iniciales = inicialesDe(nombre);

  const matricula = prof?.matricula
    ? [prof.tipoMatricula, prof.matricula].filter(Boolean).join(' ')
    : SIN_MATRICULA;

  return {
    nombre,
    iniciales,
    matricula,
    especialidad: prof?.subespecialidades?.[0] ?? '',
    centro: cuenta?.empresa?.nombre ?? '',
  };
}

export function kpisDelDia(agenda: readonly ScheduleItemDTO[], espera: ReadonlyArray<{ wait: number }>): KpisDelDia {
  const atendidos = agenda.filter((s) => s.state === 'past').length;
  const pendientes = agenda.filter((s) => s.state === 'next' || s.state === 'upcoming').length;
  const demora = espera.length > 0 ? Math.round(espera.reduce((acc, p) => acc + p.wait, 0) / espera.length) : null;
  return { atendidos, totalHoy: agenda.length, pendientes, demoraPromedioMin: demora };
}
