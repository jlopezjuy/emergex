import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CentroAdministrativoComponent } from './centro-administrativo.component';
import { BandejasApi } from '../../../data-access/api/bandejas.api';
import {
  BandejaTrabajoResumenDTO,
  ResumenBandejaCoberturaDTO
} from '../../../data-access/dto/bandejas.dto';

describe('CentroAdministrativoComponent', () => {
  let bandejasApiMock: {
    getResumen: ReturnType<typeof vi.fn>;
    getResumenCobertura: ReturnType<typeof vi.fn>;
    getKpisAdministrativos: ReturnType<typeof vi.fn>;
  };

  const mockKpis = [
    {
      codigo: 'O-01',
      nombre: 'Producción Pendiente',
      descripcion: 'Detalle',
      formula: 'sum(...)',
      periodo: 'Mes actual',
      exclusiones: 'Ninguna',
      valorNumerico: 15000,
      valorFormateado: '$ 15.000,00',
      unidad: 'ARS',
      estadoSalud: 'OPTIMO',
      drillDown: [
        { entidadId: 1, tipoEntidad: 'PRESTACION', identificador: '#1', descripcion: 'Atención', importe: 15000, fecha: '2026-08-25', responsable: 'Auditor', estado: 'PENDIENTE' }
      ]
    }
  ];

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
      { categoria: 'TARIFACION', titulo: 'Ticket #101 sin precio', detalle: 'Emergencia sin valorizar', severidad: 'URGENTE', entidadTipo: 'TICKET', entidadId: 10 }
    ],
    itemsCobranzas: [
      { categoria: 'MORA', titulo: 'Débito pendiente', detalle: 'Saldo $50.000', severidad: 'ATENCION', entidadTipo: 'DEBITO', entidadId: 5 }
    ],
    itemsCompras: [],
    itemsContratos: [
      { categoria: 'CONTRATOS', titulo: 'Contrato vencido', detalle: 'Renovación requerida', severidad: 'CRITICA', entidadTipo: 'CONTRATO', entidadId: 2 }
    ]
  };

  const mockResumenCobertura: ResumenBandejaCoberturaDTO = {
    totalAtenciones: 15,
    totalImporteEstimado: 185000,
    atencionesSinFinanciadorCount: 2,
    atencionesPendientesIdentificarCount: 1,
    atencionesCubiertasPorAbonoCount: 4,
    desgloseFinanciadores: [
      {
        terceroEmpresaId: 10,
        nombreFinanciador: 'OSDE',
        cuit: '30-54674125-3',
        cantidadAtenciones: 8,
        importeEstimado: 120000
      }
    ],
    atencionesSinFinanciador: [
      {
        registroPrestacionId: 101,
        ticketId: 1001,
        numeroTicket: 'TCK-SIN-01',
        fecha: '2026-08-17T03:00:00Z',
        prestacionNombre: 'Código Rojo',
        modalidadCobertura: 'PARTICULAR',
        importeUnitario: 25000
      }
    ],
    atencionesPendientesIdentificar: [
      {
        registroPrestacionId: 102,
        ticketId: 1002,
        numeroTicket: 'TCK-NN-01',
        fecha: '2026-08-17T04:00:00Z',
        prestacionNombre: 'Emergencia Vía Pública',
        estadoIdentificacion: 'NO_IDENTIFICADO',
        sujetoNombre: 'NN'
      }
    ],
    atencionesCubiertasPorAbono: [],
    atencionesDocumentacionIncompleta: []
  };

  beforeEach(() => {
    bandejasApiMock = {
      getResumen: vi.fn().mockReturnValue(of(mockResumen)),
      getResumenCobertura: vi.fn().mockReturnValue(of(mockResumenCobertura)),
      getKpisAdministrativos: vi.fn().mockReturnValue(of(mockKpis))
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

  it('debería cargar el resumen de bandejas de trabajo, cobertura y mostrar KPIs', async () => {
    await setup();
    const fixture = TestBed.createComponent(CentroAdministrativoComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.loading()).toBe(false);
    expect(component.kpis().length).toBe(1);
    expect(component.kpis()[0].codigo).toBe('O-01');
    expect(component.resumen()?.ticketsPendientesTarifacion).toBe(5);
    expect(component.resumenCobertura()?.totalAtenciones).toBe(15);
    expect(component.resumenCobertura()?.desgloseFinanciadores.length).toBe(1);
    expect(component.resumenCobertura()?.atencionesSinFinanciadorCount).toBe(2);
    expect(component.resumenCobertura()?.atencionesPendientesIdentificarCount).toBe(1);
  });

  it('debería filtrar ítems por severidades reales (CRITICA, URGENTE, ATENCION, TODAS)', async () => {
    await setup();
    const fixture = TestBed.createComponent(CentroAdministrativoComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;

    // TODAS
    component.severidadFiltro.set('TODAS');
    expect(component.filteredFacturacion().length).toBe(1);
    expect(component.filteredCobranzas().length).toBe(1);
    expect(component.filteredContratos().length).toBe(1);

    // CRITICA
    component.severidadFiltro.set('CRITICA');
    expect(component.filteredContratos().length).toBe(1);
    expect(component.filteredFacturacion().length).toBe(0);
    expect(component.filteredCobranzas().length).toBe(0);

    // URGENTE
    component.severidadFiltro.set('URGENTE');
    expect(component.filteredFacturacion().length).toBe(1);
    expect(component.filteredContratos().length).toBe(0);

    // ATENCION
    component.severidadFiltro.set('ATENCION');
    expect(component.filteredCobranzas().length).toBe(1);
    expect(component.filteredContratos().length).toBe(0);
  });

  it('debería mapear severidades reales a badges correspondientes (CRITICA->critical, URGENTE->urgent, ATENCION->info)', async () => {
    await setup();
    const fixture = TestBed.createComponent(CentroAdministrativoComponent);
    const component = fixture.componentInstance;

    expect(component.mapSeveridadBadge('CRITICA')).toBe('critical');
    expect(component.mapSeveridadBadge('URGENTE')).toBe('urgent');
    expect(component.mapSeveridadBadge('ATENCION')).toBe('info');
    expect(component.mapSeveridadBadge('DESCONOCIDA')).toBe('info');
  });

  it('debería manejar errores de la API estableciendo el estado de error', async () => {
    bandejasApiMock.getResumen.mockReturnValue(throwError(() => new Error('HTTP 500')));
    bandejasApiMock.getResumenCobertura.mockReturnValue(throwError(() => new Error('HTTP 500')));
    bandejasApiMock.getKpisAdministrativos.mockReturnValue(throwError(() => new Error('HTTP 500')));
    await setup();

    const fixture = TestBed.createComponent(CentroAdministrativoComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.loading()).toBe(false);
    expect(component.error()).toBe('No se pudo cargar el resumen del centro administrativo.');
  });
});
