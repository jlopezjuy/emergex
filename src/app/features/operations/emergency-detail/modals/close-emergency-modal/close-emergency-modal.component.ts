import { Component, input, output, signal, computed } from '@angular/core';
import { HospitalDTO, CerrarTicketRequest } from '../../../../../data-access/dto/ticket.dto';
import { EmergencyApiService } from '../../../../../data-access/api/emergency.api';
import { VitalSignsUtils } from '../../../../../core/utils/vital-signs.utils';
import { SearchableSelectComponent, SearchableSelectOption } from '../../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-close-emergency-modal',
  standalone: true,
  imports: [SearchableSelectComponent],
  templateUrl: './close-emergency-modal.component.html',
  styleUrl: './close-emergency-modal.component.scss',
})
export class CloseEmergencyModalComponent {
  readonly ticketId = input.required<number>();
  readonly hospitales = input<HospitalDTO[]>([]);
  readonly diagnosticosFrecuentesOptions = input<SearchableSelectOption[]>([]);
  readonly trasladoEnCurso = input<boolean>(false);

  readonly confirmed = output<void>();
  readonly closed = output<void>();

  readonly Number = Number;

  readonly closeImpresion = signal('');
  readonly closeTratamiento = signal('');
  readonly closeTipoResolucion = signal('RESUELTA_EN_SITIO');
  readonly closeRequiereTraslado = signal(false);
  readonly closeDestino = signal('');
  readonly closeNota = signal('');

  readonly svTa = signal('');
  readonly svFc = signal('');
  readonly svFr = signal('');
  readonly svSatO2 = signal('');
  readonly svTemp = signal('');
  readonly svGlucemia = signal('');
  readonly glasgowOcular = signal('');
  readonly glasgowVerbal = signal('');
  readonly glasgowMotor = signal('');
  readonly avpu = signal<'ALERTA' | 'VOZ' | 'DOLOR' | 'INCONSCIENTE' | ''>('');

  readonly closeUrgenciaVital = signal(false);
  readonly closeNotificadoSAME107 = signal(false);
  readonly closeHospitalId = signal<number | null>(null);

  readonly closeDiagnosticoFrecuenteId = signal<number | null>(null);
  readonly closeDiagnosticoLibre = signal('');
  readonly closeAntecedentes = signal('');
  readonly closeConsultoFamiliar = signal(false);
  readonly closeConsultadoNombre = signal('');

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly glasgowTotal = computed((): number | null => {
    const o = Number(this.glasgowOcular());
    const v = Number(this.glasgowVerbal());
    const m = Number(this.glasgowMotor());
    if (!o && !v && !m) return null;
    return (o || 0) + (v || 0) + (m || 0);
  });

  constructor(private emergencyApi: EmergencyApiService) {}

  confirmarCierre(): void {
    if (!this.closeImpresion().trim()) return;

    this.submitting.set(true);
    this.error.set(null);

    const req: CerrarTicketRequest = {
      nota: this.closeNota().trim() || undefined,
      resolucion: {
        impresionClinica: this.closeImpresion().trim(),
        tratamientoRealizado: this.closeTratamiento().trim() || undefined,
        requiereTraslado: this.closeRequiereTraslado(),
        tipoResolucion: this.closeTipoResolucion(),
        destinoTraslado: this.closeHospitalId()
          ? ((this.hospitales().find((h) => h.id === this.closeHospitalId())?.nombre ?? this.closeDestino().trim()) || undefined)
          : (this.closeDestino().trim() || undefined),
        urgenciaVitalSinConsentimiento: this.closeUrgenciaVital() || undefined,
        notificadoSAME107: this.closeNotificadoSAME107() || undefined,
        signosVitales: {
          ta: this.svTa().trim() || undefined,
          fc: VitalSignsUtils.toNumber(this.svFc()),
          fr: VitalSignsUtils.toNumber(this.svFr()),
          satO2: VitalSignsUtils.toNumber(this.svSatO2()),
          temp: VitalSignsUtils.toNumber(this.svTemp()),
          glucemia: VitalSignsUtils.toNumber(this.svGlucemia()),
          glasgowOcular: VitalSignsUtils.toNumber(this.glasgowOcular()) ?? undefined,
          glasgowVerbal: VitalSignsUtils.toNumber(this.glasgowVerbal()) ?? undefined,
          glasgowMotor: VitalSignsUtils.toNumber(this.glasgowMotor()) ?? undefined,
          glasgowTotal: this.glasgowTotal() ?? undefined,
          avpu: this.avpu() || undefined,
        },
        diagnosticoFrecuenteId: this.closeDiagnosticoFrecuenteId(),
        diagnosticoLibre: this.closeDiagnosticoFrecuenteId() ? undefined : (this.closeDiagnosticoLibre().trim() || undefined),
        antecedentes: this.closeAntecedentes().trim() || undefined,
        consultoFamiliarEmpleado: this.closeConsultoFamiliar(),
        consultadoNombre: this.closeConsultoFamiliar() ? (this.closeConsultadoNombre().trim() || undefined) : undefined,
      },
    };

    this.emergencyApi.cerrar(this.ticketId(), req).subscribe({
      next: () => {
        this.submitting.set(false);
        this.confirmed.emit();
      },
      error: () => {
        this.submitting.set(false);
        this.error.set('Error al cerrar el ticket');
      },
    });
  }

  onCloseKeydown(event: Event): void {
    const kEvent = event as KeyboardEvent;
    if (kEvent.key === 'Enter' && !kEvent.shiftKey) {
      kEvent.preventDefault();
      if (this.closeImpresion().trim()) {
        this.confirmarCierre();
      }
    }
  }
}
