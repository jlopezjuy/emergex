import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProveedoresComponent } from './proveedores.component';
import { TercerosApiService } from '../../../data-access/api/terceros.api';
import { SessionStore } from '../../../core/stores/session.store';
import { of } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';

describe('ProveedoresComponent', () => {
  let component: ProveedoresComponent;
  let fixture: ComponentFixture<ProveedoresComponent>;
  let tercerosApiMock: { getPage: ReturnType<typeof vi.fn>; buscar: ReturnType<typeof vi.fn>; registrarTercero: ReturnType<typeof vi.fn> };
  let sessionStoreMock: { hasAnyRole: ReturnType<typeof vi.fn>; isAdmin: () => boolean };

  beforeEach(async () => {
    tercerosApiMock = {
      getPage: vi.fn().mockReturnValue(of({
        data: [{ id: 1, razonSocial: 'Proveedor Uno SA', cuit: '30-11111111-9', nombreComercial: 'Prov Uno' }],
        total: 1,
        page: 0,
        size: 10,
        totalPages: 1
      })),
      buscar: vi.fn().mockReturnValue(of([
        { id: 1, razonSocial: 'Proveedor Uno SA', cuit: '30-11111111-9', nombreComercial: 'Prov Uno' }
      ])),
      registrarTercero: vi.fn().mockReturnValue(of({ id: 2, razonSocialCanonica: 'Nuevo Proveedor' }))
    };

    sessionStoreMock = {
      hasAnyRole: vi.fn().mockReturnValue(true),
      isAdmin: () => true
    };

    await TestBed.configureTestingModule({
      imports: [ProveedoresComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: TercerosApiService, useValue: tercerosApiMock },
        { provide: SessionStore, useValue: sessionStoreMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProveedoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería cargar la lista paginada de proveedores al iniciar (V3-S3-01)', () => {
    expect(component.proveedores().length).toBe(1);
    expect(component.proveedores()[0].razonSocial).toBe('Proveedor Uno SA');
    expect(component.totalElements()).toBe(1);
  });

  it('debería realizar búsquedas con debounce de 300ms (G1-04)', async () => {
    component.onSearchChange({ target: { value: 'Proveedor' } } as any);
    const llamadasIniciales = tercerosApiMock.getPage.mock.calls.length;

    await new Promise(r => setTimeout(r, 350));
    expect(tercerosApiMock.getPage.mock.calls.length).toBeGreaterThan(llamadasIniciales);
    expect(tercerosApiMock.getPage).toHaveBeenCalledWith(expect.objectContaining({ q: 'Proveedor' }));
  });

  it('debería permitir abrir modal de alta si el usuario es Admin (G1-04)', () => {
    expect(component.puedeCrearProveedor()).toBe(true);
  });
});
