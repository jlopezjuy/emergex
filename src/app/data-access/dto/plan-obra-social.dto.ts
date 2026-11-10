/** Debe coincidir 1:1 con ar.com.aliviarsalud.app.domain.enumeration.Provincia (backend). */
export type Provincia =
  | 'SALTA'
  | 'JUJUY'
  | 'TUCUMAN'
  | 'SANTIAGO_DEL_ESTERO'
  | 'CATAMARCA'
  | 'FORMOSA'
  | 'CHACO'
  | 'CORRIENTES'
  | 'MISIONES'
  | 'BUENOS_AIRES'
  | 'CAPITAL_FEDERAL'
  | 'CORDOBA'
  | 'SANTA_FE'
  | 'MENDOZA'
  | 'ENTRE_RIOS'
  | 'LA_PAMPA'
  | 'SAN_LUIS'
  | 'SAN_JUAN'
  | 'LA_RIOJA'
  | 'NEUQUEN'
  | 'RIO_NEGRO'
  | 'CHUBUT'
  | 'SANTA_CRUZ'
  | 'TIERRA_DEL_FUEGO';

export const PROVINCIAS: { value: Provincia; label: string }[] = [
  { value: 'BUENOS_AIRES', label: 'Buenos Aires' },
  { value: 'CAPITAL_FEDERAL', label: 'Capital Federal' },
  { value: 'CATAMARCA', label: 'Catamarca' },
  { value: 'CHACO', label: 'Chaco' },
  { value: 'CHUBUT', label: 'Chubut' },
  { value: 'CORDOBA', label: 'Córdoba' },
  { value: 'CORRIENTES', label: 'Corrientes' },
  { value: 'ENTRE_RIOS', label: 'Entre Ríos' },
  { value: 'FORMOSA', label: 'Formosa' },
  { value: 'JUJUY', label: 'Jujuy' },
  { value: 'LA_PAMPA', label: 'La Pampa' },
  { value: 'LA_RIOJA', label: 'La Rioja' },
  { value: 'MENDOZA', label: 'Mendoza' },
  { value: 'MISIONES', label: 'Misiones' },
  { value: 'NEUQUEN', label: 'Neuquén' },
  { value: 'RIO_NEGRO', label: 'Río Negro' },
  { value: 'SALTA', label: 'Salta' },
  { value: 'SAN_JUAN', label: 'San Juan' },
  { value: 'SAN_LUIS', label: 'San Luis' },
  { value: 'SANTA_CRUZ', label: 'Santa Cruz' },
  { value: 'SANTA_FE', label: 'Santa Fe' },
  { value: 'SANTIAGO_DEL_ESTERO', label: 'Santiago del Estero' },
  { value: 'TIERRA_DEL_FUEGO', label: 'Tierra del Fuego' },
  { value: 'TUCUMAN', label: 'Tucumán' },
];

export interface PlanObraSocialDTO {
  id?: number;
  nombre: string;
  codigo?: string;
  descripcion?: string;
  activo: boolean;
  obraSocial: { id: number; nombre?: string };
}
