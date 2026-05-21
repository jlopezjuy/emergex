export interface Account {
  id: number;
  login: string;
  email: string;
  firstName?: string;
  lastName?: string;
  authorities: string[];
  activated?: boolean;
  langKey?: string;
  imageUrl?: string;
  empresa?: { id: number; nombre: string; cuit?: string; estado?: string; planSuscripcion?: string };
  usuarioEmpresa?: { id: number; rol?: string; activo?: boolean; fechaIngreso?: string };
  profesional?: {
    id: number;
    nombre?: string;
    apellido?: string;
    matricula?: string;
    tipoMatricula?: string;
    matriculaJurisdiccion?: string;
    fechaVencimientoHabilitacion?: string;
    telefono?: string;
    email?: string;
    activo?: boolean;
    foto?: string;
    atencionDomiciliaria?: boolean;
    atencionEmergencia?: boolean;
    createdAt?: string;
    updatedAt?: string;
    subespecialidades?: string[];
  };
}
