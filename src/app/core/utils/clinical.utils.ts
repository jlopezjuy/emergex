import { AtencionFullDTO } from '../../data-access/dto/ticket.dto';

export class ClinicalUtils {
  static sanitizeClinicalPayload(atencion: AtencionFullDTO): AtencionFullDTO {
    return {
      ...atencion,
      notas: (atencion.notas ?? []).map((nota: any) => ({
        id: nota.id,
        fecha: nota.fecha,
        motivoConsulta: nota.motivoConsulta,
        tipoConsulta: nota.tipoConsulta,
        procedimientoRealizado: nota.procedimientoRealizado,
        evolucion: nota.evolucion,
        observacion: nota.observacion,
      })),
      signos: (atencion.signos ?? []).map((signo: any) => ({
        id: signo.id,
        fechaHora: signo.fechaHora ?? signo.timestamp,
        presionSistolica: signo.presionSistolica,
        presionDiastolica: signo.presionDiastolica,
        frecuenciaCardiaca: signo.frecuenciaCardiaca,
        frecuenciaRespiratoria: signo.frecuenciaRespiratoria,
        saturacionOxigeno: signo.saturacionOxigeno ?? signo.saturacionO2,
        temperatura: signo.temperatura,
        glucemia: signo.glucemia,
        glasgowOcular: signo.glasgowOcular,
        glasgowVerbal: signo.glasgowVerbal,
        glasgowMotor: signo.glasgowMotor,
        glasgowTotal: signo.glasgowTotal,
        avpu: signo.avpu,
        observacion: signo.observacion,
      })),
    };
  }

  static extractMedicationPart(text: string | undefined, label: string): string | undefined {
    if (!text) return undefined;
    const line = text.split('\n').find((l) => l.toLowerCase().startsWith(label.toLowerCase() + ':'));
    return line?.split(':').slice(1).join(':').trim();
  }

  static abrirDocumentoFirmado(consentimiento: any): void {
    if (!consentimiento?.documentoFirmado) return;
    try {
      const base64Content = consentimiento.documentoFirmado;
      const cleanBase64 = base64Content.includes('base64,') ? base64Content.split('base64,')[1] : base64Content;
      const contentType = base64Content.includes('data:') ? base64Content.split(';')[0].replace('data:', '') : 'application/pdf';

      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: contentType });
      const fileURL = URL.createObjectURL(blob);
      window.open(fileURL, '_blank');
    } catch (e) {
      console.error('Error opening signed document:', e);
      alert('No se pudo abrir el documento firmado.');
    }
  }
}
