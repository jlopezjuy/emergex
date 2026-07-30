export type EstadoCuentaBancaria = 'PENDIENTE_VERIFICACION' | 'VERIFICADA' | 'RECHAZADA' | 'BAJA';

export interface CuentaBancariaTercero {
  id?: number;
  terceroEmpresaId: number;
  bancoNombre: string;
  cbuHash?: string;
  cbuMasked: string;
  alias?: string;
  titularNombre: string;
  moneda: string;
  estado: EstadoCuentaBancaria;
  solicitadoPor?: string;
  solicitadoAt?: string;
  aprobadoPor?: string;
  aprobadoAt?: string;
}

export interface SolicitarCbuRequest {
  terceroEmpresaId: number;
  bancoNombre: string;
  cbu: string;
  alias?: string;
  titularNombre: string;
  moneda?: string;
}
