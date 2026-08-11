import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TercerosApiService } from '../../../data-access/api/terceros.api';
import { UserFeedbackService } from '../../../core/notifications/user-feedback.service';
import { SessionStore } from '../../../core/stores/session.store';
import { TerceroResumenDTO } from '../../../data-access/dto/ledger.dto';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { ModalShellComponent } from '../../../shared/components/modal-shell/modal-shell.component';

@Component({
  selector: 'emx-proveedores',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    LoadingStateComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    ModalShellComponent
  ],
  template: `
    <div class="p-6 space-y-6" style="background: var(--bg-deep); min-height: 100vh; color: var(--text-primary);">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold" style="color: var(--text-primary);">Gestión de Proveedores</h1>
          <p class="text-sm" style="color: var(--text-muted);">Catálogo de terceros con rol proveedor y gestión fiscal.</p>
        </div>
        @if (puedeCrearProveedor()) {
          <button
            id="btn-nuevo-proveedor"
            type="button"
            (click)="showModal.set(true)"
            class="px-4 py-2 font-medium text-sm rounded-lg shadow transition"
            style="background: var(--accent-blue); color: #fff;"
          >
            + Nuevo Proveedor
          </button>
        }
      </div>

      <!-- Filtro Búsqueda -->
      <div class="p-4 rounded-xl border" style="background: var(--bg-elevated); border-color: var(--border-glass);">
        <div class="relative max-w-md">
          <input
            id="search-proveedores"
            type="text"
            [value]="searchTerm()"
            (input)="onSearchChange($event)"
            placeholder="Buscar por Razón Social, CUIT o Nombre Comercial..."
            class="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
            style="background: var(--surface-inset); border-color: var(--border-glass); color: var(--text-primary);"
          />
          <span class="absolute left-3 top-2.5" style="color: var(--text-muted);">🔍</span>
        </div>
      </div>

      <!-- Estado Carga / Error / Vacío / Tabla -->
      @if (loading()) {
        <emx-loading-state message="Cargando proveedores..."></emx-loading-state>
      } @else if (error()) {
        <emx-error-state [message]="errorMessage() || 'Error al cargar proveedores'" (retry)="cargarProveedores()"></emx-error-state>
      } @else if (proveedores().length === 0) {
        <emx-empty-state title="Sin proveedores registrados" message="No se encontraron proveedores activos con la búsqueda."></emx-empty-state>
      } @else {
        <div class="rounded-xl border overflow-hidden" style="background: var(--bg-elevated); border-color: var(--border-glass);">
          <table class="w-full text-left text-sm">
            <thead class="text-xs uppercase font-semibold border-b" style="background: var(--surface-glass); color: var(--text-muted); border-color: var(--border-glass);">
              <tr>
                <th class="px-6 py-3">Razón Social</th>
                <th class="px-6 py-3">CUIT / Identificador</th>
                <th class="px-6 py-3">Nombre Comercial</th>
                <th class="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (prov of proveedores(); track prov.id) {
                <tr class="border-b transition" style="border-color: var(--border-glass);">
                  <td class="px-6 py-4 font-medium" style="color: var(--text-primary);">{{ prov.razonSocial }}</td>
                  <td class="px-6 py-4 font-mono text-xs" style="color: var(--text-muted);">{{ prov.cuit }}</td>
                  <td class="px-6 py-4" style="color: var(--text-muted);">{{ prov.nombreComercial || '-' }}</td>
                  <td class="px-6 py-4 text-right">
                    <a
                      [routerLink]="['/administracion/proveedores', prov.id]"
                      [state]="{ proveedor: prov }"
                      class="font-medium text-xs"
                      style="color: var(--accent-blue);"
                    >
                      Ver Ficha 360 →
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Paginación Server-Side (V3-S3-01) -->
        <div class="flex items-center justify-between p-4 rounded-xl border" style="background: var(--bg-elevated); border-color: var(--border-glass);">
          <span class="text-xs font-medium" style="color: var(--text-muted);">
            Mostrando página <strong style="color: var(--text-primary);">{{ page() + 1 }}</strong> de <strong style="color: var(--text-primary);">{{ totalPages() || 1 }}</strong> (Total: {{ totalElements() }} proveedores)
          </span>
          <div class="flex gap-2">
            <button
              id="btn-prev-page"
              type="button"
              [disabled]="page() === 0 || loading()"
              (click)="cambiarPagina(page() - 1)"
              class="px-3 py-1.5 text-xs font-medium rounded-lg border disabled:opacity-40 transition"
              style="background: var(--surface-glass); border-color: var(--border-glass); color: var(--text-primary);"
            >
              ← Anterior
            </button>
            <button
              id="btn-next-page"
              type="button"
              [disabled]="page() >= totalPages() - 1 || loading()"
              (click)="cambiarPagina(page() + 1)"
              class="px-3 py-1.5 text-xs font-medium rounded-lg border disabled:opacity-40 transition"
              style="background: var(--surface-glass); border-color: var(--border-glass); color: var(--text-primary);"
            >
              Siguiente →
            </button>
          </div>
        </div>
      }

      <!-- Modal Alta Proveedor (usando modal-shell) -->
      @if (showModal()) {
        <emx-modal-shell title="Alta de Proveedor" (closed)="showModal.set(false)">
          <form [formGroup]="provForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
            <div>
              <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted);">Razón Social</label>
              <input
                type="text"
                formControlName="razonSocialCanonica"
                placeholder="Proveedor S.A."
                class="w-full px-3 py-2 border rounded-lg text-sm"
                style="background: var(--surface-inset); border-color: var(--border-glass); color: var(--text-primary);"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted);">Nombre Comercial</label>
              <input
                type="text"
                formControlName="nombreComercial"
                placeholder="Proveedor Express"
                class="w-full px-3 py-2 border rounded-lg text-sm"
                style="background: var(--surface-inset); border-color: var(--border-glass); color: var(--text-primary);"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted);">CUIT / Identificador</label>
              <input
                type="text"
                formControlName="identificador"
                placeholder="30-12345678-9"
                class="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                style="background: var(--surface-inset); border-color: var(--border-glass); color: var(--text-primary);"
              />
            </div>
          </form>

          <div footer class="flex justify-end gap-3">
            <button
              type="button"
              (click)="showModal.set(false)"
              class="px-4 py-2 text-sm font-medium rounded-lg border"
              style="color: var(--text-primary); background: var(--surface-glass); border-color: var(--border-glass);"
            >
              Cancelar
            </button>
            <button
              type="button"
              [disabled]="provForm.invalid || saving()"
              (click)="onSubmit()"
              class="px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50 transition"
              style="background: var(--accent-blue); color: #fff;"
            >
              {{ saving() ? 'Registrando...' : 'Registrar' }}
            </button>
          </div>
        </emx-modal-shell>
      }
    </div>
  `
})
export class ProveedoresComponent implements OnInit, OnDestroy {
  proveedores = signal<TerceroResumenDTO[]>([]);
  loading = signal(true);
  error = signal(false);
  errorMessage = signal('');
  searchTerm = signal('');
  showModal = signal(false);
  saving = signal(false);

