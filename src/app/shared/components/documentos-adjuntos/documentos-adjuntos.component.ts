import { Component, Input, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { DocumentosAdjuntosApiService, DocumentoAdjuntoDTO } from '../../../data-access/api/documentos-adjuntos.api';
import { UserFeedbackService } from '../../../core/notifications/user-feedback.service';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { LoadingStateComponent } from '../loading-state/loading-state.component';
import { ErrorStateComponent } from '../error-state/error-state.component';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';

@Component({
  selector: 'emx-documentos-adjuntos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    EmptyStateComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    ModalShellComponent
  ],
  template: `
    <div class="glass rounded-panel p-5 flex flex-col gap-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-sm font-bold uppercase tracking-wider" style="color: var(--text-primary);">
            Documentación Adjunta
          </h3>
          <p class="text-xs" style="color: var(--text-muted);">
            Gestión de contratos, constancias y adjuntos administrativos.
          </p>
        </div>
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
          style="background-color: var(--accent-blue); color: #fff;"
          (click)="mostrarModalAlta.set(true)"
        >
          + Adjuntar Documento
        </button>
      </div>

      @if (loading()) {
        <emx-loading-state />
      } @else if (error()) {
        <emx-error-state message="Error al cargar los documentos adjuntos." (retry)="cargarDocumentos()" />
      } @else if (documentos().length === 0) {
        <emx-empty-state message="No hay documentos adjuntos registrados para esta entidad." />
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left" style="color: var(--text-primary);">
            <thead>
              <tr class="border-b" style="border-color: var(--border-glass); color: var(--text-muted);">
                <th class="py-2 px-3 font-semibold">Tipo</th>
                <th class="py-2 px-3 font-semibold">Nombre del Archivo</th>
                <th class="py-2 px-3 font-semibold">Vigencia</th>
                <th class="py-2 px-3 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              @for (doc of documentos(); track doc.id || doc.nombreArchivo) {
                <tr class="border-b transition-colors hover:bg-white/5" style="border-color: var(--border-glass);">
                  <td class="py-2 px-3 font-medium">{{ doc.tipoDocumento }}</td>
                  <td class="py-2 px-3">{{ doc.nombreArchivo }}</td>
                  <td class="py-2 px-3" style="color: var(--text-muted);">
                    {{ doc.vigenciaDesde || '—' }} al {{ doc.vigenciaHasta || 'indefinida' }}
                  </td>
                  <td class="py-2 px-3 text-right">
                    @if (doc.urlArchivo) {
                      <a
                        [href]="doc.urlArchivo"
                        target="_blank"
                        rel="noopener"
                        class="text-xs font-semibold hover:underline"
                        style="color: var(--accent-blue);"
                      >
                        Ver / Descargar
                      </a>
                    } @else {
                      <span style="color: var(--text-muted);">Sin enlace</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (mostrarModalAlta()) {
      <emx-modal-shell title="Adjuntar Documento" (close)="mostrarModalAlta.set(false)">
        <form [formGroup]="form" (ngSubmit)="guardarDocumento()" class="space-y-4">
          <div>
            <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted);">
              Tipo de Documento
            </label>
            <input
              type="text"
              formControlName="tipoDocumento"
              placeholder="Ej: CONTRATO, CONSTANCIA_AFIP, DNI"
              class="w-full px-3 py-2 text-xs border rounded-lg"
              style="background-color: var(--bg-card); color: var(--text-primary); border-color: var(--border-glass);"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted);">
              Origen del Archivo
            </label>
            <div class="flex items-center gap-4 mb-2">
              <label class="text-xs flex items-center gap-1 cursor-pointer" style="color: var(--text-primary);">
                <input type="radio" name="modoOrigen" [value]="'file'" [checked]="modoOrigen() === 'file'" (change)="modoOrigen.set('file')" />
                Subir archivo local
              </label>
              <label class="text-xs flex items-center gap-1 cursor-pointer" style="color: var(--text-primary);">
                <input type="radio" name="modoOrigen" [value]="'url'" [checked]="modoOrigen() === 'url'" (change)="modoOrigen.set('url')" />
                Enlace / URL externa (S3, Drive)
              </label>
            </div>

            @if (modoOrigen() === 'file') {
              <input
                type="file"
                (change)="onFileSelected($event)"
                class="w-full px-3 py-2 text-xs border rounded-lg file:mr-3 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-500/20 file:text-blue-400"
                style="background-color: var(--bg-card); color: var(--text-primary); border-color: var(--border-glass);"
              />
            } @else {
              <input
                type="url"
                formControlName="urlArchivo"
                placeholder="https://bucket-s3.amazonaws.com/documento.pdf"
                class="w-full px-3 py-2 text-xs border rounded-lg"
                style="background-color: var(--bg-card); color: var(--text-primary); border-color: var(--border-glass);"
              />
            }
          </div>

          <div>
            <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted);">
              Nombre del Archivo / Descripción
            </label>
            <input
              type="text"
              formControlName="nombreArchivo"
              placeholder="Ej: Contrato_Firmado_2026.pdf"
              class="w-full px-3 py-2 text-xs border rounded-lg"
              style="background-color: var(--bg-card); color: var(--text-primary); border-color: var(--border-glass);"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted);">Vigencia Desde</label>
              <input
                type="date"
                formControlName="vigenciaDesde"
                class="w-full px-3 py-2 text-xs border rounded-lg"
                style="background-color: var(--bg-card); color: var(--text-primary); border-color: var(--border-glass);"
              />
            </div>
            <div>
              <label class="block text-xs font-semibold uppercase mb-1" style="color: var(--text-muted);">Vigencia Hasta</label>
              <input
                type="date"
                formControlName="vigenciaHasta"
                class="w-full px-3 py-2 text-xs border rounded-lg"
                style="background-color: var(--bg-card); color: var(--text-primary); border-color: var(--border-glass);"
              />
            </div>
          </div>

          <div class="pt-4 flex justify-end gap-2">
            <button
              type="button"
              class="px-4 py-2 text-xs font-medium rounded-lg"
              style="background-color: var(--bg-panel); color: var(--text-muted);"
              (click)="mostrarModalAlta.set(false)"
            >
              Cancelar
            </button>
            <button
              type="submit"
              [disabled]="form.invalid || enviando()"
              class="px-4 py-2 text-xs font-medium text-white rounded-lg disabled:opacity-50"
              style="background-color: var(--accent-blue);"
            >
              {{ enviando() ? 'Guardando...' : 'Guardar Documento' }}
            </button>
          </div>
        </form>
      </emx-modal-shell>
    }
  `
})
export class DocumentosAdjuntosComponent implements OnInit {
  @Input({ required: true }) entidadTipo!: string;
  @Input({ required: true }) entidadId!: number;

