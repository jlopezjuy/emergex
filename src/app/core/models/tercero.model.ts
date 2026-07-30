export type TipoIdentificador = 'CUIT' | 'CUIL' | 'DNI' | 'PASAPORTE' | 'CDI';
export type TipoRolTercero = 'CLIENTE' | 'PROVEEDOR' | 'FINANCIADOR' | 'EMPLEADO' | 'INSTITUCION';
export type CondicionIVA = 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTO' | 'EXENTO' | 'CONSUMIDOR_FINAL' | 'NO_RESPONSABLE';

export interface SujetoLegal {
  id?: number;
  pais: string;
  tipoIdentificador: TipoIdentificador;
  identificadorNormalizado: string;
  razonSocialCanonica: string;
}

export interface TerceroEmpresa {
  id?: number;
  empresaId?: number;
  sujetoLegal?: SujetoLegal;
  nombreComercial: string;
  estado: string;
}

export interface RegistrarTerceroRequest {
  pais: string;
  tipoIdentificador: TipoIdentificador;
  identificador: string;
  razonSocialCanonica: string;
  nombreComercial: string;
  roles?: TipoRolTercero[];
  condicionIva?: CondicionIVA;
  numeroInscripcionIibb?: string;
}
