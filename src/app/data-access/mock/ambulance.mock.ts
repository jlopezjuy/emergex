// MOCK — replace with real endpoint GET /api/flota/ambulancias
import { UnidadMovilDTO } from '../dto/ambulancia.dto';

export const MOCK_AMBULANCIAS: UnidadMovilDTO[] = [
  { id: 1, identificador: 'U-04', tipo: 'ALS', estado: 'DISPONIBLE', tripulacion: 'Dr. Sosa / Ramírez', bateria: 92, combustible: 78, latitud: -34.61, longitud: -58.45 },
  { id: 2, identificador: 'U-07', tipo: 'ALS', estado: 'EN_RUTA', tripulacion: 'Dr. Méndez / Torres', bateria: 67, combustible: 55, latitud: -34.60, longitud: -58.43, ticketActivo: 1001, eta: 4 },
  { id: 3, identificador: 'U-09', tipo: 'BLS', estado: 'DISPONIBLE', tripulacion: 'Enf. Gómez / Castro', bateria: 85, combustible: 90, latitud: -34.625, longitud: -58.41 },
  { id: 4, identificador: 'U-12', tipo: 'ALS', estado: 'EN_SITIO', tripulacion: 'Dr. Vera / Sánchez', bateria: 43, combustible: 38, latitud: -34.50, longitud: -58.50, ticketActivo: 1002 },
  { id: 5, identificador: 'U-14', tipo: 'BLS', estado: 'DISPONIBLE', tripulacion: 'Enf. Ríos / Herrera', bateria: 100, combustible: 100, latitud: -34.58, longitud: -58.39 },
  { id: 6, identificador: 'U-15', tipo: 'ALS', estado: 'EN_RUTA', tripulacion: 'Dr. Fuentes / Díaz', bateria: 71, combustible: 62, latitud: -34.53, longitud: -58.47, ticketActivo: 1006, eta: 7 },
  { id: 7, identificador: 'U-17', tipo: 'BLS', estado: 'TRASLADO', tripulacion: 'Enf. Molina / Peralta', bateria: 55, combustible: 48, latitud: -34.64, longitud: -58.44 },
  { id: 8, identificador: 'U-20', tipo: 'ALS', estado: 'DISPONIBLE', tripulacion: 'Dr. Aguilar / Romero', bateria: 88, combustible: 75, latitud: -34.59, longitud: -58.40 },
  { id: 9, identificador: 'U-22', tipo: 'BLS', estado: 'MANTENIMIENTO', tripulacion: '—', bateria: 20, combustible: 30, latitud: -34.62, longitud: -58.43 },
  { id: 10, identificador: 'U-25', tipo: 'ALS', estado: 'DISPONIBLE', tripulacion: 'Dr. Navarro / Cruz', bateria: 95, combustible: 85, latitud: -34.57, longitud: -58.46 },
  { id: 11, identificador: 'U-28', tipo: 'BLS', estado: 'EN_RUTA', tripulacion: 'Enf. Vargas / Morales', bateria: 60, combustible: 52, latitud: -34.54, longitud: -58.41, eta: 12 },
  { id: 12, identificador: 'U-33', tipo: 'ALS', estado: 'DISPONIBLE', tripulacion: 'Dr. Blanco / Fernández', bateria: 78, combustible: 70, latitud: -34.63, longitud: -58.42 },
];
