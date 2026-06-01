import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FacturacionComponent } from './facturacion.component';
import { FacturacionApiService } from '../../data-access/api/facturacion.api';
import { InstitutionsApiService } from '../../data-access/api/institutions.api';

describe('FacturacionComponent', () => {
  const facturacionApiMock = {
    listarFacturas: vi.fn().mockName('listarFacturas').mockReturnValue(of([
      { id: 1, estado: 'EMITIDA', importeTotal: 1000 },
      { id: 2, estado: 'PAGADA', importeTotal: 500 },
      { id: 3, estado: 'VENCIDA', importeTotal: 250 },
    ])),
    generarMensual: vi.fn().mockName('generarMensual').mockReturnValue(of(null)),
    generarAnual: vi.fn().mockName('generarAnual').mockReturnValue(of(null)),
    registrarPago: vi.fn().mockName('registrarPago').mockReturnValue(of(null)),
  };

  const institutionsApiMock = {
    getAllFacturasInstitucionales: vi.fn().mockName('getAllFacturasInstitucionales').mockReturnValue(of([
      { id: 10, importeTotal: 8000, cantidadMiembrosFacturados: 40, periodoDesde: '2026-05-01', periodoHasta: '2026-05-31', contratoCobertura: { id: 99, nombre: 'Contrato A' } },
    ])),
    getAllContratosActivos: vi.fn().mockName('getAllContratosActivos').mockReturnValue(of([{ id: 99, nombre: 'Contrato A' }])),
    generarFacturaInstitucional: vi.fn().mockName('generarFacturaInstitucional').mockReturnValue(of(null)),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FacturacionComponent],
      providers: [
        { provide: FacturacionApiService, useValue: facturacionApiMock },
        { provide: InstitutionsApiService, useValue: institutionsApiMock },
      ],
    }).compileComponents();
  });

  it('debería calcular KPIs B2C y B2B al iniciar', () => {
    const fixture = TestBed.createComponent(FacturacionComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.kpis().totalFacturado).toBe(1750);
    expect(component.kpis().pendiente).toBe(1000);
    expect(component.kpisInstitucionales().totalFacturado).toBe(8000);
    expect(institutionsApiMock.getAllFacturasInstitucionales).toHaveBeenCalled();
  });
});
