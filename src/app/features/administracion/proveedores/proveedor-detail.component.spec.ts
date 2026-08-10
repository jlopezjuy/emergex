import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProveedorDetailComponent } from './proveedor-detail.component';
import { OrdenesPagoApiService } from '../../../data-access/api/ordenes-pago.api';
import { TercerosApiService } from '../../../data-access/api/terceros.api';
import { of } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, ActivatedRoute } from '@angular/router';

describe('ProveedorDetailComponent', () => {
  let component: ProveedorDetailComponent;
  let fixture: ComponentFixture<ProveedorDetailComponent>;
  let ordenesPagoApiMock: any;

  beforeEach(async () => {
    ordenesPagoApiMock = {
      getOrdenesDePago: () => of([
        { id: 1, numeroOp: 'OP-001', comprobanteId: 10, montoBruto: 5000, montoNeto: 5000, estado: 'PENDIENTE_APROBACION' }
      ]),
      aprobarOrdenDePago: () => of({ id: 1, estado: 'APROBADA' }),
      ejecutarOrdenDePago: () => of({ id: 1, estado: 'EJECUTADA' })
    };

    await TestBed.configureTestingModule({
      imports: [ProveedorDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: OrdenesPagoApiService, useValue: ordenesPagoApiMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => '1' } }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProveedorDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería cargar órdenes de pago en la solapa correspondiente', () => {
    expect(component.ordenesPago().length).toBe(1);
    expect(component.ordenesPago()[0].numeroOp).toBe('OP-001');
  });
});
