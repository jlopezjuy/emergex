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
});
