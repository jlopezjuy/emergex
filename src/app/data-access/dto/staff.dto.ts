export interface ProfesionalSaludDTO {
  id: number;
  nombre: string;
  apellido: string;
  email?: string;
  especialidad?: string;
  activo?: boolean;
  empresa?: { id: number; nombre: string };
  atencionDomiciliaria?: boolean;
  atencionEmergencia?: boolean;
  foto?: string;
  createdAt?: string;
}
