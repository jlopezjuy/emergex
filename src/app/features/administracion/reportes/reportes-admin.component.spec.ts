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

  const colorDeEtiqueta = (label: string): string => {
    const span = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('emx-kpi-card span')).find(
      (s) => s.textContent?.trim() === label,
    ) as HTMLElement | undefined;
    return span?.getAttribute('style') ?? '';
  };

  it('does not paint «Total deuda pendiente» red when it is zero (S3)', () => {
    reportesApiSpy.financiero.mockReturnValue(of({ ...mockFinanciero, totalDeuda: 0 }));
    fixture.detectChanges();
    expect(colorDeEtiqueta('Total deuda pendiente')).not.toContain('accent-red');
  });

  it('uses plain Spanish labels with no ampersands or abbreviations (S2)', () => {
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('&');
    expect(text).not.toContain('Aging');
    expect(text).not.toContain('CxP');
    expect(text).toContain('Financiero y antigüedad de deuda');
  });

  it('shows contract due dates as dd/mm/aaaa (S2)', () => {
    reportesApiSpy.padronContratos.mockReturnValue(
      of({
        ...mockPadron,
        resumenContratosPorVencer: [{ contratoId: 1, numeroContrato: 'C-1', institucionNombre: 'Club', fechaVencimiento: '2026-12-31', diasParaVencer: 10 }],
      }),
    );
    fixture.detectChanges();
    component.setTab('PADRON');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('31/12/2026');
    expect(text).not.toContain('2026-12-31');
  });
});
