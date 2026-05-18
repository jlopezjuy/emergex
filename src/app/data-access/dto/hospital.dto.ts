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
  ocupacionUrgencias?: number; // 0-100
  tiempoEsperaMin?: number;
  especialidades?: string[];
}

export interface HospitalDTO {
  id: number;
  nombre: string;
  cuit?: string;
  tipo?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  telefono?: string;
  codigoEstablecimiento?: string;
  activo?: boolean;
  nivel?: string; // 'ALTA_COMPLEJIDAD' | 'MEDIA_COMPLEJIDAD' | 'BAJA_COMPLEJIDAD'
  latitud?: number;
  longitud?: number;
  estado?: 'DISPONIBLE' | 'LIMITADO' | 'SATURADO';
  ocupacionUrgencias?: number; // 0-100
  tiempoEsperaMin?: number;
  especialidades?: string; // Comma-separated string
  enDerivacion?: boolean;
}
