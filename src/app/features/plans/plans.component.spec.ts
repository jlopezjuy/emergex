import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlansComponent } from './plans.component';
import { PlanComercialApiService } from '../../data-access/api/plan-comercial.api';
import { ZonesApiService } from '../../data-access/api/zones.api';
import { PlanComercialDTO } from '../../data-access/dto/plan-comercial.dto';

function plan(overrides: Partial<PlanComercialDTO> = {}): PlanComercialDTO {
  return {
    id: '5',
    name: 'Plan Test',
    description: '',
    tier: 'basico',
    modality: 'individual',
    audience: 'particulares',
    pricing: { monthly: 3000, quarterly: 0, annual: 0, perDependent: 0, discountPct: 0 },
    limits: { monthlyCap: 5, freeIncluded: 1, carencyDays: 0 },
    coverages: {
      emergency: true,
      homeVisit: false,
      phoneOrientation: false,
      homeNursing: false,
      monthlyControl: false,
      scheduledTransport: false,
      interurbanTransport: false,
    },
    active: true,
    ...overrides,
  };
}

describe('PlansComponent — pausar/activar plan (BUG-E2E-008)', () => {
  let component: PlansComponent;
  let setActiveSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    setActiveSpy = vi.fn((_id: number, activo: boolean) => of({ ...plan(), active: activo }));

    await TestBed.configureTestingModule({
      imports: [PlansComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: PlanComercialApiService, useValue: { setActive: setActiveSpy } },
        {
          provide: ZonesApiService,
          useValue: {
            getZones: () => of([]),
            getTariffs: () => of([]),
            getPrestaciones: () => of([]),
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(PlansComponent);
    component = fixture.componentInstance;
  });

  it('pausar un plan activo invoca setActive(false) en el backend', () => {
    (component as unknown as { plans: { set: (p: PlanComercialDTO[]) => void } }).plans.set([plan()]);

    component.toggleActive('5');

    expect(setActiveSpy).toHaveBeenCalledWith(5, false);
  });

  it('activar un plan pausado invoca setActive(true) en el backend', () => {
    (component as unknown as { plans: { set: (p: PlanComercialDTO[]) => void } }).plans.set([plan({ active: false })]);

    component.toggleActive('5');

    expect(setActiveSpy).toHaveBeenCalledWith(5, true);
  });

  it('actualiza el estado local solo tras el éxito del backend', () => {
    (component as unknown as { plans: { set: (p: PlanComercialDTO[]) => void } }).plans.set([plan()]);

    component.toggleActive('5');

    expect(component.plans()[0].active).toBe(false);
  });

  it('no llama al backend si el plan no existe', () => {
    (component as unknown as { plans: { set: (p: PlanComercialDTO[]) => void } }).plans.set([plan({ id: '9' })]);

    component.toggleActive('5');

    expect(setActiveSpy).not.toHaveBeenCalled();
  });
});
