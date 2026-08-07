import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CuentasCorrientesComponent } from './cuentas-corrientes.component';
import { LedgerApiService } from '../../data-access/api/ledger.api';
import { TercerosApiService } from '../../data-access/api/terceros.api';

describe('CuentasCorrientesComponent', () => {
  const tercero = { id: 5, razonSocial: 'Droguería del Sur SA', cuit: '30-71234567-8', nombreComercial: 'Farmacia del Sur' };

  const ledgerApiMock = {
    getSaldo: vi.fn().mockName('getSaldo').mockReturnValue(of(15000)),
    getMovimientos: vi.fn().mockName('getMovimientos').mockReturnValue(
      of([{ id: 1, fechaContable: '2026-08-01', tipoMovimiento: 'DEBITO_DOCUMENTO', concepto: 'Pago OP N° 1', montoDebe: 15000, montoHaber: 0 }]),
    ),
  };

  const tercerosApiMock = {
    buscar: vi.fn().mockName('buscar').mockReturnValue(of([tercero])),
  };

  beforeEach(async () => {
    ledgerApiMock.getSaldo.mockClear();
    ledgerApiMock.getMovimientos.mockClear();
    tercerosApiMock.buscar.mockClear();
    await TestBed.configureTestingModule({
      imports: [CuentasCorrientesComponent],
      providers: [
        { provide: LedgerApiService, useValue: ledgerApiMock },
        { provide: TercerosApiService, useValue: tercerosApiMock },
      ],
    }).compileComponents();
  });

  it('busca terceros, selecciona uno y carga saldo y movimientos', async () => {
    const fixture = TestBed.createComponent(CuentasCorrientesComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.onSearchChange('sur');
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(tercerosApiMock.buscar).toHaveBeenCalledWith('sur');
    expect(component.resultados()).toEqual([tercero]);

    component.seleccionarTercero(tercero);

    expect(ledgerApiMock.getSaldo).toHaveBeenCalledWith(5);
    expect(ledgerApiMock.getMovimientos).toHaveBeenCalledWith(5);
    expect(component.saldo()).toBe(15000);
    expect(component.movimientos().length).toBe(1);
    expect(component.error()).toBeNull();
  });

  it('muestra un estado de error visible cuando falla la carga del estado de cuenta', () => {
    ledgerApiMock.getSaldo.mockReturnValueOnce(throwError(() => ({ error: { detail: 'Tercero no encontrado' } })));
    const fixture = TestBed.createComponent(CuentasCorrientesComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.seleccionarTercero(tercero);

    expect(component.error()).toBe('Tercero no encontrado');
    expect(component.loadingCuenta()).toBe(false);
  });
});
