/**
 * Catálogo global de obras sociales / prepagas (ObraSocial en el backend).
 * Sin tenant: compartido entre todas las empresas — ver ObraSocialDTO.java.
 */
export interface ObraSocialDTO {
  id?: number;
  nombre: string;
  cuit?: string;
  telefono?: string;
  email?: string;
  sitioWeb?: string;
  direccion?: string;
  codigoRNOS?: string;
  activa: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/** Resumen devuelto por el importador de padrón RNOS (creadas/actualizadas/rechazadas). */
export interface ImportarPadronObraSocialResultDTO {
  creadas: number;
  actualizadas: number;
  rechazadas: number;
  errores: string[];
}
