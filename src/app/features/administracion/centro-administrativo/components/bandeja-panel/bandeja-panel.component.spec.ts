import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BandejaPanelComponent } from './bandeja-panel.component';
import { ItemBandejaDTO } from '../../../../../data-access/dto/bandejas.dto';

describe('BandejaPanelComponent', () => {
  let component: BandejaPanelComponent;
  let fixture: ComponentFixture<BandejaPanelComponent>;

  const mockItems: ItemBandejaDTO[] = [
    {
      titulo: 'Afiliado A Con Deuda',
      severidad: 'CRITICA',
      entidadTipo: 'AFILIADO',
      entidadId: 10,
      detalle: 'Mora crítica en cuota',
      categoria: 'FACTURACIÓN'
    }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BandejaPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(BandejaPanelComponent);
    component = fixture.componentInstance;
    component.titulo = 'Facturación y Tarifación';
    component.icon = '🧾';
    component.items = mockItems;
    component.categoriaDefault = 'FACTURACIÓN';
    component.emptyMessage = 'Sin excepciones de facturación.';
  });

  it('debería renderizar título, contador y lista de ítems (G4-04)', () => {
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Facturación y Tarifación');
    expect(compiled.textContent).toContain('1 ítems');
    expect(compiled.textContent).toContain('Afiliado A Con Deuda');
    expect(compiled.textContent).toContain('CRITICA');
  });

  it('debería emitir el ítem seleccionado al hacer clic', () => {
    const spy = vi.spyOn(component.selectItem, 'emit');
    fixture.detectChanges();

    const itemEl = fixture.nativeElement.querySelector('.cursor-pointer') as HTMLElement;
    expect(itemEl).toBeTruthy();
    itemEl.click();

    expect(spy).toHaveBeenCalledWith(mockItems[0]);
  });
});
