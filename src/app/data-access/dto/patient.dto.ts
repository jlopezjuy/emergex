export interface PacienteDTO {
  id: number;
  nombre: string;
  apellido: string;
  dni: string;
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
