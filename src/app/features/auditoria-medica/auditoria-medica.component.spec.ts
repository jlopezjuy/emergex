import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditoriaMedicaComponent } from './auditoria-medica.component';
import { AuditoriaMedicaApiService } from '../../data-access/api/auditoria-medica.api';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('AuditoriaMedicaComponent', () => {
  let fixture: ComponentFixture<AuditoriaMedicaComponent>;
  let apiMock: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    apiMock = {
      pendientes: vi.fn().mockReturnValue(of([])),
      aprobar: vi.fn().mockReturnValue(of(undefined)),
      observar: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [AuditoriaMedicaComponent],
      providers: [{ provide: AuditoriaMedicaApiService, useValue: apiMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditoriaMedicaComponent);
    fixture.detectChanges();
  });

  it('con lista vacía, avisa que la bandeja se habilita en Sprint 3 en vez de decir que no hay casos', () => {
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('La bandeja de auditoría se habilita al completar el Sprint 3');
    expect(texto).not.toContain('No hay tickets pendientes de auditoría');
  });
});
