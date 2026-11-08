/**
 * Ícono de ambulancia para el mapa de operaciones: vista cenital con volumen simulado.
 *
 * Por qué cenital y no en perspectiva: el ícono gira según hacia dónde va la unidad, y una vista
 * en tres cuartos se rompe al rotar (la luz y las proporciones dejan de tener sentido). Una vista
 * desde arriba rota limpio, y el volumen se logra con capas: cuerpo con degradado lateral, techo
 * levemente elevado, parabrisas con reflejo y una sombra que va en una capa aparte para que la luz
 * siempre caiga hacia el mismo lado de la pantalla aunque la ambulancia gire.
 *
 * El dibujo está pensado en una grilla de 48×48 con la ambulancia mirando hacia ARRIBA (norte); las
 * formas son trazados SVG (`Path2D`), así se dibuja de forma síncrona y nítida a cualquier densidad
 * de píxeles. No depende de Angular ni de MapLibre.
 */

/** Lado, en unidades de la grilla, del lienzo de la ambulancia. */
export const LADO_ICONO = 48;

/** Color de la carrocería y de las luces; sólo el anillo del techo cambia con el estado. */
const PALETA = {
  contorno: '#94A3B8',
  rueda: '#0F172A',
  parabrisasArriba: '#1E3A5F',
  parabrisasAbajo: '#4F7CAC',
  estrella: '#1D4ED8',
  luzRoja: '#EF4444',
  luzAzul: '#3B82F6',
  luzRojaApagada: '#7F1D1D',
  luzAzulApagada: '#1E3A8A',
  faro: '#FEF3C7',
  trasera: '#DC2626',
} as const;

// ─── Formas (trazados SVG en la grilla de 48×48, frente hacia arriba) ───────────

/** Silueta completa: capot achaflanado adelante y caja más ancha atrás. */
export const SILUETA = 'M18.5 3H29.5Q33 3 33 7V15.5L33.8 17V41Q33.8 45 29.8 45H18.2Q14.2 45 14.2 41V17L15 15.5V7Q15 3 18.5 3Z';

const CAPOT = 'M17 5.4H31Q31.9 5.4 31.9 6.4V9.2H16.1V6.4Q16.1 5.4 17 5.4Z';
const PARABRISAS = 'M16.8 9.7H31.2L30.1 15.4H17.9Z';
const REFLEJO = 'M19.4 10.3H22.9L21 15H19Z';
const TECHO_CABINA = 'M17.4 16H30.6Q31 16 31 16.5V17.2H17V16.5Q17 16 17.4 16Z';
const TECHO_CAJA = 'M18.8 20.2H29.2Q31.6 20.2 31.6 22.6V41Q31.6 43 29.6 43H18.4Q16.4 43 16.4 41V22.6Q16.4 20.2 18.8 20.2Z';

/** Brazo de la Estrella de la Vida, centrado en el origen y apuntando hacia arriba. */
const BRAZO_ESTRELLA = 'M-0.95 -5.3H0.95V5.3H-0.95Z';

// ─── Dibujo ─────────────────────────────────────────────────────────────────

export interface OpcionesAmbulancia {
  /** Color del estado de la unidad (disponible, en ruta…); pinta el anillo del techo. */
  colorEstado: string;
  /** En movimiento las luces de la barra se prenden y emiten un resplandor. */
  enMovimiento: boolean;
}

/** Cantidad de píxeles del lienzo por unidad de grilla, según la densidad de pantalla. */
function escala(ctx: CanvasRenderingContext2D, densidad: number): void {
  ctx.setTransform(densidad, 0, 0, densidad, 0, 0);
}

function rellenar(ctx: CanvasRenderingContext2D, trazado: string, relleno: string | CanvasGradient): void {
  ctx.fillStyle = relleno;
  ctx.fill(new Path2D(trazado));
}

function degradado(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, paradas: ReadonlyArray<[number, string]>): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [posicion, color] of paradas) g.addColorStop(posicion, color);
  return g;
}

