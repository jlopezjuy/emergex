import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TercerosApiService } from '../../../data-access/api/terceros.api';
import { UserFeedbackService } from '../../../core/notifications/user-feedback.service';
import { TerceroResumenDTO } from '../../../data-access/dto/ledger.dto';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';

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
    ErrorStateComponent
  ],
  template: `
    <div class="p-6 space-y-6 bg-[var(--color-bg-app)] min-h-screen text-[var(--color-text-main)]">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 class="text-2xl font-bold text-[var(--color-text-main)]">Gestión de Proveedores</h1>
          <p class="text-sm text-[var(--color-text-muted)]">Catálogo de terceros con rol proveedor y gestión fiscal.</p>
        </div>
        <button
          (click)="showModal = true"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow transition"
        >
          + Nuevo Proveedor
        </button>
      </div>

      <!-- Filtro Búsqueda -->
      <div class="bg-[var(--color-bg-card)] p-4 rounded-xl border border-[var(--color-border)] shadow-sm">
        <div class="relative max-w-md">
          <input
            type="text"
            [value]="searchTerm()"
            (input)="onSearchChange($event)"
            placeholder="Buscar por Razón Social, CUIT o Nombre Comercial..."
            class="w-full pl-9 pr-4 py-2 bg-[var(--color-bg-input)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text-main)]"
          />
          <span class="absolute left-3 top-2.5 text-[var(--color-text-muted)]">🔍</span>
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
        <div class="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-sm">
          <table class="w-full text-left text-sm">
            <thead class="bg-[var(--color-bg-surface)] text-xs uppercase font-semibold text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
              <tr>
                <th class="px-6 py-3">Razón Social</th>
                <th class="px-6 py-3">CUIT / Identificador</th>
                <th class="px-6 py-3">Nombre Comercial</th>
                <th class="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border)]">
              @for (prov of proveedores(); track prov.id) {
                <tr class="hover:bg-[var(--color-bg-surface)] transition">
                  <td class="px-6 py-4 font-medium text-[var(--color-text-main)]">{{ prov.razonSocial }}</td>
                  <td class="px-6 py-4 font-mono text-xs text-[var(--color-text-muted)]">{{ prov.cuit }}</td>
                  <td class="px-6 py-4 text-[var(--color-text-muted)]">{{ prov.nombreComercial || '-' }}</td>
                  <td class="px-6 py-4 text-right">
                    <a
                      [routerLink]="['/administracion/proveedores', prov.id]"
                      class="text-blue-500 hover:text-blue-600 font-medium text-xs"
                    >
                      Ver Ficha 360 →
                    </a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Modal Alta Proveedor -->
      @if (showModal) {
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div class="bg-[var(--color-bg-card)] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[var(--color-border)]">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-bold text-[var(--color-text-main)]">Alta de Proveedor</h3>
              <button (click)="showModal = false" class="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]">✕</button>
            </div>

            <form [formGroup]="provForm" (ngSubmit)="onSubmit()" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-1">Razón Social</label>
                <input
                  type="text"
                  formControlName="razonSocialCanonica"
                  placeholder="Proveedor S.A."
                  class="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-input)] text-sm text-[var(--color-text-main)]"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  formControlName="nombreComercial"
                  placeholder="Proveedor Express"
                  class="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-input)] text-sm text-[var(--color-text-main)]"
                />
              </div>

              <div>
                <label class="block text-xs font-semibold uppercase text-[var(--color-text-muted)] mb-1">CUIT / Identificador</label>
                <input
                  type="text"
                  formControlName="identificador"
                  placeholder="30-12345678-9"
                  class="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-bg-input)] text-sm font-mono text-[var(--color-text-main)]"
                />
              </div>

              <div class="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  (click)="showModal = false"
                  class="px-4 py-2 text-sm font-medium text-[var(--color-text-main)] bg-[var(--color-bg-surface)] border border-[var(--color-border)] rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="provForm.invalid || saving"
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class ProveedoresComponent implements OnInit {
  proveedores = signal<TerceroResumenDTO[]>([]);
  loading = signal(true);
  error = signal(false);
  errorMessage = signal('');
  searchTerm = signal('');

  showModal = false;
  saving = false;

  private tercerosApi = inject(TercerosApiService);
  private feedbackService = inject(UserFeedbackService);
  private fb = inject(FormBuilder);

  provForm = this.fb.group({
    razonSocialCanonica: ['', Validators.required],
    nombreComercial: ['', Validators.required],
    identificador: ['', Validators.required]
  });

  ngOnInit(): void {
    this.cargarProveedores();
  }

  cargarProveedores(): void {
    this.loading.set(true);
    this.error.set(false);

    this.tercerosApi.buscar(this.searchTerm()).subscribe({
      next: (res) => {
        this.proveedores.set(res || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(true);
        this.errorMessage.set(err?.error?.detail || 'No se pudo obtener el catálogo de proveedores.');
      }
    });
  }

  onSearchChange(evt: Event): void {
    const val = (evt.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.cargarProveedores();
  }

  onSubmit(): void {
    if (this.provForm.invalid) return;

    this.saving = true;
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
        this.saving = false;
        this.showModal = false;
        this.provForm.reset();
        this.feedbackService.push({
          type: 'success',
          title: 'Proveedor Registrado',
          message: 'El tercero fue dado de alta con rol PROVEEDOR.'
        });
        this.cargarProveedores();
      },
      error: (err) => {
        this.saving = false;
        this.feedbackService.push({
          type: 'error',
          title: 'Error al registrar',
          message: err?.error?.detail || err?.error?.message || 'No se pudo crear el proveedor.'
        });
      }
    });
  }
}
