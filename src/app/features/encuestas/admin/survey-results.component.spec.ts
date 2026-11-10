import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { SurveyAdminApiService } from '../../../data-access/api/survey-admin.api';
import { CampaniaSummary, MetricasCampania } from '../../../data-access/dto/survey.dto';
import { SurveyResultsComponent } from './survey-results.component';

const campaign = (id: number): CampaniaSummary => ({
  id, codigo: `C${id}`, nombre: `Campaña ${id}`, fechaDesde: '2026-07-13', fechaHasta: '2026-07-19',
  estado: 'EN_PROCESO', cantidadObjetivo: 15, cantidadSeleccionada: 15, encuestaId: 1, version: 1,
});

const metrics = (nps: number): MetricasCampania => ({
  seleccionados: 15, intentos: 5, completadas: 2, rechazados: 0,
  tasaRespuesta: 13.33, tasaRechazo: 0, promedioIntentos: 1, nps,
});

describe('SurveyResultsComponent', () => {
  it('cancela la consulta anterior al cambiar rápidamente de campaña', () => {
    const first = new Subject<MetricasCampania>();
    const second = new Subject<MetricasCampania>();
    const api = {
      listCampaigns: () => of({ data: [campaign(1), campaign(2)], total: 2, totalPages: 1 }),
      campaignMetrics: (id: number) => id === 1 ? first : second,
    };
    TestBed.configureTestingModule({
      imports: [SurveyResultsComponent],
      providers: [provideRouter([]), { provide: SurveyAdminApiService, useValue: api }],
    });
    const fixture = TestBed.createComponent(SurveyResultsComponent);
    fixture.detectChanges();

    fixture.componentInstance.select(campaign(1));
    fixture.componentInstance.select(campaign(2));
    first.next(metrics(-100));
    second.next(metrics(80));

    expect(fixture.componentInstance.metrics()?.nps).toBe(80);
  });
});
