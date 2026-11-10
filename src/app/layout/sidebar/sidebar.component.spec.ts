import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SidebarComponent } from './sidebar.component';
import { ThemeService } from '../../core/theme/theme.service';
import { FleetStore } from '../../core/stores/fleet.store';
import { MenuService, IMenuItem } from '../../core/menu/menu.service';
import { AuthService } from '../../core/auth/auth.service';
import { Account } from '../../core/auth/models/account.model';
import { SessionStore } from '../../core/stores/session.store';
import { provideRouter, Router } from '@angular/router';
import { Component, signal } from '@angular/core';
import { of } from 'rxjs';

describe('SidebarComponent', () => {
  let component: SidebarComponent;
  let fixture: ComponentFixture<SidebarComponent>;
  let menuServiceMock: { getMenu: ReturnType<typeof vi.fn>; groupMenuItems: ReturnType<typeof vi.fn> };
  let authServiceMock: { currentAccount: ReturnType<typeof signal> };
  let sessionStoreMock: { hasAnyRole: ReturnType<typeof vi.fn> };

  const rawMenu: IMenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', title: 'Dashboard', icon: '', route: '/dashboard' },
    { id: 'patients', label: 'Afiliados', title: 'Afiliados', icon: '', route: '/patients' }
  ];

  beforeEach(async () => {
    menuServiceMock = {
      getMenu: vi.fn().mockReturnValue(of(rawMenu)),
      groupMenuItems: vi.fn().mockImplementation((items: IMenuItem[]) => [
        {
          id: 'sec-operacion',
          label: 'Operación',
          title: 'Operación',
          icon: '',
          children: items.filter((i) => i.id === 'dashboard')
        },
        {
          id: 'sec-administracion',
          label: 'Administración',
          title: 'Administración',
          icon: '',
          children: items.filter((i) => i.id === 'patients')
        }
      ])
    };

    authServiceMock = {
      currentAccount: signal({ id: 1, login: 'admin' } as unknown as Account)
    };

    sessionStoreMock = {
      hasAnyRole: vi.fn().mockReturnValue(true)
    };

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        { provide: ThemeService, useValue: { toggleTheme: vi.fn(), theme: signal('dark') } },
        { provide: FleetStore, useValue: { ambulances: signal([]) } },
        { provide: MenuService, useValue: menuServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: SessionStore, useValue: sessionStoreMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería agrupar los ítems de menú obtenidos en secciones', () => {
    expect(menuServiceMock.groupMenuItems).toHaveBeenCalled();
    const grouped = component.groupedItems();
    expect(grouped.length).toBe(2);
    expect(grouped[0].id).toBe('sec-operacion');
  });
  it('debería permitir colapsar y expandir secciones individualmente', () => {
    expect(component.isSectionExpanded('sec-operacion')).toBe(true);

    component.toggleSection('sec-operacion');
    expect(component.isSectionExpanded('sec-operacion')).toBe(false);

    component.toggleSection('sec-operacion');
    expect(component.isSectionExpanded('sec-operacion')).toBe(true);
  });

  it('debería verificar los roles ROLE_ADMIN, ROLE_ADMINISTRADOR, ROLE_PROPIETARIO y ROLE_CONTADOR para el menú de Tesorería', () => {
    expect(sessionStoreMock.hasAnyRole).toHaveBeenCalledWith(['ROLE_ADMIN', 'ROLE_ADMINISTRADOR', 'ROLE_PROPIETARIO', 'ROLE_CONTADOR']);
  });
});

@Component({ standalone: true, template: '' })
class PaginaVaciaComponent {}

describe('SidebarComponent — ítem activo único e íconos (S6, S10)', () => {
  async function montarEn(url: string) {
    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([
          { path: 'administracion', component: PaginaVaciaComponent },
          { path: 'administracion/proveedores', component: PaginaVaciaComponent },
          { path: 'administracion/proveedores/:id', component: PaginaVaciaComponent },
          { path: 'administracion/reportes', component: PaginaVaciaComponent },
          { path: '**', component: PaginaVaciaComponent },
        ]),
        { provide: ThemeService, useValue: { toggleTheme: vi.fn(), theme: signal('dark') } },
        { provide: FleetStore, useValue: { ambulances: signal([]) } },
        {
          provide: MenuService,
          useValue: {
            getMenu: vi.fn().mockReturnValue(of([])),
            groupMenuItems: (items: IMenuItem[]) => [
              { id: 'sec-administracion', label: 'Administración', title: 'Administración', icon: '', children: items },
            ],
          },
        },
        { provide: AuthService, useValue: { currentAccount: signal({ id: 1, login: 'conta' } as unknown as Account) } },
        { provide: SessionStore, useValue: { hasAnyRole: (roles: string[]) => roles.includes('ROLE_CONTADOR') } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function activos(fixture: Awaited<ReturnType<typeof montarEn>>): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('aside .flex-1 a.nav-active') as NodeListOf<HTMLElement>)
      .map((a) => a.getAttribute('title') ?? '');
  }

  it('en /administracion/proveedores marca sólo Proveedores, no el Centro Administrativo', async () => {
    const fixture = await montarEn('/administracion/proveedores');
    expect(activos(fixture)).toEqual(['Catálogo de Proveedores']);
  });

  it('en la ficha de un proveedor sigue marcando Proveedores', async () => {
    const fixture = await montarEn('/administracion/proveedores/7');
    expect(activos(fixture)).toEqual(['Catálogo de Proveedores']);
  });

  it('en /administracion marca sólo el Centro Administrativo', async () => {
    const fixture = await montarEn('/administracion');
    expect(activos(fixture)).toEqual(['Centro Administrativo y Bandejas']);
  });

  it('no usa emoji en los íconos del menú', async () => {
    const fixture = await montarEn('/administracion');
    expect(/\p{Extended_Pictographic}/u.test(fixture.nativeElement.textContent as string)).toBe(false);
  });
});
