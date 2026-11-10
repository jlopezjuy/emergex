import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, switchMap, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EpisodioClinicoDTO, MedicamentoPrescritoDTO } from '../dto/clinical.dto';
import { SessionStore } from '../../core/stores/session.store';

// ── Backend response shapes ──────────────────────────────────────────────────

interface TurnoResumenBackend {
  id: number;
  fechaHora: string; // ISO instant
  estado: string;
  tipoTurno?: string;
  motivo?: string;
  pacienteId: number;
  pacienteNombre?: string;
  pacienteDni?: string;
  pacienteSexo?: string;
  pacienteEdad?: number;
  profesionalId?: number;
  tiempoEsperaEstimado?: number;
  tiempoEsperaReal?: number;
  consultorioNombre?: string;
}

export interface WaitlistItemDTO {
  id: string;
  turnoId: number;
  pacienteId: number;
  name: string;
  age: number;
  time: string;
  wait: number;
  tri: 'red' | 'amber' | 'green';
  spec: string;
  os: string;
  avatar: string;
  // No lo asigna getWaitlist(): el turno del backend no distingue "atención primaria" del
  // profesional logueado. El template lo lee para resaltar una fila; hoy nunca se cumple.
  primary?: boolean;
}

export interface ScheduleItemDTO {
  turnoId: number;
  pacienteId: number;
  time: string;
  name: string;
  sub: string;
  state: 'past' | 'active' | 'next' | 'upcoming';
}

interface AtencionInitBackend {
  turnoId: number;
  pacienteId: number;
  atencionId: number | null;
  estadoTurno: string;
  estadoAtencion: string | null;
  profesionalId: number;
  profesionalNombre: string;
  paciente?: {
    id: number;
    nombreCompleto: string;
    edad?: number;
    sexo?: string;
    documento?: string;
  };
  historiaClinica?: {
    antecedentes?: string;
    tallaCm?: number;
    pesoKg?: number;
    imc?: number;
    imcEstado?: string;
    grupoSanguineo?: string;
    ultimaAtencion?: string;
    coberturaNombre?: string;
  };
  alergias?: Array<{ sustancia?: string; reaccion?: string }>;
  antecedentes?: Array<{ descripcion?: string }>;
}

interface AtencionFullBackend {
  atencionId: number | null;
  turnoId?: number;
  pacienteId?: number;
  observaciones?: string;
  estado?: string;
  notas?: Array<{ texto?: string; avpu?: string; glasgow?: { o: number; v: number; m: number } }>;
  signos?: Array<{
    frecuenciaCardiaca?: number;
    presionSistolica?: number;
    presionDiastolica?: number;
    temperatura?: number;
    saturacionOxigeno?: number;
    glucemia?: number;
    dolor?: number;
  }>;
  diagnosticos?: Array<{ codigoCIE10?: string; nombre?: string }>;
  recetas?: Array<{
    id?: number;
    firmaDigital?: string;
    lineas?: Array<{
      medicamentoNombre?: string;
      atcDescripcion?: string;
      dosis?: string;
      duracion?: string;
      tieneRiesgoAlergia?: boolean;
    }>;
  }>;
  pacienteNombreSnapshot?: string;
  pacienteDniSnapshot?: string;
  coberturaNombreSnapshot?: string;
}

// ── Waitlist estados que indican espera activa ───────────────────────────────
const ESTADOS_ESPERA = new Set(['CONFIRMADO', 'EN_ESPERA', 'EN_SALA', 'CHECK_IN']);

// ── Triage color por estado ──────────────────────────────────────────────────
function triFromEstado(estado: string): 'red' | 'amber' | 'green' {
  if (estado === 'EN_ESPERA' || estado === 'EN_SALA') return 'amber';
  if (estado === 'CONFIRMADO') return 'green';
  return 'green';
}

// ── Schedule state por estado del turno ─────────────────────────────────────
function scheduleStateFromEstado(estado: string): 'past' | 'active' | 'next' | 'upcoming' {
  switch (estado) {
    case 'COMPLETADO':
    case 'CERRADO':
      return 'past';
    case 'EN_ATENCION':
      return 'active';
    case 'EN_ESPERA':
    case 'EN_SALA':
    case 'CHECK_IN':
      return 'next';
    default:
      return 'upcoming';
  }
}

