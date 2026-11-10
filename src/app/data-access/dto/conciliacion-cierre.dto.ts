export interface ConciliacionInstitucionalCierreDTO {
  id?: number;
  periodoDesde?: string;
  periodoHasta?: string;
  totalFacturado?: number;
  totalPagado?: number;
  saldo?: number;
  cerradoAt?: string;
  institucion: { id: number; name?: string };
}
