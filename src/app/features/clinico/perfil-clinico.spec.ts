import { describe, it, expect } from 'vitest';
import { Account } from '../../core/auth/models/account.model';
import { kpisDelDia, perfilClinico } from './perfil-clinico';

const cuenta = (extra: Partial<Account> = {}): Account => ({
  id: 1,
  login: 'qa.profesional',
  email: 'qa@x.com',
  authorities: ['ROLE_PROFESIONAL'],
  firstName: 'Lucía',
  lastName: 'Gómez',
  empresa: { id: 1, nombre: 'SAE' },
  ...extra,
});

describe('perfilClinico (QA-ROL-039)', () => {
  it('usa los datos reales del profesional y nunca la identidad de ejemplo', () => {
    const p = perfilClinico(
      cuenta({ profesional: { id: 9, nombre: 'Lucía', apellido: 'Gómez', matricula: '55.123', tipoMatricula: 'M.P.', subespecialidades: ['Pediatría'] } }),
    );

    expect(p.nombre).toBe('Lucía Gómez');
    expect(p.iniciales).toBe('LG');
    expect(p.matricula).toBe('M.P. 55.123');
    expect(p.especialidad).toBe('Pediatría');
    expect(p.centro).toBe('SAE');
    expect(JSON.stringify(p)).not.toContain('Altieri');
  });

  it('sin ficha profesional cae en el nombre de la cuenta y avisa que falta la matrícula', () => {
    const p = perfilClinico(cuenta());

    expect(p.nombre).toBe('Lucía Gómez');
    expect(p.matricula).toBe('Matrícula no cargada');
    expect(p.especialidad).toBe('');
  });

  it('sin cuenta usa el login o un texto neutro', () => {
    expect(perfilClinico(null).nombre).toBe('Profesional');
    expect(perfilClinico(cuenta({ firstName: undefined, lastName: undefined })).nombre).toBe('qa.profesional');
  });

  it('la matrícula sin tipo se muestra sola', () => {
    const p = perfilClinico(cuenta({ profesional: { id: 9, matricula: '777' } }));
    expect(p.matricula).toBe('777');
  });
});

describe('kpisDelDia', () => {
  it('cuenta atendidos y total a partir de la agenda y promedia la espera real', () => {
    const k = kpisDelDia(
      [
        { turnoId: 1, pacienteId: 1, time: '08:00', name: 'A', sub: '', state: 'past' },
        { turnoId: 2, pacienteId: 2, time: '09:00', name: 'B', sub: '', state: 'past' },
        { turnoId: 3, pacienteId: 3, time: '10:00', name: 'C', sub: '', state: 'next' },
        { turnoId: 4, pacienteId: 4, time: '11:00', name: 'D', sub: '', state: 'upcoming' },
      ],
      [
        { wait: 10 },
        { wait: 20 },
      ],
    );

    expect(k.atendidos).toBe(2);
    expect(k.totalHoy).toBe(4);
    expect(k.pendientes).toBe(2);
    expect(k.demoraPromedioMin).toBe(15);
  });

  it('sin turnos ni espera no inventa números', () => {
    const k = kpisDelDia([], []);
    expect(k).toEqual({ atendidos: 0, totalHoy: 0, pendientes: 0, demoraPromedioMin: null });
  });
});
