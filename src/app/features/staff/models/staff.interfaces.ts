export type SpecialtyGroup = 'Médica' | 'Enfermería' | 'Operativo';

export interface CatalogItem {
  id: string;
  name: string;
  group: SpecialtyGroup;
  descripcion?: string;
  requiereCertificacion?: boolean;
  aniosFormacion?: number;
}

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  prefix: string;
  matricula: string;
  phone: string;
  email: string;
  documento?: string | null;
  linkedUser: boolean;
  role: string;
  unit: string;
  shift: string;
  exp: number;
  avatar: string;
  specialties: string[];
  domiciliary: boolean;
  emergency: boolean;
  active: boolean;
  photoUrl?: string | null;
  empresaId?: number;
  userId?: number | null;
  userLogin?: string | null;
  createdAt?: string;
  especialidadPrincipalId?: number | null;
  authorities?: string[];
}

export interface StaffForm {
  prefix: string;
  firstName: string;
  lastName: string;
  matricula: string;
  documento: string;
  phone: string;
  email: string;
  specialties: string[];
  domiciliary: boolean;
  emergency: boolean;
  active: boolean;
  username: string;
  authorities: string[];
  especialidadPrincipalId: number | null;
  /** Set once checkEmail resolves the address to an existing user; null means a new user will be created. */
  existingUserId: number | null;
  /** Explicit admin confirmation required to link a user that already belongs to another empresa. */
  confirmarVinculoOtraEmpresa: boolean;
}

export const SPEC_GROUP_COLOR: Record<SpecialtyGroup, { bg: string; fg: string; border: string }> = {
  'Médica':     { bg: 'rgba(59,130,246,0.16)',  fg: 'var(--accent-blue)',    border: 'rgba(59,130,246,0.30)' },
  'Enfermería': { bg: 'rgba(16,185,129,0.16)',  fg: 'var(--accent-emerald)', border: 'rgba(16,185,129,0.30)' },
  'Operativo':  { bg: 'rgba(245,158,11,0.16)',  fg: 'var(--accent-amber)',   border: 'rgba(245,158,11,0.30)' },
};

export const PREFIX_OPTIONS = ['Dr.', 'Dra.', 'Lic.', 'Enf.', 'Tec.', 'Op.'];

/**
 * El catálogo de especialidades es global (Subespecialidad no tiene columna de grupo/categoría
 * en el backend), así que el agrupamiento se infiere acá por nombre. Roles operativos
 * (despachante, operador, secretaría) se detectan por palabra clave para no caer en "Médica".
 */
export function inferSpecialtyGroup(nombre: string): SpecialtyGroup {
  const n = nombre.toLowerCase();
  if (/^enfermer/.test(n)) return 'Enfermería';
  if (/operador|despachante|secretari|coordinaci[oó]n|administrativ/.test(n)) return 'Operativo';
  return 'Médica';
}

export function emptyForm(): StaffForm {
  return {
    prefix: 'Dr.',
    firstName: '',
    lastName: '',
    matricula: '',
    documento: '',
    phone: '',
    email: '',
    specialties: [],
    domiciliary: false,
    emergency: false,
    active: true,
    username: '',
    // ROLE_USER se asigna siempre en el backend; ROLE_PROFESIONAL cubre el caso más
    // común de alta y evita un click extra para el admin.
    authorities: ['ROLE_USER', 'ROLE_PROFESIONAL'],
    especialidadPrincipalId: null,
    existingUserId: null,
    confirmarVinculoOtraEmpresa: false,
  };
}

export function specById(catalog: CatalogItem[], id: string): CatalogItem | undefined {
  return catalog.find(s => s.id === id);
}
