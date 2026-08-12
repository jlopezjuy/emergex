import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { OperativeTimelineComponent } from './operative-timeline.component';

describe('OperativeTimelineComponent', () => {
  it('renders an EN_SITIO self-transition as an operational milestone and distinguishes occurrence from record time', async () => {
    await TestBed.configureTestingModule({ imports: [OperativeTimelineComponent] }).compileComponents();
    const fixture = TestBed.createComponent(OperativeTimelineComponent);
    fixture.componentRef.setInput('ticket', { id: 1, horaInicioTraslado: '2026-08-12T10:00:00Z' });
    fixture.componentRef.setInput('events', [{
      id: 7,
      estado: 'EN_SITIO',
      estadoAnterior: 'EN_SITIO',
      fecha: '2026-08-12T10:04:00Z',
      fechaEvento: '2026-08-12T10:00:00Z',
      origenHorario: 'SISTEMA',
    }]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('INICIO DE TRASLADO');
    // DateUtils pins every rendered timestamp to America/Argentina/Buenos_Aires (UTC-3),
    // so the 10:00Z occurrence and the 10:04Z record time render as 07:00 and 07:04.
    // These values are machine-independent: do not "correct" them back to UTC.
    expect(text).toContain('Ocurrió: 07:00');
    expect(text).toContain('Registrado: 07:04');
    expect(text).toContain('Registro operativo sin cambio de estado');
  });

  it('does not infer a transport milestone from an ordinary EN_SITIO self-event and falls back to record time for malformed occurrence time', async () => {
    await TestBed.configureTestingModule({ imports: [OperativeTimelineComponent] }).compileComponents();
    const fixture = TestBed.createComponent(OperativeTimelineComponent);
    fixture.componentRef.setInput('ticket', { id: 1, horaInicioTraslado: '2026-08-12T10:00:00Z' });
    fixture.componentRef.setInput('events', [
      { id: 1, estado: 'EN_SITIO', estadoAnterior: 'EN_SITIO', fecha: '2026-08-12T10:10:00Z', fechaEvento: 'not-a-date' },
      { id: 2, estado: 'RECIBIDO', fecha: '2026-08-12T10:05:00Z' },
    ]);
    fixture.detectChanges();

    expect(fixture.componentInstance.timelineEntries().map((entry) => entry.id)).toEqual(['2', '1']);
    expect(fixture.nativeElement.textContent).not.toContain('INICIO DE TRASLADO');
    expect(fixture.nativeElement.textContent).toContain('HITO OPERATIVO');
  });
});
