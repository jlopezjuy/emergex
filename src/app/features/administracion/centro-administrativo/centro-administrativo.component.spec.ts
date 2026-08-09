import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CentroAdministrativoComponent } from './centro-administrativo.component';
import { BandejasApi } from '../../../data-access/api/bandejas.api';
import { BandejaTrabajoResumenDTO } from '../../../data-access/dto/bandejas.dto';

describe('CentroAdministrativoComponent', () => {
  let bandejasApiMock: {
    getResumen: ReturnType<typeof vi.fn>;
  };

  const mockResumen: BandejaTrabajoResumenDTO = {
    ticketsPendientesTarifacion: 5,
    facturasPendientesCobro: 12,
    debitosPendientesReclamo: 2,
    promesasIncumplidas: 1,
    clientesEnMoraCritica: 3,
    ordenesCompraPendientesAprobacion: 4,
    ordenesPagoPendientesAprobacion: 2,
    contratosPorVencer: 6,
    contratosVencidos: 1,
    itemsFacturacion: [
      { categoria: 'TARIFACION', titulo: 'Ticket #101 sin precio', detalle: 'Emergencia sin valorizar', severidad: 'ALTA', entidadTipo: 'AFILIADO', entidadId: 10 }
    ],
    itemsCobranzas: [
      { categoria: 'MORA', titulo: 'Cliente en Mora 90+ días', detalle: 'Saldo $50.000', severidad: 'MEDIA', entidadTipo: 'TERCERO', entidadId: 5 }
    ],
    itemsCompras: [],
    itemsContratos: []
  };

  beforeEach(() => {
    bandejasApiMock = {
      getResumen: vi.fn().mockReturnValue(of(mockResumen))
    };
  });

  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [CentroAdministrativoComponent],
      providers: [
        provideRouter([]),
        { provide: BandejasApi, useValue: bandejasApiMock }
      ]
    }).compileComponents();
  };

  it('debería cargar el resumen de bandejas de trabajo y mostrar KPIs', async () => {
    await setup();
    const fixture = TestBed.createComponent(CentroAdministrativoComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.loading()).toBe(false);
    expect(component.resumen()?.ticketsPendientesTarifacion).toBe(5);
    expect(component.resumen()?.itemsFacturacion.length).toBe(1);
  });

  it('debería filtrar ítems por severidad', async () => {
    await setup();
    const fixture = TestBed.createComponent(CentroAdministrativoComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component.severidadFiltro.set('ALTA');

    expect(component.filteredFacturacion().length).toBe(1);
    expect(component.filteredCobranzas().length).toBe(0);
  });

  it('debería manejar errores de la API estableciendo el estado de error', async () => {
    bandejasApiMock.getResumen.mockReturnValue(throwError(() => new Error('HTTP 500')));
    await setup();

    const fixture = TestBed.createComponent(CentroAdministrativoComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('No se pudo cargar el resumen del centro administrativo.');
  });
});
