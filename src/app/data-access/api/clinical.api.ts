import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EpisodioClinicoDTO, MedicamentoPrescritoDTO } from '../dto/clinical.dto';

@Injectable({ providedIn: 'root' })
export class ClinicalApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v1/clinical`;

  // Waitlist data for Mode A
  getWaitlist(): Observable<any[]> {
    return of([
      { id: 'P-09120', name: 'Iván Schuldberg', age: 47, time: '09:45', wait: 32, tri: 'red', spec: 'Cardio · dolor torácico', os: 'OSDE 410', avatar: 'IS' },
      { id: 'P-09877', name: 'Sofía Larreta', age: 24, time: '10:15', wait: 16, tri: 'amber', spec: 'Cardio · disnea + tos', os: 'Swiss Medical', avatar: 'SL', primary: true },
      { id: 'P-08291', name: 'Marcos Vignola', age: 38, time: '11:30', wait: 0, tri: 'green', spec: 'Cardio · control rutina', os: 'OSDE 310', avatar: 'MV' }
    ]);
  }

  // Today's schedule for Mode A
  getScheduleToday(): Observable<any[]> {
    return of([
      { time: '08:30', name: 'Ramón Felipe Ávila', sub: 'OSDE 410 · Cardio control', state: 'past' },
      { time: '09:00', name: 'Marcos Vignola', sub: 'OSDE 310 · Cardio control', state: 'past' },
      { time: '09:30', name: 'Iván Schuldberg', sub: 'OSDE 410 · Dolor torácico · Triage Rojo', state: 'past' },
      { time: '10:15', name: 'Sofía Larreta', sub: 'Swiss Medical · Disnea + tos seca', state: 'active' },
      { time: '11:00', name: 'Esteban Pellegrino', sub: 'Particular · Trauma · Tele-consulta', state: 'next' },
      { time: '11:30', name: 'Marcos Vignola', sub: 'OSDE 310 · Re-evaluación', state: 'upcoming' },
      { time: '12:30', name: 'María Inés Roca', sub: 'OSDE 310 · Control 6 meses', state: 'upcoming' },
      { time: '13:00', name: 'Patricia Olmedo', sub: 'Particular · Cardio consulta', state: 'upcoming' }
    ]);
  }

  // Active EHR session for Mode B
  getActiveEpisode(patientId: number): Observable<EpisodioClinicoDTO> {
    // Return mock data that simulates the state from portal-app.jsx
    return of({
      id: 'E-98772',
      pacienteId: patientId,
      pacienteNombre: 'Sofía Larreta',
      pacienteDni: '41.987.654',
      pacienteEdad: 24,
      pacienteSexo: 'Femenino',
      cobertura: 'Swiss Medical · Plan SB02',
      grupoSanguineo: 'O+ · Rh positivo',
      ultimaAtencion: '14 · 03 · 2026',
      tallaPeso: '1.66 m · 58 kg',
      imc: 21.0,
      imcEstado: 'Normal',
      antecedentes: 'Asma crónica moderada controlada con Fluticasona inhalatoria. Apendicectomía laparoscópica (2022). Madre con HTA. Sin tabaquismo. Vacunación al día.',
      notas: 'Paciente consulta por cuadro de tos seca persistente de 4 días de evolución, acompañada de disnea leve al esfuerzo. A la auscultación se detectan sibilancias espiratorias bilaterales diseminadas. Sin signos de cianosis periférica. Saturación basal preservada en 98%. Tensión arterial estable. Refiere uso esporádico de salbutamol los últimos 3 días, con respuesta parcial.',
      avpu: 'V',
      glasgow: { o: 4, v: 5, m: 6 },
      diagnosticos: [
        { code: 'J45.9', l: 'Asma, no especificada' }
      ],
      receta: [
        { id: '1', nombre: 'Salbutamol 100 mcg / dosis · Aerosol', sub: 'Broncodilatador β-agonista · ATC: R03AC02', dosis: '2 disparos / 6 hs', duracion: '10 días' },
        { id: '2', nombre: 'Amoxicilina 500 mg · Comprimidos', sub: 'Beta-lactámico (Penicilina) · ATC: J01CA04', dosis: '500 mg / 8 hs', duracion: '7 días', riesgoAlergia: true }
      ],
      firmado: false,
      vitals: {
        fc: '82',
        ta: '120/80',
        temp: '36.8',
        spo2: '98',
        glucemia: '104',
        dolor: '3'
      }
    });
  }

  // Save/auto-save endpoint simulation
  saveEpisode(episode: EpisodioClinicoDTO): Observable<EpisodioClinicoDTO> {
    return of({ ...episode });
  }

  // Sign recipe/episode simulation
  signEpisode(episodeId: string, signature: string): Observable<{ success: boolean; hash: string }> {
    return of({
      success: true,
      hash: '0x9F1A 8C42 D7B0 E338'
    });
  }
}
