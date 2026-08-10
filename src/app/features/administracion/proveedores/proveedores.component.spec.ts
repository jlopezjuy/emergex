import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProveedoresComponent } from './proveedores.component';
import { TercerosApiService } from '../../../data-access/api/terceros.api';
import { of } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('ProveedoresComponent', () => {
  let component: ProveedoresComponent;
  let fixture: ComponentFixture<ProveedoresComponent>;
  let tercerosApiMock: any;

  beforeEach(async () => {
    tercerosApiMock = {
      buscar: () => of([
        { id: 1, razonSocial: 'Proveedor Uno SA', cuit: '30-11111111-9', nombreComercial: 'Prov Uno' }
      ]),
      registrarTercero: () => of({ id: 2, razonSocialCanonica: 'Nuevo Proveedor' })
    };

    await TestBed.configureTestingModule({
      imports: [ProveedoresComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: TercerosApiService, useValue: tercerosApiMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProveedoresComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería cargar la lista de proveedores al iniciar', () => {
    expect(component.proveedores().length).toBe(1);
    expect(component.proveedores()[0].razonSocial).toBe('Proveedor Uno SA');
  });
});
