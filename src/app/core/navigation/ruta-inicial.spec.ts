import { describe, it, expect, vi } from 'vitest';
import { rutaInicialParaRoles } from './ruta-inicial';

describe('rutaInicialParaRoles', () => {
  it('aterriza al Centro Administrativo cuando el rol es administrativo', () => {
    const hasAnyRole = vi.fn().mockReturnValue(true);
    expect(rutaInicialParaRoles(hasAnyRole)).toBe('/administracion');
  });

  it('aterriza al dashboard operativo para el resto de los roles', () => {
    const hasAnyRole = vi.fn().mockReturnValue(false);
    expect(rutaInicialParaRoles(hasAnyRole)).toBe('/dashboard');
  });

  it('consulta los mismos 4 roles administrativos que la ruta raíz', () => {
    const hasAnyRole = vi.fn().mockReturnValue(false);
    rutaInicialParaRoles(hasAnyRole);
    expect(hasAnyRole).toHaveBeenCalledWith(['ROLE_ADMIN', 'ROLE_PROPIETARIO', 'ROLE_ADMINISTRADOR', 'ROLE_CONTADOR']);
  });
});
