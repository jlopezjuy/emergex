import { Component, computed, inject, input, output, signal, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { InstitutionsApiService } from '../../../../data-access/api/institutions.api';
import { AutorizanteItem, InstitutionDTO } from '../../../../data-access/dto/institution.dto';

@Component({
  selector: 'app-excepcion-deuda-modal',
  standalone: true,
  templateUrl: './excepcion-deuda-modal.component.html',
  styleUrl: './excepcion-deuda-modal.component.scss',
})
export class ExcepcionDeudaModalComponent implements OnInit {
  readonly institutionId = input.required<number>();
  readonly institutionName = input.required<string>();
  readonly accion = input.required<'suspender' | 'reactivar'>();
  readonly motivoInicial = input<string>('');

  readonly confirmed = output<InstitutionDTO>();
  readonly closed = output<void>();

  private readonly api = inject(InstitutionsApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly autorizantes = signal<AutorizanteItem[]>([]);
  readonly loadingAutorizantes = signal(true);
  readonly motivo = signal('');
  readonly autorizadoPor = signal('');
  readonly autorizadoPorSegundo = signal('');
  readonly vigenciaHoras = signal<number | null>(null);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly autorizantesDistintos = computed(() => {
    const primero = this.autorizadoPor();
    const segundo = this.autorizadoPorSegundo();
    return !!primero && !!segundo && primero !== segundo;
  });

  readonly puedeEnviar = computed(
    () => !!this.motivo().trim() && this.autorizantesDistintos() && !this.submitting(),
  );

  ngOnInit(): void {
    this.motivo.set(this.motivoInicial());
    this.api.getAutorizantes().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.autorizantes.set(items);
        this.loadingAutorizantes.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la lista de autorizantes.');
        this.loadingAutorizantes.set(false);
      },
    });
  }

  confirmar(): void {
    if (!this.puedeEnviar()) return;

    this.submitting.set(true);
    this.error.set(null);

    const motivo = this.motivo().trim();
    const primero = this.autorizadoPor();
    const segundo = this.autorizadoPorSegundo();
    const vigencia = this.vigenciaHoras() ?? undefined;

    const request$ =
      this.accion() === 'suspender'
        ? this.api.suspenderPorDeuda(this.institutionId(), motivo, true, primero, segundo, vigencia)
        : this.api.reactivarInstitucion(this.institutionId(), motivo, true, primero, segundo, vigencia);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (institution) => {
        this.submitting.set(false);
        this.confirmed.emit(institution);
      },
      error: (err) => {
        this.submitting.set(false);
        this.error.set(err?.error?.detail ?? err?.error?.title ?? 'No se pudo registrar la excepción.');
      },
    });
  }
}
