import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PatientDetailDrawerComponent } from './patient-detail-drawer.component';
import { PatientRow } from '../../patients.component';
import { FichaAfiliadoDTO } from '../../../../data-access/dto/patient.dto';

function makePatient(): PatientRow {
  return {
    pacienteId: 1,
    id: 'AF-1',
    name: 'Test',
    dni: '1',
    type: 'titular',
    status: 'indefinido',
    sinceMonth: '—',
    planNombre: 'Plan',
    planColor: '#000',
    depCount: 0,
    _raw: {} as never,
  };
}

describe('PatientDetailDrawerComponent — BUG-E2E-004/006', () => {
  let component: PatientDetailDrawerComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientDetailDrawerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    const fixture = TestBed.createComponent(PatientDetailDrawerComponent);
    fixture.componentRef.setInput('patient', makePatient());
    component = fixture.componentInstance;
  });

  describe('getMontoCuota — fuente real, sin fallback hardcodeado (BUG-E2E-004)', () => {
    it('retorna null si no hay cobertura (no inventa monto)', () => {
      expect(component.getMontoCuota(null)).toBeNull();
    });

    it('prioriza precioMensualAcordado si el backend lo expone', () => {
      const ficha = { cobertura: { precioMensualAcordado: 4500, precioMensual: 9999 } } as unknown as FichaAfiliadoDTO;
      expect(component.getMontoCuota(ficha)).toBe(4500);
    });

    it('usa el precio real del plan si no hay precio acordado', () => {
      const ficha = { cobertura: { precioMensual: 4500 } } as unknown as FichaAfiliadoDTO;
      expect(component.getMontoCuota(ficha)).toBe(4500);
    });

    it('retorna null si no hay precio acordado ni precio de plan (sin hardcode)', () => {
      const ficha = { cobertura: { nivel: 'basico' } } as unknown as FichaAfiliadoDTO;
      expect(component.getMontoCuota(ficha)).toBeNull();
    });
  });

  describe('fmtCurrency — maneja null (BUG-E2E-004)', () => {
    it('devuelve guion para montos desconocidos', () => {
      expect(component.fmtCurrency(null)).toBe('—');
      expect(component.fmtCurrency(undefined)).toBe('—');
    });
  });

  describe('getProximoVencimientoDetalle — estado neutral (BUG-E2E-006)', () => {
    it('no presenta "En deuda" cuando el estado es indefinido', () => {
      expect(component.getProximoVencimientoDetalle('indefinido')).toBe('sin datos de deuda');
    });
  });

  describe('rolLabel — rol real del miembro (BUG-E2E-003)', () => {
    it('muestra "Titular" para el rol TITULAR (no "Hijo/a")', () => {
      expect(component.rolLabel('TITULAR')).toBe('Titular');
    });
    it('muestra "Cónyuge" para CO_TITULAR', () => {
      expect(component.rolLabel('CO_TITULAR')).toBe('Cónyuge');
    });
    it('muestra "Hijo/a" para un dependiente', () => {
      expect(component.rolLabel('DEPENDIENTE')).toBe('Hijo/a');
    });
  });
});
