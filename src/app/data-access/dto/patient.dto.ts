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

// ─── Cobertura / plan ────────────────────────────────────────────────────────

export interface CrearCoberturaRequest {
  tipoCobertura: 'PLAN_PROPIO' | 'OBRA_SOCIAL' | 'BASICA' | 'COMPLETA' | 'PREMIUM';
  planComercialId?: number;
  vigenciaDesde: string;
  numeroCredencial?: string;
}
