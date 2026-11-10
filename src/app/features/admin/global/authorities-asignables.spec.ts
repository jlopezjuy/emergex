import { describe, it, expect } from 'vitest';
import { AUTHORITIES_ASIGNABLES, authoritiesParaEnviar, authoritiesSeleccionadas } from './authorities-asignables';

describe('authorities asignables desde Admin global (QA-ROL-001/003)', () => {
  it('ofrece los 9 permisos funcionales y nunca ROLE_ADMIN, ROLE_USER ni los huérfanos', () => {
    const nombres = AUTHORITIES_ASIGNABLES.map((a) => a.authority);
    expect(nombres).toEqual(
      expect.arrayContaining([
        'ROLE_PROPIETARIO',
        'ROLE_ADMINISTRADOR',
        'ROLE_CONTADOR',
        'ROLE_AUDITOR',
        'ROLE_DESPACHANTE',
        'ROLE_OPERADOR',
        'ROLE_PROFESIONAL',
        'ROLE_MEDICO_CAMPO',
        'ROLE_CHOFER',
      ]),
    );
    expect(nombres).toHaveLength(9);
    expect(nombres).not.toContain('ROLE_ADMIN');
    expect(nombres).not.toContain('ROLE_USER');
    expect(nombres).not.toContain('ROLE_FACTURISTA');
  });

  it('siempre envía ROLE_USER, para que una selección vacía no signifique "sin cambios" en el backend', () => {
    expect(authoritiesParaEnviar(new Set())).toEqual(['ROLE_USER']);
  });

  it('envía ROLE_USER más lo seleccionado, sin duplicados', () => {
    expect(authoritiesParaEnviar(new Set(['ROLE_CONTADOR', 'ROLE_AUDITOR']))).toEqual(
      expect.arrayContaining(['ROLE_USER', 'ROLE_CONTADOR', 'ROLE_AUDITOR']),
    );
    expect(authoritiesParaEnviar(new Set(['ROLE_CONTADOR']))).toHaveLength(2);
  });

  it('al editar preselecciona sólo las asignables que el usuario ya tiene', () => {
    const sel = authoritiesSeleccionadas(['ROLE_USER', 'ROLE_AUDITOR', 'ROLE_ADMIN']);
    expect([...sel]).toEqual(['ROLE_AUDITOR']);
  });
});
