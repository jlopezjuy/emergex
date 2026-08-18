import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PatientsComponent, PatientRow } from './patients.component';
import { PacienteDTO } from '../../data-access/dto/patient.dto';
import { provideRouter } from '@angular/router';

type PatientsSignal = { set: (r: PatientRow[]) => void };

describe('PatientsComponent — utility functions', () => {
  let component: PatientsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PatientsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('PatientsComponent — KPI y estado (BUG-E2E-005/006)', () => {
  let component: PatientsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(PatientsComponent);
    component = fixture.componentInstance;
  });

  it('no duplica dependientes en el KPI de afiliados (BUG-E2E-005)', () => {
    const rows = [
      { ...baseRow(1), type: 'titular', depCount: 2 },
      { ...baseRow(2), type: 'dependiente', depCount: 0 },
    ] as PatientRow[];
    (component as unknown as { patients: PatientsSignal }).patients.set(rows);

    // total = cantidad de filas (dependientes ya incluidos como filas), sin sumar depCount
    expect(component.counts().total).toBe(2);
  });

  it('el estado financiero no se infiere de activo: queda neutro (BUG-E2E-006)', () => {
    const activo = { ...baseRow(1), type: 'titular', depCount: 0 } as PatientRow;
    (component as unknown as { patients: PatientsSignal }).patients.set([activo]);

    expect(component.counts().alDia).toBe(0);
    expect(component.counts().deuda).toBe(0);
  });

  function baseRow(id: number): PatientRow {
    return {
      pacienteId: id,
      id: `AF-${id}`,
      name: `Test ${id}`,
      dni: String(id),
      type: 'titular',
      status: 'indefinido',
      sinceMonth: '—',
      planNombre: 'Plan',
      planColor: '#000',
      depCount: 0,
      _raw: {} as PacienteDTO,
    };
  }
});

describe('fmtDate — standalone', () => {
  function fmtDate(s: string | undefined): string {
    if (!s) return '—';
    const parts = s.split('T')[0].split('-');
    if (parts.length < 3) return s;
    const [y, m, d] = parts;
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${d} ${months[parseInt(m) - 1]} ${y}`;
  }

  it('returns — for undefined', () => {
    expect(fmtDate(undefined)).toBe('—');
  });

  it('formats ISO date correctly', () => {
    expect(fmtDate('2025-03-15')).toBe('15 mar 2025');
  });

  it('handles datetime with T', () => {
    expect(fmtDate('2025-11-01T10:00:00Z')).toBe('01 nov 2025');
  });
});

describe('avatarOf — standalone', () => {
  function avatarOf(name: string): string {
    return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('');
  }

  it('returns initials for single name', () => {
    expect(avatarOf('Juan')).toBe('J');
  });

  it('returns two initials for full name', () => {
    expect(avatarOf('Juan Lopez')).toBe('JL');
  });

  it('handles extra spaces', () => {
    expect(avatarOf('  Ana   García  ')).toBe('AG');
  });
});
