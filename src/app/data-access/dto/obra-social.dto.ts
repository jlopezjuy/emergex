/**
 * Catálogo global de obras sociales / prepagas (ObraSocial en el backend).
 * Sin tenant: compartido entre todas las empresas — ver ObraSocialDTO.java.
 */
/**
 * Naturaleza jurídica del financiador. Los primeros diez valores replican las categorías del
 * RNAS y se derivan del primer dígito del código; los tres últimos son entidades que están
 * fuera del sistema nacional. Ver TipoFinanciadorSalud.java.
 */
export type TipoFinanciadorSalud =
  | 'OTRA_NATURALEZA'
  | 'SINDICAL'
  | 'ESTATAL'
  | 'POR_CONVENIO'
  | 'PERSONAL_DIRECCION'
  | 'ADMINISTRACION_MIXTA'
  | 'ASOCIACION_OBRAS_SOCIALES'
  | 'POR_ADHESION'
  | 'LEY_21476'
  | 'EMPRESA'
  | 'OBRA_SOCIAL_PROVINCIAL'
  | 'INSTITUTO_NACIONAL'
  | 'EMPRESA_MEDICINA_PREPAGA'
  | 'OTRO';

export type AmbitoFinanciador = 'NACIONAL' | 'PROVINCIAL';

export interface ObraSocialDTO {
  id?: number;
  nombre: string;
  cuit?: string;
  telefono?: string;
  email?: string;
  sitioWeb?: string;
  direccion?: string;
  /** Código del Registro Nacional de Agentes del Seguro (ex RNOS), formato 9-0080-5. */
  codigoRNOS?: string;
  /**
   * Código del Registro Nacional de Entidades de Medicina Prepaga (Ley 26.682), formato 1-1332-8.
   * Una entidad puede tener LOS DOS: Swiss Medical es RNAS 9-0080-5 y RNEMP 1-1332-8.
   */
  codigoRNEMP?: string;
  /** Clave funcional estable del catálogo (AR-RNAS-…, AR-RNEMP-…, AR-OSP-…). */
  codigoInterno?: string;
  sigla?: string;
  tipo?: TipoFinanciadorSalud;
  ambito?: AmbitoFinanciador;
  /** Sólo se completa cuando ambito = PROVINCIAL. */
  provincia?: string;
  fuenteOficial?: string;
  fechaVerificacion?: string;
  activa: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Etiquetas cortas para la tabla: los valores del enum son largos y no se leen de un vistazo. */
export const TIPO_FINANCIADOR_LABEL: Record<TipoFinanciadorSalud, string> = {
  SINDICAL: 'Sindical',
  PERSONAL_DIRECCION: 'Dirección',
  EMPRESA: 'De empresa',
  ESTATAL: 'Estatal',
  POR_CONVENIO: 'Por convenio',
  ADMINISTRACION_MIXTA: 'Adm. mixta',
  ASOCIACION_OBRAS_SOCIALES: 'A.D.O.S.',
  POR_ADHESION: 'Por adhesión',
  LEY_21476: 'Ley 21.476',
  OTRA_NATURALEZA: 'Otra naturaleza',
  OBRA_SOCIAL_PROVINCIAL: 'Provincial',
  INSTITUTO_NACIONAL: 'Instituto nacional',
  EMPRESA_MEDICINA_PREPAGA: 'Prepaga',
  OTRO: 'Otro',
};

/** Resumen devuelto por el importador de padrón RNOS (creadas/actualizadas/rechazadas). */
export interface ImportarPadronObraSocialResultDTO {
  creadas: number;
  actualizadas: number;
  rechazadas: number;
  errores: string[];
}
