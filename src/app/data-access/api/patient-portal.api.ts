import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PacientePortalDashboardDTO, SOSRequestDTO, SOSResponseDTO } from '../dto/patient-portal.dto';

// TODO(P2): reemplazar mock por backend real. Actualmente devuelve datos hardcodeados.
@Injectable({ providedIn: 'root' })
export class PatientPortalApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v1/patient-portal`;

  getDashboardData(): Observable<PacientePortalDashboardDTO> {
    // Simulated /me dashboard data with full premium details from React reference
    return of({
      perfil: {
        id: 345,
        nombreCompleto: 'Marcos Vignola',
        nombre: 'Marcos',
        dni: '34.567.890',
        sexo: 'M',
        edad: 38,
        grupoSanguineo: 'O+ · Rh positivo',
        tallaPeso: '1.78 m · 82 kg',
        alergias: [],
        cronicos: ['HTA leve'],
        coberturaPrincipal: 'OSDE 310',
        nroCredencial: '3104 8820 1245 7891',
        vencimientoCredencial: '12 / 28'
      },
      proximoTurno: {
        id: 'T-9821',
        especialidad: 'Cardiología',
        motivo: 'Control anual',
        fecha: '22 · 05 · 2026',
        diaSemana: 'VIERNES',
        horaInicio: '11:30',
        horaFin: '12:00',
        doctorNombre: 'Dr. Alejandro Gómez',
        doctorMatricula: 'M.N. 88.741',
        doctorIniciales: 'AG',
        doctorExperiencia: '18 AÑOS DE EXPERIENCIA',
        consultorio: 'Box 3 · Planta baja · Clínica Médica Central · Palermo',
        indicaciones: ['Ayuno 8 h'],
        cobertura: 'OSDE 310',
        copago: 4500,
        tiempoRestante: '3 h 12 min'
      },
      recetaReciente: {
        id: 'REC-742189027',
        fecha: '22 · 05 · 2026',
        hora: '10:27',
        profesional: 'Dr. A. Gómez',
        matricula: 'M.N. 88.741',
        medicamentos: [
          {
            nombre: 'Salbutamol 100 mcg · Aerosol',
            dosis: '2 disparos / 6 hs · 10 días · vía inhalatoria',
            atc: 'R03AC02',
            via: 'INH',
            cie10: 'J45.9'
          },
          {
            nombre: 'Claritromicina 500 mg · Comp.',
            dosis: '500 mg / 12 hs · 7 días · vía oral',
            atc: 'J01FA09',
            via: 'ORAL',
            cie10: 'J20.9',
            colorSecundario: true
          }
        ],
        qrValidoHasta: '21 · 06 · 2026',
        qrHash: 'SHA256 · 0x9F1A 8C42…',
        qrTransaccion: 'REC-742189027'
      },
      actividadReciente: [
        {
          id: 'ACT-1',
          fechaHora: 'HOY · 10:27',
          tipo: 'turno',
          titulo: 'Consulta cardiología · Dr. A. Gómez',
          subtitulo: 'RECETA EMITIDA · 2 MEDICAMENTOS',
          montoOEstado: 'OK',
          color: 'blue'
        },
        {
          id: 'ACT-2',
          fechaHora: '21 · 05 · 14:08',
          tipo: 'factura',
          titulo: 'Cuota mensual · plan Premium',
          subtitulo: 'DÉBITO · VISA ••• 4827 · MAYO 2026',
          montoOEstado: '$ 62.400',
          color: 'emerald'
        },
        {
          id: 'ACT-3',
          fechaHora: '19 · 05 · 09:42',
          tipo: 'estudio',
          titulo: 'Laboratorio · perfil lipídico',
          subtitulo: 'RESULTADO LISTO · LDL 142 · HDL 56',
          montoOEstado: 'VER',
          color: 'cyan'
        },
        {
          id: 'ACT-4',
          fechaHora: '17 · 05 · 18:15',
          tipo: 'telemedicina',
          titulo: 'Telemedicina · Dr. R. Cano',
          subtitulo: 'CONSULTA REMOTA · 12 MIN · COBERTURA OSDE',
          montoOEstado: 'S/CARGO',
          color: 'amber'
        },
        {
          id: 'ACT-5',
          fechaHora: '15 · 05 · 22:48',
          tipo: 'alerta',
          titulo: 'Alerta domiciliaria · SpO₂ baja',
          subtitulo: 'UNIDAD DELTA-4 DESPACHADA · ATENDIDO',
          montoOEstado: 'COD. ROJO',
          color: 'red'
        },
        {
          id: 'ACT-6',
          fechaHora: '14 · 05 · 11:00',
          tipo: 'receta',
          titulo: 'Renovación · Fluticasona inhalatoria',
          subtitulo: '3 MESES · CRÓNICO · DRA. M. SOTO',
          montoOEstado: 'RECETA',
          color: 'blue'
        }
      ],
      grupoFamiliar: [
        { id: 1, nombreCompleto: 'Marcos Vignola', relacion: 'TITULAR · 38 AÑOS', edad: 38, iniciales: 'MV', estado: 'VOS' },
        { id: 2, nombreCompleto: 'Julia Vignola', relacion: 'CÓNYUGE · 36 AÑOS', edad: 36, iniciales: 'JV', estado: 'ACTIVA' },
        { id: 3, nombreCompleto: 'Lucas Vignola', relacion: 'HIJO · 12 AÑOS', edad: 12, iniciales: 'LV', estado: 'ACTIVO' },
        { id: 4, nombreCompleto: 'Martina Vignola', relacion: 'HIJA · 8 AÑOS', edad: 8, iniciales: 'MV', estado: 'ACTIVA' }
      ],
      plan: {
        nombre: 'Emergex Corporate Premium',
        descripcion: 'Grupo familiar · 4 integrantes · Cobertura ALS',
        estado: 'AL DÍA · PRÓX. DÉBITO 05/06',
        proximoDebito: 'Próximo débito · $ 62.400 · 05 · 06 · 2026',
        cuotaActual: 62400,
        totalCuotasCobradas: 11,
        porcentajeCobrado: 92
      }
    });
  }

  triggerSOS(req: SOSRequestDTO): Observable<SOSResponseDTO> {
    // Simulated emergency request matching the React implementation
    return of({
      exito: true,
      unidadAsignada: 'ALPHA-1',
      tiempoEstimadoMinutos: 6,
      baseOperativa: 'base Palermo',
      mensaje: 'Unidad de Código Rojo asignada y en camino. Queda asentado en tu historia clínica.'
    });
  }
}
