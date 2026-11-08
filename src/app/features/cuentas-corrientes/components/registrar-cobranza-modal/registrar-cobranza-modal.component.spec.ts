import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RegistrarCobranzaModalComponent } from './registrar-cobranza-modal.component';
import { CobranzasApiService } from '../../../../data-access/api/cobranzas.api';

describe('RegistrarCobranzaModalComponent — medio de pago y retenciones (QA-ROL-019)', () => {
  let registrar: ReturnType<typeof vi.fn>;

  function crear() {
    registrar = vi.fn().mockReturnValue(of({}));
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [RegistrarCobranzaModalComponent],
      providers: [{ provide: CobranzasApiService, useValue: { registrarCobranzaConImputaciones: registrar } }],
    });
    const fixture = TestBed.createComponent(RegistrarCobranzaModalComponent);
    fixture.componentRef.setInput('terceroEmpresaId', 7);
    fixture.componentRef.setInput('documentosPendientes', []);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('pide el medio de pago antes de poder registrar', () => {
    const fixture = crear();
    fixture.componentInstance.form.patchValue({ numeroRecibo: 'R-1', montoCobrado: 1000 });
    expect(fixture.componentInstance.form.invalid).toBe(true);

    fixture.componentInstance.form.patchValue({ medioPago: 'TRANSFERENCIA' });
    expect(fixture.componentInstance.form.invalid).toBe(false);
  });

  it('manda el medio de pago y las retenciones, y el monto sigue siendo el bruto', () => {
    const fixture = crear();
    const c = fixture.componentInstance;
    c.form.patchValue({ numeroRecibo: 'R-1', montoCobrado: 10000, medioPago: 'CHEQUE' });
    c.agregarRetencion();
    c.actualizarRetencion(0, { tipo: 'IIBB', monto: 500, numeroCertificado: 'CERT-I-1', jurisdiccion: 'Buenos Aires' });

    c.onSubmit();

    const [req] = registrar.mock.calls[0];
    expect(req.montoCobrado).toBe(10000);
    expect(req.medioPago).toBe('CHEQUE');
    expect(req.retenciones).toEqual([{ tipo: 'IIBB', monto: 500, numeroCertificado: 'CERT-I-1', jurisdiccion: 'Buenos Aires' }]);
  });

  it('no manda jurisdicción en las retenciones que no son de IIBB', () => {
    const fixture = crear();
    const c = fixture.componentInstance;
    c.form.patchValue({ numeroRecibo: 'R-2', montoCobrado: 1000, medioPago: 'EFECTIVO' });
    c.agregarRetencion();
    c.actualizarRetencion(0, { tipo: 'GANANCIAS', monto: 50, numeroCertificado: 'CERT-G-1', jurisdiccion: 'Resto de un cambio de tipo' });

    c.onSubmit();

    expect(registrar.mock.calls[0][0].retenciones[0].jurisdiccion).toBeUndefined();
  });

  it('muestra lo realmente recibido: el cobrado menos las retenciones', () => {
    const fixture = crear();
    const c = fixture.componentInstance;
    c.form.patchValue({ numeroRecibo: 'R-3', montoCobrado: 10000, medioPago: 'TRANSFERENCIA' });
    c.agregarRetencion();
    c.actualizarRetencion(0, { monto: 300, numeroCertificado: 'CERT-G-2' });

    expect(c.montoNetoRecibido()).toBe(9700);
  });

  it('no registra si una retención está incompleta', () => {
    const fixture = crear();
    const c = fixture.componentInstance;
    c.form.patchValue({ numeroRecibo: 'R-4', montoCobrado: 1000, medioPago: 'TRANSFERENCIA' });
    c.agregarRetencion();
    c.actualizarRetencion(0, { monto: 50, numeroCertificado: '' });

    c.onSubmit();

    expect(registrar).not.toHaveBeenCalled();
    expect(c.errorRetenciones()).toContain('certificado');
  });

  it('permite quitar una retención', () => {
    const fixture = crear();
    const c = fixture.componentInstance;
    c.agregarRetencion();
    c.agregarRetencion();
    c.quitarRetencion(0);

    expect(c.retenciones().length).toBe(1);
  });
  it('renderiza con el formulario válido: el template no escribe señales (NG0600)', () => {
    const fixture = crear();
    fixture.componentInstance.form.patchValue({ numeroRecibo: 'R-9', montoCobrado: 1000, medioPago: 'EFECTIVO' });

    // Antes, hasImputacionError() hacía error.set(...) y el template lo llamaba: con el formulario
    // válido, Angular abortaba el render con NG0600 y la pantalla quedaba congelada.
    expect(() => fixture.detectChanges()).not.toThrow();
  });

  it('avisa en pantalla cuando lo imputado supera lo cobrado y bloquea el registro', () => {
    const fixture = crear();
    const c = fixture.componentInstance;
    c.form.patchValue({ numeroRecibo: 'R-10', montoCobrado: 1000, medioPago: 'EFECTIVO' });
    c.imputaciones.set({ 1: 5000 });

    fixture.detectChanges();

    expect(c.hasImputacionError()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('no puede superar el monto cobrado');
    registrar.mockClear();
    c.onSubmit();
    expect(registrar).not.toHaveBeenCalled();
  });
});
