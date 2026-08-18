import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PlanComercialDTO, PlanTier, PlanModality, PlanPrestacionDTO } from '../dto/plan-comercial.dto';

interface BackendPlanComercial {
  id: number;
  nombre: string;
  nivel: 'PREMIUM' | 'MEDIO' | 'BASICO';
  modalidad: 'INDIVIDUAL' | 'GRUPO_FAMILIAR' | 'AREA_PROTEGIDA';
  descripcion?: string;
  maxAtencionesMes?: number;
  cantidadIncluida?: number;
  incluyeEmergencia: boolean;
  incluyeVisitaDomiciliaria: boolean;
  incluyeOrientacionTelefonica: boolean;
  incluyeEnfermeriaDomiciliaria: boolean;
  incluyeControlMensual: boolean;
  incluyeTrasladosProgramados: boolean;
  incluyeTrasladoInterurbano: boolean;
  precioMensual: number;
  precioTrimestral?: number;
  precioAnual?: number;
  precioAdherente?: number;
  descuentoPorcentaje?: number;
  periodoCarenciaDias?: number;
  activo: boolean;
  empresa?: { id: number; nombre: string };
}

const TIER_MAP: Record<BackendPlanComercial['nivel'], PlanTier> = {
  PREMIUM: 'premium',
  MEDIO: 'medio',
  BASICO: 'basico',
};

const TIER_MAP_INVERSE: Record<PlanTier, BackendPlanComercial['nivel']> = {
  premium: 'PREMIUM',
  medio: 'MEDIO',
  basico: 'BASICO',
};

const MODALITY_MAP: Record<BackendPlanComercial['modalidad'], PlanModality> = {
  INDIVIDUAL: 'individual',
  GRUPO_FAMILIAR: 'familiar',
  AREA_PROTEGIDA: 'institucional',
};

const MODALITY_MAP_INVERSE: Record<PlanModality, BackendPlanComercial['modalidad']> = {
  individual: 'INDIVIDUAL',
  familiar: 'GRUPO_FAMILIAR',
  institucional: 'AREA_PROTEGIDA',
};

function toDTO(b: BackendPlanComercial): PlanComercialDTO {
  return {
    id: String(b.id),
    name: b.nombre,
    description: b.descripcion,
    tier: TIER_MAP[b.nivel],
    modality: MODALITY_MAP[b.modalidad],
    audience: b.modalidad === 'AREA_PROTEGIDA' ? 'corporativos' : 'particulares',
    pricing: {
      monthly: b.precioMensual,
      quarterly: b.precioTrimestral ?? 0,
      annual: b.precioAnual ?? 0,
      perDependent: b.precioAdherente ?? 0,
      discountPct: b.descuentoPorcentaje ?? 0,
    },
    limits: {
      monthlyCap: b.maxAtencionesMes ?? 0,
      freeIncluded: b.cantidadIncluida ?? 0,
      carencyDays: b.periodoCarenciaDias ?? 0,
    },
    coverages: {
      emergency: b.incluyeEmergencia,
      homeVisit: b.incluyeVisitaDomiciliaria,
      phoneOrientation: b.incluyeOrientacionTelefonica,
      homeNursing: b.incluyeEnfermeriaDomiciliaria,
      monthlyControl: b.incluyeControlMensual,
      scheduledTransport: b.incluyeTrasladosProgramados,
      interurbanTransport: b.incluyeTrasladoInterurbano,
    },
    active: b.activo,
  };
}

function toBackend(dto: PlanComercialDTO): Partial<BackendPlanComercial> {
  return {
    nombre: dto.name,
    descripcion: dto.description,
    nivel: TIER_MAP_INVERSE[dto.tier],
    modalidad: MODALITY_MAP_INVERSE[dto.modality],
    precioMensual: dto.pricing.monthly,
    precioTrimestral: dto.pricing.quarterly,
    precioAnual: dto.pricing.annual,
    precioAdherente: dto.pricing.perDependent,
    descuentoPorcentaje: dto.pricing.discountPct,
    maxAtencionesMes: dto.limits.monthlyCap,
    cantidadIncluida: dto.limits.freeIncluded,
    periodoCarenciaDias: dto.limits.carencyDays,
    incluyeEmergencia: dto.coverages.emergency,
    incluyeVisitaDomiciliaria: dto.coverages.homeVisit,
    incluyeOrientacionTelefonica: dto.coverages.phoneOrientation,
    incluyeEnfermeriaDomiciliaria: dto.coverages.homeNursing,
    incluyeControlMensual: dto.coverages.monthlyControl,
    incluyeTrasladosProgramados: dto.coverages.scheduledTransport,
    incluyeTrasladoInterurbano: dto.coverages.interurbanTransport,
    activo: dto.active,
  };
}

@Injectable({ providedIn: 'root' })
export class PlanComercialApiService {
  private http = inject(HttpClient);
  private catalogBase = `${environment.apiUrl}/api/v1/planes-comerciales`;
  private crudBase = `${environment.apiUrl}/api/plan-comercials`;

  getAll(): Observable<PlanComercialDTO[]> {
    return this.http.get<BackendPlanComercial[]>(this.catalogBase).pipe(
      map(list => list.map(toDTO))
    );
  }

  /** Todos los planes del tenant, incluidos los inactivos/pausados (para la grilla de administración). */
  getAllIncludingInactive(): Observable<PlanComercialDTO[]> {
    return this.http
      .get<BackendPlanComercial[]>(`${this.crudBase}`, { params: { size: '200', sort: 'id,desc' } })
      .pipe(map(list => list.map(toDTO)));
  }

  create(dto: PlanComercialDTO): Observable<PlanComercialDTO> {
    return this.http.post<BackendPlanComercial>(this.crudBase, toBackend(dto)).pipe(
      map(toDTO)
    );
  }

  update(dto: PlanComercialDTO): Observable<PlanComercialDTO> {
    return this.http.put<BackendPlanComercial>(`${this.crudBase}/${dto.id}`, toBackend(dto)).pipe(
      map(toDTO)
    );
  }

  /** Persiste solo el flag activo (PATCH), p. ej. pausar/reactivar un plan. */
  setActive(id: number, activo: boolean): Observable<PlanComercialDTO> {
    return this.http.patch<BackendPlanComercial>(`${this.crudBase}/${id}`, { id, activo }).pipe(map(toDTO));
  }

  getPrestacionesByPlan(planId: number): Observable<PlanPrestacionDTO[]> {
    return this.http.get<PlanPrestacionDTO[]>(`${environment.apiUrl}/api/plan-prestaciones/plan/${planId}`);
  }

  createPlanPrestacion(dto: PlanPrestacionDTO): Observable<PlanPrestacionDTO> {
    return this.http.post<PlanPrestacionDTO>(`${environment.apiUrl}/api/plan-prestaciones`, dto);
  }

  updatePlanPrestacion(id: number, dto: PlanPrestacionDTO): Observable<PlanPrestacionDTO> {
    return this.http.put<PlanPrestacionDTO>(`${environment.apiUrl}/api/plan-prestaciones/${id}`, dto);
  }

  deletePlanPrestacion(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/api/plan-prestaciones/${id}`);
  }

  /** Validates consistency between PlanComercial boolean flags and PlanPrestacion entries. Returns warning strings. */
  validarConsistenciaPlan(planId: number): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiUrl}/api/plan-prestaciones/plan/${planId}/consistencia`);
  }
}
