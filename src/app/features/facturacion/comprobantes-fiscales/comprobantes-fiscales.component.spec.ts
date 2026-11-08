import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ComprobantesFiscalesComponent } from './comprobantes-fiscales.component';
import { ComprobantesFiscalesApiService, ComprobanteFiscalDTO } from '../../../data-access/api/comprobantes-fiscales.api';
import { ArcaStatusDTO } from '../../../data-access/api/facturacion.api';

describe('ComprobantesFiscalesComponent (TDD Spec - S6-T2)', () => {
  let fixture: ComponentFixture<ComprobantesFiscalesComponent>;
  let component: ComprobantesFiscalesComponent;

  const mockComprobantes: ComprobanteFiscalDTO[] = [
    {
      id: 1,
      documentoComercialId: 101,
      tipoComprobante: 'FACTURA_A',
      puntoVenta: 4,
      numeroComprobante: 1,
      fechaEmision: '2026-08-17',
      montoTotal: 12100,
      cae: '74391234567890',
      vencimientoCae: '2026-08-27',
      estado: 'AUTORIZADO',
      retryCount: 0,
      maxRetries: 5,
      createdAt: '2026-08-17T10:00:00Z',
      receptorNombre: 'OSDE',
    },
    {
      id: 2,
      documentoComercialId: 102,
      tipoComprobante: 'FACTURA_B',
      puntoVenta: 4,
      numeroComprobante: 2,
      fechaEmision: '2026-08-17',
      montoTotal: 5000,
      cae: null,
      vencimientoCae: null,
      estado: 'PENDIENTE_CAE',
      retryCount: 1,
      maxRetries: 5,
      createdAt: '2026-08-17T11:00:00Z',
      receptorNombre: 'Particular',
    },
    {
      id: 3,
      documentoComercialId: 103,
      tipoComprobante: 'FACTURA_A',
      puntoVenta: 4,
      numeroComprobante: 3,
      fechaEmision: '2026-08-17',
      montoTotal: 8500,
      cae: null,
      vencimientoCae: null,
      estado: 'RECHAZADO_ARCA',
      retryCount: 5,
      maxRetries: 5,
      lastError: 'El CUIT del receptor no se encuentra activo en AFIP (Error 10014)',
      createdAt: '2026-08-17T12:00:00Z',
      receptorNombre: 'Swiss Medical',
    },
  ];

  const mockArcaStatusNormal: ArcaStatusDTO = {
    arcaEnabled: true,
    caeSimuladoHabilitado: false,
    modoPruebas: false,
  };

  const mockArcaStatusSimulado: ArcaStatusDTO = {
    arcaEnabled: false,
    caeSimuladoHabilitado: true,
    modoPruebas: true,
  };

  const apiMock = {
    listarComprobantes: vi.fn().mockReturnValue(of(mockComprobantes)),
    emitirComprobante: vi.fn().mockReturnValue(of(mockComprobantes[1])),
    getArcaStatus: vi.fn().mockReturnValue(of(mockArcaStatusNormal)),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    apiMock.listarComprobantes.mockReturnValue(of(mockComprobantes));
    apiMock.getArcaStatus.mockReturnValue(of(mockArcaStatusNormal));

    await TestBed.configureTestingModule({
      imports: [ComprobantesFiscalesComponent],
      providers: [
        { provide: ComprobantesFiscalesApiService, useValue: apiMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ComprobantesFiscalesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('muestra los comprobantes devueltos por el servicio', () => {
    expect(component.comprobantes().length).toBe(3);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('FACTURA_A');
    expect(compiled.textContent).toContain('FACTURA_B');
    expect(compiled.textContent).toContain('12.100,00');
  });

  it('muestra PENDIENTE_CAE como estado en tramite y no como error', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const pendienteEl = compiled.querySelector('[data-testid="estado-PENDIENTE_CAE"]');
    expect(pendienteEl).toBeTruthy();
    expect(pendienteEl?.textContent?.toLowerCase()).toContain('en trámite');
    expect(pendienteEl?.classList.contains('text-red-500')).toBe(false);
  });

  it('muestra el banner de modo simulado cuando arca no esta habilitado', () => {
    apiMock.getArcaStatus.mockReturnValue(of(mockArcaStatusSimulado));
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.isModoSimulado()).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    const banner = compiled.querySelector('[data-testid="banner-modo-simulado"]');
    expect(banner).toBeTruthy();
    expect(banner?.textContent).toContain('sin validez fiscal');
  });

  it('deshabilita el boton emitir mientras hay una emision en curso', () => {
    const emitSubject = new Subject<ComprobanteFiscalDTO>();
    apiMock.emitirComprobante.mockReturnValue(emitSubject.asObservable());

    component.documentoIdInput.set(105);
    fixture.detectChanges();

    component.emitirComprobante();
    fixture.detectChanges();

    expect(component.emitLoading()).toBe(true);

    const compiled = fixture.nativeElement as HTMLElement;
    const botonEmitir = compiled.querySelector('[data-testid="btn-emitir"]') as HTMLButtonElement;
    expect(botonEmitir.disabled).toBe(true);

    emitSubject.next(mockComprobantes[1]);
    emitSubject.complete();
    fixture.detectChanges();

    expect(component.emitLoading()).toBe(false);
    expect(botonEmitir.disabled).toBe(false);
  });

  it('muestra el ultimo error cuando el estado es RECHAZADO_ARCA', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const errorEl = compiled.querySelector('[data-testid="error-3"]');
    expect(errorEl).toBeTruthy();
    expect(errorEl?.textContent).toContain('Error 10014');
  });
});
