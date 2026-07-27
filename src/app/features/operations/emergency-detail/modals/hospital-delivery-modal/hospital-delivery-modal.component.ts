import { Component, input, output, signal } from '@angular/core';
import { HospitalDTO, EntregaHospitalariaDTO } from '../../../../../data-access/dto/ticket.dto';
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
  readonly entregaSaving = signal(false);
  readonly entregaError = signal<string | null>(null);

  constructor(private emergencyApi: EmergencyApiService) {}

  confirmarEntregaHospitalaria(): void {
    const nombre = this.entregaReceptorNombre().trim();
    if (!nombre) {
      this.entregaError.set('El nombre del receptor es obligatorio');
      return;
    }

    this.entregaSaving.set(true);
    this.entregaError.set(null);

    const dto: EntregaHospitalariaDTO = {
      receptorNombre: nombre,
      receptorMatricula: this.entregaReceptorMatricula().trim() || undefined,
      servicioReceptor: this.entregaServicioReceptor().trim() || undefined,
      hospitalId: this.entregaHospitalId() ?? undefined,
      horaEntrega: DateUtils.now().toISO()!,
      condicionEntregaGlasgow: VitalSignsUtils.toNumber(this.entregaGlasgow()) ?? undefined,
      condicionEntregaPa: this.entregaPa().trim() || undefined,
      condicionEntregaFc: VitalSignsUtils.toNumber(this.entregaFc()) ?? undefined,
      condicionEntregaSatO2: VitalSignsUtils.toNumber(this.entregaSatO2()) ?? undefined,
      firmaReceptor: this.entregaFirmaReceptor().trim() || undefined,
    };

    this.emergencyApi.registrarEntregaHospitalaria(this.ticketId(), dto).subscribe({
      next: () => {
        this.emergencyApi.finalizarTraslado(this.ticketId()).subscribe({
          next: () => {
            this.entregaSaving.set(false);
            this.confirmed.emit();
          },
          error: () => {
            this.entregaSaving.set(false);
            this.entregaError.set('Entrega registrada pero error al finalizar traslado');
          },
        });
      },
      error: (err) => {
        this.entregaSaving.set(false);
        this.entregaError.set(err?.error?.detail ?? 'Error al registrar la entrega hospitalaria');
      },
    });
  }
}
