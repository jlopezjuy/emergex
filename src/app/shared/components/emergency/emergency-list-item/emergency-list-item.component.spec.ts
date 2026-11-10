import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { EmergencyListItemComponent } from './emergency-list-item.component';
import { TicketAsistenciaDTO } from '../../../../data-access/dto/ticket.dto';

describe('EmergencyListItemComponent', () => {
  it('identifies an area-protected emergency with its contractual coverage', async () => {
    await TestBed.configureTestingModule({
      imports: [EmergencyListItemComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(EmergencyListItemComponent);
    const emergency: TicketAsistenciaDTO = {
      id: 4751,
      codigo: 'TK-20260714-002',
      tipoEmergencia: 'Dolores de cabeza',
      prioridad: 'NORMAL',
      pacienteDescripcion: 'A IDENTIFICAR (ÁREA PROTEGIDA), PACIENTE',
      unidadAsignada: 'MOVIL-01',
      coberturaNombreSnapshot: 'CONTRATO: Kiosko El Sol',
      contextoCobertura: { modalidadCobertura: 'AREA_PROTEGIDA' },
    };

    fixture.componentRef.setInput('emergency', emergency);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('INSTITUCIONAL');
    expect(fixture.nativeElement.textContent).toContain('Kiosko El Sol');
  });
});
