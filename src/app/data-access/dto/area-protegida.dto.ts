export type EstadoAreaProtegida = 'ACTIVA' | 'SUSPENDIDA' | 'INACTIVA';

export interface AreaProtegidaDTO {
  id?: number;
  nombre: string;
  direccion?: string;
  telefono?: string;
  contactoResponsable?: string;
  estado?: EstadoAreaProtegida;
  institucionId?: number;
  planComercialId?: number;
  createdAt?: string;
  updatedAt?: string;
}
