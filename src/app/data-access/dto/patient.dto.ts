export interface PacienteDTO {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
  tipoDocumento?: string;
  email?: string;
  telefono?: string;
  telefonoAlternativo?: string;
  fechaNacimiento?: string;
  sexo?: 'MASCULINO' | 'FEMENINO' | 'OTRO';
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  empresa?: { id: number; nombre: string };
  numeroAfiliado?: string;
  activo?: boolean;
  alergia?: string;
  notaMedica?: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
  createdAt?: string;
}

export interface CreatePacienteRequest {
  nombre: string;
  apellido: string;
  dni: string;
  tipoDocumento: 'DNI' | 'PASAPORTE' | 'CEDULA' | 'OTRO';
  sexo: 'MASCULINO' | 'FEMENINO' | 'OTRO';
  fechaNacimiento?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  activo: boolean;
  empresa: { id: number };
  alergia?: string;
  notaMedica?: string;
  contactoEmergenciaNombre?: string;
  contactoEmergenciaTelefono?: string;
}

// ─── Ficha afiliado ──────────────────────────────────────────────────────────

export interface FichaAfiliadoDTO {
  pacienteId: number;
  nombreCompleto: string;
  dni: string;
  telefono?: string;
  direccion?: string;
  numeroAfiliado?: string;
  edad?: number;
  grupoFamiliarId?: number;
  numeroCuentaGrupo?: string;
  estadoGrupo?: string;
  saldoFavor?: number;
  cobertura?: CoberturaFichaDTO;
  atencionesMes?: number;
  miembrosGrupo?: MiembroFichaDTO[];
  alertas?: AlertaFichaDTO[];
}

export interface CoberturaFichaDTO {
  nombre?: string;
  nivel?: string;
  copago?: string;
  prestaciones?: string[];
  /** Precio mensual acordado devuelto por el backend (cuando disponible) */
  precioMensualAcordado?: number;
}

export interface MiembroFichaDTO {
  nombre?: string;
  rol?: string;
  estado?: string;
  fechaIngreso?: string;
  fechaBaja?: string;
  motivoBaja?: string;
}

export interface AlertaFichaDTO {
  tipo?: string;
  descripcion?: string;
  severidad?: string;
}

// ─── Grupo familiar ──────────────────────────────────────────────────────────

export interface MiembroGrupoFamiliarDTO {
  id: number;
  rolFamiliar: 'TITULAR' | 'CO_TITULAR' | 'DEPENDIENTE';
  fechaIngreso: string;
  fechaSalida?: string;
  estado: 'ACTIVA' | 'INACTIVA' | 'TRANSFERIDA';
  motivoCambio?: string;
  empresa?: { id: number; nombre?: string };
  grupoFamiliar?: { id: number; numeroCuenta?: string };
  paciente?: PacienteDTO;
}

export interface AddMiembroRequest {
  rolFamiliar: 'TITULAR' | 'CO_TITULAR' | 'DEPENDIENTE';
  fechaIngreso: string;
  estado: 'ACTIVA' | 'INACTIVA' | 'TRANSFERIDA';
  motivoCambio?: string;
  empresa: { id: number };
  grupoFamiliar: { id: number };
  paciente: { id: number };
}

export interface RemoveMiembroRequest {
  fechaSalida: string;
  estado: 'INACTIVA';
  motivoCambio?: string;
}

// ─── Facturas y pagos ────────────────────────────────────────────────────────

export interface FacturaDTO {
  id: number;
  numeroFactura?: string;
  estado?: string;
  tipoFactura?: string;
  fechaEmision?: string;
  periodoDesde?: string;
  periodoHasta?: string;
  grupoFamiliarId?: number;
  grupoNumeroCuenta?: string;
  importeTotal?: number;
  saldoPendiente?: number;
}

export interface RegistrarPagoRequest {
  fechaPago: string;
  monto: number;
  metodoPago: 'EFECTIVO' | 'TARJETA_CREDITO' | 'TARJETA_DEBITO' | 'TRANSFERENCIA' | 'MERCADOPAGO' | 'CHEQUE' | 'OBRA_SOCIAL' | 'PREPAGA' | 'OTRO';
  numeroReferencia?: string;
  nota?: string;
}

