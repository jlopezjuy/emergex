import { Component, input, output, signal, computed } from '@angular/core';
import { EmergencyApiService } from '../../../../../data-access/api/emergency.api';
import { AtencionFullDTO } from '../../../../../data-access/dto/ticket.dto';
import { DateUtils } from '../../../../../core/utils/date.utils';
import { VitalSignsUtils } from '../../../../../core/utils/vital-signs.utils';
import { ClinicalUtils } from '../../../../../core/utils/clinical.utils';

@Component({
  selector: 'app-clinical-data-modal',
  standalone: true,
  templateUrl: './clinical-data-modal.component.html',
  styleUrl: './clinical-data-modal.component.scss',
})
export class ClinicalDataModalComponent {
  readonly ticketId = input.required<number>();
  readonly kind = input<'SIGNOS' | 'PROCEDIMIENTO' | 'MEDICACION' | null>(null);
  readonly clinicalAtencionInput = input<AtencionFullDTO | null>(null);
  readonly tripulacion = input<unknown[]>([]);

  readonly saved = output<void>();
  readonly closed = output<void>();

  readonly savingClinical = signal(false);
  readonly clinicalError = signal<string | null>(null);
  readonly clinicalTitulo = signal('');
  readonly clinicalDetalle = signal('');
  readonly clinicalObservacion = signal('');
  readonly medMedicamento = signal('');
  readonly medDosis = signal('');
  readonly medVia = signal('');

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

  readonly glasgowTotal = computed((): number | null => {
    const o = Number(this.glasgowOcular());
    const v = Number(this.glasgowVerbal());
    const m = Number(this.glasgowMotor());
    if (!o && !v && !m) return null;
    return (o || 0) + (v || 0) + (m || 0);
  });

  constructor(private emergencyApi: EmergencyApiService) {}

  clinicalModalTitle(): string {
    switch (this.kind()) {
      case 'SIGNOS': return 'Cargar signos vitales';
      case 'PROCEDIMIENTO': return 'Registrar procedimiento';
      case 'MEDICACION': return 'Registrar medicación aplicada';
      default: return 'Carga clínica';
    }
  }

  guardarClinicalModal(): void {
    this.savingClinical.set(true);
    this.clinicalError.set(null);
    this.ensureClinicalAtencion().then((atencion) => {
      const updated: AtencionFullDTO = {
        ...atencion,
        tipo: atencion.tipo ?? 'URGENCIA',
        canal: atencion.canal ?? 'TELEFONICA',
        estado: atencion.estado ?? 'EN_CURSO',
        notas: [...(atencion.notas ?? [])],
        signos: [...(atencion.signos ?? [])],
      };

      const now = DateUtils.now().toISO()!;
      if (this.kind() === 'SIGNOS') {
        const parsedTa = VitalSignsUtils.parseTa(this.svTa());
        const signo = {
          fechaHora: now,
          presionSistolica: parsedTa.sistolica,
          presionDiastolica: parsedTa.diastolica,
          frecuenciaCardiaca: VitalSignsUtils.toNumber(this.svFc()),
          frecuenciaRespiratoria: VitalSignsUtils.toNumber(this.svFr()),
          saturacionOxigeno: VitalSignsUtils.toNumber(this.svSatO2()),
          temperatura: VitalSignsUtils.toNumber(this.svTemp()),
          glucemia: VitalSignsUtils.toNumber(this.svGlucemia()),
          glasgowOcular: VitalSignsUtils.toNumber(this.glasgowOcular()) ?? undefined,
          glasgowVerbal: VitalSignsUtils.toNumber(this.glasgowVerbal()) ?? undefined,
          glasgowMotor: VitalSignsUtils.toNumber(this.glasgowMotor()) ?? undefined,
          glasgowTotal: this.glasgowTotal() ?? undefined,
          avpu: this.avpu() || undefined,
          observacion: this.clinicalObservacion().trim() || undefined,
        };
        VitalSignsUtils.validarSignosVitales(signo);
        updated.signos!.push(signo);
      }

      if (this.kind() === 'PROCEDIMIENTO') {
        const titulo = this.clinicalTitulo().trim();
        const detalle = this.clinicalDetalle().trim();
        if (!titulo && !detalle) throw new Error('Indicá procedimiento o detalle');
        updated.notas!.push({
          fecha: now,
          motivoConsulta: 'PROCEDIMIENTO',
          tipoConsulta: 'URGENCIA',
          procedimientoRealizado: titulo || detalle,
          evolucion: detalle || titulo,
        });
      }

      if (this.kind() === 'MEDICACION') {
        const medicamento = this.medMedicamento().trim();
        if (!medicamento) throw new Error('Indicá medicamento');
        updated.notas!.push({
          fecha: now,
          motivoConsulta: 'MEDICACION',
          tipoConsulta: 'URGENCIA',
          evolucion: `Medicamento: ${medicamento}
Dosis: ${this.medDosis().trim() || 'S/D'}
Vía: ${this.medVia().trim() || 'S/D'}
Observación: ${this.clinicalObservacion().trim() || '—'}`,
        });
      }

      this.emergencyApi.guardarAtencionCompleta(ClinicalUtils.sanitizeClinicalPayload(updated)).subscribe({
        next: () => {
          this.savingClinical.set(false);
          this.saved.emit();
        },
        error: (error) => {
          this.savingClinical.set(false);
          this.clinicalError.set(error?.error?.title ?? error?.error?.detail ?? 'No se pudo guardar la carga clínica');
        },
      });
    }).catch((error) => {
      this.savingClinical.set(false);
      this.clinicalError.set(error?.message ?? 'No se pudo preparar la atención clínica');
    });
  }

  private ensureClinicalAtencion(): Promise<AtencionFullDTO> {
    const current = this.clinicalAtencionInput();
    if (current?.atencionId && current.turnoId) return Promise.resolve(current);

    const profesionalId = this.resolveProfesionalIdParaAtencion();

    return new Promise((resolve, reject) => {
      this.emergencyApi.iniciarAtencionDesdeTicket(this.ticketId(), profesionalId).subscribe({
        next: (created) => {
          this.emergencyApi.getAtencionDetalle(created.atencionId).subscribe({
            next: resolve,
            error: reject,
          });
        },
        error: reject,
      });
    });
  }

  private resolveProfesionalIdParaAtencion(): number | undefined {
    const list = this.tripulacion() as Array<{ id?: number; rol?: string }>;
    if (!list.length) return undefined;

    const medico = list.find((t) => (t.rol ?? '').toUpperCase().includes('MED'));
    return medico?.id ?? list[0]?.id;
  }
}
