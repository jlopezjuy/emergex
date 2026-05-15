export interface AreaProtegidaDTO {
  id: number;
  nombre: string;
  nivel?: string; // 'ALTA_COMPLEJIDAD' | 'MEDIA_COMPLEJIDAD' | 'BAJA_COMPLEJIDAD'
  tipo?: string; // 'HOSPITAL' | 'CLINICA' | 'SANATORIO'
  direccion?: string;
  telefono?: string;
  latitud?: number;
  longitud?: number;
  distanciaKm?: number;
  enDerivacion?: boolean;
  estado?: 'DISPONIBLE' | 'LIMITADO' | 'SATURADO';
  camasLibres?: number;
  camasTotales?: number;
  ocupacionUrgencias?: number; // 0-100
  tiempoEsperaMin?: number;
  especialidades?: string[];
}
