export interface ExtractoBancario {
  id?: number;
  empresaId?: number;
  bancoNombre: string;
  fechaMovimiento: string;
  concepto: string;
  monto: number;
  conciliado: boolean;
  hashLinea: string;
}
