export type EstadoEmpresa = 'ACTIVA' | 'SUSPENDIDA' | 'INACTIVA';
export type PlanSuscripcionSaas = 'BASICO' | 'ESTANDAR' | 'PREMIUM';

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
