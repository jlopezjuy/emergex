import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ItemBandejaDTO } from '../../../../../data-access/dto/bandejas.dto';
import { LOCALE_AR_PROVIDERS } from '../../../../../core/i18n/locale';
import { BandejaPanelComponent } from './bandeja-panel.component';

function itemBase(overrides: Partial<ItemBandejaDTO> = {}): ItemBandejaDTO {
  return {
    categoria: 'FACTURACION',
    titulo: 'Ticket #75051 sin zona',
    detalle: 'Requiere tarifación manual de cargo base/espera',
    severidad: 'URGENTE',
    entidadTipo: 'TICKET',
    entidadId: 75051,
    ...overrides,
  };
}

describe('BandejaPanelComponent', () => {
  let fixture: ComponentFixture<BandejaPanelComponent>;

  const render = async (items: ItemBandejaDTO[]): Promise<string> => {
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement.textContent as string;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BandejaPanelComponent],
      providers: [...LOCALE_AR_PROVIDERS],
    }).compileComponents();
    fixture = TestBed.createComponent(BandejaPanelComponent);
  });

  it('muestra el motivo del bloqueo que envía el backend', async () => {
    const texto = await render([itemBase({ motivoBloqueo: 'Sin zona tarifaria asignada' })]);
    expect(texto).toContain('Sin zona tarifaria asignada');
  });

  it('muestra importe, antigüedad y responsable para poder priorizar', async () => {
    const texto = await render([
      itemBase({ importe: 12500, diasAntiguedad: 6, responsable: 'Facturación' }),
    ]);
    expect(texto).toContain('12.500,00');
    expect(texto).toContain('6 días');
    expect(texto).toContain('Facturación');
  });

  it('singulariza la antigüedad de un solo día', async () => {
    const texto = await render([itemBase({ diasAntiguedad: 1 })]);
    expect(texto).toContain('1 día');
    expect(texto).not.toContain('1 días');
  });

  it('usa la próxima acción del backend como etiqueta del botón', async () => {
    const texto = await render([itemBase({ proximaAccion: 'Tarifar asistencia' })]);
    expect(texto).toContain('Tarifar asistencia');
  });

  it('avisa cuando el ítem no tiene destino navegable', async () => {
    const texto = await render([itemBase({ entidadTipo: 'DESCONOCIDO', entidadId: 1 })]);
    expect(texto).toContain('Sin acción directa');
  });

  it('totaliza el dinero en juego de la bandeja', async () => {
    await render([itemBase({ importe: 1000 }), itemBase({ importe: 2500 }), itemBase()]);
    expect(fixture.componentInstance.importeTotal()).toBe(3500);
  });

  it('muestra el estado vacío configurado cuando no hay excepciones', async () => {
    fixture.componentRef.setInput('emptyMessage', 'Sin excepciones de cobranzas.');
    const texto = await render([]);
    expect(texto).toContain('Sin excepciones de cobranzas.');
  });

  it('mapea la severidad a la variante visual correspondiente', () => {
    const c = fixture.componentInstance;
    expect(c.mapSeveridadBadge('CRITICA')).toBe('critical');
    expect(c.mapSeveridadBadge('URGENTE')).toBe('urgent');
    expect(c.mapSeveridadBadge('ATENCION')).toBe('info');
    expect(c.mapSeveridadBadge(undefined)).toBe('info');
  });
});
