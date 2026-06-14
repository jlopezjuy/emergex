export type SpecialtyGroup = 'Médica' | 'Enfermería';

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
  linkedUser: boolean;
  specialties: string[];
  domiciliary: boolean;
  emergency: boolean;
  active: boolean;
  username: string;
  passwordTemporal: string;
  authorities: string[];
  especialidadPrincipalId: number | null;
}

export const SPEC_GROUP_COLOR: Record<SpecialtyGroup, { bg: string; fg: string; border: string }> = {
  'Médica':     { bg: 'rgba(59,130,246,0.16)',  fg: 'var(--accent-blue)',    border: 'rgba(59,130,246,0.30)' },
  'Enfermería': { bg: 'rgba(16,185,129,0.16)',  fg: 'var(--accent-emerald)', border: 'rgba(16,185,129,0.30)' },
};

export const PREFIX_OPTIONS = ['Dr.', 'Dra.', 'Lic.', 'Enf.', 'Tec.', 'Op.'];

export function emptyForm(): StaffForm {
  return {
    prefix: 'Dr.',
    firstName: '',
    lastName: '',
    matricula: '',
    documento: '',
    phone: '',
    email: '',
    linkedUser: false,
    specialties: [],
    domiciliary: false,
    emergency: false,
    active: true,
    username: '',
    passwordTemporal: '',
    authorities: ['ROLE_USER'],
    especialidadPrincipalId: null,
  };
}

export function specById(catalog: CatalogItem[], id: string): CatalogItem | undefined {
  return catalog.find(s => s.id === id);
}
