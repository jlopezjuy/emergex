import { describe, expect, it } from 'vitest';
import { coincidenciaExacta } from './activo-menu';

const MENU = ['/administracion', '/administracion/proveedores', '/administracion/reportes', '/encuestas', '/encuestas/mis-llamadas'];

describe('coincidenciaExacta', () => {
  it('turns off the parent when a more specific menu item is the current page', () => {
    expect(coincidenciaExacta('/administracion', MENU, '/administracion/proveedores')).toBe(true);
    expect(coincidenciaExacta('/administracion', MENU, '/administracion/proveedores/7')).toBe(true);
    expect(coincidenciaExacta('/encuestas', MENU, '/encuestas/mis-llamadas')).toBe(true);
  });

  it('keeps the parent highlighted on its own sub-pages that are not menu items', () => {
    expect(coincidenciaExacta('/encuestas', MENU, '/encuestas/campanias')).toBe(false);
    expect(coincidenciaExacta('/encuestas', MENU, '/encuestas/12/editar')).toBe(false);
  });

  it('uses prefix matching for items without menu children', () => {
    expect(coincidenciaExacta('/administracion/proveedores', MENU, '/administracion/proveedores/7')).toBe(false);
    expect(coincidenciaExacta('/patients', MENU, '/patients/7')).toBe(false);
  });

  it('ignores query strings and fragments in the current url', () => {
    expect(coincidenciaExacta('/administracion', MENU, '/administracion/reportes?desde=2026-01-01#x')).toBe(true);
  });
});
