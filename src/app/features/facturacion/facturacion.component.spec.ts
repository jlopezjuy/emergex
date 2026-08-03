import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FacturacionComponent } from './facturacion.component';
import { FacturacionApiService } from '../../data-access/api/facturacion.api';
import { InstitutionsApiService } from '../../data-access/api/institutions.api';

describe('FacturacionComponent (Comprehensive TDD Spec)', () => {
  const facturacionApiMock = {
    listarFacturas: vi.fn().mockName('listarFacturas').mockReturnValue(of([
      { id: 1, numeroFactura: 'FAC-001', estado: 'EMITIDA', importeTotal: 1000 },
      { id: 2, numeroFactura: 'FAC-002', estado: 'PAGADA', importeTotal: 500 },
      { id: 3, numeroFactura: 'FAC-003', estado: 'VENCIDA', importeTotal: 250 },
    ])),
    generarMensual: vi.fn().mockName('generarMensual').mockReturnValue(of({
      mes: 5,
      anio: 2026,
      totalGeneradas: 1,
      totalOmitidas: 0,
      facturasGeneradas: [{ id: 4, numeroFactura: 'FAC-004', estado: 'EMITIDA', importeTotal: 1200 }],
    })),
    generarAnual: vi.fn().mockName('generarAnual').mockReturnValue(of(null)),
    registrarPago: vi.fn().mockName('registrarPago').mockReturnValue(of(null)),
  };

  const institutionsApiMock = {
    getAllFacturasInstitucionales: vi.fn().mockName('getAllFacturasInstitucionales').mockReturnValue(of([
      { id: 10, importeTotal: 8000, cantidadMiembrosFacturados: 40, periodoDesde: '2026-05-01', periodoHasta: '2026-05-31', contratoCobertura: { id: 99, nombre: 'Contrato A' } },
    ])),
    getAllContratosActivos: vi.fn().mockName('getAllContratosActivos').mockReturnValue(of([{ id: 99, nombre: 'Contrato A' }])),
    generarFacturaInstitucional: vi.fn().mockName('generarFacturaInstitucional').mockReturnValue(of({
      id: 11,
      importeTotal: 15000,
      cantidadMiembrosFacturados: 50,
      periodoDesde: '2026-05-01',
      periodoHasta: '2026-05-31',
    })),
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

  it('debería manejar errores de la API durante la generación de facturas de forma segura', () => {
    facturacionApiMock.generarMensual.mockReturnValueOnce(throwError(() => new Error('Error ARCA 500')));

    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.confirmarGenerar();

    expect(component.generando()).toBe(false);
    expect(component.generarError()).toContain('Error ARCA 500');
  });

  it('debería permitir abrir el modal para generar facturas institucionales B2B', () => {
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.abrirModalGenerarInst();

    expect(component.showGenerarInstModal()).toBe(true);
    expect(component.contratosActivos().length).toBe(1);
  });

  it('debería generar una factura institucional B2B y actualizar la lista', () => {
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.abrirModalGenerarInst();
    component.genInstContratoId = 99;
    component.genInstPeriodoDesde = '2026-05-01';
    component.genInstPeriodoHasta = '2026-05-31';

    component.confirmarGenerarInst();

    expect(institutionsApiMock.generarFacturaInstitucional).toHaveBeenCalledWith({
      contratoId: 99,
      periodoDesde: '2026-05-01',
      periodoHasta: '2026-05-31',
      observaciones: '',
    });
    expect(component.showGenerarInstModal()).toBe(false);
  });
});
