import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ClinicoComponent } from './clinico.component';
import { ClinicalApiService } from '../../data-access/api/clinical.api';
import { AuthService } from '../../core/auth/auth.service';
import { Account } from '../../core/auth/models/account.model';

const cuenta: Account = {
  id: 1,
  login: 'qa.profesional',
  email: 'qa@x.com',
  authorities: ['ROLE_PROFESIONAL'],
  firstName: 'Lucía',
  lastName: 'Gómez',
  empresa: { id: 1, nombre: 'SAE' },
  profesional: { id: 9, nombre: 'Lucía', apellido: 'Gómez', matricula: '55.123', tipoMatricula: 'M.P.', subespecialidades: ['Pediatría'] },
};

describe('ClinicoComponent — identidad y datos reales (QA-ROL-039)', () => {
  let api: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(async () => {
    vi.useFakeTimers();
    TestBed.resetTestingModule();
    api = {
      getWaitlist: vi.fn().mockReturnValue(of([{ id: 'T-1', turnoId: 1, pacienteId: 1, name: 'Ana', age: 30, time: '10:00', wait: 10, tri: 'green', spec: 'X', os: 'OS', avatar: 'A' }])),
      getScheduleToday: vi.fn().mockReturnValue(
        of([
          { turnoId: 1, pacienteId: 1, time: '08:00', name: 'A', sub: '', state: 'past' },
          { turnoId: 2, pacienteId: 2, time: '09:00', name: 'B', sub: '', state: 'next' },
          { turnoId: 3, pacienteId: 3, time: '10:00', name: 'C', sub: '', state: 'upcoming' },
        ]),
      ),
      signEpisode: vi.fn().mockReturnValue(of({ hash: 'abc' })),
      getActiveEpisode: vi.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [ClinicoComponent],
      providers: [
        { provide: ClinicalApiService, useValue: api },
        { provide: AuthService, useValue: { currentAccount: signal(cuenta).asReadonly() } },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function crear() {
    const fixture = TestBed.createComponent(ClinicoComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('la cabecera muestra al profesional autenticado y no a la profesional de ejemplo', () => {
    const texto = (crear().nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Lucía Gómez');
    expect(texto).toContain('M.P. 55.123');
    expect(texto).toContain('SAE');
    expect(texto).not.toContain('Altieri');
    expect(texto).not.toContain('119.827');
    expect(texto).not.toContain('Consultorio 3');
  });

  it('la agenda no tiene fecha fija y los KPIs salen de los datos cargados', () => {
    const texto = (crear().nativeElement as HTMLElement).textContent ?? '';

    expect(texto).not.toContain('Mayo 2026');
    expect(texto).not.toContain('8 / 11');
    expect(texto).not.toContain('/ 27 hoy');
    expect(texto).toContain('1 / 3 atendidos');
  });

  it('firma la receta con el nombre real del profesional', () => {
    const fixture = crear();
    const c = fixture.componentInstance;
    c.activeEpisode.set({ id: 55 } as never);

    c.signRecipe();

    expect(api['signEpisode']).toHaveBeenCalledWith(55, 'Lucía Gómez');
  });
});
