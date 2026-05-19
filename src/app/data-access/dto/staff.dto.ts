export interface ProfesionalSaludDTO {
  id: number;
  nombre: string;
  apellido: string;
  matricula?: string;
  telefono?: string;
  email?: string;
  documento?: string;
  foto?: string;
  atencionDomiciliaria: boolean;
  atencionEmergencia: boolean;
  activo: boolean;
  createdAt?: string;
  updatedAt?: string;
  user?: { id: number; login: string; firstName?: string; lastName?: string };
  empresa?: { id: number; nombre: string };
  especialidad?: string;
  subespecialidads?: Array<{ id: number; nombre: string; grupo?: string }>;
}
