import { Component, OnInit, computed, inject, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ObrasSocialesApiService } from '../../data-access/api/obras-sociales.api';
import { ImportarPadronObraSocialResultDTO, ObraSocialDTO } from '../../data-access/dto/obra-social.dto';
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
    <div style="display:flex; flex-direction:column; height:100%; overflow:hidden; background:var(--bg-deep);">

      <!-- Header -->
      <div style="padding:24px 24px 0; flex-shrink:0;">
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
          <div style="margin-top:10px; padding:10px 12px; border-radius:8px; background:var(--surface-glass); border:1px solid var(--border-glass);">
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

        <!-- Search + filter row -->
        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:8px;">
          <div style="position:relative; width:280px;">
            <svg
              style="position:absolute; left:10px; top:50%; transform:translateY(-50%); pointer-events:none;"
              width="14" height="14" viewBox="0 0 16 16" fill="none"
              stroke="var(--text-muted)" stroke-width="1.5"
            >
              <circle cx="7" cy="7" r="5"/>
              <path d="M11 11l3 3"/>
            </svg>
            <input
              type="text"
              placeholder="Buscar por nombre o CUIT..."
              [(ngModel)]="searchQuery"
              style="width:100%; box-sizing:border-box; padding:7px 10px 7px 32px; border-radius:8px; border:1px solid var(--border-glass); background:var(--surface-glass); color:var(--text-primary); font-size:12px; outline:none; font-family:inherit;"
            />
          </div>

          <div style="display:flex; gap:4px;">
            @for (opt of filterOptions; track opt.value) {
              <button
                type="button"
                (click)="activaFilter.set(opt.value)"
                [style.background]="activaFilter() === opt.value ? 'rgba(59,130,246,0.15)' : 'transparent'"
                [style.color]="activaFilter() === opt.value ? 'var(--accent-blue)' : 'var(--text-muted)'"
                [style.borderColor]="activaFilter() === opt.value ? 'rgba(59,130,246,0.4)' : 'var(--border-glass)'"
                style="padding:5px 12px; font-size:11px; font-family:var(--font-mono); border-radius:6px; border:1px solid; cursor:pointer; text-transform:uppercase; letter-spacing:0.08em; transition:all 0.15s;"
              >{{ opt.label }}</button>
            }
          </div>

          <button type="button" class="btn btn--ghost btn--sm" style="margin-left:auto;" (click)="load()">Actualizar</button>
        </div>

        @if (loading()) {
          <div style="height:2px; background:var(--accent-blue); border-radius:2px; margin-top:4px; opacity:0.7; animation:pulse 1.5s ease-in-out infinite;"></div>
        }
        @if (error()) {
          <div style="margin-top:10px; padding:8px 12px; border-radius:6px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); font-size:11px; font-family:var(--font-mono); color:var(--accent-red);">
            {{ error() }}
          </div>
        }

        <div style="height:1px; background:var(--border-hairline); margin-top:16px;"></div>
      </div>

      <!-- Table -->
      <div style="flex:1; overflow-y:auto; padding:16px 24px 24px;">
        <div class="data-table-wrap">
          <table class="data-table" style="width:100%;min-width:760px">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>CUIT</th>
                <th>Código RNOS</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Estado</th>
                <th style="width:80px"></th>
              </tr>
            </thead>
            <tbody>
              @if (filtered().length === 0 && !loading()) {
                <tr>
                  <td colspan="7" style="padding:20px;text-align:center;">
                    <emx-empty-state message="No se encontraron obras sociales para los filtros aplicados." />
                  </td>
                </tr>
              }
              @for (os of filtered(); track os.id) {
                <tr>
                  <td style="font-weight:500;">{{ os.nombre }}</td>
                  <td class="mono" style="font-size:12px;">{{ os.cuit || '—' }}</td>
                  <td class="mono" style="font-size:12px;">{{ os.codigoRNOS || '—' }}</td>
                  <td style="color:var(--text-secondary);">{{ os.telefono || '—' }}</td>
                  <td style="color:var(--text-secondary);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ os.email || '—' }}</td>
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

  readonly counts = computed(() => {
    const all = this.obrasSociales();
    return {
      total: all.length,
      activas: all.filter(o => o.activa).length,
      inactivas: all.filter(o => !o.activa).length,
    };
  });

  // Filtrado client-side: el catálogo global es chico (decenas de registros), no
  // justifica ida y vuelta al backend por cada tecla. La carga sí usa criteria server-side.
  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const filter = this.activaFilter();

    return this.obrasSociales().filter(os => {
      const matchesFilter =
        filter === 'TODAS' || (filter === 'ACTIVAS' ? os.activa : !os.activa);
      const matchesSearch =
        !q ||
        os.nombre.toLowerCase().includes(q) ||
        (os.cuit ?? '').toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .getAll()
      .pipe(
        catchError(() => {
          this.error.set('No se pudo conectar con el servidor');
          return of([]);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((data) => {
        this.obrasSociales.set(data);
        this.loading.set(false);
      });
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
    this.load();
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
