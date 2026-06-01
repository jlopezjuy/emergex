import { vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ManagementDashboardComponent } from './management-dashboard.component';
import { DashboardApiService } from '../../data-access/api/dashboard.api';

describe('ManagementDashboardComponent', () => {
  const dashboardApiMock = {
    comercial: vi.fn().mockName('comercial').mockReturnValue(of({
      totalAfiliadosActivos: 120,
      altasMesActual: 8,
      ingresosMesActual: 320000,
      institucionesActivas: 6,
      facturasCobradas: 50,
      facturasImpagas: 10,
      moraFacturas: 12,
      afiliadosPorPlan: { Basico: 80, Premium: 40 },
      coberturasPorVencer: [
        { coberturaId: 1, pacienteApellido: 'Perez', pacienteNombre: 'Ana', pacienteDni: '123', planNombre: 'Basico', diasRestantes: 5, vigenciaHasta: '2026-06-10' },
      ],
    })),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagementDashboardComponent],
      providers: [
        provideRouter([]),
        { provide: DashboardApiService, useValue: dashboardApiMock },
      ],
    }).compileComponents();
  });

  it('debería cargar datos gerenciales y alertas comerciales', () => {
    const fixture = TestBed.createComponent(ManagementDashboardComponent);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
    expect(component.error()).toBeNull();
    expect(component.data()?.institucionesActivas).toBe(6);
    expect(component.planSegments().length).toBe(2);
  });
});
