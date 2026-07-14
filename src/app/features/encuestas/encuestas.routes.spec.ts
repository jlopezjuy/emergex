import { describe, expect, it } from 'vitest';
import { ENCUESTAS_ROUTES } from './encuestas.routes';

describe('ENCUESTAS_ROUTES', () => {
  it('declara administración y operación antes de la ruta dinámica', () => {
    const shell = ENCUESTAS_ROUTES[0];
    const paths = shell.children?.map(route => route.path) ?? [];
    expect(paths).toContain('planes');
    expect(paths).toContain('campanias');
    expect(paths).toContain('mis-llamadas');
    expect(paths.indexOf('mis-llamadas')).toBeLessThan(paths.indexOf(':id'));
  });

  it('protege todas las pantallas funcionales con guards', () => {
    const children = ENCUESTAS_ROUTES[0].children ?? [];
    expect(children.filter(route => route.path !== '').every(route => (route.canActivate?.length ?? 0) > 0)).toBe(true);
  });
});
