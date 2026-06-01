import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PatientsComponent } from './patients.component';
import { provideRouter } from '@angular/router';

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
