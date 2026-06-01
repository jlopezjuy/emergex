import { beforeEach, describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { InstitutionsComponent } from './institutions.component';
import { InstitutionsApiService } from '../../data-access/api/institutions.api';
import { PlanComercialApiService } from '../../data-access/api/plan-comercial.api';
import { SessionStore } from '../../core/stores/session.store';

describe('InstitutionsComponent', () => {
  const institutionsApiMock = {
    getAll: vi.fn().mockName('getAll').mockReturnValue(of([
      {
        id: '1',
        name: 'Colegio Norte',
        razonSocial: 'Colegio Norte SA',
        cuit: '20-12345678-9',
        type: 'colegio',
        status: 'ACTIVA',
        plan: 'Plan Comercial Institucional',
      },
    ])),
    getMiembros: vi.fn().mockName('getMiembros').mockReturnValue(of([{ id: 1 }, { id: 2 }])),
    getEstadoDeudaInstitucion: vi.fn().mockName('getEstadoDeudaInstitucion').mockReturnValue(of({ totalFacturado: 50000, saldoPendiente: 12000 })),
    getAllFacturasInstitucionales: vi.fn().mockName('getAllFacturasInstitucionales').mockReturnValue(of([])),
    getPagosFacturaInstitucional: vi.fn().mockName('getPagosFacturaInstitucional').mockReturnValue(of([{ id: 1, montoTotal: 1000 }])),
  };

  const plansApiMock = {
    getAll: vi.fn().mockName('getAll').mockReturnValue(of([
      {
        id: '10',
        name: 'Plan Comercial Institucional',
        tier: 'medio',
        pricing: { monthly: 10000 },
      },
    ])),
  };

  const sessionStoreMock = {
    hasAnyRole: vi.fn().mockName('hasAnyRole').mockReturnValue(true),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InstitutionsComponent],
      providers: [
        { provide: InstitutionsApiService, useValue: institutionsApiMock },
        { provide: PlanComercialApiService, useValue: plansApiMock },
        { provide: SessionStore, useValue: sessionStoreMock },
      ],
    }).compileComponents();
  });

  it('debería cargar resumen 360 institucional con KPIs básicos', () => {
    const fixture = TestBed.createComponent(InstitutionsComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.institutions().length).toBe(1);
    expect(component.counts().members).toBe(2);
    expect(component.totalFacturadoInstitucional()).toBe(50000);
    expect(component.totalDeudaInstitucional()).toBe(12000);
    expect(institutionsApiMock.getEstadoDeudaInstitucion).toHaveBeenCalledWith(1);
  });

  it('debería cargar pagos del modal al cambiar factura', () => {
    const fixture = TestBed.createComponent(InstitutionsComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.paymentFacturaId = 77;
    component.onPaymentFacturaChange();
    expect(institutionsApiMock.getPagosFacturaInstitucional).toHaveBeenCalledWith(77);
    expect(component.pagosFacturaModal().length).toBe(1);
  });
});