// ── Formatear hora desde ISO instant ────────────────────────────────────────
function formatHora(isoInstant: string): string {
  const d = new Date(isoInstant);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// ── Avatar initials ──────────────────────────────────────────────────────────
function avatarFromName(nombre: string): string {
  const parts = nombre.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return nombre.slice(0, 2).toUpperCase();
}

// ── Mapear AtencionInitBackend + AtencionFullBackend → EpisodioClinicoDTO ───
function mapToEpisodioClinico(
  init: AtencionInitBackend,
  full: AtencionFullBackend | null,
): EpisodioClinicoDTO {
  const hc = init.historiaClinica;
  const paciente = init.paciente;

  // Vitals: tomar el registro más reciente si existe
  const lastSigno = full?.signos?.at(-1) ?? null;
  const vitals = {
    fc: lastSigno?.frecuenciaCardiaca?.toString() ?? '',
    ta:
      lastSigno?.presionSistolica != null && lastSigno?.presionDiastolica != null
        ? `${lastSigno.presionSistolica}/${lastSigno.presionDiastolica}`
        : '',
    temp: lastSigno?.temperatura?.toString() ?? '',
    spo2: lastSigno?.saturacionOxigeno?.toString() ?? '',
    glucemia: lastSigno?.glucemia?.toString() ?? '',
    dolor: lastSigno?.dolor?.toString() ?? '',
  };

  // Nota clínica: tomar la última nota
  const lastNota = full?.notas?.at(-1) ?? null;
  const notas = lastNota?.texto ?? full?.observaciones ?? '';

  // AVPU: tomar del campo avpu de la nota, o default 'A'
  const avpuRaw = lastNota?.avpu ?? 'A';
  const avpu =
    avpuRaw === 'A' || avpuRaw === 'V' || avpuRaw === 'P' || avpuRaw === 'U'
      ? (avpuRaw as 'A' | 'V' | 'P' | 'U')
      : 'A';

  const glasgow = lastNota?.glasgow ?? { o: 4, v: 5, m: 6 };

  // Diagnósticos: mapear codigoCIE10/nombre → { code, l }
  const diagnosticos = (full?.diagnosticos ?? []).map((d) => ({
    code: d.codigoCIE10 ?? '',
    l: d.nombre ?? '',
  }));

  // Receta: aplanar lineas de todas las recetas → MedicamentoPrescritoDTO[]
  const receta: MedicamentoPrescritoDTO[] = (full?.recetas ?? []).flatMap((r) =>
    (r.lineas ?? []).map((l) => ({
      id: r.id?.toString(),
      nombre: l.medicamentoNombre ?? '',
      sub: l.atcDescripcion ?? '',
      dosis: l.dosis ?? '',
      duracion: l.duracion ?? '',
      riesgoAlergia: l.tieneRiesgoAlergia ?? false,
    })),
  );

  // Talla/peso
  const tallaPeso =
    hc?.tallaCm != null && hc?.pesoKg != null
      ? `${(hc.tallaCm / 100).toFixed(2)} m · ${hc.pesoKg} kg`
      : '';

  // Antecedentes: concatenar lista backend o el campo libre de la HC
  const antecedentesStr =
    init.antecedentes?.map((a) => a.descripcion ?? '').join('. ') ?? hc?.antecedentes ?? '';

  return {
    id: full?.atencionId?.toString() ?? init.atencionId?.toString() ?? '',
    pacienteId: init.pacienteId,
    pacienteNombre: paciente?.nombreCompleto ?? full?.pacienteNombreSnapshot ?? '',
    pacienteDni: paciente?.documento ?? full?.pacienteDniSnapshot ?? '',
    pacienteEdad: paciente?.edad ?? 0,
    pacienteSexo: paciente?.sexo ?? '',
    cobertura: hc?.coberturaNombre ?? full?.coberturaNombreSnapshot ?? '',
    grupoSanguineo: hc?.grupoSanguineo ?? '',
    ultimaAtencion: hc?.ultimaAtencion ?? '',
    tallaPeso,
    imc: hc?.imc ?? 0,
    imcEstado: hc?.imcEstado ?? '',
    antecedentes: antecedentesStr,
    notas,
    avpu,
    glasgow,
    diagnosticos,
    receta,
    firmado: false,
    vitals,
  };
}

@Injectable({ providedIn: 'root' })
export class ClinicalApiService {
  private http = inject(HttpClient);
  private session = inject(SessionStore);

  private get baseV1(): string {
    return `${environment.apiUrl}/api/v1/turnos`;
  }

  private get basAtenciones(): string {
    return `${environment.apiUrl}/api/atenciones`;
  }

  private getProfesionalId(): number | null {
    return this.session.account()?.profesional?.id ?? null;
  }

  // Waitlist data for Mode A — pacientes con turno hoy en estado de espera
  getWaitlist(): Observable<WaitlistItemDTO[]> {
    const profesionalId = this.getProfesionalId();
    if (!profesionalId) {
      // TODO: backend endpoint missing — profesionalId not available in session
      return of([]);
    }

    const today = new Date().toISOString().slice(0, 10);
    return this.http
      .get<TurnoResumenBackend[]>(`${this.baseV1}/profesional/${profesionalId}/dia`, {
        params: { fecha: today },
      })
      .pipe(
        map((turnos) =>
          turnos
            .filter((t) => ESTADOS_ESPERA.has(t.estado))
            .map((t) => ({
              id: `P-${t.pacienteId}`,
              turnoId: t.id,
              pacienteId: t.pacienteId,
              name: t.pacienteNombre ?? 'Paciente',
              age: t.pacienteEdad ?? 0,
              time: formatHora(t.fechaHora),
              wait: t.tiempoEsperaReal ?? t.tiempoEsperaEstimado ?? 0,
              tri: triFromEstado(t.estado),
              spec: t.motivo ?? t.tipoTurno ?? '',
              os: '',
              avatar: avatarFromName(t.pacienteNombre ?? 'P'),
            })),
        ),
        catchError((err) => {
          console.error('[ClinicalApiService] Error fetching waitlist:', err);
          return throwError(() => err);
        }),
      );
  }

  // Today's schedule for Mode A
  getScheduleToday(): Observable<ScheduleItemDTO[]> {
    const profesionalId = this.getProfesionalId();
    if (!profesionalId) {
      // TODO: backend endpoint missing — profesionalId not available in session
      return of([]);
    }

    const today = new Date().toISOString().slice(0, 10);
    return this.http
      .get<TurnoResumenBackend[]>(`${this.baseV1}/profesional/${profesionalId}/dia`, {
        params: { fecha: today },
      })
      .pipe(
        map((turnos) =>
          turnos.map((t) => ({
            turnoId: t.id,
            pacienteId: t.pacienteId,
            time: formatHora(t.fechaHora),
            name: t.pacienteNombre ?? 'Paciente',
            sub: [t.motivo, t.tipoTurno].filter(Boolean).join(' · '),
            state: scheduleStateFromEstado(t.estado),
          })),
        ),
        catchError((err) => {
          console.error('[ClinicalApiService] Error fetching schedule:', err);
          return throwError(() => err);
        }),
      );
  }

  // Active EHR session for Mode B
  // Flujo: busca el turno del día del paciente → /atenciones/init → /atenciones/{id}/detalle
  getActiveEpisode(patientId: number): Observable<EpisodioClinicoDTO> {
    const profesionalId = this.getProfesionalId();

    if (!profesionalId) {
      // TODO: profesionalId missing — returning minimal episode shell
      return of({
        id: '',
        pacienteId: patientId,
        pacienteNombre: '',
        pacienteDni: '',
        pacienteEdad: 0,
        pacienteSexo: '',
        cobertura: '',
        grupoSanguineo: '',
        tallaPeso: '',
        imc: 0,
        imcEstado: '',
        antecedentes: '',
        notas: '',
        avpu: 'A' as const,
        glasgow: { o: 4, v: 5, m: 6 },
        diagnosticos: [],
        receta: [],
        firmado: false,
        vitals: { fc: '', ta: '', temp: '', spo2: '', glucemia: '', dolor: '' },
      });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Paso 1: obtener turno del día del paciente para este profesional
    return this.http
      .get<TurnoResumenBackend[]>(`${this.baseV1}/profesional/${profesionalId}/dia`, {
        params: { fecha: today },
      })
      .pipe(
        switchMap((turnos) => {
          const turno = turnos.find((t) => t.pacienteId === patientId);
          const turnoId = turno?.id;

          if (!turnoId) {
            // Sin turno del día → no se puede cargar contexto real
            // TODO: backend podría exponer un endpoint de episodio activo sin turnoId
            return of({ init: null as AtencionInitBackend | null, full: null });
          }

          // Paso 2: cargar contexto inicial de atención
          return this.http
            .get<AtencionInitBackend>(`${this.basAtenciones}/init`, {
              params: { turnoId: turnoId.toString(), pacienteId: patientId.toString() },
            })
            .pipe(
              switchMap((init) => {
                if (!init.atencionId) {
                  // No hay atención iniciada aún — solo datos de contexto
                  return of({ init, full: null as AtencionFullBackend | null });
                }
                // Paso 3: cargar detalle completo de la atención en curso
                return this.http
                  .get<AtencionFullBackend>(`${this.basAtenciones}/${init.atencionId}/detalle`)
                  .pipe(map((full) => ({ init, full })));
              }),
            );
        }),
        map(({ init, full }) => {
          if (!init) {
            // Contexto base sin atención clínica iniciada aún
            return {
              id: '',
              pacienteId: patientId,
              pacienteNombre: '',
              pacienteDni: '',
              pacienteEdad: 0,
              pacienteSexo: '',
              cobertura: '',
              grupoSanguineo: '',
              tallaPeso: '',
              imc: 0,
              imcEstado: '',
              antecedentes: '',
              notas: '',
              avpu: 'A' as const,
              glasgow: { o: 4, v: 5, m: 6 },
              diagnosticos: [],
              receta: [],
              firmado: false,
              vitals: { fc: '', ta: '', temp: '', spo2: '', glucemia: '', dolor: '' },
            } satisfies EpisodioClinicoDTO;
          }
          return mapToEpisodioClinico(init, full);
        }),
      );
  }

  // Save/auto-save → POST /api/atenciones/guardar-completa
  saveEpisode(episode: EpisodioClinicoDTO): Observable<EpisodioClinicoDTO> {
    const atencionId = episode.id ? Number(episode.id) : null;

    const payload = {
      atencionId,
      pacienteId: episode.pacienteId,
      observaciones: episode.notas,
      notas: [
        {
          texto: episode.notas,
          avpu: episode.avpu,
          glasgow: episode.glasgow,
        },
      ],
      diagnosticos: episode.diagnosticos.map((d) => ({
        codigoCIE10: d.code,
        nombre: d.l,
      })),
      // Recetas se envían como una receta con varias líneas
      recetas:
        episode.receta.length > 0
          ? [
              {
                lineas: episode.receta.map((m) => ({
                  medicamentoNombre: m.nombre,
                  atcDescripcion: m.sub,
                  dosis: m.dosis,
                  duracion: m.duracion,
                  tieneRiesgoAlergia: m.riesgoAlergia ?? false,
                })),
              },
            ]
          : [],
    };

    return this.http
      .post<AtencionFullBackend>(`${this.basAtenciones}/guardar-completa`, payload)
      .pipe(
        map(() => episode),
        catchError((err) => throwError(() => err)),
      );
  }

  // Sign recipe/episode → POST /api/atenciones/{id}/cerrar
  signEpisode(episodeId: string, _signature: string): Observable<{ success: boolean; hash: string }> {
    if (!episodeId) {
      return of({ success: false, hash: '' });
    }

    return this.http
      .post<{ success: boolean; hash: string }>(`${this.basAtenciones}/${episodeId}/cerrar`, null)
      .pipe(
        map((res) => ({
          success: res?.success ?? true,
          hash: res?.hash ?? '',
        })),
        catchError(() => of({ success: false, hash: '' })),
      );
  }
}
