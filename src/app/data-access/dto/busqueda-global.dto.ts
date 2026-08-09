export interface ResultadoBusquedaItemDTO {
  tipo: string;
  id: number;
  codigo?: string;
  titulo: string;
  subtitulo?: string;
  urlRef?: string;
}

export interface BusquedaGlobalResultadoDTO {
  query: string;
  totalCoincidencias: number;
  resultados: ResultadoBusquedaItemDTO[];
}
