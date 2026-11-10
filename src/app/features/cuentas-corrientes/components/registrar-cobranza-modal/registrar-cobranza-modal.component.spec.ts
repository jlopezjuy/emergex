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

  describe('ventana de cobro (S8)', () => {
    const docs = [
      { id: 1, numeroDocumento: 'FC-1', fechaEmision: '2026-10-01', fechaVencimiento: '2026-11-01', montoTotal: 1000, saldoPendiente: 1000, moneda: 'ARS' },
      { id: 2, numeroDocumento: 'FC-2', fechaEmision: '2026-10-05', montoTotal: 800, saldoPendiente: 500, moneda: 'ARS' },
    ];
    const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

    function crearConDocs() {
      const fixture = crear();
      fixture.componentRef.setInput('terceroNombre', 'Clínica del Valle');
      fixture.componentRef.setInput('documentosPendientes', docs);
      fixture.detectChanges();
      return fixture;
    }

    it('shows who is being charged and today as the date of the cobro', () => {
      const fixture = crearConDocs();
      const el = fixture.nativeElement as HTMLElement;
      const hoy = new Date();
      const dd = String(hoy.getDate()).padStart(2, '0');
      const mm = String(hoy.getMonth() + 1).padStart(2, '0');

      expect(texto(el.querySelector('[data-testid="cobro-tercero"]'))).toContain('Clínica del Valle');
      expect(el.textContent).toContain(`Fecha del cobro: hoy (${dd}/${mm}/${hoy.getFullYear()})`);
    });

    it('uses «Registrar cobro» as both title and button', () => {
      const el = crearConDocs().nativeElement as HTMLElement;
      expect(texto(el.querySelector('h3'))).toBe('Registrar cobro');
      expect(texto(el.querySelector('[data-testid="confirmar-cobro"]'))).toBe('Registrar cobro');
      expect(el.textContent).not.toContain('Registrar Cobranza');
    });

    it('shows the currency as plain text, not a read-only input', () => {
      const el = crearConDocs().nativeElement as HTMLElement;
      expect(el.querySelector('input[formControlName="moneda"]')).toBeNull();
      expect(texto(el.querySelector('[data-testid="moneda"]'))).toContain('ARS');
    });

    it('talks with voseo', () => {
      const el = crearConDocs().nativeElement as HTMLElement;
      expect(el.textContent).toContain('Seleccioná los documentos');
      expect(el.textContent).not.toContain('Seleccione');
    });

    it('fills «Monto total cobrado» when documents are selected, and the user can still edit it', () => {
      const fixture = crearConDocs();
      const el = fixture.nativeElement as HTMLElement;
      const checks = el.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-testid="seleccionar-documento"]');
      expect(checks.length).toBe(2);

      checks[0].click();
      checks[1].click();
      fixture.detectChanges();
      const monto = el.querySelector<HTMLInputElement>('input[formControlName="montoCobrado"]')!;
      expect(fixture.componentInstance.form.value.montoCobrado).toBe(1500);
      expect(monto.value).toBe('1500');
      expect(fixture.componentInstance.totalAImputar()).toBe(1500);

      monto.value = '1200';
      monto.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(fixture.componentInstance.form.value.montoCobrado).toBe(1200);

      checks[1].click();
      fixture.detectChanges();
      expect(fixture.componentInstance.totalAImputar()).toBe(1000);
      expect(fixture.componentInstance.form.value.montoCobrado).toBe(1200);
    });
  });
});
