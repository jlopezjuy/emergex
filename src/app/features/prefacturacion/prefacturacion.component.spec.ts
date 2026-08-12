import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PrefacturacionComponent } from './prefacturacion.component';
import { PrefacturacionApiService } from '../../data-access/api/prefacturacion.api';
import { UserFeedbackService } from '../../core/notifications/user-feedback.service';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('PrefacturacionComponent', () => {
  let fixture: ComponentFixture<PrefacturacionComponent>;
  let apiMock: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    apiMock = {
      listarLotes: vi.fn().mockReturnValue(of([])),
      obtenerLote: vi.fn().mockReturnValue(of(null)),
      crearLote: vi.fn().mockReturnValue(of(null)),
      confirmarLote: vi.fn().mockReturnValue(of(null)),
      excluirTicket: vi.fn().mockReturnValue(of(undefined)),
    };

    await TestBed.configureTestingModule({
      imports: [PrefacturacionComponent],
      providers: [
        { provide: PrefacturacionApiService, useValue: apiMock },
        { provide: UserFeedbackService, useValue: { push: vi.fn(), fromHttpError: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrefacturacionComponent);
    fixture.detectChanges();
  });

  it('con lista de lotes vacía, avisa que la generación automática todavía no está disponible', () => {
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('La generación automática de líneas todavía no está disponible');
    expect(texto).not.toContain('sin resultados');
  });
});
