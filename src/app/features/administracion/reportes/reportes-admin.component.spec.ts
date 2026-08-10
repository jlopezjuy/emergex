import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReportesAdminComponent } from './reportes-admin.component';
import { ReportesApiService } from '../../../data-access/api/reportes.api';
import { of, throwError } from 'rxjs';
import { ReporteFinancieroDTO, ReporteComprasDTO, ReportePadronContratosDTO } from '../../../data-access/dto/reportes.dto';
import { vi } from 'vitest';

describe('ReportesAdminComponent', () => {
  let component: ReportesAdminComponent;
  let fixture: ComponentFixture<ReportesAdminComponent>;
  let reportesApiSpy: {
    financiero: ReturnType<typeof vi.fn>;
    compras: ReturnType<typeof vi.fn>;
    padronContratos: ReturnType<typeof vi.fn>;
  };

  const mockFinanciero: ReporteFinancieroDTO = {
    totalCobranza: 100000,
    totalDeuda: 20000,
    totalDebitos: 5000,
    aging: { total0a30: 10000, total31a60: 5000, total61a90: 3000, total90Mas: 2000 },
  };

  const mockCompras: ReporteComprasDTO = {
    totalCuentasPorPagar: 45000,
    gastoPorProveedor: [{ proveedorId: 1, razonSocial: 'FarmaCorp', totalGasto: 30000 }],
  };

  const mockPadron: ReportePadronContratosDTO = {
    totalAfiliadosActivos: 500,
    altasEnPeriodo: 20,
    bajasEnPeriodo: 5,
    contratosActivos: 10,
  };

  beforeEach(async () => {
    reportesApiSpy = {
      financiero: vi.fn().mockReturnValue(of(mockFinanciero)),
      compras: vi.fn().mockReturnValue(of(mockCompras)),
      padronContratos: vi.fn().mockReturnValue(of(mockPadron)),
    };

    await TestBed.configureTestingModule({
      imports: [ReportesAdminComponent],
      providers: [{ provide: ReportesApiService, useValue: reportesApiSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportesAdminComponent);
    component = fixture.componentInstance;
  });

  it('debería cargar los tres reportes al inicializar', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(reportesApiSpy.financiero).toHaveBeenCalled();
    expect(reportesApiSpy.compras).toHaveBeenCalled();
    expect(reportesApiSpy.padronContratos).toHaveBeenCalled();
    expect(component.financiero()?.totalCobranza).toBe(100000);
    expect(component.compras()?.totalCuentasPorPagar).toBe(45000);
    expect(component.padron()?.totalAfiliadosActivos).toBe(500);
  });

  it('debería cambiar de pestaña activa entre financiero, compras y padron', () => {
    fixture.detectChanges();
    expect(component.tabActiva()).toBe('FINANCIERO');
    component.setTab('COMPRAS');
    expect(component.tabActiva()).toBe('COMPRAS');
    component.setTab('PADRON');
    expect(component.tabActiva()).toBe('PADRON');
  });

  it('debería manejar errores de API en la carga', () => {
    reportesApiSpy.financiero.mockReturnValue(throwError(() => new Error('Error backend')));
    reportesApiSpy.compras.mockReturnValue(throwError(() => new Error('Error backend')));
    reportesApiSpy.padronContratos.mockReturnValue(throwError(() => new Error('Error backend')));
    fixture.detectChanges();
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeTruthy();
  });
});
