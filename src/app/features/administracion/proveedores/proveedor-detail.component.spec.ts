import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProveedorDetailComponent } from './proveedor-detail.component';
import { OrdenesPagoApiService } from '../../../data-access/api/ordenes-pago.api';
import { OrdenDePagoDTO } from '../../../data-access/dto/ordenes-pago.dto';
import { TercerosApiService } from '../../../data-access/api/terceros.api';
import { of } from 'rxjs';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter, ActivatedRoute } from '@angular/router';

describe('ProveedorDetailComponent', () => {
  let component: ProveedorDetailComponent;
  let fixture: ComponentFixture<ProveedorDetailComponent>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ordenesPagoApiMock: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let tercerosApiMock: any;

  beforeEach(async () => {
    ordenesPagoApiMock = {
      getOrdenesDePago: vi.fn().mockReturnValue(of([
        { id: 1, numeroOp: 'OP-001', comprobanteId: 10, montoBruto: 5000, montoNeto: 5000, estado: 'PENDIENTE_APROBACION' }
      ])),
      aprobarOrdenDePago: vi.fn().mockReturnValue(of({ id: 1, estado: 'APROBADA' })),
      ejecutarOrdenDePago: vi.fn().mockReturnValue(of({ id: 1, estado: 'EJECUTADA' }))
    };

    tercerosApiMock = {
      buscar: vi.fn().mockReturnValue(of([
        { id: 1, razonSocial: 'Proveedor Test SA', cuit: '30-12345678-9', nombreComercial: 'Test Insumos' }
      ])),
      listarCuentasBancarias: vi.fn().mockReturnValue(of([
        { id: 5, bancoNombre: 'Banco X', cbuMasked: '****1234', titularNombre: 'Proveedor Test SA', estado: 'PENDIENTE_VERIFICACION' }
      ]))
    };

    await TestBed.configureTestingModule({
      imports: [ProveedorDetailComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: OrdenesPagoApiService, useValue: ordenesPagoApiMock },
        { provide: TercerosApiService, useValue: tercerosApiMock },
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

  it('debería cargar la identidad del proveedor mediante la API de terceros', () => {
    expect(tercerosApiMock.buscar).toHaveBeenCalled();
    expect(component.proveedorInfo()?.razonSocial).toBe('Proveedor Test SA');
    expect(component.proveedorInfo()?.cuit).toBe('30-12345678-9');
  });

  it('carga las cuentas bancarias del proveedor para que el Checker pueda aprobar (QA-ROL-021)', () => {
    expect(tercerosApiMock.listarCuentasBancarias).toHaveBeenCalledWith(1);
    expect(component.cuentasBancarias().length).toBe(1);
    expect(component.cuentasBancarias()[0].estado).toBe('PENDIENTE_VERIFICACION');
  });

  it('el modal de CBU recibe las cuentas cargadas', () => {
    const abrir = [...fixture.nativeElement.querySelectorAll('button')].find((b) =>
      (b as HTMLElement).textContent?.includes('Workflow CBU Maker-Checker'),
    ) as HTMLButtonElement;
    abrir.click();
    fixture.detectChanges();

    const modal = fixture.nativeElement.querySelector('emx-cbu-maker-checker-modal');
    expect(modal).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Banco X');
    expect(fixture.nativeElement.textContent).toContain('Aprobar');
  });

  it('debería cargar órdenes de pago en la solapa correspondiente', () => {
    expect(component.ordenesPago().length).toBe(1);
    expect(component.ordenesPago()[0].numeroOp).toBe('OP-001');
  });

  it('abrirModalEjecutar debe establecer la OP a ejecutar y no llamar a la API directamente', () => {
    const spy = vi.spyOn(ordenesPagoApiMock, 'ejecutarOrdenDePago');
    const op: OrdenDePagoDTO = { id: 1, numeroOp: 'OP-001', comprobanteId: 10, montoBruto: 5000, montoNeto: 5000, estado: 'APROBADA' };

    component.abrirModalEjecutar(op);

    expect(component.opAEjecutar()).toBe(op);
    expect(spy).not.toHaveBeenCalled();
  });

  it('confirmarEjecucionOp debe ejecutar la OP con medioPago y referenciaTransf provistos', () => {
    const spy = vi.spyOn(ordenesPagoApiMock, 'ejecutarOrdenDePago');
    const op: OrdenDePagoDTO = { id: 1, numeroOp: 'OP-001', comprobanteId: 10, montoBruto: 5000, montoNeto: 5000, estado: 'APROBADA' };

    component.abrirModalEjecutar(op);
    component.confirmarEjecucionOp({ medioPago: 'CHEQUE', referenciaTransf: 'CHQ-9876' });

    expect(spy).toHaveBeenCalledWith(
      1,
      { medioPago: 'CHEQUE', referenciaTransf: 'CHQ-9876' },
      expect.stringMatching(/^OP-EXEC-1-/)
    );
    expect(component.opAEjecutar()).toBeNull();
  });

  it('cerrarModalEjecutar debe limpiar la OP seleccionada sin llamar a la API', () => {
    const spy = vi.spyOn(ordenesPagoApiMock, 'ejecutarOrdenDePago');
    const op: OrdenDePagoDTO = { id: 1, numeroOp: 'OP-001', comprobanteId: 10, montoBruto: 5000, montoNeto: 5000, estado: 'APROBADA' };

    component.abrirModalEjecutar(op);
    component.cerrarModalEjecutar();

    expect(component.opAEjecutar()).toBeNull();
    expect(spy).not.toHaveBeenCalled();
  });

  it('debería cambiar a la solapa de documentación adjunta', () => {
    component.activeTab.set('docs');
    expect(component.activeTab()).toBe('docs');
  });
});
