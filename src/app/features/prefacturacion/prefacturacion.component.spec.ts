import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrefacturacionComponent } from './prefacturacion.component';
import { PrefacturacionApiService } from '../../data-access/api/prefacturacion.api';
import { UserFeedbackService } from '../../core/notifications/user-feedback.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('PrefacturacionComponent', () => {
  let fixture: ComponentFixture<PrefacturacionComponent>;
  let apiMock: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    apiMock = {
      listarLotes: vi.fn().mockReturnValue(of([])),
      obtenerLote: vi.fn().mockReturnValue(of(null)),
      crearLote: vi.fn().mockReturnValue(of(null)),
      confirmarLote: vi.fn().mockReturnValue(of(null)),
      emitirLote: vi.fn().mockReturnValue(of(null)),
      excluirTicket: vi.fn().mockReturnValue(of(undefined)),
      generarLineas: vi.fn().mockReturnValue(of(null)),
      listarPendientesTarifacion: vi.fn().mockReturnValue(of([])),
      tarifarManual: vi.fn().mockReturnValue(of({ id: 10, estadoTarifacion: 'TARIFA_MANUAL' })),
    };

    await TestBed.configureTestingModule({
      imports: [PrefacturacionComponent],
      providers: [
        { provide: PrefacturacionApiService, useValue: apiMock },
        { provide: UserFeedbackService, useValue: { push: vi.fn(), fromHttpError: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrefacturacionComponent);
    fixture.detectChanges();
  });

  it('con lista de lotes vacía, muestra un mensaje honesto sin la advertencia de S0-3', () => {
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).not.toContain('La generación automática de líneas todavía no está disponible');
    expect(texto).toContain('No hay lotes de prefacturación');
  });

  it('para un lote en BORRADOR, generar líneas invoca la API con el período ingresado', () => {
    const lote = { id: 5, fechaCreacion: '2026-08-01', estado: 'BORRADOR' as const, financiadorNombre: 'OSDE', totalTickets: 0 };
    (apiMock['obtenerLote'] as ReturnType<typeof vi.fn>).mockReturnValue(of(lote));
    const component = fixture.componentInstance;

    component.selectLote(lote);
    fixture.detectChanges();

    component.openGenerarLineasModal();
    component.generarDesde.set('2026-08-01');
    component.generarHasta.set('2026-08-31');
    component.generarLineas();

    expect(apiMock['generarLineas']).toHaveBeenCalledWith(5, '2026-08-01', '2026-08-31');
  });

  it('para un lote en CONFIRMADO, emitir invoca el endpoint de emisión, no el de confirmación (H-13)', () => {
    const lote = { id: 7, fechaCreacion: '2026-08-01', estado: 'CONFIRMADO' as const, financiadorNombre: 'OSDE', totalTickets: 3 };
    const loteEmitido = { ...lote, estado: 'EMITIDO' as const };
    (apiMock['obtenerLote'] as ReturnType<typeof vi.fn>).mockReturnValue(of(lote));
    (apiMock['emitirLote'] as ReturnType<typeof vi.fn>).mockReturnValue(of(loteEmitido));
    const component = fixture.componentInstance;

    component.selectLote(lote);
    fixture.detectChanges();

    component.emitirLote(7);

    expect(apiMock['emitirLote']).toHaveBeenCalledWith(7);
    expect(apiMock['confirmarLote']).not.toHaveBeenCalled();
  });

  it('ejecutarTarifacionManual invoca el endpoint tarifarManual con los valores del modal (H-06b / H-18)', () => {
    const component = fixture.componentInstance;
    const ticket = { id: 101, numeroTicket: 'TK-101', tipoAsistencia: 'EMERGENCIA_DOMICILIARIA', estadoActual: 'COMPLETADO' };

    component.abrirModalTarifarManual(ticket);
    component.manualCargoBase.set(4500);
    component.manualCostoEspera.set(1000);
    component.manualMotivo.set('Tarifación autorizada por operador');
    component.ejecutarTarifacionManual();

    expect(apiMock['tarifarManual']).toHaveBeenCalledWith(101, {
      cargoBase: 4500,
      costoEspera: 1000,
      motivo: 'Tarifación autorizada por operador',
    });
  });
});