  page = signal(0);
  size = signal(10);
  totalElements = signal(0);
  totalPages = signal(1);

  private readonly tercerosApi = inject(TercerosApiService);
  private readonly feedbackService = inject(UserFeedbackService);
  private readonly sessionStore = inject(SessionStore);
  private readonly fb = inject(FormBuilder);

  /** Solo ROLE_ADMIN, ROLE_ADMINISTRADOR y ROLE_PROPIETARIO pueden dar de alta proveedores */
  readonly puedeCrearProveedor = this.sessionStore.isAdmin;

  provForm = this.fb.group({
    razonSocialCanonica: ['', Validators.required],
    nombreComercial: ['', Validators.required],
    identificador: ['', Validators.required]
  });

  private readonly searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.page.set(0);
        this.cargarProveedores();
      });

    this.cargarProveedores();
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  cargarProveedores(): void {
    this.loading.set(true);
    this.error.set(false);

    this.tercerosApi
      .getPage({
        q: this.searchTerm(),
        esProveedor: true,
        page: this.page(),
        size: this.size()
      })
      .subscribe({
        next: (res) => {
          this.proveedores.set(res.data || []);
          this.totalElements.set(res.total || 0);
          this.totalPages.set(Math.ceil((res.total || 0) / this.size()) || 1);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(true);
          this.errorMessage.set(err?.error?.detail || 'No se pudo obtener el catálogo de proveedores.');
        }
      });
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina < 0 || nuevaPagina >= this.totalPages()) return;
    this.page.set(nuevaPagina);
    this.cargarProveedores();
  }

  onSearchChange(evt: Event): void {
    const val = (evt.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.searchSubject.next(val);
  }

  onSubmit(): void {
    if (this.provForm.invalid) return;

    this.saving.set(true);
    const val = this.provForm.value;

    this.tercerosApi.registrarTercero({
      pais: 'ARG',
      tipoIdentificador: 'CUIT',
      identificador: val.identificador || '',
      razonSocialCanonica: val.razonSocialCanonica || '',
      nombreComercial: val.nombreComercial || '',
      roles: ['PROVEEDOR']
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.provForm.reset();
        this.feedbackService.push({
          type: 'success',
          title: 'Proveedor Registrado',
          message: 'El tercero fue dado de alta con rol PROVEEDOR.'
        });
        this.cargarProveedores();
      },
      error: (err) => {
        this.saving.set(false);
        this.feedbackService.push({
          type: 'error',
          title: 'Error al registrar',
          message: err?.error?.detail || err?.error?.message || 'No se pudo crear el proveedor.'
        });
      }
    });
  }
}
