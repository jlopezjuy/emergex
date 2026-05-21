export type RolCentro =
  | 'PROPIETARIO'
  | 'ADMINISTRADOR'
  | 'DESPACHANTE'
  | 'OPERADOR'
  | 'PROFESIONAL'
  | 'CONTADOR';

export interface AdminUserDTO {
  id?: number;
  login: string;
  firstName?: string;
  lastName?: string;
  email: string;
  activated: boolean;
  langKey?: string;
  imageUrl?: string;
  authorities: string[];
  createdBy?: string;
  createdDate?: string;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
}

export interface UsuarioEmpresaItem {
  id: number;
  rol: RolCentro;
  activo: boolean;
  fechaIngreso: string;
  user: AdminUserDTO;
  empresa: { id: number; nombre?: string };
}

export interface CreateEmpresaUserRequest {
  user: Pick<AdminUserDTO, 'login' | 'email' | 'firstName' | 'lastName' | 'langKey' | 'authorities' | 'activated'>;
  password: string;
  rolCentro: RolCentro;
}