  private api = inject(DocumentosAdjuntosApiService);
  private feedback = inject(UserFeedbackService);
  private fb = inject(FormBuilder);

  readonly documentos = signal<DocumentoAdjuntoDTO[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly enviando = signal(false);
  readonly mostrarModalAlta = signal(false);

  readonly modoOrigen = signal<'file' | 'url'>('file');
  readonly archivoSeleccionado = signal<File | null>(null);

  readonly form = this.fb.group({
    tipoDocumento: ['CONTRATO', Validators.required],
    nombreArchivo: ['', Validators.required],
    urlArchivo: [''],
    vigenciaDesde: [''],
    vigenciaHasta: ['']
  });

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.archivoSeleccionado.set(file);
      this.form.patchValue({
        nombreArchivo: file.name,
        urlArchivo: `file://${file.name}`
      });
    }
  }

  ngOnInit(): void {
    this.cargarDocumentos();
  }

  cargarDocumentos(): void {
    if (!this.entidadTipo || !this.entidadId) return;
    this.loading.set(true);
    this.error.set(false);

    this.api
      .getDocumentosPorEntidad(this.entidadTipo, this.entidadId)
      .pipe(
        catchError(() => {
          this.error.set(true);
          return of([]);
        })
      )
      .subscribe((res) => {
        this.documentos.set(res || []);
        this.loading.set(false);
      });
  }

  guardarDocumento(): void {
    if (this.form.invalid || !this.entidadTipo || !this.entidadId) return;
    this.enviando.set(true);

    const val = this.form.value;
    this.api
      .adjuntarDocumento({
        entidadTipo: this.entidadTipo,
        entidadId: this.entidadId,
        tipoDocumento: val.tipoDocumento!,
        nombreArchivo: val.nombreArchivo!,
        urlArchivo: val.urlArchivo!,
        vigenciaDesde: val.vigenciaDesde || undefined,
        vigenciaHasta: val.vigenciaHasta || undefined
      })
      .pipe(
        catchError((err) => {
          const detail = err?.error?.detail || 'No se pudo guardar el documento adjunto.';
          this.feedback.push({ type: 'error', title: 'Error al adjuntar', message: detail });
          this.enviando.set(false);
          return of(null);
        })
      )
      .subscribe((res) => {
        this.enviando.set(false);
        if (res) {
          this.feedback.push({ type: 'success', title: 'Documento registrado', message: 'El documento se adjuntó correctamente.' });
          this.mostrarModalAlta.set(false);
          this.form.reset({ tipoDocumento: 'CONTRATO' });
          this.cargarDocumentos();
        }
      });
  }
}
