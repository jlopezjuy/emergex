import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FacturacionComponent } from './facturacion.component';
import { FacturacionApiService } from '../../data-access/api/facturacion.api';
import { InstitutionsApiService } from '../../data-access/api/institutions.api';

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

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [FacturacionComponent],
      providers: [
        { provide: FacturacionApiService, useValue: facturacionApiMock },
        { provide: InstitutionsApiService, useValue: institutionsApiMock },
      ],
    }).compileComponents();
  });

  it('debería calcular correctamente los KPIs B2C y B2B al iniciar el componente', () => {
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.kpis().totalFacturado).toBe(1750);
    expect(component.kpis().pendiente).toBe(1000);
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
    expect(banner.textContent).toContain('MODO PRUEBAS AFIP');
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

  it('debería ejecutar la anulación masiva y reportar el resultado por ítem', () => {
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    component.toggleSelect(1);
    expect(component.selectedCount()).toBe(1);

    component.ejecutarAnulacionMasiva();
    expect(component.selectedCount()).toBe(0);
  });
});
