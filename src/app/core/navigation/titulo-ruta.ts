/**
 * Título y subtítulo de topbar por ruta administrativa (H9).
 *
 * El header mostraba "Centro de Operaciones · Dashboard operativo" fijo en todas las
 * rutas, así que el usuario perdía la ubicación al navegar. Se resuelve por prefijo del
 * primer segmento de la URL: no depende de `route.data`, que hoy no existe en app.routes.ts.
 */

interface TituloRuta {
  titulo: string;
  subtitulo: string;
}

const TITULOS_POR_SEGMENTO: Record<string, TituloRuta> = {
  administracion: { titulo: 'Centro Administrativo', subtitulo: 'Emergex · Administración' },
  prefacturacion: { titulo: 'Prefacturación', subtitulo: 'Emergex · Administración' },
  facturacion: { titulo: 'Facturación', subtitulo: 'Emergex · Administración' },
  'cuentas-corrientes': { titulo: 'Cuentas Corrientes', subtitulo: 'Emergex · Administración' },
  compras: { titulo: 'Compras', subtitulo: 'Emergex · Administración' },
  tesoreria: { titulo: 'Tesorería', subtitulo: 'Emergex · Administración' },
  patients: { titulo: 'Afiliados', subtitulo: 'Emergex · Administración' },
  'grupos-familiares': { titulo: 'Grupos Familiares', subtitulo: 'Emergex · Administración' },
  institutions: { titulo: 'Instituciones', subtitulo: 'Emergex · Administración' },
  'obras-sociales': { titulo: 'Obras Sociales', subtitulo: 'Emergex · Administración' },
  plans: { titulo: 'Planes', subtitulo: 'Emergex · Administración' },
  inventario: { titulo: 'Inventario', subtitulo: 'Emergex · Administración' },
  management: { titulo: 'Gerencial', subtitulo: 'Emergex · Administración' },
  analytics: { titulo: 'Analítica', subtitulo: 'Emergex · Administración' },
  'zonas-tarifas': { titulo: 'Zonas y Tarifas', subtitulo: 'Emergex · Administración' },
  'asistencias': { titulo: 'Historial de Asistencias', subtitulo: 'Emergex · Administración' },

  dashboard: { titulo: 'Centro de Operaciones', subtitulo: 'Emergex · Dashboard operativo' },
  turnos: { titulo: 'Turnos', subtitulo: 'Emergex · Operación' },
  clinico: { titulo: 'Clínico', subtitulo: 'Emergex · Clínica' },
  tripulacion: { titulo: 'Tripulación', subtitulo: 'Emergex · Operación' },
  map: { titulo: 'Mapa', subtitulo: 'Emergex · Operación' },
  profile: { titulo: 'Mi Perfil', subtitulo: 'Emergex' },
  fleet: { titulo: 'Flota', subtitulo: 'Emergex · Operación' },
  staff: { titulo: 'Personal', subtitulo: 'Emergex · Configuración' },
  events: { titulo: 'Eventos', subtitulo: 'Emergex · Operación' },
  incidents: { titulo: 'Incidentes', subtitulo: 'Emergex · Operación' },
  auditoria: { titulo: 'Auditoría Médica', subtitulo: 'Emergex · Clínica' },
  hospitals: { titulo: 'Hospitales', subtitulo: 'Emergex' },
  encuestas: { titulo: 'Encuestas', subtitulo: 'Emergex · Clínica' },
  internacion: { titulo: 'Internación', subtitulo: 'Emergex · Clínica' },
  communications: { titulo: 'Comunicaciones', subtitulo: 'Emergex' },
  settings: { titulo: 'Configuración', subtitulo: 'Emergex' },
  admin: { titulo: 'Administración Global', subtitulo: 'Emergex' },
};

const DEFAULT_TITULO: TituloRuta = { titulo: 'Centro de Operaciones', subtitulo: 'Emergex · Dashboard operativo' };

export function tituloParaRuta(url: string): TituloRuta {
  const primerSegmento = url.split('?')[0].split('/').filter(Boolean)[0];
  if (!primerSegmento) {
    return DEFAULT_TITULO;
  }
  // 'auditoria-medica' y 'asistencias/historial' usan el prefijo del primer segmento.
  const clave = Object.keys(TITULOS_POR_SEGMENTO).find((k) => primerSegmento.startsWith(k));
  return (clave && TITULOS_POR_SEGMENTO[clave]) || DEFAULT_TITULO;
}
