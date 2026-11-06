import { describe, it, expect } from 'vitest';
import { tituloParaRuta } from './titulo-ruta';

describe('tituloParaRuta', () => {
  it('devuelve el título del Centro Administrativo para /administracion', () => {
    expect(tituloParaRuta('/administracion')).toEqual({
      titulo: 'Centro Administrativo',
      subtitulo: 'Emergex · Administración',
    });
  });

  it('no confunde /administracion con /admin/global (mismo prefijo)', () => {
    expect(tituloParaRuta('/admin/global')).toEqual({
      titulo: 'Administración Global',
      subtitulo: 'Emergex',
    });
  });

  it('ignora la query string', () => {
    expect(tituloParaRuta('/facturacion?tab=debitos-os&debitoId=2').titulo).toBe('Facturación');
  });

  it('cae al título por defecto para la raíz o una ruta desconocida', () => {
    expect(tituloParaRuta('/')).toEqual({
      titulo: 'Centro de Operaciones',
      subtitulo: 'Emergex · Dashboard operativo',
    });
    expect(tituloParaRuta('/ruta-que-no-existe').titulo).toBe('Centro de Operaciones');
  });

  it('resuelve las rutas administrativas principales', () => {
    expect(tituloParaRuta('/patients').titulo).toBe('Afiliados');
    expect(tituloParaRuta('/cuentas-corrientes').titulo).toBe('Cuentas Corrientes');
    expect(tituloParaRuta('/prefacturacion').titulo).toBe('Prefacturación');
    expect(tituloParaRuta('/obras-sociales').titulo).toBe('Obras Sociales');
  });
});
