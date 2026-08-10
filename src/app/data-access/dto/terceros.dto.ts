export interface RegistrarTerceroRequestDTO {
  pais?: string;
  tipoIdentificador: 'CUIT' | 'CUIL' | 'DNI' | 'PASAPORTE';
  identificador: string;
  razonSocialCanonica: string;
  nombreComercial: string;
  roles?: string[];
  condicionIva?: string;
  numeroInscripcionIibb?: string;
}

export interface SolicitarCbuRequestDTO {
  terceroEmpresaId: number;
  bancoNombre: string;
  cbu: string;
  alias?: string;
  titularNombre: string;
  moneda?: string;
}

export interface CuentaBancariaTerceroDTO {
  id: number;
  bancoNombre: string;
  cbu: string;
  alias?: string;
  titularNombre: string;
  estado: 'PENDIENTE_VERIFICACION' | 'VERIFICADA' | 'RECHAZADA';
  cbuMasked?: string;
}

export interface TerceroEmpresaDTO {
  id: number;
  razonSocialCanonica: string;
  identificador: string;
  nombreComercial?: string;
  roles?: string[];
  condicionIva?: string;
  cuentasBancarias?: CuentaBancariaTerceroDTO[];
  saldoCxp?: number;
}
