/**
 * Copy for the public landing page.
 *
 * Every statement here must describe a capability that exists in the product. Do not add
 * customer counts, SLA figures or certifications unless they are verified and approved.
 */

export const LANDING_CONTACT_EMAIL = 'contacto@emergex.com';

/** WhatsApp number in international format, digits only (wa.me requirement). */
export const LANDING_WHATSAPP_NUMBER = '5493884105177';
export const LANDING_WHATSAPP_MESSAGE = 'Hola, quiero conocer Emergex y coordinar una demo.';

export interface LandingHighlight {
  label: string;
  value: string;
}

export interface LandingStep {
  code: string;
  title: string;
  text: string;
}

export type LandingIcon = 'dispatch' | 'fleet' | 'mobile' | 'clinical' | 'billing' | 'admin';

export interface LandingModule {
  icon: LandingIcon;
  title: string;
  text: string;
  tags: string[];
}

export interface LandingRole {
  role: string;
  screen: string;
}

export interface LandingSecurityItem {
  title: string;
  text: string;
}

export const LANDING_HIGHLIGHTS: LandingHighlight[] = [
  { label: 'Operación', value: 'Despacho en tiempo real' },
  { label: 'Campo', value: 'App móvil offline' },
  { label: 'Facturación', value: 'Electrónica ARCA' },
];

export const LANDING_FLOW: LandingStep[] = [
  { code: '01', title: 'Llamada', text: 'Alta del incidente con domicilio geocodificado y validación de cobertura.' },
  { code: '02', title: 'Triage', text: 'Nivel de urgencia y prioridad visibles para todo el centro.' },
  { code: '03', title: 'Despacho', text: 'Asignación de móvil y tripulación sobre el mapa en vivo.' },
  { code: '04', title: 'Atención', text: 'Registro clínico desde la app, aun sin señal.' },
  { code: '05', title: 'Cierre', text: 'Cierre validado que genera la prestación facturable.' },
  { code: '06', title: 'Facturación', text: 'Prefacturación, comprobante electrónico y cuenta corriente.' },
];

export const LANDING_MODULES: LandingModule[] = [
  {
    icon: 'dispatch',
    title: 'Centro de operaciones',
    text: 'Tablero de incidentes, mapa con posición de cada móvil y estados de asistencia en tiempo real.',
    tags: ['Mapa en vivo', 'Triage', 'Telemetría GPS'],
  },
  {
    icon: 'fleet',
    title: 'Flota y tripulación',
    text: 'Unidades, documentación vehicular, turnos y agenda operativa del personal.',
    tags: ['Ambulancias', 'Turnos', 'Guardias'],
  },
  {
    icon: 'mobile',
    title: 'App móvil para el equipo',
    text: 'Viajes, estados y atención en el lugar con almacenamiento cifrado y sincronización al recuperar señal.',
    tags: ['Offline', 'Sincronización', 'Android'],
  },
  {
    icon: 'clinical',
    title: 'Gestión clínica',
    text: 'Registro de la atención, internación, derivación a hospitales y auditoría médica selectiva.',
    tags: ['Historia', 'Auditoría', 'Internación'],
  },
  {
    icon: 'billing',
    title: 'Facturación',
    text: 'Prefacturación por convenio, padrones de afiliados, obras sociales y comprobantes electrónicos.',
    tags: ['ARCA', 'Obras sociales', 'Planes'],
  },
  {
    icon: 'admin',
    title: 'Administración',
    text: 'Cuentas corrientes, tesorería, compras y reportes de gestión en un solo circuito.',
    tags: ['Tesorería', 'Compras', 'Reportes'],
  },
];

export const LANDING_ROLES: LandingRole[] = [
  { role: 'Despachante', screen: 'Centro de operaciones' },
  { role: 'Médico de campo', screen: 'Atención clínica' },
  { role: 'Chofer', screen: 'Viajes y estados' },
  { role: 'Auditor médico', screen: 'Auditoría de prestaciones' },
  { role: 'Administración', screen: 'Centro administrativo' },
];

export const LANDING_SECURITY: LandingSecurityItem[] = [
  { title: 'Datos aislados por empresa', text: 'Cada organización opera sobre su propia información.' },
  { title: 'Acceso por rol', text: 'Cada usuario ve sólo las pantallas y acciones de su función.' },
  { title: 'Conexión cifrada', text: 'Tráfico por HTTPS y datos del dispositivo móvil cifrados.' },
  { title: 'Trazabilidad', text: 'Estados y cambios registrados con usuario y fecha.' },
];
