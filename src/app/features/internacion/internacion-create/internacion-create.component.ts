import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { EmergencyApiService } from '../../../data-access/api/emergency.api';
import { InternacionApiService } from '../../../data-access/api/internacion.api';
import { InternacionStore } from '../../../core/stores/internacion.store';
import { TicketAsistenciaDTO } from '../../../data-access/dto/ticket.dto';
import { IniciarInternacionDTO } from '../../../data-access/dto/internacion.dto';
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
  selector: 'emx-internacion-create',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
  template: `
    <div class="max-w-3xl mx-auto p-6">
      <!-- Back -->
      <a
        routerLink="/internacion"
        class="text-sm hover:underline mb-6 inline-flex items-center gap-1"
        style="color: var(--text-secondary)"
      >
        ← Volver al listado
      </a>

      <h1 class="text-2xl font-semibold mb-2" style="color: var(--text-primary)">
        Nueva Internación Domiciliaria
      </h1>

      <!-- Step Indicator -->
      <div class="flex items-center gap-2 mb-8">
        <button
          (click)="step.set(1)"
          class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
          [style.background]="step() === 1 ? 'var(--accent-emerald)' : 'var(--surface-glass)'"
          [style.color]="step() === 1 ? '#fff' : 'var(--text-secondary)'"
          [style.border]="step() === 1 ? '1px solid var(--accent-emerald)' : '1px solid var(--border-glass)'"
        >
          <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                [style.background]="step() === 1 ? 'rgba(255,255,255,0.25)' : 'var(--surface-inset)'">1</span>
          Seleccionar Ticket
        </button>
        <span style="color: var(--text-muted)">→</span>
        <button
          (click)="selectedTicket() ? step.set(2) : null"
          class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all"
          [style.background]="step() === 2 ? 'var(--accent-emerald)' : 'var(--surface-glass)'"
          [style.color]="step() === 2 ? '#fff' : 'var(--text-secondary)'"
          [style.border]="step() === 2 ? '1px solid var(--accent-emerald)' : '1px solid var(--border-glass)'"
          [style.opacity]="selectedTicket() ? '1' : '0.5'"
        >
          <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                [style.background]="step() === 2 ? 'rgba(255,255,255,0.25)' : 'var(--surface-inset)'">2</span>
          Datos Clínicos
        </button>
      </div>

      <!-- Step 1: Ticket Selection -->
      @if (step() === 1) {
        <div
          class="rounded-xl p-6 mb-6"
          style="background: var(--surface-glass); border: 1px solid var(--border-glass)"
        >
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-medium" style="color: var(--text-primary)">
              Tickets activos
            </h2>
            <input
              type="text"
              [value]="searchQuery()"
              (input)="searchQuery.set(($any($event.target)).value)"
              placeholder="Buscar paciente..."
              class="rounded-lg px-3 py-2 text-sm w-64"
              style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
            />
          </div>

          @if (loadingTickets()) {
            <p class="text-center py-8" style="color: var(--text-muted)">Cargando tickets...</p>
          } @else if (filteredTickets().length === 0) {
            <p class="text-center py-8" style="color: var(--text-muted)">
              No se encontraron tickets activos
            </p>
          } @else {
            <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
              @for (t of filteredTickets(); track t.id) {
                <button
                  (click)="selectTicket(t)"
                  class="w-full text-left p-4 rounded-xl border transition-all hover:scale-[1.005]"
                  [style.background]="selectedTicket()?.id === t.id ? 'var(--surface-glass-strong)' : 'var(--surface-glass)'"
                  [style.borderColor]="selectedTicket()?.id === t.id ? 'var(--accent-emerald)' : 'var(--border-glass)'"
                >
                  <div class="flex items-start justify-between">
                    <div>
                      <div class="font-medium" style="color: var(--text-primary)">
                        {{ t.pacienteDescripcion || 'Paciente #' + t.pacienteId }}
                      </div>
                      <div class="text-sm mt-1" style="color: var(--text-secondary)">
                        {{ t.tipoEmergencia || t.codigo || 'Ticket #' + t.id }}
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      <span
                        class="px-2 py-0.5 rounded-full text-xs font-medium"
                        [style.background]="urgenciaColor(t.prioridad)"
                        style="color: #fff"
                      >
                        {{ t.prioridad }}
                      </span>
                      <span class="text-xs" style="color: var(--text-muted)">
                        {{ t.fechaCreacion | date:'dd/MM HH:mm' }}
                      </span>
                    </div>
                  </div>
                </button>
              }
            </div>
          }

          <div class="mt-6 flex justify-end">
            <button
              (click)="step.set(2)"
              [disabled]="!selectedTicket()"
              class="px-6 py-2.5 rounded-lg text-sm font-medium transition-all"
              [style.background]="selectedTicket() ? 'var(--accent-emerald)' : 'var(--surface-inset)'"
              [style.color]="selectedTicket() ? '#fff' : 'var(--text-muted)'"
            >
              Continuar
            </button>
          </div>
        </div>
      }

      <!-- Step 2: Clinical Form -->
      @if (step() === 2 && selectedTicket(); as ticket) {
        <div class="grid grid-cols-3 gap-6">
          <!-- Patient Preview Card -->
          <div class="col-span-1">
            <div
              class="rounded-xl p-5 sticky top-6"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass)"
            >
              <h3 class="text-sm font-semibold mb-3 uppercase tracking-wider" style="color: var(--text-muted)">
                Paciente
              </h3>
              <div class="text-lg font-medium mb-1" style="color: var(--text-primary)">
                {{ ticket.pacienteDescripcion || 'Sin nombre' }}
              </div>
              <div class="text-sm mb-3" style="color: var(--text-secondary)">
                Ticket #{{ ticket.id }}
              </div>
              <div class="text-xs space-y-1" style="color: var(--text-muted)">
                <div>Prioridad: {{ ticket.prioridad }}</div>
                <div>Fecha: {{ ticket.fechaCreacion | date:'dd/MM/yy HH:mm' }}</div>
                @if (ticket.direccion) {
                  <div class="break-words">Dirección: {{ ticket.direccion }}</div>
                }
              </div>
            </div>
          </div>

          <!-- Clinical Form -->
          <div class="col-span-2">
            <form
              [formGroup]="form"
              (ngSubmit)="submit()"
              class="rounded-xl p-6 space-y-5"
              style="background: var(--surface-glass); border: 1px solid var(--border-glass)"
            >
              <h2 class="text-lg font-medium mb-2" style="color: var(--text-primary)">
                Datos clínicos de la internación
              </h2>

              <!-- Diagnóstico Principal -->
              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">
                  Diagnóstico Principal *
                </label>
                <textarea
                  formControlName="diagnosticoPrincipal"
                  rows="3"
                  placeholder="Ej: Neumonía adquirida en la comunidad..."
                  class="rounded-lg px-3 py-2 text-sm w-full resize-none"
                  style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
                ></textarea>
                @if (f['diagnosticoPrincipal'].invalid && f['diagnosticoPrincipal'].touched) {
                  <span class="text-xs" style="color: var(--accent-red)">Requerido</span>
                }
              </div>

              <!-- Dirección -->
              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">
                  Dirección de Internación *
                </label>
                <input
                  type="text"
                  formControlName="direccionInternacion"
                  placeholder="Calle, número, piso, depto..."
                  class="rounded-lg px-3 py-2 text-sm w-full"
                  style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
                />
                @if (f['direccionInternacion'].invalid && f['direccionInternacion'].touched) {
                  <span class="text-xs" style="color: var(--accent-red)">Requerido</span>
                }
              </div>

              <!-- Familiar + Teléfono -->
              <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">
                    Familiar Responsable *
                  </label>
                  <input
                    type="text"
                    formControlName="familiarResponsable"
                    placeholder="Nombre y apellido"
                    class="rounded-lg px-3 py-2 text-sm w-full"
                    style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
                  />
                  @if (f['familiarResponsable'].invalid && f['familiarResponsable'].touched) {
                    <span class="text-xs" style="color: var(--accent-red)">Requerido</span>
                  }
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">
                    Teléfono Emergencia *
                  </label>
                  <input
                    type="text"
                    formControlName="telefonoEmergencia"
                    placeholder="+54 11 1234-5678"
                    class="rounded-lg px-3 py-2 text-sm w-full"
                    style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
                  />
                  @if (f['telefonoEmergencia'].invalid && f['telefonoEmergencia'].touched) {
                    <span class="text-xs" style="color: var(--accent-red)">Requerido</span>
                  }
                </div>
              </div>

              <!-- Observaciones -->
              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary)">
                  Observaciones
                </label>
                <textarea
                  formControlName="observaciones"
                  rows="2"
                  placeholder="Notas adicionales..."
                  class="rounded-lg px-3 py-2 text-sm w-full resize-none"
                  style="background: var(--surface-inset); border: 1px solid var(--border-glass); color: var(--text-primary); outline: none;"
                ></textarea>
              </div>

              <!-- Error message -->
              @if (error()) {
                <div class="p-3 rounded-lg text-sm" style="background: rgba(239, 68, 68, 0.1); color: var(--accent-red)">
                  {{ error() }}
                </div>
              }

              <!-- Actions -->
              <div class="flex items-center justify-between pt-4 border-t" style="border-color: var(--border-glass)">
                <button
                  type="button"
                  (click)="step.set(1)"
                  class="px-4 py-2 text-sm rounded-lg transition-colors"
                  style="color: var(--text-secondary); background: transparent"
                >
                  ← Volver
                </button>
                <button
                  type="submit"
                  [disabled]="form.invalid || submitting()"
                  class="px-6 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  [style.background]="form.valid ? 'var(--accent-emerald)' : 'var(--surface-inset)'"
                  [style.color]="form.valid ? '#fff' : 'var(--text-muted)'"
                >
                  @if (submitting()) {
                    <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Creando...
                  } @else {
                    Iniciar Internación
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class InternacionCreateComponent {
    private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private emergencyApi = inject(EmergencyApiService);
  private internacionApi = inject(InternacionApiService);
  private store = inject(InternacionStore);

  step = signal(1);
  selectedTicket = signal<TicketAsistenciaDTO | null>(null);
  loadingTickets = signal(false);
  submitting = signal(false);
  error = signal<string | null>(null);
  tickets = signal<TicketAsistenciaDTO[]>([]);
  searchQuery = signal('');

  form = this.fb.nonNullable.group({
    diagnosticoPrincipal: ['', [Validators.required]],
    direccionInternacion: ['', [Validators.required]],
    familiarResponsable: ['', [Validators.required]],
    telefonoEmergencia: ['', [Validators.required]],
    observaciones: [''],
  });

  get f() {
    return this.form.controls;
  }

  filteredTickets = computed(() => {
    const q = this.searchQuery().toLowerCase();
    const list = this.tickets();
    if (!q) return list;
    return list.filter(
      (t) =>
        (t.pacienteDescripcion ?? '').toLowerCase().includes(q) ||
        (t.codigo ?? '').toLowerCase().includes(q) ||
        String(t.id).includes(q),
    );
  });

  constructor() {
    this.loadTickets();
  }

  private loadTickets(): void {
    this.loadingTickets.set(true);
    this.emergencyApi.getActivos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (data) => {
              this.tickets.set(data ?? []);
              this.loadingTickets.set(false);
            },
            error: () => {
              this.loadingTickets.set(false);
              this.error.set('Error al cargar tickets');
            },
          });
  }

  selectTicket(t: TicketAsistenciaDTO): void {
    this.selectedTicket.set(t);
    this.error.set(null);
  }

  submit(): void {
    if (this.form.invalid || !this.selectedTicket()) return;
    this.submitting.set(true);
    this.error.set(null);

    const dto: IniciarInternacionDTO = {
      ticketId: this.selectedTicket()!.id,
      diagnosticoPrincipal: this.f.diagnosticoPrincipal.value,
      direccionInternacion: this.f.direccionInternacion.value,
      familiarResponsable: this.f.familiarResponsable.value,
      telefonoEmergencia: this.f.telefonoEmergencia.value,
      observaciones: this.f.observaciones.value || undefined,
    };

    this.internacionApi.iniciarDesdeTicket(dto).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (internacion) => {
              this.store.agregarALista(internacion);
              this.router.navigate(['/internacion', internacion.id]);
            },
            error: (err) => {
              this.submitting.set(false);
              const msg = err?.error?.detail ?? err?.error?.message ?? err?.message ?? 'Error al crear la internación';
              this.error.set(msg);
            },
          });
  }

  urgenciaColor(prioridad?: string): string {
    const map: Record<string, string> = {
      CRITICA: 'var(--accent-red)',
      URGENTE: 'var(--accent-amber)',
      NORMAL: 'var(--accent-blue)',
      ROJO: 'var(--accent-red)',
      AMARILLO: 'var(--accent-amber)',
      VERDE: 'var(--accent-emerald)',
    };
    return map[prioridad ?? ''] ?? 'var(--text-muted)';
  }
}