/** Dibuja la ambulancia (sin sombra) en un contexto ya dimensionado a `LADO_ICONO × densidad`. */
export function dibujarAmbulancia(ctx: CanvasRenderingContext2D, densidad: number, { colorEstado, enMovimiento }: OpcionesAmbulancia): void {
  escala(ctx, densidad);
  ctx.clearRect(0, 0, LADO_ICONO, LADO_ICONO);

  // 1. Ruedas: sólo asoman por los costados, desde arriba no se ven enteras.
  ctx.fillStyle = PALETA.rueda;
  for (const [x, y, alto] of [[12.5, 9.5, 6.5], [33.5, 9.5, 6.5], [12.5, 31.5, 7.5], [33.5, 31.5, 7.5]] as const) {
    ctx.beginPath();
    ctx.roundRect(x, y, 2, alto, 0.9);
    ctx.fill();
  }

  // 2. Carrocería: degradado de izquierda a derecha, la luz entra desde la izquierda.
  const lateral = degradado(ctx, 14, 0, 34, 0, [[0, '#FFFFFF'], [0.42, '#F8FAFC'], [1, '#B8C4D4']]);
  const silueta = new Path2D(SILUETA);
  ctx.fillStyle = lateral;
  ctx.fill(silueta);
  ctx.lineWidth = 0.6;
  ctx.strokeStyle = PALETA.contorno;
  ctx.stroke(silueta);

  // 3. Capot con un velo más oscuro: baja hacia el frente.
  rellenar(ctx, CAPOT, degradado(ctx, 0, 5, 0, 9.5, [[0, 'rgba(148,163,184,0.15)'], [1, 'rgba(100,116,139,0.45)']]));

  // 4. Parabrisas con degradado vertical y un reflejo diagonal.
  rellenar(ctx, PARABRISAS, degradado(ctx, 0, 9.7, 0, 15.4, [[0, PALETA.parabrisasArriba], [1, PALETA.parabrisasAbajo]]));
  rellenar(ctx, REFLEJO, 'rgba(255,255,255,0.38)');

  // 5. Techo de la cabina y de la caja: la caja lleva un anillo del color del estado.
  rellenar(ctx, TECHO_CABINA, '#E2E8F0');
  const techo = new Path2D(TECHO_CAJA);
  ctx.fillStyle = degradado(ctx, 0, 20, 0, 43, [[0, '#FFFFFF'], [1, '#E5EAF1']]);
  ctx.fill(techo);
  // El estado es lo que el operador mira primero: a 40 px un anillo fino no se distingue, así que
  // además de un anillo grueso el techo lleva un velo del mismo color.
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = colorEstado;
  ctx.fill(techo);
  ctx.restore();
  ctx.lineWidth = 1.9;
  ctx.strokeStyle = colorEstado;
  ctx.stroke(techo);
  // Brillo fino en el borde izquierdo del techo: es lo que lo hace sentir elevado.
  ctx.beginPath();
  ctx.moveTo(17.7, 23);
  ctx.lineTo(17.7, 40.5);
  ctx.lineWidth = 0.5;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.stroke();

  // 6. Estrella de la Vida: seis brazos a 0°, 60° y 120°.
  ctx.save();
  ctx.translate(24, 31.6);
  ctx.fillStyle = PALETA.estrella;
  for (const grados of [0, 60, 120]) {
    ctx.save();
    ctx.rotate((grados * Math.PI) / 180);
    ctx.fill(new Path2D(BRAZO_ESTRELLA));
    ctx.restore();
  }
  ctx.restore();

  // 7. Barra de luces sobre el techo de la cabina, con resplandor si está en movimiento.
  if (enMovimiento) {
    for (const [cx, color] of [[20.2, 'rgba(239,68,68,0.55)'], [27.8, 'rgba(59,130,246,0.55)']] as const) {
      const g = ctx.createRadialGradient(cx, 18.6, 0, cx, 18.6, 7);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - 7, 11.6, 14, 14);
    }
  }
  ctx.beginPath();
  ctx.roundRect(16.3, 17.2, 15.4, 2.8, 1.3);
  ctx.fillStyle = '#1E293B';
  ctx.fill();
  ctx.fillStyle = enMovimiento ? PALETA.luzRoja : PALETA.luzRojaApagada;
  ctx.beginPath();
  ctx.roundRect(16.8, 17.55, 7, 2.1, 1);
  ctx.fill();
  ctx.fillStyle = enMovimiento ? PALETA.luzAzul : PALETA.luzAzulApagada;
  ctx.beginPath();
  ctx.roundRect(24.2, 17.55, 7, 2.1, 1);
  ctx.fill();

  // 8. Espejos, faros y luces traseras: los detalles chicos que dan escala.
  ctx.fillStyle = '#CBD5E1';
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 0.3;
  for (const x of [12.9, 33.3]) {
    ctx.beginPath();
    ctx.roundRect(x, 12, 1.8, 2.3, 0.6);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = PALETA.faro;
  for (const x of [16.1, 29.3]) {
    ctx.beginPath();
    ctx.roundRect(x, 3.7, 2.6, 1.2, 0.5);
    ctx.fill();
  }
  ctx.fillStyle = PALETA.trasera;
  for (const x of [15.1, 30.5]) {
    ctx.beginPath();
    ctx.roundRect(x, 43.2, 2.4, 1.2, 0.4);
    ctx.fill();
  }
  // Junta de las puertas traseras.
  ctx.beginPath();
  ctx.moveTo(24, 43.2);
  ctx.lineTo(24, 44.7);
  ctx.lineWidth = 0.4;
  ctx.strokeStyle = PALETA.contorno;
  ctx.stroke();
}

/**
 * Sombra de la ambulancia: la misma silueta, oscura y difusa. Se dibuja en una capa aparte del mapa
 * que gira igual que el cuerpo pero se desplaza siempre hacia el mismo lado de la pantalla.
 */
export function dibujarSombra(ctx: CanvasRenderingContext2D, densidad: number): void {
  escala(ctx, densidad);
  ctx.clearRect(0, 0, LADO_ICONO, LADO_ICONO);
  ctx.shadowColor = 'rgba(15,23,42,0.5)';
  ctx.shadowBlur = 3.2 * densidad;
  ctx.fillStyle = 'rgba(15,23,42,0.42)';
  ctx.fill(new Path2D(SILUETA));
}

/** Insignia "estacionada" (la P): va sin rotar, en su propia capa, para que siempre se lea derecha. */
export function dibujarInsigniaEstacionada(ctx: CanvasRenderingContext2D, densidad: number): void {
  escala(ctx, densidad);
  ctx.clearRect(0, 0, 16, 16);
  ctx.beginPath();
  ctx.arc(8, 8, 6.2, 0, Math.PI * 2);
  ctx.fillStyle = '#475569';
  ctx.fill();
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 8px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('P', 8, 8.4);
}

/** Crea un lienzo de `lado × lado` unidades a la densidad pedida y devuelve su contexto. */
export function crearLienzo(lado: number, densidad: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(lado * densidad);
  canvas.height = Math.round(lado * densidad);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el contexto 2D para el ícono de la ambulancia');
  return { canvas, ctx };
}
