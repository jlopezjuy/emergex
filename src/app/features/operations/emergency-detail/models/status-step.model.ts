export interface StatusStep {
  id: string;
  label: string;
}

export const ALL_STEPS: StatusStep[] = [
  { id: 'RECIBIDO',   label: 'Recibido'   },
  { id: 'DESPACHADO', label: 'Despachado' },
  { id: 'EN_CAMINO',  label: 'En camino'  },
  { id: 'EN_SITIO',   label: 'En sitio'   },
  { id: 'HOSPITALIZACION_PENDIENTE', label: 'Hosp. pendiente' },
  { id: 'TRASLADO',   label: 'Traslado'   },
  { id: 'ENTREGADO',  label: 'Entregado'  },
  { id: 'CERRADO',    label: 'Cerrado'    },
];
