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
    expect(msg).toContain('50000');
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
    expect(filas.some((t) => t.includes('Caja Cerrada') && t.includes('CERRADA') && t.includes('200000'))).toBe(true);
    expect(filas.some((t) => t.includes('Caja Abierta') && t.includes('ABIERTA') && t.includes('700'))).toBe(true);

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
    expect(msg).toContain('150');
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
});
