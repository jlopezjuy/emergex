import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemBandejaDTO } from '../../../../../data-access/dto/bandejas.dto';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { rutaParaEntidad } from '../../../../../core/navigation/entidad-ruta';

@Component({
  selector: 'emx-bandeja-panel',
  standalone: true,
  imports: [
    CommonModule,
    StatusBadgeComponent,
    EmptyStateComponent
  ],
  template: `
    <div class="glass rounded-panel p-4 flex flex-col gap-3 border" style="border-color: var(--border-glass);">
      <div class="flex items-center justify-between border-b pb-2" style="border-color: var(--border-glass);">
        <h3 class="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style="color: var(--text-primary);">
          <span>{{ icon }}</span> {{ titulo }}
        </h3>
        <span class="text-xs font-mono font-semibold px-2 py-0.5 rounded" style="background: var(--bg-elevated); color: var(--text-secondary);">
          {{ items.length }} ítems
        </span>
      </div>

      @if (items.length === 0) {
        <emx-empty-state [message]="emptyMessage" />
      } @else {
        <div class="flex flex-col gap-2 overflow-y-auto max-h-80 pr-1">
          @for (item of items; track $index) {
            <div
              class="p-3 rounded-lg border flex flex-col gap-1.5 transition-all"
              [class.cursor-pointer]="getRoute(item) !== null"
              [class.hover:border-blue-500]="getRoute(item) !== null"
              style="background: var(--bg-elevated); border-color: var(--border-glass);"
              (click)="onItemClick(item)"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs font-bold" style="color: var(--text-primary);">{{ item.titulo }}</span>
                <emx-status-badge [variant]="mapSeveridadBadge(item.severidad)">
                  {{ item.severidad }}
                </emx-status-badge>
              </div>
              @if (item.detalle) {
                <p class="text-xs leading-relaxed" style="color: var(--text-muted);">{{ item.detalle }}</p>
              }
              <div class="flex items-center justify-between text-[11px] font-mono mt-1 pt-1 border-t" style="border-color: var(--border-glass); color: var(--text-muted);">
                <span>{{ item.categoria || categoriaDefault }}</span>
                @if (getRoute(item)) {
                  <span class="font-semibold" style="color: var(--accent-blue);">Ver Ficha →</span>
                } @else {
                  <span style="color: var(--text-muted);">Sin ficha 360</span>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `
})
export class BandejaPanelComponent {
  @Input() titulo = '';
  @Input() icon = '';
  @Input() items: ItemBandejaDTO[] = [];
  @Input() categoriaDefault = '';
  @Input() emptyMessage = 'Sin excepciones.';

  @Output() selectItem = new EventEmitter<ItemBandejaDTO>();

  getRoute(item: ItemBandejaDTO): string | null {
    return rutaParaEntidad(item.entidadTipo, item.entidadId);
  }

  onItemClick(item: ItemBandejaDTO): void {
    this.selectItem.emit(item);
  }

  mapSeveridadBadge(severidad?: string): 'critical' | 'urgent' | 'info' {
    const sev = severidad?.toUpperCase();
    if (sev === 'CRITICA') return 'critical';
    if (sev === 'URGENTE') return 'urgent';
    return 'info';
  }
}
