import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
  OnDestroy,
  ViewChild,
  inject,
  output,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { BusquedaGlobalApi } from '../../../data-access/api/busqueda-global.api';
import { ResultadoBusquedaItemDTO } from '../../../data-access/dto/busqueda-global.dto';
import { rutaParaEntidad } from '../../../core/navigation/entidad-ruta';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { LoadingStateComponent } from '../loading-state/loading-state.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { ErrorStateComponent } from '../error-state/error-state.component';

@Component({
  selector: 'emx-global-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalShellComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent
  ],
  template: `
    <emx-modal-shell title="Búsqueda Global Administrativa" maxWidthClass="max-w-2xl" (closed)="closed.emit()">
      <div class="flex flex-col gap-4">
        <!-- Search Input -->
        <div class="relative flex items-center">
          <svg class="absolute left-3 w-5 h-5" style="color: var(--text-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            #searchInput
            type="text"
            class="w-full pl-10 pr-12 py-3 rounded-lg text-sm transition-colors"
            style="background: var(--surface-card); border: 1px solid var(--border-glass); color: var(--text-primary);"
            placeholder="Buscar por DNI, nombre, CUIT, código de contrato o comprobante..."
            [ngModel]="queryText()"
            (ngModelChange)="onQueryInput($event)"
            autofocus
          />
          <kbd
            class="absolute right-3 px-2 py-0.5 text-xs font-mono rounded"
            style="background: var(--surface-glass); border: 1px solid var(--border-glass); color: var(--text-muted);"
          >
            ESC
          </kbd>
        </div>

        <!-- Feedback & Content -->
        @if (cargando()) {
          <emx-loading-state />
        } @else if (error()) {
          <emx-error-state message="Error al realizar la búsqueda global" (retry)="ejecutarBusqueda(queryText())" />
        } @else if (busquedaRealizada() && resultados().length === 0) {
          <emx-empty-state message="No se encontraron coincidencias para la búsqueda." />
        } @else if (resultados().length > 0) {
          <div class="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
            @for (grupo of resultadosAgrupados(); track grupo.tipo) {
              <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between px-1">
                  <span class="text-xs font-bold uppercase tracking-wider" style="color: var(--text-secondary);">
                    {{ grupo.tipo }} ({{ grupo.items.length }})
                  </span>
                </div>
                <div class="flex flex-col gap-1">
                  @for (item of grupo.items; track item.id + item.tipo) {
                    @let ruta = obtenerRutaReal(item);
                    <div
                      class="flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer"
                      [class.opacity-60]="!ruta"
                      [class.cursor-not-allowed]="!ruta"
                      style="background: var(--surface-card); border-color: var(--border-glass);"
                      [title]="!ruta ? 'Ficha 360 de ' + item.tipo + ' no implementada aún en frontend' : 'Ir a ' + item.titulo"
                      (click)="seleccionarResultado(item)"
                    >
                      <div class="flex flex-col">
                        <div class="flex items-center gap-2">
                          <span class="font-medium text-sm" style="color: var(--text-primary);">
                            {{ item.titulo }}
                          </span>
                          @if (item.codigo) {
                            <span class="text-xs px-1.5 py-0.5 rounded font-mono" style="background: var(--surface-glass); color: var(--text-secondary);">
                              {{ item.codigo }}
                            </span>
                          }
                        </div>
                        @if (item.subtitulo) {
                          <span class="text-xs mt-0.5" style="color: var(--text-muted);">
                            {{ item.subtitulo }}
                          </span>
                        }
                      </div>

                      <div class="flex items-center gap-2">
                        @if (ruta) {
                          <span class="text-xs font-medium px-2 py-1 rounded flex items-center gap-1" style="color: var(--color-primary); background: var(--surface-glass);">
                            Abrir
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                            </svg>
                          </span>
                        } @else {
                          <span class="text-xs italic" style="color: var(--text-muted);">
                            Sin ficha enlazable
                          </span>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </emx-modal-shell>
  `,
})
export class GlobalSearchComponent implements OnInit, OnDestroy {
  private readonly busquedaApi = inject(BusquedaGlobalApi);
  private readonly router = inject(Router);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  closed = output<void>();

  readonly queryText = signal('');
  readonly resultados = signal<ResultadoBusquedaItemDTO[]>([]);
  readonly cargando = signal(false);
  readonly error = signal(false);
  readonly busquedaRealizada = signal(false);

  private readonly searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  readonly resultadosAgrupados = computed(() => {
    const items = this.resultados();
    const gruposMap = new Map<string, ResultadoBusquedaItemDTO[]>();

    for (const item of items) {
      const tipo = item.tipo || 'OTROS';
      if (!gruposMap.has(tipo)) {
        gruposMap.set(tipo, []);
      }
      gruposMap.get(tipo)!.push(item);
    }

    return Array.from(gruposMap.entries()).map(([tipo, list]) => ({
      tipo,
      items: list
    }));
  });

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!query || query.trim().length === 0) {
            this.resultados.set([]);
            this.cargando.set(false);
            this.busquedaRealizada.set(false);
            return [];
          }

          this.cargando.set(true);
          this.error.set(false);
          return this.busquedaApi.buscar(query.trim(), 10);
        })
      )
      .subscribe({
        next: (res) => {
          this.resultados.set(res.resultados || []);
          this.cargando.set(false);
          this.busquedaRealizada.set(true);
        },
        error: () => {
          this.cargando.set(false);
          this.error.set(true);
        }
      });
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  onQueryInput(query: string): void {
    this.queryText.set(query);
    if (!query || query.trim().length === 0) {
      this.resultados.set([]);
      this.busquedaRealizada.set(false);
      this.cargando.set(false);
      return;
    }
    this.searchSubject.next(query);
  }

  ejecutarBusqueda(query: string): void {
    if (query) {
      this.searchSubject.next(query);
    }
  }

  obtenerRutaReal(item: Partial<ResultadoBusquedaItemDTO>): string | null {
    return rutaParaEntidad(item.tipo, item.id ?? 0);
  }

  seleccionarResultado(item: ResultadoBusquedaItemDTO): void {
    const ruta = this.obtenerRutaReal(item);
    if (ruta) {
      this.router.navigateByUrl(ruta);
      this.closed.emit();
    }
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }
}
