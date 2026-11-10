import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuditoriaMedicaComponent } from './auditoria-medica.component';
import { AuditoriaMedicaApiService, PrestacionAuditDTO } from '../../data-access/api/auditoria-medica.api';
import { of } from 'rxjs';
import { vi } from 'vitest';

describe('AuditoriaMedicaComponent', () => {
  let fixture: ComponentFixture<AuditoriaMedicaComponent>;
  let apiMock: Record<string, ReturnType<typeof vi.fn>>;

  const prestacion: PrestacionAuditDTO = {
    id: 1,
    fecha: '2026-08-12T10:00:00Z',
    cargoCobrado: 5000,
    importeUnitario: 4500,
    estadoRevision: 'PENDIENTE',
    paciente: { id: 1, nombre: 'Juan', apellido: 'Perez', dni: '30111222' },
    prestacion: { id: 1, codigo: 'COD-1', nombre: 'Emergencia domiciliaria' },
    ticket: { id: 1, numeroTicket: 'TK-0001', direccion: 'Calle Falsa 123', tipoAsistencia: 'EMERGENCIA_DOMICILIARIA', nivelUrgencia: 'ROJO' },
    contratoCobertura: { id: 1, codigo: 'CONV-001' },
  };

  function configurar(pendientes: PrestacionAuditDTO[]): void {
    apiMock = {
      pendientes: vi.fn().mockReturnValue(of(pendientes)),
      aprobar: vi.fn().mockReturnValue(of(prestacion)),
      excluir: vi.fn().mockReturnValue(of(prestacion)),
    };

    TestBed.configureTestingModule({
      imports: [AuditoriaMedicaComponent],
      providers: [{ provide: AuditoriaMedicaApiService, useValue: apiMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(AuditoriaMedicaComponent);
    fixture.detectChanges();
  }

  it('con lista vacía, muestra un estado vacío real (no el aviso de bandeja no disponible)', () => {
    configurar([]);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('No hay prestaciones pendientes de auditoría');
    expect(texto).not.toContain('se habilita al completar el Sprint 3');
  });

  it('muestra las prestaciones reales devueltas por el backend', () => {
    configurar([prestacion]);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('TK-0001');
    expect(texto).toContain('Juan Perez');
  });

  it('aprobar llama al servicio con el id de la prestación', () => {
    configurar([prestacion]);

    fixture.componentInstance.aprobar(1);

    expect(apiMock['aprobar']).toHaveBeenCalledWith(1);
  });

  it('excluir con motivo llama al servicio con id y motivo', () => {
    configurar([prestacion]);

    fixture.componentInstance.motivoInput.set('Falta documentación');
    fixture.componentInstance.confirmarExclusion(1);

    expect(apiMock['excluir']).toHaveBeenCalledWith(1, 'Falta documentación');
  });
});