export interface PagoResponseDTO {
  pagoId: number;
  facturaId: number;
  fechaPago?: string;
  monto?: number;
  metodoPago?: string;
  estadoPago?: string;
  saldoPendiente?: number;
}

// ─── Consumo mensual y órdenes médicas ───────────────────────────────────────

export interface OrdenMedicaDTO {
  id: number;
  numeroOrden: string;
  fechaEmision: string;
  fechaUso?: string;
  usada: boolean;
}

export interface ConsumoMensualDTO {
  atencionesConsumidas: number;
  atencionesMaximas: number;
  controlesMedicosConsumidos: number;
  controlesMedicosMaximos: number;
  ordenesDisponibles: OrdenMedicaDTO[];
}

// ─── Cobertura / plan ────────────────────────────────────────────────────────

export type OrigenCobertura = 'PLAN_PROPIO' | 'OBRA_SOCIAL' | 'INSTITUCIONAL' | 'SIN_COBERTURA';

export interface CoberturaVigenteDTO {
  pacienteNombre?: string;
  pacienteDni?: string;
  pacienteId?: number;
  origen: OrigenCobertura;
  cubierto: boolean;
  planNombre?: string;
  contratoId?: string;
  contratoDescripcion?: string;
  institucionNombre?: string;
  miembroInstitucionId?: number;
  requiereCopago?: boolean;
  montoCopago?: number;
  requiereAutorizacion?: boolean;
  esFacturable?: boolean;
  vigenciaDesde?: string;
  vigenciaHasta?: string;
  estadoCobertura?: string;
}

export interface CrearCoberturaRequest {
  tipoCobertura: 'PLAN_PROPIO' | 'OBRA_SOCIAL' | 'INSTITUCIONAL' | 'SIN_COBERTURA';
  planComercialId?: number;
  vigenciaDesde: string;
  numeroCredencial?: string;
}

// ─── Alta completa (endpoint atómico) ────────────────────────────────────────

export interface AltaAfiliadoCompletaRequest {
  nombre: string;
  apellido: string;
  dni: string;
  tipoDocumento: 'DNI' | 'PASAPORTE' | 'CEDULA' | 'OTRO';
  sexo: 'MASCULINO' | 'FEMENINO' | 'OTRO';
  fechaNacimiento?: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  planComercialId: number;
  dependientes: DependienteAltaRequest[];
}

export interface DependienteAltaRequest {
  nombre: string;
  apellido: string;
  dni: string;
  tipoDocumento: 'DNI' | 'PASAPORTE' | 'CEDULA' | 'OTRO';
  sexo: 'MASCULINO' | 'FEMENINO' | 'OTRO';
  fechaNacimiento?: string;
  rolFamiliar: 'TITULAR' | 'CO_TITULAR' | 'DEPENDIENTE';
}

export interface ValidacionDniAfiliadoDTO {
  dni?: string;
  disponible: boolean;
  duplicadoPaciente: boolean;
  duplicadoInstitucional: boolean;
  mensaje?: string;
}

export interface AltaAfiliadoCompletaResponse {
  pacienteId: number;
  grupoFamiliarId: number;
  coberturaId: number;
  numeroCuentaGrupo: string;
  dependientesCreados: number;
  facturaId?: number;
}

// ─── Búsqueda de afiliados server-side ──────────────────────────────────────

export interface AfiliadoSearchResult {
  pacienteId: number;
  nombreCompleto: string;
  dni: string;
  telefono?: string;
  numeroAfiliado?: string;
  grupoFamiliarId?: number;
  numeroCuentaGrupo?: string;
  estadoGrupo?: string;
  coberturaActiva?: string;
  planNivel?: string;
  depCount?: number;
  activo?: boolean;
  createdAt?: string;
  contextoCoberturaId?: number;
  coberturaVigente?: CoberturaVigenteDTO;
  rolFamiliar?: 'TITULAR' | 'CO_TITULAR' | 'DEPENDIENTE';
}
