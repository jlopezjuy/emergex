import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CxcAgingDashboardComponent } from './cxc-aging-dashboard.component';
import { ReportesApiService } from '../../../../data-access/api/reportes.api';
import { of, throwError } from 'rxjs';
import { ReporteFinancieroDTO } from '../../../../data-access/dto/reportes.dto';
import { vi } from 'vitest';

describe('CxcAgingDashboardComponent', () => {
  let component: CxcAgingDashboardComponent;
  let fixture: ComponentFixture<CxcAgingDashboardComponent>;
  let reportesApiSpy: { financiero: ReturnType<typeof vi.fn> };

  const mockReporte: ReporteFinancieroDTO = {
    aging: {
      totalSaldoDeuda: 50000,
      total0a30: 25000,
      total31a60: 15000,
      total61a90: 7000,
      total90Mas: 3000,
    },
  };

  beforeEach(async () => {
    reportesApiSpy = {
      financiero: vi.fn().mockReturnValue(of(mockReporte)),
    };

    await TestBed.configureTestingModule({
      imports: [CxcAgingDashboardComponent],
      providers: [{ provide: ReportesApiService, useValue: reportesApiSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(CxcAgingDashboardComponent);
    component = fixture.componentInstance;
  });

  it('debería instanciar el componente y cargar los datos de aging', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(reportesApiSpy.financiero).toHaveBeenCalled();
    expect(component.loading()).toBe(false);
    expect(component.aging()?.total0a30).toBe(25000);
    expect(component.aging()?.total90Mas).toBe(3000);
  });

  it('debería mostrar estado de error si el endpoint falla', () => {
    reportesApiSpy.financiero.mockReturnValue(throwError(() => new Error('HTTP 500')));
    fixture.detectChanges();
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeTruthy();
  });
});
