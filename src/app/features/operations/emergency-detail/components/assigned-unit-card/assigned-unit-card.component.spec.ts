import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssignedUnitCardComponent } from './assigned-unit-card.component';
import { TicketAsistenciaDTO } from '../../../../../data-access/dto/ticket.dto';

describe('AssignedUnitCardComponent', () => {
  let fixture: ComponentFixture<AssignedUnitCardComponent>;
  let component: AssignedUnitCardComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignedUnitCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AssignedUnitCardComponent);
    component = fixture.componentInstance;
  });

  function setTicket(ticket: TicketAsistenciaDTO): void {
    fixture.componentRef.setInput('ticket', ticket);
    fixture.detectChanges();
  }

  function render(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  it('renderiza N tarjetas cuando hay 2 unidades activas y el badge PRIMARIA solo en la primera', () => {
    setTicket({
      id: 67001,
      ambulanciaId: 10,
      ambulancias: [
        { ambulanciaId: 10, ambulanciaCodigo: 'VIR-01', fechaAsignacion: '2026-08-07T10:00:00-03:00' },
        { ambulanciaId: 11, ambulanciaCodigo: 'UTIM-02', fechaAsignacion: '2026-08-07T10:00:00-03:00' },
      ],
    });

    const cards = render().querySelectorAll('.unit-card');
    expect(cards.length).toBe(2);
    expect(render().textContent).toContain('VIR-01');
    expect(render().textContent).toContain('UTIM-02');
    expect(cards[0].textContent).toContain('PRIMARIA');
    expect(cards[1].textContent).not.toContain('PRIMARIA');
  });

  it('muestra el badge PRIMARIA cuando ambulanciaId coincide con la primera unidad', () => {
    setTicket({
      id: 67001,
      ambulanciaId: 10,
      ambulancias: [
        { ambulanciaId: 10, ambulanciaCodigo: 'VIR-01', fechaAsignacion: '2026-08-07T10:00:00-03:00' },
        { ambulanciaId: 11, ambulanciaCodigo: 'UTIM-02', fechaAsignacion: '2026-08-07T10:00:00-03:00' },
      ],
    });

    const badges = render().querySelectorAll('.unit-card .unit-badge');
    expect(badges.length).toBe(1);
    expect(badges[0].textContent).toContain('PRIMARIA');
  });

  it('muestra "Sin unidad asignada" y el botón "Asignar unidad" cuando no hay ambulancia y canDispatch', () => {
    fixture.componentRef.setInput('ticket', { id: 67002 } as TicketAsistenciaDTO);
    fixture.componentRef.setInput('canDispatch', true);
    fixture.detectChanges();

    expect(render().textContent).toContain('Sin unidad asignada');
    const buttons = Array.from(render().querySelectorAll('button')).map((b) => b.textContent?.trim());
    expect(buttons).toContain('Asignar unidad');
  });

  it('muestra el historial cuando no hay unidades activas pero hay historial', () => {
    setTicket({
      id: 67003,
      historialMoviles: [
        { ambulanciaId: 10, ambulanciaCodigo: 'VIR-01', fechaAsignacion: '2026-08-01T08:00:00-03:00', fechaLiberacion: '2026-08-01T09:00:00-03:00' },
        { ambulanciaId: 11, ambulanciaCodigo: 'UTIM-02', fechaAsignacion: '2026-08-01T09:30:00-03:00', fechaLiberacion: '2026-08-01T10:00:00-03:00' },
      ],
    });

    expect(render().textContent).toContain('Historial de unidades');
    expect(render().textContent).toContain('VIR-01');
    expect(render().textContent).toContain('UTIM-02');
    expect(render().querySelectorAll('.unit-card').length).toBe(0);
  });

  it('emite dispatch al hacer clic en "Asignar unidad" y changeUnit al hacer clic en "Cambiar unidad"', () => {
    const dispatchSpy = vi.spyOn(component.dispatch, 'emit');
    const changeUnitSpy = vi.spyOn(component.changeUnit, 'emit');

    fixture.componentRef.setInput('ticket', { id: 67004 } as TicketAsistenciaDTO);
    fixture.componentRef.setInput('canDispatch', true);
    fixture.detectChanges();

    const assignBtn = Array.from(render().querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Asignar unidad');
    expect(assignBtn).toBeTruthy();
    assignBtn!.click();
    expect(dispatchSpy).toHaveBeenCalledTimes(1);

    fixture.componentRef.setInput('ticket', {
      id: 67004,
      ambulanciaId: 10,
      ambulancias: [{ ambulanciaId: 10, ambulanciaCodigo: 'VIR-01', fechaAsignacion: '2026-08-07T10:00:00-03:00' }],
    });
    fixture.componentRef.setInput('canChangeUnit', true);
    fixture.detectChanges();

    const changeBtn = Array.from(render().querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Cambiar unidad');
    expect(changeBtn).toBeTruthy();
    changeBtn!.click();
    expect(changeUnitSpy).toHaveBeenCalledTimes(1);
  });
});
