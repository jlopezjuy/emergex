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
  it('abre el modal de cobro desde la lista, sin tercero seleccionado, y lo ata al tercero de la fila (QA-ROL-019)', () => {
    const fixture = TestBed.createComponent(CuentasCorrientesComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component.terceroSeleccionado()).toBeNull();

    component.abrirModalCobranza(77);
    // Antes el modal leía `terceroSeleccionado()!.id` y explotaba al renderizar si venía de la lista.
    expect(() => fixture.detectChanges()).not.toThrow();

    const modal = fixture.nativeElement.querySelector('app-registrar-cobranza-modal');
    expect(modal).not.toBeNull();
    expect(component.terceroCobroId()).toBe(77);
  });

  it('al registrar un cobro desde la lista cierra el modal y refresca el aging sin exigir un tercero seleccionado', () => {
    const fixture = TestBed.createComponent(CuentasCorrientesComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    component.abrirModalCobranza(77);
    ledgerApiMock.getAgingDeuda.mockClear();

    expect(() => component.onCobranzaRegistrada(77)).not.toThrow();

    expect(component.mostrarModalCobranza()).toBe(false);
    expect(ledgerApiMock.getAgingDeuda).toHaveBeenCalled();
  });

  it('reads a negative receivable balance as a customer credit and shows dates as dd/mm/aaaa', () => {
    ledgerApiMock.getSaldoCxc.mockReturnValueOnce(of(-30500));
    const fixture = TestBed.createComponent(CuentasCorrientesComponent);
    fixture.componentInstance.seleccionarTercero(tercero);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent!.replace(/\u00a0/g, ' ');
    expect(text).toContain('Saldo a favor del cliente (anticipo)');
    expect(text).not.toContain('nos deben');
    const saldo = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="saldo-submayor"]')!;
    expect(saldo.textContent!.replace(/\u00a0/g, ' ').trim()).toBe('$ 30.500,00');
    expect(text).toContain('01/08/2026');
    expect(text).not.toContain('2026-08-01');
  });

  it('labels a negative payable balance as money we owe the supplier', () => {
    ledgerApiMock.getSaldoCxp.mockReturnValueOnce(of(-45000));
    const fixture = TestBed.createComponent(CuentasCorrientesComponent);
    const component = fixture.componentInstance;
    component.seleccionarTercero(tercero);
    component.setSubmayor('CXP');
    fixture.detectChanges();

    expect(component.tipoSubmayor()).toBe('CXP');
    expect(component.leyendaSaldo()).toBe('Le debemos al proveedor');
    expect(component.saldoAbsoluto()).toBe(45000);
  });

  it('says the aging only covers the current-account book', () => {
    const fixture = TestBed.createComponent(CuentasCorrientesComponent);
    fixture.detectChanges();
    const nota = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="aging-alcance"]');
    expect(nota?.textContent).toContain('Las cuotas de afiliados se controlan en Facturación');
  });

  describe('UX contable (T3)', () => {
    const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

    it('uses a normal page header with a plain-language subtitle (S2, S10)', () => {
      const fixture = TestBed.createComponent(CuentasCorrientesComponent);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      expect(el.textContent).toContain('Movimientos de cuenta corriente. No se pueden borrar ni editar.');
      expect(el.textContent).not.toContain('Append-Only');
      expect(el.querySelector('header')!.className).not.toContain('bg-slate-900');
    });

    it('shows $0 aging buckets muted and a zero «Total vencido» without red (S3)', () => {
      ledgerApiMock.getAgingDeuda.mockReturnValueOnce(
        of({ noVencido: 0, tramo0a30: 5000, tramo31a60: 0, tramo61a90: 0, tramo90plus: 0, totalVencido: 0 }),
      );
      const fixture = TestBed.createComponent(CuentasCorrientesComponent);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      const noVencido = el.querySelector('[data-testid="aging-noVencido"]')!;
      expect(noVencido.className).not.toContain('green');
      expect(noVencido.className).toContain('bg-slate-50');
      const tramo31 = el.querySelector('[data-testid="aging-tramo31a60"]')!;
      expect(tramo31.className).not.toContain('amber');
      const tramo0 = el.querySelector('[data-testid="aging-tramo0a30"]')!;
      expect(tramo0.className).toContain('amber');
      const total = el.querySelector('[data-testid="aging-totalVencido"]')!;
      expect(total.className).not.toContain('red');
    });

    it('paints «Total vencido» red only when it is greater than zero (S3)', () => {
      const fixture = TestBed.createComponent(CuentasCorrientesComponent);
      fixture.detectChanges();
      const total = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="aging-totalVencido"]')!;
      expect(total.className).toContain('red');
    });

    it('shows movement types in plain Spanish (S2)', () => {
      ledgerApiMock.getMovimientosCxc.mockReturnValueOnce(
        of([{ id: 9, fechaContable: '2026-08-03', tipoMovimiento: 'CREDITO_COBRANZA', concepto: 'Recibo 1', montoDebe: 0, montoHaber: 100 }]),
      );
      const fixture = TestBed.createComponent(CuentasCorrientesComponent);
      fixture.componentInstance.seleccionarTercero(tercero);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      expect(texto(el.querySelector('[data-testid="tipo-movimiento"]'))).toBe('Cobro');
      expect(el.textContent).not.toContain('CREDITO_COBRANZA');
    });

    it('adds a running «Saldo» column, debe − haber cumulative by date then id (S9)', () => {
      ledgerApiMock.getMovimientosCxc.mockReturnValueOnce(
        of([
          { id: 3, fechaContable: '2026-08-05', tipoMovimiento: 'CREDITO_COBRANZA', concepto: 'Recibo', montoDebe: 0, montoHaber: 400 },
          { id: 2, fechaContable: '2026-08-01', tipoMovimiento: 'DEBITO_DOCUMENTO', concepto: 'Factura B', montoDebe: 500, montoHaber: 0 },
          { id: 1, fechaContable: '2026-08-01', tipoMovimiento: 'DEBITO_DOCUMENTO', concepto: 'Factura A', montoDebe: 1000, montoHaber: 0 },
        ]),
      );
      const fixture = TestBed.createComponent(CuentasCorrientesComponent);
      fixture.componentInstance.seleccionarTercero(tercero);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      const header = Array.from(el.querySelectorAll('th')).find((th) => texto(th) === 'Saldo')!;
      expect(header).toBeTruthy();
      expect(header.className).toContain('text-right');
      const filas = Array.from(el.querySelectorAll('[data-testid="fila-movimiento"]'));
      expect(filas.map((f) => texto(f.querySelector('[data-testid="concepto"]')))).toEqual(['Factura A', 'Factura B', 'Recibo']);
      expect(filas.map((f) => texto(f.querySelector('[data-testid="saldo-acumulado"]')))).toEqual([
        '$ 1.000,00',
        '$ 1.500,00',
        '$ 1.100,00',
      ]);
    });

    it('shows the CUIT formatted with dashes (S10)', () => {
      const sinGuiones = { ...tercero, cuit: '30712345678' };
      tercerosApiMock.buscar.mockReturnValueOnce(of([sinGuiones]));
      const fixture = TestBed.createComponent(CuentasCorrientesComponent);
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('30-71234567-8');

      fixture.componentInstance.seleccionarTercero(sinGuiones);
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('CUIT 30-71234567-8');
    });

    it('tells the cobro window who is being charged (S8)', () => {
      const fixture = TestBed.createComponent(CuentasCorrientesComponent);
      fixture.detectChanges();
      fixture.componentInstance.abrirModalCobranza(5, 'Farmacia del Sur');
      fixture.detectChanges();

      const modal = (fixture.nativeElement as HTMLElement).querySelector('app-registrar-cobranza-modal')!;
      expect(modal.textContent).toContain('Farmacia del Sur');
    });
  });
});
