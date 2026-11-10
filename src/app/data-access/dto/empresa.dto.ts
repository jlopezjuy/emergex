export type EstadoEmpresa = 'ACTIVA' | 'SUSPENDIDA' | 'INACTIVA';
export type PlanSuscripcionSaas = 'TRIAL' | 'BASICO' | 'PROFESIONAL' | 'EMPRESARIAL';

export const ALL_PLANES: PlanSuscripcionSaas[] = ['TRIAL', 'BASICO', 'PROFESIONAL', 'EMPRESARIAL'];

export const ALL_PROVINCIAS = [
  'SALTA',
  'JUJUY',
  'TUCUMAN',
  'SANTIAGO_DEL_ESTERO',
  'CATAMARCA',
  'FORMOSA',
  'CHACO',
  'CORRIENTES',
  'MISIONES',
  'BUENOS_AIRES',
  'CAPITAL_FEDERAL',
  'CORDOBA',
  'SANTA_FE',
  'MENDOZA',
  'ENTRE_RIOS',
  'LA_PAMPA',
  'SAN_LUIS',
  'SAN_JUAN',
  'LA_RIOJA',
  'NEUQUEN',
  'RIO_NEGRO',
  'CHUBUT',
  'SANTA_CRUZ',
  'TIERRA_DEL_FUEGO'
] as const;

export interface EmpresaDTO {
  id: number;
  nombre: string;
  cuit: string;
  razonSocial?: string;
  condicionIva?: string;
  direccion: string;
  ciudad: string;
  provincia: string;
  telefono: string;
  email: string;
  logoUrl?: string;
  estado: EstadoEmpresa;
  planSuscripcion: PlanSuscripcionSaas;
  suscripcionVenceEl?: string;
  puntoDeVenta?: number;
  zonaHoraria?: string;
  habilitaTelemedicina?: boolean;
  urlTelemedicina?: string;
  createdAt?: string;
  updatedAt?: string;
}
