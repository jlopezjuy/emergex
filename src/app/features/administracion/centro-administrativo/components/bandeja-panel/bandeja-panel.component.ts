import { Component, computed, input, output } from '@angular/core';
import { ItemBandejaDTO } from '../../../../../data-access/dto/bandejas.dto';
import { StatusBadgeComponent } from '../../../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state.component';
import { rutaParaEntidad } from '../../../../../core/navigation/entidad-ruta';
import { MonedaPipe } from '../../../../../shared/pipes/moneda.pipe';

/**
 * Panel unico de bandeja de trabajo por excepcion.
 *
 * Renderiza el triple que el backend ya entrega en ItemBandejaDTO:
 * estado (severidad) + por que esta asi (motivoBloqueo) + que hacer ahora (proximaAccion),
 * mas el importe, la antiguedad y el responsable, que son lo que permite priorizar
 * sin tener que abrir cada item.
 */
@Component({
  selector: 'emx-bandeja-panel',
  standalone: true,
  imports: [MonedaPipe, StatusBadgeComponent, EmptyStateComponent],
  template: `
    <div class="glass rounded-panel p-4 flex flex-col gap-3 border" style="border-color: var(--border-glass);">
      <div class="flex items-center justify-between border-b pb-2" style="border-color: var(--border-glass);">
        <h3 class="text-sm font-bold flex items-center gap-2" style="color: var(--text-primary);">
          <span>{{ icon() }}</span> {{ titulo() }}
        </h3>
        <div class="flex items-center gap-2">
          @if (importeTotal() > 0) {
            <span class="text-xs num font-bold px-2 py-0.5 rounded" style="background: var(--bg-elevated); color: var(--text-primary);">
              {{ importeTotal() | moneda }}
            </span>
          }
          <span class="text-xs num font-semibold px-2 py-0.5 rounded" style="background: var(--bg-elevated); color: var(--text-secondary);">
            {{ items().length }} ítems
          </span>
        </div>
      </div>

      @if (items().length === 0) {
        <emx-empty-state [message]="emptyMessage()" />
      } @else {
        <div class="flex flex-col gap-2 overflow-y-auto max-h-80 pr-1">
          @for (item of items(); track $index) {
            <div
              class="p-3 rounded-lg border flex flex-col gap-1.5 transition-all"
              [class.cursor-pointer]="getRoute(item) !== null"
              [class.hover:border-blue-500]="getRoute(item) !== null"
              style="background: var(--bg-elevated); border-color: var(--border-glass);"
              (click)="onItemClick(item)"
            >
              <div class="flex items-start justify-between gap-2">
                <span class="text-xs font-bold" style="color: var(--text-primary);">{{ item.titulo }}</span>
                <emx-status-badge [variant]="mapSeveridadBadge(item.severidad)">
                  {{ item.severidad }}
                </emx-status-badge>
              </div>

              @if (item.detalle) {
                <p class="text-xs leading-relaxed" style="color: var(--text-muted);">{{ item.detalle }}</p>
              }

              @if (item.motivoBloqueo) {
                <p class="text-[11px] leading-relaxed flex items-start gap-1" style="color: var(--accent-amber, #f59e0b);">
                  <span aria-hidden="true">⚠</span>
                  <span><span class="font-semibold">Motivo:</span> {{ item.motivoBloqueo }}</span>
                </p>
              }

              @if (item.importe || item.diasAntiguedad != null || item.responsable) {
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] num" style="color: var(--text-secondary);">
                  @if (item.importe) {
                    <span class="font-bold" style="color: var(--text-primary);">{{ item.importe | moneda }}</span>
                  }
                  @if (item.diasAntiguedad != null) {
                    <span [class.font-bold]="item.diasAntiguedad >= 30">
                      {{ item.diasAntiguedad }} {{ item.diasAntiguedad === 1 ? 'día' : 'días' }}
                    </span>
                  }
                  @if (item.responsable) {
                    <span>{{ item.responsable }}</span>
                  }
                </div>
              }

              <div class="flex items-center justify-between text-[11px] mt-1 pt-1.5 border-t" style="border-color: var(--border-glass); color: var(--text-muted);">
                <span class="font-bold text-[10px] uppercase tracking-wider">{{ item.categoria || categoriaDefault() }}</span>
                @if (getRoute(item)) {
                  <button
                    type="button"
                    class="px-2 py-0.5 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                    style="background: rgba(59, 130, 246, 0.15); color: var(--accent-blue); border: 1px solid rgba(59, 130, 246, 0.3);"
                  >
                    {{ item.proximaAccion || 'Resolver' }} →
                  </button>
                } @else {
                  <span style="color: var(--text-muted);">Sin acción directa</span>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class BandejaPanelComponent {
  readonly titulo = input('');
  readonly icon = input('');
  readonly items = input<ItemBandejaDTO[]>([]);
  readonly categoriaDefault = input('');
  readonly emptyMessage = input('Sin excepciones.');

  readonly selectItem = output<ItemBandejaDTO>();

  /** Dinero en juego en la bandeja: es lo que decide por cual empezar. */
  readonly importeTotal = computed(() =>
    this.items().reduce((total, item) => total + (item.importe || 0), 0),
  );

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
