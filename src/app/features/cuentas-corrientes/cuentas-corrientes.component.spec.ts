import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CuentasCorrientesComponent } from './cuentas-corrientes.component';
import { LedgerApiService } from '../../data-access/api/ledger.api';
import { TercerosApiService } from '../../data-access/api/terceros.api';

describe('CuentasCorrientesComponent (F0-07)', () => {
  const tercero = { id: 5, razonSocial: 'Droguería del Sur SA', cuit: '30-71234567-8', nombreComercial: 'Farmacia del Sur' };

  const ledgerApiMock = {
    getSaldo: vi.fn().mockName('getSaldo').mockReturnValue(of(15000)),
    getSaldoCxc: vi.fn().mockName('getSaldoCxc').mockReturnValue(of(15000)),
    getSaldoCxp: vi.fn().mockName('getSaldoCxp').mockReturnValue(of(45000)),
    getMovimientos: vi.fn().mockName('getMovimientos').mockReturnValue(of([])),
    getMovimientosCxc: vi.fn().mockName('getMovimientosCxc').mockReturnValue(
      of([{ id: 1, fechaContable: '2026-08-01', tipoMovimiento: 'DEBITO_DOCUMENTO', concepto: 'Factura A', montoDebe: 15000, montoHaber: 0 }]),
    ),
    getMovimientosCxp: vi.fn().mockName('getMovimientosCxp').mockReturnValue(
      of([{ id: 2, fechaContable: '2026-08-02', tipoMovimiento: 'CREDITO_DOCUMENTO', concepto: 'Factura Proveedor B', montoDebe: 0, montoHaber: 45000 }]),
    ),
    // Método agregado al LedgerApiService en V3-S1-03 para el dashboard de aging
    getAgingDeuda: vi.fn().mockName('getAgingDeuda').mockReturnValue(
      of({ noVencido: 0, tramo0a30: 5000, tramo31a60: 3000, tramo61a90: 1000, tramo90plus: 500, totalVencido: 9500 }),
    ),
  };

  const tercerosApiMock = {
    buscar: vi.fn().mockName('buscar').mockReturnValue(of([tercero])),
  };

  // Mock de CobranzasApiService inyectado en el componente para las operaciones del modal
  const cobranzasApiMock = {
    getDocumentosPendientes: vi.fn().mockName('getDocumentosPendientes').mockReturnValue(of([])),
    registrarCobranza: vi.fn().mockName('registrarCobranza').mockReturnValue(of({ id: 1 })),
  };

  beforeEach(async () => {
    ledgerApiMock.getSaldoCxc.mockClear();
    ledgerApiMock.getSaldoCxp.mockClear();
    ledgerApiMock.getMovimientosCxc.mockClear();
    ledgerApiMock.getMovimientosCxp.mockClear();
    ledgerApiMock.getAgingDeuda.mockClear();
    tercerosApiMock.buscar.mockClear();
    cobranzasApiMock.getDocumentosPendientes.mockClear();

    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [CuentasCorrientesComponent],
      providers: [
        { provide: LedgerApiService, useValue: ledgerApiMock },
        { provide: TercerosApiService, useValue: tercerosApiMock },
        // Proveer el mock de CobranzasApiService por token para que inject() funcione
        {
          provide: (await import('../../data-access/api/cobranzas.api')).CobranzasApiService,
          useValue: cobranzasApiMock,
        },
      ],
    }).compileComponents();
  });

  it('busca terceros, selecciona uno y carga saldo CxC por defecto', async () => {
    const fixture = TestBed.createComponent(CuentasCorrientesComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.onSearchChange('sur');
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(tercerosApiMock.buscar).toHaveBeenCalledWith('sur');
    expect(component.resultados()).toEqual([tercero]);

    component.seleccionarTercero(tercero);

    expect(ledgerApiMock.getSaldoCxc).toHaveBeenCalledWith(5);
    expect(ledgerApiMock.getMovimientosCxc).toHaveBeenCalledWith(5);
    expect(component.saldo()).toBe(15000);
    expect(component.movimientos().length).toBe(1);
    expect(component.tipoSubmayor()).toBe('CXC');
  });

  it('permite cambiar a submayor CxP y recalcular saldo y movimientos', () => {
    const fixture = TestBed.createComponent(CuentasCorrientesComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.seleccionarTercero(tercero);
    component.setSubmayor('CXP');

    expect(component.tipoSubmayor()).toBe('CXP');
    expect(ledgerApiMock.getSaldoCxp).toHaveBeenCalledWith(5);
    expect(ledgerApiMock.getMovimientosCxp).toHaveBeenCalledWith(5);
    expect(component.saldo()).toBe(45000);
  });

  it('muestra un estado de error visible cuando falla la carga del estado de cuenta', () => {
    ledgerApiMock.getSaldoCxc.mockReturnValueOnce(throwError(() => ({ error: { detail: 'Tercero no encontrado' } })));
    const fixture = TestBed.createComponent(CuentasCorrientesComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.seleccionarTercero(tercero);

    expect(component.error()).toBe('Tercero no encontrado');
    expect(component.loadingCuenta()).toBe(false);
  });

  it('carga el aging de deuda al inicializar el componente', () => {
    const fixture = TestBed.createComponent(CuentasCorrientesComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(ledgerApiMock.getAgingDeuda).toHaveBeenCalledOnce();
    expect(component.agingDeuda()?.totalVencido).toBe(9500);
  });
});
