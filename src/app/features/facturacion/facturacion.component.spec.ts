import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { FacturacionComponent } from './facturacion.component';
import { FacturacionApiService } from '../../data-access/api/facturacion.api';
import { InstitutionsApiService } from '../../data-access/api/institutions.api';
import { DebitosApiService } from '../../data-access/api/debitos.api';

describe('FacturacionComponent (Comprehensive TDD Spec)', () => {
  const facturacionApiMock = {
    listarFacturas: vi
      .fn()
      .mockName('listarFacturas')
      .mockReturnValue(
        of([
          { id: 1, numeroFactura: 'FAC-001', estado: 'EMITIDA', importeTotal: 1000 },
          { id: 2, numeroFactura: 'FAC-002', estado: 'PAGADA', importeTotal: 500 },
          { id: 3, numeroFactura: 'FAC-003', estado: 'VENCIDA', importeTotal: 250 },
        ]),
      ),
    generarMensual: vi
      .fn()
      .mockName('generarMensual')
      .mockReturnValue(
        of({
          mes: 5,
          anio: 2026,
          totalGeneradas: 1,
          totalOmitidas: 0,
          facturasGeneradas: [
            { id: 4, numeroFactura: 'FAC-004', estado: 'EMITIDA', importeTotal: 1200 },
          ],
        }),
      ),
    generarAnual: vi.fn().mockName('generarAnual').mockReturnValue(of(null)),
    registrarPago: vi.fn().mockName('registrarPago').mockReturnValue(of(null)),
    getFacturasPage: vi
      .fn()
      .mockName('getFacturasPage')
      .mockReturnValue(
        of({
          data: [
            { id: 1, numeroFactura: 'FAC-001', estado: 'EMITIDA', importeTotal: 1000, tipoPeriodo: 'MENSUAL' },
            { id: 2, numeroFactura: 'FAC-002', estado: 'PAGADA', importeTotal: 500, tipoPeriodo: 'MENSUAL' },
          ],
          total: 42,
        }),
      ),
    getArcaStatus: vi
      .fn()
      .mockName('getArcaStatus')
      .mockReturnValue(of({ arcaEnabled: true, caeSimuladoHabilitado: false, modoPruebas: false })),
  };

  const institutionsApiMock = {
    getAllFacturasInstitucionales: vi
      .fn()
      .mockName('getAllFacturasInstitucionales')
      .mockReturnValue(
        of([
          {
            id: 10,
            importeTotal: 8000,
            cantidadMiembrosFacturados: 40,
            periodoDesde: '2026-05-01',
            periodoHasta: '2026-05-31',
            contratoCobertura: { id: 99, nombre: 'Contrato A' },
          },
        ]),
      ),
    getAllContratosActivos: vi
      .fn()
      .mockName('getAllContratosActivos')
      .mockReturnValue(of([{ id: 99, nombre: 'Contrato A' }])),
    generarFacturaInstitucional: vi
      .fn()
      .mockName('generarFacturaInstitucional')
      .mockReturnValue(
        of({
          id: 11,
          importeTotal: 15000,
          cantidadMiembrosFacturados: 50,
          periodoDesde: '2026-05-01',
          periodoHasta: '2026-05-31',
        }),
      ),
  };

  const debitosApiMock = {
    getDebitos: vi.fn().mockReturnValue(of([{ id: 1, documentoId: 10, montoDebito: 500, estado: 'PENDIENTE', causaPrincipal: 'VALOR_EXCESIVO' }])),
    actualizarEstado: vi.fn().mockReturnValue(of({ id: 1, documentoId: 10, montoDebito: 500, estado: 'ACEPTADO', montoRecuperado: 500 }))
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [FacturacionComponent],
      providers: [
        provideRouter([]),
        { provide: FacturacionApiService, useValue: facturacionApiMock },
        { provide: InstitutionsApiService, useValue: institutionsApiMock },
        { provide: DebitosApiService, useValue: debitosApiMock },
      ],
    }).compileComponents();
  });

  it('debería calcular correctamente los KPIs B2C y B2B al iniciar el componente', () => {
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.kpis().totalFacturado).toBe(1750);
    // Overdue invoices are still owed, so they count as pending; the header always reconciles.
    expect(component.kpis().pendiente).toBe(1250);
    expect(component.kpis().cobrado).toBe(500);
    expect(component.kpis().cobrado + component.kpis().pendiente + component.kpis().anulado).toBe(1750);
    expect(component.kpisInstitucionales().totalFacturado).toBe(8000);
    expect(institutionsApiMock.getAllFacturasInstitucionales).toHaveBeenCalled();
  });

  it('debería invocar la generación masiva de facturación mensual B2C', () => {
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.genMes = 5;
    component.genAnio = 2026;

    component.confirmarGenerar();

    expect(facturacionApiMock.generarMensual).toHaveBeenCalledWith(5, 2026);
  });

  it('debería mostrarle al operador el mensaje real que devuelve el backend', () => {
    // El backend responde ProblemDetail (spring.mvc.problemdetails.enabled), así que el
    // error trae `error.detail`. Un `new Error(...)` pelado no ejercita ese camino: caía
    // siempre en el mensaje genérico y el test no probaba nada.
    facturacionApiMock.generarMensual.mockReturnValueOnce(
      throwError(() => ({ status: 500, error: { detail: 'Error ARCA 500' } })),
    );

    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.confirmarGenerar();

    expect(component.generando()).toBe(false);
    expect(component.generarError()).toContain('Error ARCA 500');
  });

  it('debería caer a un mensaje genérico cuando el error no trae detalle', () => {
    facturacionApiMock.generarMensual.mockReturnValueOnce(
      throwError(() => new Error('network down')),
    );

    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.confirmarGenerar();

    // Nunca queda colgado en "Generando...": el flag se libera igual.
    expect(component.generando()).toBe(false);
    expect(component.generarError()).toBe('Error al generar facturas.');
  });

  it('debería permitir abrir el modal para generar facturas institucionales B2B', () => {
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.openGenerarInstModal();

    expect(component.showGenerarInstModal()).toBe(true);
    expect(component.contratosActivos().length).toBe(1);
  });

  it('debería generar una factura institucional B2B y actualizar la lista', () => {
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.openGenerarInstModal();
    component.genInstContratoId = 99;
    component.genInstPeriodoDesde = '2026-05-01';
    component.genInstPeriodoHasta = '2026-05-31';

    component.onGenerarFacturaInst();

    // observaciones viaja como undefined cuando el operador no escribió nada: el backend
    // distingue "sin observación" de "observación vacía".
    expect(institutionsApiMock.generarFacturaInstitucional).toHaveBeenCalledWith({
      contratoId: 99,
      periodoDesde: '2026-05-01',
      periodoHasta: '2026-05-31',
      observaciones: undefined,
    });
    // El modal NO se cierra al generar: se queda mostrando el resumen de la factura
    // (importe y miembros facturados) y el operador lo cierra a mano.
    expect(component.generarInstResult()?.id).toBe(11);
    expect(component.generandoInst()).toBe(false);
    expect(institutionsApiMock.getAllFacturasInstitucionales).toHaveBeenCalledTimes(2);
  });

  it('debería exigir contrato y período antes de llamar a la API', () => {
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.openGenerarInstModal();
    component.genInstContratoId = 0;

    component.onGenerarFacturaInst();

    expect(institutionsApiMock.generarFacturaInstitucional).not.toHaveBeenCalled();
    expect(component.generarInstError()).toContain('Completá contrato');
  });

  it('debería mostrar el banner de MODO PRUEBAS AFIP cuando ARCA está desactivado', () => {
    // Escenario: el backend reporta arcaEnabled=false + caeSimuladoHabilitado=true → modoPruebas=true.
    // La UI debe renderizar el banner "MODO PRUEBAS AFIP" y setear arcaModoPruebas en true para
    // alertar al operador.
    facturacionApiMock.getArcaStatus.mockReturnValueOnce(
      of({ arcaEnabled: false, caeSimuladoHabilitado: true, modoPruebas: true }),
    );

    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    const banner = fixture.nativeElement.querySelector('.arca-warning-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('MODO PRUEBAS ARCA');
    expect(banner.textContent).not.toContain('AFIP');
    expect(component.arcaModoPruebas()).toBe(true);
  });

  it('debería ocultar el banner cuando ARCA está habilitado', () => {
    // Escenario: ARCA habilitado (modoPruebas=false, valor por defecto del mock). El banner no
    // debe renderizarse porque la emisión fiscal es real.
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.arcaModoPruebas()).toBe(false);
    expect(fixture.nativeElement.querySelector('.arca-warning-banner')).toBeNull();
  });

  it('muestra el saldo pendiente de cada factura en su propia columna', () => {
    // ADM-UX-005: FacturaResumenDTO.saldoPendiente ya venía del backend y no se renderizaba.
    facturacionApiMock.getFacturasPage.mockReturnValueOnce(
      of({
        data: [
          { id: 1, numeroFactura: 'FAC-001', estado: 'EMITIDA', importeTotal: 5250, saldoPendiente: 5250, tipoPeriodo: 'MENSUAL' },
          { id: 2, numeroFactura: 'FAC-002', estado: 'PAGADA', importeTotal: 500, saldoPendiente: 0, tipoPeriodo: 'MENSUAL' },
        ],
        total: 2,
      }),
    );

    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const filas = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(filas[0].textContent).toContain('5.250');
    expect(filas[1].textContent).toContain('0');
  });

  it('carga la tabla server-side y el total viene de la respuesta paginada', () => {
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(facturacionApiMock.getFacturasPage).toHaveBeenCalledWith(null, 0, component.PAGE_SIZE);
    expect(component.paged().length).toBe(2);
    expect(component.tableTotal()).toBe(42);
  });

  it('cambiar el filtro de estado dispara una nueva request con el estado y resetea la página', () => {
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    facturacionApiMock.getFacturasPage.mockClear();

    component.setEstadoFilter('PAGADA');

    expect(component.page()).toBe(0);
    expect(facturacionApiMock.getFacturasPage).toHaveBeenCalledWith('PAGADA', 0, component.PAGE_SIZE);
  });

  it('tras confirmar un cobro refresca la grilla paginada y no sólo los KPIs (QA-ROL-023)', () => {
    facturacionApiMock.registrarPago.mockReturnValueOnce(of({ id: 1, estado: 'PAGADA' }));
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.openPayModal({ id: 1, numeroFactura: 'FAC-001', estado: 'EMITIDA', importeTotal: 1000 } as never);
    facturacionApiMock.getFacturasPage.mockClear();

    component.confirmarPago({ amount: 1000, method: 'EFECTIVO', ref: '', nota: '', fecha: '2026-11-07', billingMode: 'mensual' });

    expect(facturacionApiMock.registrarPago).toHaveBeenCalled();
    expect(facturacionApiMock.getFacturasPage).toHaveBeenCalledTimes(1);
  });

  it('debería no romper el componente si el endpoint de estado ARCA falla', () => {
    // Escenario de resiliencia: falla GET /api/arca/status. El componente no debe romperse y
    // arcaModoPruebas queda en false (sin banner) para no mostrar una advertencia errónea.
    facturacionApiMock.getArcaStatus.mockReturnValueOnce(
      throwError(() => new Error('network down')),
    );

    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.arcaModoPruebas()).toBe(false);
    expect(fixture.nativeElement.querySelector('.arca-warning-banner')).toBeNull();
  });

  it('debería permitir seleccionar/deseleccionar ítems masivamente en B2C y calcular el total de seleccionados', () => {
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.selectedIds().size).toBe(0);
    component.toggleSelect(1);
    expect(component.selectedIds().has(1)).toBe(true);
    expect(component.selectedCount()).toBe(1);

    component.toggleAllB2c(true);
    expect(component.selectedCount()).toBe(2);

    component.toggleAllB2c(false);
    expect(component.selectedCount()).toBe(0);
  });

  it('la barra de selección no ofrece una anulación masiva que no existe en el backend', () => {
    // Antes había un botón «Anular seleccionadas» que sólo mostraba un aviso de éxito sin llamar
    // a ninguna API: la barra ofrece únicamente acciones que existen (H-19).
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.toggleSelect(1);
    fixture.detectChanges();

    const barra = fixture.nativeElement.querySelector('[data-testid="barra-seleccion"]');
    expect(barra).toBeTruthy();
    expect(barra.textContent).not.toContain('Anular');
    component.clearSelection();
    expect(component.selectedCount()).toBe(0);
  });

  it('debería cargar débitos OS al activar la solapa debitos-os (G2-01)', () => {
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.seleccionarTabDebitosOs();
    fixture.detectChanges();

    expect(debitosApiMock.getDebitos).toHaveBeenCalled();
    expect(component.debitosOs().length).toBe(1);
  });

  it('debería permitir actualizar el estado de un débito OS (G2-01)', () => {
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.actualizarEstadoDebito(1, 'ACEPTADO', 500);
    expect(debitosApiMock.actualizarEstado).toHaveBeenCalledWith(1, { nuevoEstado: 'ACEPTADO', montoRecuperado: 500 });
  });

  describe('lista de facturas a afiliados (H-07, H-09, H-15 a H-19)', () => {
    const filas = [
      { id: 1, numeroFactura: 'FAC-001', estado: 'EMITIDA', importeTotal: 1000, saldoPendiente: 1000, tipoPeriodo: 'MENSUAL', fechaEmision: '2026-10-01', grupoNumeroCuenta: 'G-100' },
      { id: 2, numeroFactura: 'FAC-002', estado: 'PAGADA', importeTotal: 500, saldoPendiente: 0, tipoPeriodo: 'MENSUAL', fechaEmision: '2026-10-15', grupoNumeroCuenta: 'G-200' },
      { id: 3, numeroFactura: 'FAC-003', estado: 'VENCIDA', importeTotal: 250, saldoPendiente: 250, tipoPeriodo: 'MENSUAL', fechaEmision: '2026-11-02', grupoNumeroCuenta: 'G-300' },
    ];

    function crear(data: unknown[] = filas) {
      facturacionApiMock.getFacturasPage.mockReturnValueOnce(of({ data, total: data.length }));
      const fixture = TestBed.createComponent(FacturacionComponent);
      fixture.detectChanges();
      return { fixture, component: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
    }

    function textoTotales(el: HTMLElement): string {
      return el.querySelector('[data-testid="fila-totales"]')?.textContent ?? '';
    }

    it('muestra una fila de totales con importe y saldo de las filas visibles', () => {
      const { el } = crear();
      const totales = textoTotales(el);
      expect(totales).toContain('1.750,00');
      expect(totales).toContain('1.250,00');
    });

    it('busca por número de factura o por grupo y recalcula los totales', () => {
      const { fixture, component, el } = crear();
      component.busqueda.set('fac-003');
      fixture.detectChanges();
      expect(component.paged().map((f) => f.id)).toEqual([3]);
      expect(textoTotales(el)).toContain('250,00');

      component.busqueda.set('g-200');
      fixture.detectChanges();
      expect(component.paged().map((f) => f.id)).toEqual([2]);
    });

    it('filtra por rango de fecha de emisión', () => {
      const { fixture, component } = crear();
      component.fechaDesde.set('2026-10-10');
      component.fechaHasta.set('2026-10-31');
      fixture.detectChanges();
      expect(component.paged().map((f) => f.id)).toEqual([2]);
    });

    it('rotula «Tipo» el filtro de mensual/anual', () => {
      const { el } = crear();
      const rotulos = Array.from(el.querySelectorAll('.ft-toolbar .eyebrow')).map((e) => e.textContent?.trim());
      expect(rotulos).toContain('Tipo:');
      expect(rotulos).not.toContain('Período:');
    });

    it('exporta a CSV las filas filtradas', () => {
      const { fixture, component } = crear();
      component.busqueda.set('G-100');
      fixture.detectChanges();
      const csv = component.csvDeFilas(component.paged());
      const lineas = csv.trim().split('\n');
      expect(lineas[0]).toBe('N° factura;Período;Grupo;Importe;Saldo;Tipo;Estado;Emisión');
      expect(lineas.length).toBe(2);
      expect(lineas[1]).toContain('FAC-001');
      expect(lineas[1]).toContain('Emitida');
      expect(lineas[1]).toContain('01/10/2026');
    });

    it('alinea a la derecha los encabezados numéricos y usa números tabulares', () => {
      const { el } = crear();
      const ths = Array.from(el.querySelectorAll('thead th')) as HTMLElement[];
      const importe = ths.find((t) => t.textContent?.trim() === 'Importe');
      const saldo = ths.find((t) => t.textContent?.trim() === 'Saldo');
      expect(importe?.classList.contains('num')).toBe(true);
      expect(saldo?.classList.contains('num')).toBe(true);
      const celdas = el.querySelectorAll('tbody td.num');
      expect(celdas.length).toBe(6);
    });

    it('no repite la columna «Tipo» cuando todas las filas visibles tienen el mismo', () => {
      const { el } = crear();
      const ths = Array.from(el.querySelectorAll('thead th')).map((t) => t.textContent?.trim());
      expect(ths).not.toContain('Tipo');
      expect(el.querySelector('[data-testid="tipo-unico"]')?.textContent).toContain('Mensual');
    });

    it('muestra la columna «Tipo» cuando hay tipos distintos', () => {
      const { el } = crear([filas[0], { ...filas[1], tipoPeriodo: 'ANUAL' }]);
      const ths = Array.from(el.querySelectorAll('thead th')).map((t) => t.textContent?.trim());
      expect(ths).toContain('Tipo');
      expect(el.querySelector('[data-testid="tipo-unico"]')).toBeNull();
    });

    it('muestra el estado en castellano y no el enum técnico', () => {
      const { el } = crear();
      const cuerpo = el.querySelector('tbody')?.textContent ?? '';
      expect(cuerpo).toContain('Emitida');
      expect(cuerpo).not.toContain('EMITIDA');
    });

    it('pinta de rojo el saldo sólo cuando la factura está vencida', () => {
      const { el } = crear();
      const saldos = Array.from(el.querySelectorAll('[data-testid="saldo"]')) as HTMLElement[];
      expect(saldos[0].style.color).not.toContain('accent-red');
      expect(saldos[2].style.color).toContain('accent-red');
      // El saldo cero va en gris apagado.
      expect(saldos[1].style.color).toContain('text-muted');
    });

    it('no pinta de rojo el KPI de vencidas cuando no hay ninguna', () => {
      facturacionApiMock.listarFacturas.mockReturnValueOnce(
        of([{ id: 1, numeroFactura: 'FAC-001', estado: 'EMITIDA', importeTotal: 1000 }]),
      );
      const { el } = crear();
      const vencidas = el.querySelector('[data-testid="kpi-vencidas"]') as HTMLElement;
      expect(vencidas.textContent?.trim()).toBe('0');
      expect(vencidas.style.color).not.toContain('accent-red');
    });

    it('rotula los CITI con ARCA y no con AFIP', () => {
      const { el } = crear();
      const acciones = el.querySelector('.screen-head__actions')?.textContent ?? '';
      expect(acciones).toContain('CITI Ventas (ARCA)');
      expect(acciones).toContain('CITI Compras (ARCA)');
      expect(acciones).not.toContain('AFIP');
    });

    it('la barra de selección ofrece exportar las seleccionadas y «Registrar cobro» sólo con una sola', () => {
      const { fixture, component, el } = crear();
      component.toggleSelect(1);
      fixture.detectChanges();
      let barra = el.querySelector('[data-testid="barra-seleccion"]') as HTMLElement;
      expect(barra.textContent).toContain('Exportar seleccionadas');
      expect(barra.querySelector('[data-testid="cobrar-seleccionada"]')).toBeTruthy();

      component.toggleSelect(3);
      fixture.detectChanges();
      barra = el.querySelector('[data-testid="barra-seleccion"]') as HTMLElement;
      expect(barra.textContent).toContain('Exportar seleccionadas');
      expect(barra.querySelector('[data-testid="cobrar-seleccionada"]')).toBeNull();
      expect(component.filasSeleccionadas().map((f) => f.id)).toEqual([1, 3]);
    });

    it('no ofrece cobrar desde la barra cuando la única seleccionada ya está pagada', () => {
      const { fixture, component, el } = crear();
      component.toggleSelect(2);
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="cobrar-seleccionada"]')).toBeNull();
    });

    it('la ventana de cobro muestra a quién se le cobra (grupo de la factura)', () => {
      const { component } = crear();
      component.openPayModal(filas[0] as never);
      expect(component.payInvoiceContext()?.patientLabel).toBe('Grupo G-100');
    });
  });
});
