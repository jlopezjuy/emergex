import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PatientFormModalComponent } from './patient-form-modal.component';

describe('PatientFormModalComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PatientFormModalComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(PatientFormModalComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});

describe('formatDni — mask logic', () => {
  function formatDni(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return digits.slice(0, digits.length - 3) + '.' + digits.slice(-3);
    return digits.slice(0, digits.length - 6) + '.' + digits.slice(-6, -3) + '.' + digits.slice(-3);
  }

  it('returns raw digits for short input', () => {
    expect(formatDni('12')).toBe('12');
  });

  it('formats 7-digit DNI', () => {
    expect(formatDni('1234567')).toBe('1.234.567');
  });

  it('formats 8-digit DNI', () => {
    expect(formatDni('12345678')).toBe('12.345.678');
  });

  it('strips non-digit characters', () => {
    expect(formatDni('12.345.678')).toBe('12.345.678');
  });

  it('caps at 8 digits', () => {
    expect(formatDni('123456789')).toBe('12.345.678');
  });
});
