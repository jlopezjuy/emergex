import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EstadoCuentaTerceroComponent } from './estado-cuenta-tercero.component';
import { LedgerApiService } from '../../../../data-access/api/ledger.api';
import { of, throwError } from 'rxjs';

describe('EstadoCuentaTerceroComponent', () => {
  let component: EstadoCuentaTerceroComponent;
  let fixture: ComponentFixture<EstadoCuentaTerceroComponent>;
  let ledgerApiMock: {
    getSaldoCxp: ReturnType<typeof vi.fn>;
    getMovimientosCxp: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    ledgerApiMock = {
      getSaldoCxp: vi.fn().mockReturnValue(of(1500.50)),
      getMovimientosCxp: vi.fn().mockReturnValue(
        of([
          {
            id: 1,
            fechaContable: '2026-08-10',
            tipoMovimiento: 'DEBITO_DOCUMENTO',
            concepto: 'Factura F-0001',
            montoDebe: 1500.50,
            montoHaber: 0
          }
        ])
      )
    };

    await TestBed.configureTestingModule({
      imports: [EstadoCuentaTerceroComponent],
      providers: [
        { provide: LedgerApiService, useValue: ledgerApiMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EstadoCuentaTerceroComponent);
    component = fixture.componentInstance;
    component.terceroId = 42;
  });

  it('debería cargar el saldo CxP y movimientos CxP al iniciar (G4-02)', () => {
    fixture.detectChanges();

    expect(ledgerApiMock.getSaldoCxp).toHaveBeenCalledWith(42);
    expect(ledgerApiMock.getMovimientosCxp).toHaveBeenCalledWith(42);
    expect(component.saldo()).toBe(1500.50);
    expect(component.movimientos().length).toBe(1);
    expect(component.movimientos()[0].concepto).toBe('Factura F-0001');
  });

  it('debería mostrar mensaje de error si falla la llamada a la API', () => {
    ledgerApiMock.getSaldoCxp.mockReturnValue(throwError(() => new Error('Error de red')));
    ledgerApiMock.getMovimientosCxp.mockReturnValue(throwError(() => new Error('Error de red')));

    fixture.detectChanges();

    expect(component.error()).toBeTruthy();
    expect(component.loading()).toBe(false);
  });
});
