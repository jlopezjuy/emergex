import { Component, computed, input, output, signal } from '@angular/core';
import { CerrarTicketRequest, HospitalDTO, EntregaHospitalariaDTO } from '../../../../../data-access/dto/ticket.dto';
import { EmergencyApiService } from '../../../../../data-access/api/emergency.api';
import { DateUtils } from '../../../../../core/utils/date.utils';
import { VitalSignsUtils } from '../../../../../core/utils/vital-signs.utils';

@Component({
  selector: 'app-hospital-delivery-modal',
  standalone: true,
  templateUrl: './hospital-delivery-modal.component.html',
  styleUrl: './hospital-delivery-modal.component.scss',
})
export class HospitalDeliveryModalComponent {
  readonly ticketId = input.required<number>();
  readonly hospitales = input<HospitalDTO[]>([]);

  readonly confirmed = output<void>();
  readonly closed = output<void>();

  readonly Number = Number;

  readonly entregaReceptorNombre = signal('');
  readonly entregaReceptorMatricula = signal('');
  readonly entregaServicioReceptor = signal('');
  readonly entregaHospitalId = signal<number | null>(null);
  readonly entregaGlasgow = signal('');
  readonly entregaPa = signal('');
  readonly entregaFc = signal('');
  readonly entregaSatO2 = signal('');
  readonly entregaFirmaReceptor = signal('');
  readonly closeImpresion = signal('');
  readonly entregaSaving = signal(false);
  readonly entregaError = signal<string | null>(null);
  private readonly completionIdempotencyKey = signal<string | null>(null);

  readonly puedeCompletarEntrega = computed(() =>
    this.hospitales().length > 0 &&
    this.entregaHospitalId() !== null &&
    Boolean(this.entregaReceptorNombre().trim()) &&
    Boolean(this.closeImpresion().trim()),
  );

  constructor(private emergencyApi: EmergencyApiService) {}

  confirmarEntregaHospitalaria(): void {
    if (this.hospitales().length === 0) {
      this.entregaError.set('No hay hospitales configurados para registrar la entrega');
      return;
    }

    const hospitalId = this.entregaHospitalId();
    if (hospitalId === null) {
      this.entregaError.set('El hospital receptor es obligatorio');
      return;
    }

    const nombre = this.entregaReceptorNombre().trim();
    if (!nombre) {
      this.entregaError.set('El nombre del receptor es obligatorio');
      return;
    }

    const impresionClinica = this.closeImpresion().trim();
    if (!impresionClinica) {
      this.entregaError.set('La impresión clínica es obligatoria para completar el cierre');
      return;
    }

    this.entregaSaving.set(true);
    this.entregaError.set(null);

    const dto: EntregaHospitalariaDTO = {
      receptorNombre: nombre,
      receptorMatricula: this.entregaReceptorMatricula().trim() || undefined,
      servicioReceptor: this.entregaServicioReceptor().trim() || undefined,
      hospitalId,
      horaEntrega: DateUtils.now().toISO()!,
      condicionEntregaGlasgow: VitalSignsUtils.toNumber(this.entregaGlasgow()) ?? undefined,
      condicionEntregaPa: this.entregaPa().trim() || undefined,
      condicionEntregaFc: VitalSignsUtils.toNumber(this.entregaFc()) ?? undefined,
      condicionEntregaSatO2: VitalSignsUtils.toNumber(this.entregaSatO2()) ?? undefined,
      firmaReceptor: this.entregaFirmaReceptor().trim() || undefined,
    };

    const cierre: CerrarTicketRequest = {
      resolucion: {
        impresionClinica,
        requiereTraslado: true,
        tipoResolucion: 'DERIVADO_HOSPITAL',
      },
    };
    const idempotencyKey = this.completionIdempotencyKey() ?? crypto.randomUUID();
    this.completionIdempotencyKey.set(idempotencyKey);

    this.emergencyApi.completarEntregaHospitalaria(this.ticketId(), { entrega: dto, cierre }, idempotencyKey).subscribe({
      next: () => {
        this.entregaSaving.set(false);
        this.confirmed.emit();
      },
      error: (err) => {
        this.entregaSaving.set(false);
        this.entregaError.set(
          err?.status === 409
            ? 'La asistencia fue actualizada por otro operador. Recargá antes de reintentar.'
            : err?.error?.detail ?? 'Error al completar la entrega hospitalaria',
        );
      },
    });
  }
}
