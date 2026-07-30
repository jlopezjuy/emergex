import { Component, OnInit, computed, inject, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, debounceTime, distinctUntilChanged, forkJoin, of } from 'rxjs';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ObrasSocialesApiService } from '../../data-access/api/obras-sociales.api';
import { ITEMS_PER_PAGE } from '../../data-access/api/pagination';
import {
  ImportarPadronObraSocialResultDTO,
  ObraSocialDTO,
  TIPO_FINANCIADOR_LABEL,
  TipoFinanciadorSalud,
} from '../../data-access/dto/obra-social.dto';
import { ObraSocialModalComponent } from './obra-social-modal.component';
import { PlanObraSocialModalComponent } from './plan-obra-social-modal.component';
import { ConvenioObraSocialModalComponent } from './convenio-obra-social-modal.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { UserFeedbackService } from '../../core/notifications/user-feedback.service';

type ActivaFilter = 'TODAS' | 'ACTIVAS' | 'INACTIVAS';

@Component({
  selector: 'app-obras-sociales',
  standalone: true,
  imports: [
    FormsModule,
    ObraSocialModalComponent,
    PlanObraSocialModalComponent,
    ConvenioObraSocialModalComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="screen">

      <!-- Header -->
      <div class="screen-head">
          <div class="screen-head__title">
            <div class="screen-head__icon">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--accent-blue)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 2 3 5v4c0 4 2.5 6.5 6 7 3.5-.5 6-3 6-7V5L9 2z"/>
              </svg>
            </div>
            <div>
              <h2>Obras Sociales</h2>
              <div class="eyebrow">CATÁLOGO GLOBAL · CONVENIOS Y COBERTURA</div>
            </div>
          </div>

          <div class="screen-head__kpis">
            <div class="screen-kpi">
              <div class="eyebrow">Total</div>
              <div class="mono" style="font-size:18px;font-weight:500">{{ counts().total }}</div>
            </div>
            <div class="screen-kpi">
              <div class="eyebrow">Activas</div>
              <div class="mono" style="font-size:18px;font-weight:500;color:var(--accent-emerald)">{{ counts().activas }}</div>
            </div>
            <div class="screen-kpi">
              <div class="eyebrow">Inactivas</div>
              <div class="mono" style="font-size:18px;font-weight:500;color:var(--text-muted)">{{ counts().inactivas }}</div>
            </div>
          </div>

          <div class="screen-head__actions">
            <input
              #padronFileInput
              type="file"
              accept=".csv"
              style="display:none;"
              (change)="onPadronFileSelected($event)"
            />
            <button type="button" class="btn btn--ghost btn--sm" [disabled]="importing()" (click)="padronFileInput.click()">
              @if (importing()) {
                Importando…
              } @else {
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 1v7M3 5.5 6 8.5l3-3M2 10.5h8"/></svg>
                Importar padrón
              }
            </button>
            <button type="button" class="btn btn--primary btn--sm" (click)="openCreateModal()">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
              Nueva obra social
            </button>
          </div>
        </div>

      @if (importResult(); as result) {
        <div class="glass-strong os-import-result">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
            <div style="display:flex; gap:16px; font-size:12px; font-family:var(--font-mono);">
              <span style="color:var(--accent-emerald)">{{ result.creadas }} creadas</span>
              <span style="color:var(--accent-blue)">{{ result.actualizadas }} actualizadas</span>
              @if (result.rechazadas > 0) {
                <span style="color:var(--accent-red)">{{ result.rechazadas }} rechazadas</span>
              }
            </div>
            <button type="button" class="action-icon" style="width:22px;height:22px;" title="Cerrar" (click)="importResult.set(null)">✕</button>
          </div>
          @if (result.errores.length > 0) {
            <ul style="margin:8px 0 0; padding-left:16px; font-size:11px; color:var(--accent-red); max-height:100px; overflow-y:auto;">
              @for (err of result.errores; track err) {
                <li>{{ err }}</li>
              }
            </ul>
          }
        </div>
      }

      <!-- ── Table card ── -->
      <div class="glass-strong os-card">

        <!-- Toolbar -->
        <div class="os-toolbar">
          <div class="os-search">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"><circle cx="6" cy="6" r="4"/><path d="M9.5 9.5l3 3"/></svg>
            <input
              class="os-search__input"
              type="text"
              placeholder="Buscar por nombre o CUIT…"
              [(ngModel)]="searchQuery"
            />
          </div>

          <div class="os-filters">
            <span class="eyebrow" style="white-space:nowrap">Estado:</span>
            @for (opt of filterOptions; track opt.value) {
              <button
                type="button"
                class="filter-chip"
                [attr.data-on]="activaFilter() === opt.value"
                (click)="setActivaFilter(opt.value)"
              >{{ opt.label }}</button>
            }
          </div>

          <button type="button" class="btn btn--ghost btn--sm" style="margin-left:auto;" (click)="reload()">Actualizar</button>
        </div>

        @if (loading()) {
          <div class="os-loading-bar"></div>
        }
        @if (error()) {
          <div class="os-error">{{ error() }}</div>
        }

        <!-- Table -->
        <div class="data-table-wrap">
          <table class="data-table" style="width:100%;min-width:760px">
            <thead>
              <tr>
                <th>Obra social</th>
                <th>Tipo</th>
                <th>Ámbito</th>
                <th>Registros</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th style="width:80px"></th>
              </tr>
            </thead>
            <tbody>
              @if (obrasSociales().length === 0 && !loading()) {
                <tr>
                  <td colspan="7" style="padding:20px;text-align:center;">
                    <emx-empty-state message="No se encontraron obras sociales para los filtros aplicados." />
                  </td>
                </tr>
              }
              @for (os of obrasSociales(); track os.id) {
                <tr>
                  <td>
                    <div class="os-nombre" [title]="os.nombre">{{ os.nombre }}</div>
                    @if (os.sigla) {
                      <div class="mono micro os-sub">{{ os.sigla }}</div>
                    }
                  </td>
                  <td>
                    @if (os.tipo) {
                      <span class="os-tipo" [attr.data-tipo]="os.tipo">{{ tipoLabel(os.tipo) }}</span>
                    } @else {
                      <span style="color:var(--text-dim)">—</span>
                    }
                  </td>
                  <td style="color:var(--text-secondary);">
                    @if (os.ambito === 'PROVINCIAL') {
                      Provincial
                      @if (os.provincia) { <div class="mono micro os-sub">{{ provinciaLabel(os.provincia) }}</div> }
                    } @else if (os.ambito) {
                      Nacional
                    } @else { — }
                  </td>
                  <td class="mono" style="font-size:11.5px;">
                    @if (os.codigoRNOS) { <div><span class="os-reg">RNAS</span> {{ os.codigoRNOS }}</div> }
                    @if (os.codigoRNEMP) { <div><span class="os-reg">RNEMP</span> {{ os.codigoRNEMP }}</div> }
                    @if (!os.codigoRNOS && !os.codigoRNEMP) { <span style="color:var(--text-dim)">—</span> }
                  </td>
                  <td style="color:var(--text-secondary);">
                    @if (os.telefono) { <div>{{ os.telefono }}</div> }
                    @if (os.email) { <div class="micro os-sub os-email" [title]="os.email">{{ os.email }}</div> }
                    @if (!os.telefono && !os.email) { <span style="color:var(--text-dim)">—</span> }
                  </td>
                  <td>
                    @if (os.activa) {
                      <emx-status-badge variant="stable">Activa</emx-status-badge>
                    } @else {
                      <emx-status-badge variant="info">Inactiva</emx-status-badge>
                    }
                  </td>
                  <td style="display:flex; gap:6px; padding-top:8px;">
                    <button type="button" class="action-icon" style="width:26px;height:26px;" title="Planes" (click)="openPlanesModal(os)">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.5" y="1.5" width="9" height="9" rx="1"/><path d="M4 5h4M4 7h2.5"/></svg>
                    </button>
                    <button type="button" class="action-icon" style="width:26px;height:26px;" title="Convenios" (click)="openConveniosModal(os)">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3.5h5v6H2zM5 5.5h5v4H5"/></svg>
                    </button>
                    <button type="button" class="action-icon" style="width:26px;height:26px;" title="Editar" (click)="openEditModal(os)">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 9.5l7.5-7.5 1.5 1.5-7.5 7.5H1v-1.5z"/></svg>
                    </button>
                    @if (os.activa) {
                      <button type="button" class="action-icon" style="width:26px;height:26px;" title="Dar de baja" (click)="deactivate(os)">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="6" cy="6" r="5"/><path d="M4 4l4 4M8 4l-4 4"/></svg>
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Mismo pie que Personal Operativo: se muestra siempre, incluso con una sola página. -->
        <div class="os-pagination">
          <div class="mono micro" style="color:var(--text-muted)">
            Mostrando <strong style="color:var(--text-primary)">{{ obrasSociales().length }}</strong> de
            <strong style="color:var(--text-primary)">{{ total() }}</strong> obras sociales
          </div>
          <div style="display:flex;align-items:center;gap:4px">
            <button type="button" class="btn btn--ghost btn--sm" [disabled]="page() === 0"
                    [style.opacity]="page() === 0 ? '0.4' : '1'" (click)="goToPage(page() - 1)">‹ Anterior</button>
            @for (i of pageRange(); track i) {
              <button type="button" class="page-btn" [attr.data-active]="page() === i" (click)="goToPage(i)">{{ i + 1 }}</button>
            }
            <button type="button" class="btn btn--ghost btn--sm" [disabled]="page() >= totalPages() - 1"
                    [style.opacity]="page() >= totalPages() - 1 ? '0.4' : '1'" (click)="goToPage(page() + 1)">Siguiente ›</button>
          </div>
        </div>
      </div>

      @if (showModal()) {
        <emx-obra-social-modal
          [obraSocial]="selectedObraSocial()"
          (saved)="onModalSaved()"
          (closed)="closeModal()"
        />
      }

      @if (planesObraSocial(); as os) {
        <emx-plan-obra-social-modal
          [obraSocial]="os"
          (closed)="planesObraSocial.set(null)"
        />
      }

      @if (conveniosObraSocial(); as os) {
        <emx-convenio-obra-social-modal
          [obraSocial]="os"
          (closed)="conveniosObraSocial.set(null)"
        />
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* Mismo idioma visual que Facturación (.ft-card) e Instituciones (.pt-card):
       la tabla y su toolbar viven dentro de una tarjeta, no sueltas sobre el fondo. */
    .os-card { border-radius: var(--r-card); padding: 0; overflow: hidden; }

    .os-import-result {
      padding: 10px 12px;
      margin-bottom: 12px;
      border-radius: var(--r-card);
    }

    .os-toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-hairline);
    }
    .os-search {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      min-width: 200px;
      max-width: 380px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-glass);
      border-radius: var(--r-btn);
      padding: 0 10px;
      height: 32px;
    }
    .os-search__input {
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 13px;
    }
    .os-search__input::placeholder { color: var(--text-dim); }

    .os-filters { display: flex; align-items: center; gap: 6px; }
    .filter-chip {
      height: 28px; padding: 0 12px; border-radius: 20px;
      border: 1px solid var(--border-glass); background: transparent;
      color: var(--text-muted); font-size: 11.5px; font-family: var(--font-sans);
      cursor: pointer; transition: all 0.15s;
    }
    .filter-chip:hover { color: var(--text-primary); background: rgba(255, 255, 255, 0.04); }
    .filter-chip[data-on="true"] {
      background: rgba(59, 130, 246, 0.12);
      border-color: rgba(59, 130, 246, 0.4);
      color: var(--accent-blue);
    }

    /* Sin tope, la razón social más larga del padrón estira la columna a ~1350px y empuja
       CUIT, código y teléfono fuera de la pantalla. El nombre completo queda en el title. */
    .os-nombre {
      font-weight: 500;
      max-width: 420px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Segunda línea de una celda: sigla, provincia, email. */
    .os-sub { color: var(--text-dim); margin-top: 2px; }
    .os-email {
      max-width: 190px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Etiqueta del registro delante del código, para que RNAS y RNEMP se distingan de un vistazo. */
    .os-reg {
      display: inline-block;
      min-width: 42px;
      color: var(--text-dim);
      font-size: 9.5px;
      letter-spacing: 0.08em;
    }

    .os-tipo {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10.5px;
      font-family: var(--font-mono);
      letter-spacing: 0.04em;
      white-space: nowrap;
      background: rgba(148, 163, 184, 0.12);
      color: var(--text-secondary);
    }
    /* Los tres tipos que a Administración le cambian la decisión de a quién factura. */
    .os-tipo[data-tipo="OBRA_SOCIAL_PROVINCIAL"] { background: rgba(139, 92, 246, 0.14); color: var(--accent-purple, #a78bfa); }
    .os-tipo[data-tipo="EMPRESA_MEDICINA_PREPAGA"] { background: rgba(59, 130, 246, 0.12); color: var(--accent-blue); }
    .os-tipo[data-tipo="PERSONAL_DIRECCION"] { background: rgba(16, 185, 129, 0.12); color: var(--accent-emerald); }

    .os-pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-top: 1px solid var(--border-hairline);
    }
    .page-btn {
      width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px; border: 1px solid var(--border-glass); background: transparent;
      font-size: 12px; font-family: var(--font-mono); color: var(--text-muted); cursor: pointer;
    }
    .page-btn:hover { background: rgba(255, 255, 255, 0.05); color: var(--text-primary); }
    .page-btn[data-active="true"] {
      background: rgba(59, 130, 246, 0.15);
      border-color: rgba(59, 130, 246, 0.4);
      color: var(--accent-blue);
    }

    .os-loading-bar {
      height: 2px;
      background: var(--accent-blue);
      opacity: 0.7;
      animation: pulse 1.5s ease-in-out infinite;
    }
    .os-error {
      margin: 10px 16px;
      padding: 8px 12px;
      border-radius: 6px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.25);
      font-size: 11px;
      font-family: var(--font-mono);
      color: var(--accent-red);
    }

    @media (max-width: 900px) {
      .os-toolbar { flex-direction: column; align-items: stretch; }
      .os-search { max-width: none; }
    }
  `],
})
export class ObrasSocialesComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private api = inject(ObrasSocialesApiService);
  private feedback = inject(UserFeedbackService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly obrasSociales = signal<ObraSocialDTO[]>([]);

  readonly searchQuery = signal('');
  readonly activaFilter = signal<ActivaFilter>('TODAS');

  readonly showModal = signal(false);
  readonly selectedObraSocial = signal<ObraSocialDTO | null>(null);

  readonly importing = signal(false);
  readonly importResult = signal<ImportarPadronObraSocialResultDTO | null>(null);

  readonly planesObraSocial = signal<ObraSocialDTO | null>(null);
  readonly conveniosObraSocial = signal<ObraSocialDTO | null>(null);

  readonly filterOptions: { label: string; value: ActivaFilter }[] = [
    { label: 'Todas', value: 'TODAS' },
    { label: 'Activas', value: 'ACTIVAS' },
    { label: 'Inactivas', value: 'INACTIVAS' },
  ];

  /** Página actual (0-based) y total de filas del catálogo según el filtro aplicado. */
  readonly page = signal(0);
  readonly pageSize = signal(ITEMS_PER_PAGE);
  readonly total = signal(0);

  /**
   * KPIs de la cabecera. Vienen del endpoint /count, NO de contar lo que llegó: con paginación
   * eso daría el tamaño de la página. Antes se calculaban sobre las filas cargadas y con 834
   * registros la pantalla mostraba 500/485/15 en lugar de 834/804/30.
   */
  readonly counts = signal({ total: 0, activas: 0, inactivas: 0 });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  /** Ventana de hasta 7 botones alrededor de la página actual. */
  readonly pageRange = computed(() => {
    const tp = this.totalPages();
    const actual = this.page();
    const ventana = 7;
    let desde = Math.max(0, actual - Math.floor(ventana / 2));
    const hasta = Math.min(tp, desde + ventana);
    desde = Math.max(0, hasta - ventana);
    return Array.from({ length: hasta - desde }, (_, i) => desde + i);
  });

  constructor() {
    // La búsqueda va al backend, así que se espera a que el usuario deje de tipear en vez de
    // pedir una página por tecla. Cualquier cambio de texto vuelve a la primera página: si no,
    // se podría quedar mirando la página 12 de un resultado que ahora tiene 2.
    toObservable(this.searchQuery)
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page.set(0);
        this.load();
      });
  }

  ngOnInit(): void {
    this.loadCounts();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .getPage({
        page: this.page(),
        size: this.pageSize(),
        nombre: this.searchQuery(),
        activa: this.activaParam(),
      })
      .pipe(
        catchError(() => {
          this.error.set('No se pudo conectar con el servidor');
          return of({ data: [], total: 0 });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((res) => {
        this.obrasSociales.set(res.data);
        this.total.set(res.total);
        this.loading.set(false);
      });
  }

  /** Totales del catálogo completo, independientes de la página y del filtro de la tabla. */
  private loadCounts(): void {
    forkJoin({
      total: this.api.count().pipe(catchError(() => of(0))),
      activas: this.api.count({ activa: true }).pipe(catchError(() => of(0))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ total, activas }) => {
        this.counts.set({ total, activas, inactivas: total - activas });
      });
  }

  /** El filtro de la tabla se traduce a criteria del backend; 'TODAS' es no mandar el parámetro. */
  private activaParam(): boolean | undefined {
    const f = this.activaFilter();
    return f === 'TODAS' ? undefined : f === 'ACTIVAS';
  }

  setActivaFilter(value: ActivaFilter): void {
    if (this.activaFilter() === value) return;
    this.activaFilter.set(value);
    this.page.set(0);
    this.load();
  }

  goToPage(p: number): void {
    const destino = Math.min(Math.max(0, p), this.totalPages() - 1);
    if (destino === this.page()) return;
    this.page.set(destino);
    this.load();
  }

  /** Recarga completa: página actual + totales. Es lo que espera el botón "Actualizar". */
  reload(): void {
    this.load();
    this.loadCounts();
  }

  tipoLabel(tipo: TipoFinanciadorSalud): string {
    return TIPO_FINANCIADOR_LABEL[tipo] ?? tipo;
  }

  /** Los enums de provincia vienen en SCREAMING_SNAKE; en la tabla se leen mejor capitalizados. */
  provinciaLabel(provincia: string): string {
    return provincia
      .toLowerCase()
      .split('_')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  openCreateModal(): void {
    this.selectedObraSocial.set(null);
    this.showModal.set(true);
  }

  openEditModal(os: ObraSocialDTO): void {
    this.selectedObraSocial.set(os);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.selectedObraSocial.set(null);
  }

  onModalSaved(): void {
    this.closeModal();
    this.reload();
  }

  openPlanesModal(os: ObraSocialDTO): void {
    this.planesObraSocial.set(os);
  }

  openConveniosModal(os: ObraSocialDTO): void {
    this.conveniosObraSocial.set(os);
  }

  onPadronFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Limpiar el input ya en este punto: permite volver a elegir el mismo archivo
    // dos veces seguidas (el evento 'change' no dispara si el value no cambia).
    input.value = '';
    if (!file) return;

    this.importing.set(true);
    this.importResult.set(null);
    this.api.importarPadron(file).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (result) => {
        this.importing.set(false);
        this.importResult.set(result);
        this.load();
      },
      error: (err) => {
        this.importing.set(false);
        this.feedback.push({
          type: 'error',
          title: 'No se pudo importar el padrón',
          message: err?.error?.detail ?? 'Verificá el formato del archivo e intentá nuevamente.',
        });
      },
    });
  }

  deactivate(os: ObraSocialDTO): void {
    if (!os.id) return;
    this.api.deactivate(os.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.feedback.push({ type: 'success', title: 'Obra social dada de baja', message: `${os.nombre} quedó inactiva.` });
        this.load();
      },
      error: () => {
        this.feedback.push({ type: 'error', title: 'No se pudo dar de baja', message: 'Verificá tus permisos e intentá nuevamente.' });
      },
    });
  }
}
