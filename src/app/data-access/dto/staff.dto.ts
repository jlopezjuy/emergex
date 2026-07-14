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

export type OnboardingEmailEstado =
  | 'DISPONIBLE'
  | 'USUARIO_EN_EMPRESA'
  | 'USUARIO_SIN_EMPRESA'
  | 'USUARIO_EN_OTRA_EMPRESA'
  | 'USUARIO_YA_PROFESIONAL';

export interface OnboardingEmailStatusDTO {
  estado: OnboardingEmailEstado;
  userId?: number | null;
  login?: string | null;
  nombreCompleto?: string | null;
  loginSugerido?: string | null;
}

export interface ProfesionalOnboardingResultDTO {
  profesionalId: number;
  userId: number;
  usuarioEmpresaId?: number | null;
  nombreCompleto: string;
  email: string;
  login: string;
  empresaNombre: string;
  usuarioNuevo: boolean;
  usuarioVinculado: boolean;
  emailEnviado: boolean;
  invitacionPendiente: boolean;
  activationLink?: string | null;
}

export interface ProfesionalAccesoDTO {
  userId: number;
  login: string;
  email?: string | null;
  usuarioActivo: boolean;
  vinculoEmpresaActivo: boolean;
  invitacionPendiente: boolean;
  rolEmpresa?: string | null;
  empresaNombre?: string | null;
  authorities: string[];
}
