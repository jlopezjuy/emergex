import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MenuService, IMenuItem } from './menu.service';

describe('MenuService', () => {
  let service: MenuService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MenuService]
    });
    service = TestBed.inject(MenuService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debería agrupar correctamente los ítems de menú en las 4 secciones principales', () => {
    const flatItems: IMenuItem[] = [
      { id: 'dashboard', label: 'Dashboard', title: 'Dashboard', icon: '', route: '/dashboard' },
      { id: 'clinico', label: 'Clínico', title: 'Clínico', icon: '', route: '/clinico' },
      { id: 'patients', label: 'Afiliados', title: 'Afiliados', icon: '', route: '/patients' },
      { id: 'facturacion', label: 'Facturación', title: 'Facturación', icon: '', route: '/facturacion' },
      { id: 'staff', label: 'Personal', title: 'Personal', icon: '', route: '/staff' },
      { id: 'custom-unknown-id', label: 'Desconocido', title: 'Desconocido', icon: '', route: '/unknown' }
    ];

    const grouped: IMenuItem[] = service.groupMenuItems(flatItems);

    expect(grouped.length).toBeGreaterThanOrEqual(4);

    const operacion = grouped.find((g: IMenuItem) => g.id === 'sec-operacion');
    expect(operacion).toBeDefined();
    expect(operacion?.children?.some((child: IMenuItem) => child.id === 'dashboard')).toBe(true);

    const clinica = grouped.find((g: IMenuItem) => g.id === 'sec-clinica');
    expect(clinica).toBeDefined();
    expect(clinica?.children?.some((child: IMenuItem) => child.id === 'clinico')).toBe(true);

    const admin = grouped.find((g: IMenuItem) => g.id === 'sec-administracion');
    expect(admin).toBeDefined();
    expect(admin?.children?.some((child: IMenuItem) => child.id === 'patients')).toBe(true);
    expect(admin?.children?.some((child: IMenuItem) => child.id === 'facturacion')).toBe(true);

    const config = grouped.find((g: IMenuItem) => g.id === 'sec-configuracion');
    expect(config).toBeDefined();
    expect(config?.children?.some((child: IMenuItem) => child.id === 'staff')).toBe(true);

    const otros = grouped.find((g: IMenuItem) => g.id === 'sec-otros');
    expect(otros).toBeDefined();
    expect(otros?.children?.some((child: IMenuItem) => child.id === 'custom-unknown-id')).toBe(true);
  });

  it('agrupa "zonas-tarifas" en Administración, no en Configuración (ADM-UX-014)', () => {
    // zonas-tarifas es lo que desbloquea la bandeja de facturación con excepciones: vivía
    // clasificado por entidad ("es configuración") en lugar de por la tarea que resuelve.
    const items: IMenuItem[] = [
      { id: 'zonas-tarifas', label: 'Zonas y Tarifas', title: 'Zonas y Tarifas', icon: '' },
    ];

    const grouped = service.groupMenuItems(items);

    const admin = grouped.find((g: IMenuItem) => g.id === 'sec-administracion');
    expect(admin?.children?.some((child: IMenuItem) => child.id === 'zonas-tarifas')).toBe(true);

    const config = grouped.find((g: IMenuItem) => g.id === 'sec-configuracion');
    expect(config).toBeUndefined();
  });
});

describe('MenuService — una sola familia de íconos (S10)', () => {
  it('reemplaza los íconos emoji del backend por SVG de trazo', () => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [MenuService] });
    const service = TestBed.inject(MenuService);
    const items: IMenuItem[] = [
      { id: 'facturacion', label: 'Facturación', title: 'Facturación', icon: '🧾', route: '/facturacion' },
      { id: 'compras', label: 'Compras', title: 'Compras', icon: '🛒', route: '/compras' },
      { id: 'id-desconocido', label: 'Otro', title: 'Otro', icon: '📦', route: '/otro' },
    ];

    const hijos = service.groupMenuItems(items).flatMap((s) => s.children ?? []);

    expect(hijos.length).toBe(3);
    for (const hijo of hijos) {
      expect(hijo.icon.startsWith('<svg')).toBe(true);
      expect(/\p{Extended_Pictographic}/u.test(hijo.icon)).toBe(false);
    }
  });

  it('conserva un ícono que ya es SVG', () => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule], providers: [MenuService] });
    const service = TestBed.inject(MenuService);
    const svg = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/></svg>';
    const hijos = service
      .groupMenuItems([{ id: 'zz-x', label: 'X', title: 'X', icon: svg }])
      .flatMap((s) => s.children ?? []);
    expect(hijos[0].icon).toBe(svg);
  });
});
