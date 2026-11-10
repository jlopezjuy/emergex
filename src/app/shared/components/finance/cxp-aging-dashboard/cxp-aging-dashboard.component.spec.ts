import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CxpAgingDashboardComponent } from './cxp-aging-dashboard.component';
import { ReportesApiService } from '../../../../data-access/api/reportes.api';
import { of, throwError } from 'rxjs';
import { ReporteComprasDTO } from '../../../../data-access/dto/reportes.dto';
import { vi } from 'vitest';

describe('CxpAgingDashboardComponent', () => {
  let component: CxpAgingDashboardComponent;
  let fixture: ComponentFixture<CxpAgingDashboardComponent>;
  let reportesApiSpy: { compras: ReturnType<typeof vi.fn> };

  const mockReporte: ReporteComprasDTO = {
    totalCuentasPorPagar: 85000,
    gastoPorProveedor: [{ proveedorId: 1, razonSocial: 'Droguería Central', totalGasto: 50000 }],
  };

  beforeEach(async () => {
    reportesApiSpy = {
      compras: vi.fn().mockReturnValue(of(mockReporte)),
    };

    await TestBed.configureTestingModule({
      imports: [CxpAgingDashboardComponent],
      providers: [{ provide: ReportesApiService, useValue: reportesApiSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(CxpAgingDashboardComponent);
    component = fixture.componentInstance;
  });

  it('debería instanciar el componente y cargar los datos de compras y cuentas por pagar', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
    expect(reportesApiSpy.compras).toHaveBeenCalled();
    expect(component.loading()).toBe(false);
    expect(component.totalCuentasPorPagar()).toBe(85000);
  });

  it('debería mostrar estado de error si el endpoint falla', () => {
    reportesApiSpy.compras.mockReturnValue(throwError(() => new Error('HTTP 500')));
    fixture.detectChanges();
    expect(component.loading()).toBe(false);
    expect(component.error()).toBeTruthy();
  });
});
