import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TesoreriaComponent } from './tesoreria.component';
import { TesoreriaApi } from '../../data-access/api/tesoreria.api';
import { UserFeedbackService } from '../../core/notifications/user-feedback.service';

interface ApiMock {
  obtenerCajas: ReturnType<typeof vi.fn>;
  abrirCaja: ReturnType<typeof vi.fn>;
  registrarMovimientoCaja: ReturnType<typeof vi.fn>;
  realizarArqueoCaja: ReturnType<typeof vi.fn>;
  obtenerMovimientosCaja: ReturnType<typeof vi.fn>;
}

interface FeedbackMock {
  push: ReturnType<typeof vi.fn>;
  fromHttpError: ReturnType<typeof vi.fn>;
}

describe('TesoreriaComponent (F0-01)', () => {
  let apiMock: ApiMock;
  let feedbackMock: FeedbackMock;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    apiMock = {
      obtenerCajas: vi.fn().mockReturnValue(of([])),
      abrirCaja: vi.fn().mockReturnValue(of({ id: 1, nombre: 'Caja Central', estado: 'ABIERTA', saldoActual: 1000 })),
      registrarMovimientoCaja: vi.fn().mockReturnValue(of({ id: 2, tipo: 'INGRESO', monto: 500, concepto: 'Test' })),
      realizarArqueoCaja: vi.fn().mockReturnValue(of({ id: 3, montoFisicoContado: 1500 })),
      obtenerMovimientosCaja: vi.fn().mockReturnValue(of([])),
    };
    feedbackMock = {
      push: vi.fn(),
      fromHttpError: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [TesoreriaComponent],
      providers: [
        { provide: TesoreriaApi, useValue: apiMock },
        { provide: UserFeedbackService, useValue: feedbackMock },
      ],
    }).compileComponents();
  });

  it('debería mostrar empty-state cuando no hay cajas abiertas', () => {
    const fixture = TestBed.createComponent(TesoreriaComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('emx-empty-state')).not.toBeNull();
  });

  it('debería ejecutar abrirCaja y dar feedback de éxito', () => {
    const fixture = TestBed.createComponent(TesoreriaComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.cajaNombre.set('Caja Principal');
    component.montoInicial.set(2000);
    component.ejecutarAbrirCaja();

    expect(apiMock.abrirCaja).toHaveBeenCalledWith('Caja Principal', 2000);
    expect(feedbackMock.push).toHaveBeenCalledWith(expect.objectContaining({
      type: 'success',
      title: 'Caja abierta',
    }));
  });

  it('debería notificar error al fallar abrirCaja', () => {
    apiMock.abrirCaja.mockReturnValue(throwError(() => new Error('Forbidden')));
    const fixture = TestBed.createComponent(TesoreriaComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.cajaNombre.set('Caja Principal');
    component.montoInicial.set(2000);
    component.ejecutarAbrirCaja();

    expect(feedbackMock.fromHttpError).toHaveBeenCalled();
  });

  it('el aviso de apertura muestra el saldo real y no "undefined" (QA-ROL-017)', () => {
    apiMock.abrirCaja.mockReturnValue(of({ id: 1, nombre: 'Caja Central', estado: 'ABIERTA', saldoActual: 50000 }));
    const fixture = TestBed.createComponent(TesoreriaComponent);
    fixture.detectChanges();

    fixture.componentInstance.ejecutarAbrirCaja();

    const msg = feedbackMock.push.mock.calls.at(-1)?.[0].message as string;
    expect(msg).toContain('50.000,00');
    expect(msg).not.toContain('undefined');
  });

  it('la grilla muestra saldo actual y estado de cada caja, y los selectores sólo las abiertas (QA-ROL-017/025)', () => {
    apiMock.obtenerCajas.mockReturnValue(
      of([
        { id: 1, nombre: 'Caja Abierta', estado: 'ABIERTA', saldoActual: 700 },
        { id: 2, nombre: 'Caja Cerrada', estado: 'CERRADA', saldoActual: 200000 },
      ]),
    );
    const fixture = TestBed.createComponent(TesoreriaComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const filas = [...el.querySelectorAll('li')].map((li) => li.textContent ?? '');
    expect(filas.some((t) => t.includes('Caja Cerrada') && t.includes('Estado: Cerrada') && t.includes('200.000,00'))).toBe(true);
    expect(filas.some((t) => t.includes('Caja Abierta') && t.includes('Estado: Abierta') && t.includes('700,00'))).toBe(true);
    expect(filas.some((t) => /ABIERTA|CERRADA/.test(t))).toBe(false);

    const opciones = [...el.querySelectorAll('select option')].map((o) => o.textContent ?? '');
    expect(opciones.some((t) => t.includes('Caja Abierta'))).toBe(true);
    expect(opciones.some((t) => t.includes('Caja Cerrada'))).toBe(false);
  });

  it('un arqueo con diferencia exige justificación antes de llamar al backend (QA-ROL-018)', () => {
    apiMock.obtenerCajas.mockReturnValue(of([{ id: 1, nombre: 'Caja', estado: 'ABIERTA', saldoActual: 1000 }]));
    const fixture = TestBed.createComponent(TesoreriaComponent);
    const c = fixture.componentInstance;
    fixture.detectChanges();

    c.arqMontoFisico.set(1150);
    c.arqJustificacion.set('   ');
    c.ejecutarArqueo();

    expect(apiMock.realizarArqueoCaja).not.toHaveBeenCalled();
    expect(feedbackMock.push).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
  });

  it('envía la justificación y refresca las cajas tras el arqueo (la caja queda cerrada)', () => {
    apiMock.obtenerCajas.mockReturnValue(of([{ id: 1, nombre: 'Caja', estado: 'ABIERTA', saldoActual: 1000 }]));
    apiMock.realizarArqueoCaja.mockReturnValue(
      of({ id: 3, montoFisicoContado: 1150, saldoTeorico: 1000, diferencia: 150, realizadoPor: 'admin', justificacion: 'Cobro sin registrar' }),
    );
    const fixture = TestBed.createComponent(TesoreriaComponent);
    const c = fixture.componentInstance;
    fixture.detectChanges();
    apiMock.obtenerCajas.mockClear();

    c.arqMontoFisico.set(1150);
    c.arqJustificacion.set('Cobro sin registrar');
    c.ejecutarArqueo();

    expect(apiMock.realizarArqueoCaja).toHaveBeenCalledWith(1, 1150, 'Cobro sin registrar');
    expect(apiMock.obtenerCajas).toHaveBeenCalledTimes(1);
    const msg = feedbackMock.push.mock.calls.at(-1)?.[0].message as string;
    expect(msg).toContain('admin');
    expect(msg).toContain('150,00');
  });

  it('un arqueo sin diferencia no necesita justificación', () => {
    apiMock.obtenerCajas.mockReturnValue(of([{ id: 1, nombre: 'Caja', estado: 'ABIERTA', saldoActual: 1000 }]));
    const fixture = TestBed.createComponent(TesoreriaComponent);
    const c = fixture.componentInstance;
    fixture.detectChanges();

    c.arqMontoFisico.set(1000);
    c.ejecutarArqueo();

    expect(apiMock.realizarArqueoCaja).toHaveBeenCalledWith(1, 1000, undefined);
  });

  it('el billetaje usa la misma grilla en el encabezado y en cada fila para que no se pisen (QA-ROL-020)', () => {
    apiMock.obtenerCajas.mockReturnValue(of([{ id: 1, nombre: 'Caja', estado: 'ABIERTA', saldoActual: 1000 }]));
    const fixture = TestBed.createComponent(TesoreriaComponent);
    fixture.detectChanges();
    fixture.componentInstance.mostrarBilletaje.set(true);
    fixture.detectChanges();

    const filas = fixture.nativeElement.querySelectorAll('.billetaje-fila');
    expect(filas.length).toBe(1 + fixture.componentInstance.denominaciones.length);
    const plantillas = new Set([...filas].map((f) => (f as HTMLElement).style.gridTemplateColumns));
    expect(plantillas.size).toBe(1);
  });
  describe('UX contable (T4: S2-S5)', () => {
    const cajaUnica = [{ id: 1, nombre: 'Caja de guardia nocturna del centro', estado: 'ABIERTA', saldoActual: 1000 }];

    function crear(cajas: unknown[] = cajaUnica) {
      apiMock.obtenerCajas.mockReturnValue(of(cajas));
      const fixture = TestBed.createComponent(TesoreriaComponent);
      fixture.detectChanges();
      return { fixture, c: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
    }

    it('S4: los montos arrancan vacíos, no en 0', async () => {
      const { fixture, c, el } = crear();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(c.montoInicial()).toBeNull();
      expect(c.movMonto()).toBeNull();
      expect(c.arqMontoFisico()).toBeNull();
      const montos = [...el.querySelectorAll<HTMLInputElement>('input[type="number"]')].filter((i) => !i.closest('.billetaje-fila'));
      expect(montos.length).toBe(3);
      expect(montos.every((i) => i.value === '')).toBe(true);
    });

    it('S4: el aviso de diferencia del arqueo aparece sólo después de cargar el monto contado', () => {
      const { fixture, c, el } = crear();
      expect(el.querySelector('textarea')).toBeNull();
      expect(el.textContent).not.toContain('Justificación');

      c.arqMontoFisico.set(1150);
      fixture.detectChanges();
      expect(el.querySelector('textarea')).not.toBeNull();
    });

    it('S4: cerrar el arqueo sin cargar el monto contado avisa y no llama al backend', () => {
      const { c } = crear();
      c.ejecutarArqueo();
      expect(apiMock.realizarArqueoCaja).not.toHaveBeenCalled();
      expect(feedbackMock.push).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning' }));
    });

    it('S4: el rótulo dice «Caja a arquear»', () => {
      const { el } = crear();
      expect(el.textContent).toContain('Caja a arquear');
      expect(el.textContent?.toLowerCase()).not.toContain('arqueada');
    });

    it('S4: el selector de caja ocupa el ancho completo y muestra el nombre entero', () => {
      const { el } = crear();
      const selects = [...el.querySelectorAll('select')].filter((s) => s.textContent?.includes('Caja de guardia nocturna del centro'));
      expect(selects.length).toBe(2);
      for (const s of selects) {
        expect(s.closest('.grid-cols-2')).toBeNull();
        expect(s.getAttribute('title')).toContain('Caja de guardia nocturna del centro');
      }
    });

    it('S2: el tipo de movimiento se ofrece en palabras, no como enum', () => {
      const { el } = crear();
      const opciones = [...el.querySelectorAll('select option')].map((o) => o.textContent?.trim());
      expect(opciones).toContain('Ingreso');
      expect(opciones).toContain('Egreso');
      expect(opciones).not.toContain('INGRESO');
    });

    it('S3: sin colores de éxito por defecto (estado y conteo en neutro)', () => {
      const { fixture, c, el } = crear();
      c.mostrarBilletaje.set(true);
      fixture.detectChanges();
      expect(el.querySelectorAll('.text-emerald-400').length).toBe(0);
      expect(el.innerHTML).not.toContain('--accent-green');
    });

    it('S5: muestra los movimientos de la caja seleccionada', () => {
      apiMock.obtenerMovimientosCaja.mockReturnValue(
        of([
          { id: 11, tipo: 'INGRESO', monto: 1500, concepto: 'Cobro de coseguro' },
          { id: 12, tipo: 'EGRESO', monto: 200, concepto: 'Compra de insumos' },
        ]),
      );
      const { fixture, el } = crear();
      fixture.detectChanges();

      expect(apiMock.obtenerMovimientosCaja).toHaveBeenCalledWith(1);
      const filas = [...el.querySelectorAll('[data-testid="movimientos-caja"] tbody tr')].map((tr) => tr.textContent ?? '');
      expect(filas.length).toBe(2);
      expect(filas[0]).toContain('Ingreso');
      expect(filas[0]).toContain('Cobro de coseguro');
      expect(filas[0]).toContain('1.500,00');
      expect(filas[1]).toContain('Egreso');
    });

    it('S5: elegir otra caja en la grilla carga sus movimientos', () => {
      const { fixture, el } = crear([
        ...cajaUnica,
        { id: 2, nombre: 'Caja Cerrada', estado: 'CERRADA', saldoActual: 0 },
      ]);
      apiMock.obtenerMovimientosCaja.mockClear();
      const boton = [...el.querySelectorAll<HTMLButtonElement>('li button')].find((b) => b.textContent?.includes('Caja Cerrada'));
      boton!.click();
      fixture.detectChanges();
      expect(apiMock.obtenerMovimientosCaja).toHaveBeenCalledWith(2);
    });
  });
});
