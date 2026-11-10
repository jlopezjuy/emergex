/**
 * Ícono de ambulancia para el mapa de operaciones: modelo 3D visto desde arriba y de costado.
 *
 * La ambulancia es un modelo 3D simple (perfil lateral extruido, decales, ruedas) que se dibuja con
 * una cámara fija elevada, mirando hacia el norte desde el sur. Como una vista en perspectiva no
 * se puede rotar como imagen sin romperse, no se gira el dibujo: se vuelve a dibujar el modelo para
 * cada rumbo (16 direcciones). Así, yendo al norte se ve la parte trasera y el techo, yendo al este
 * el costado, y en diagonal una esquina, siempre con la luz y la sombra cayendo del mismo lado.
 *
 * Es un mini renderizador: proyecta cada cara, descarta las que dan la espalda a la cámara, las
 * ordena de más lejana a más cercana, y las pinta con un sombreado según su orientación respecto
 * de la luz. No depende de Angular ni de MapLibre.
 *
 * Convenciones: el modelo mira hacia +Y (adelante), +X es su derecha y +Z arriba; el mundo tiene +X
 * al este, +Y al norte. El rumbo se mide en grados desde el norte, en sentido horario.
 */

// ─── Constantes ─────────────────────────────────────────────────────────────

/** Cantidad de direcciones para las que se dibuja un sprite. */
export const PASOS_RUMBO = 16;

/** Lado, en píxeles lógicos, del lienzo de cada sprite. */
export const LADO_SPRITE = 72;

/** Píxeles por unidad del modelo. */
const ESCALA = 9.5;

/** Elevación de la cámara sobre el horizonte, en grados: 90 sería cenital, 0 de costado. */
const ELEVACION_GRADOS = 38;
const SEN_EL = Math.sin((ELEVACION_GRADOS * Math.PI) / 180);
const COS_EL = Math.cos((ELEVACION_GRADOS * Math.PI) / 180);

/** Dónde queda, dentro del sprite, el punto del suelo bajo el centro de la ambulancia. */
const ORIGEN = { x: LADO_SPRITE / 2, y: 47 };

/** Hacia dónde está la cámara, vista desde la escena: al sur y arriba. */
const HACIA_CAMARA = [0, -COS_EL, SEN_EL] as const;

/** Dirección de la luz (de dónde viene): arriba, al oeste y algo al sur. Unitaria. */
const LUZ = normalizar([-0.5, -0.4, 0.78]);

// ─── Geometría ──────────────────────────────────────────────────────────────

type Vec = readonly [number, number, number];

function normalizar(v: Vec | number[]): Vec {
  const largo = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / largo, v[1] / largo, v[2] / largo];
}
const restar = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const punto = (a: Vec, b: Vec): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Ancho de la carrocería: va de −MEDIO_ANCHO a +MEDIO_ANCHO. */
const MEDIO_ANCHO = 1.0;

/**
 * Perfil lateral de la ambulancia en (y, z), recorrido desde atrás-abajo: caja alta, escalón al
 * techo de la cabina, parabrisas inclinado, capot y trompa. Se extruye a lo ancho para armar el cuerpo.
 */
const PERFIL: ReadonlyArray<readonly [number, number]> = [
  [-2.6, 0.35],
  [-2.6, 2.2],
  [-2.45, 2.4],
  [0.85, 2.4],
  [0.85, 2.0],
  [1.45, 2.0],
  [2.05, 1.4],
  [2.65, 1.2],
  [2.8, 1.0],
  [2.8, 0.5],
  [2.6, 0.35],
];

/** Nombre de la cara que genera el tramo del perfil que empieza en cada índice. */
const NOMBRE_TRAMO = ['trasera', 'trasera', 'techo', 'escalon', 'techo-cabina', 'parabrisas', 'capot', 'frente', 'frente', 'frente', 'fondo'];

/** Un polígono del modelo, con su orientación, su color base y cómo se ordena respecto de otros. */
interface Cara {
  nombre: string;
  puntos: Vec[];
  /** Normal hacia afuera, ya unitaria. */
  normal: Vec;
  color: string;
  /** Un decal va pegado a una superficie: se pinta justo encima de ella. */
  decal?: boolean;
  /** Corrimiento al ordenar; negativo la acerca a la cámara. */
  sesgo?: number;
  /** Multiplica el brillo (el vidrio brilla más que la chapa). */
  brillo?: number;
}

function caraDe(nombre: string, puntos: Vec[], color: string, dentro: Vec, extra: Partial<Cara> = {}): Cara {
  let normal = normalizar(cruz(restar(puntos[1], puntos[0]), restar(puntos[2], puntos[0])));
  const centro: Vec = [
    puntos.reduce((s, p) => s + p[0], 0) / puntos.length,
    puntos.reduce((s, p) => s + p[1], 0) / puntos.length,
    puntos.reduce((s, p) => s + p[2], 0) / puntos.length,
  ];
  // La normal tiene que apuntar hacia afuera del cuerpo: si mira hacia el centro, se da vuelta.
  if (punto(normal, restar(centro, dentro)) < 0) normal = [-normal[0], -normal[1], -normal[2]];
  return { nombre, puntos, normal, color, ...extra };
}

/** Plano lateral del cuerpo (x = ±MEDIO_ANCHO) en el que se pegan decales. */
function enLado(lado: 1 | -1, puntos: ReadonlyArray<readonly [number, number]>, afuera = 0.012): Vec[] {
  return puntos.map(([y, z]) => [lado * (MEDIO_ANCHO + afuera), y, z] as Vec);
}

/** Círculo (o polígono regular) en el plano lateral, de `lados` lados. */
function disco(lado: 1 | -1, y: number, z: number, radio: number, afuera: number, lados = 14): Vec[] {
  return Array.from({ length: lados }, (_, i) => {
    const a = (i / lados) * Math.PI * 2;
    return [lado * (MEDIO_ANCHO + afuera), y + Math.cos(a) * radio, z + Math.sin(a) * radio] as Vec;
  });
}

/** Brazo de la Estrella de la Vida en el plano lateral, rotado `grados`, centrado en (y, z). */
function brazoEstrella(lado: 1 | -1, y: number, z: number, largo: number, ancho: number, grados: number): Vec[] {
  const a = (grados * Math.PI) / 180;
  const rotar = (u: number, v: number): readonly [number, number] => [y + u * Math.cos(a) - v * Math.sin(a), z + u * Math.sin(a) + v * Math.cos(a)];
  return enLado(lado, [rotar(-ancho, -largo), rotar(ancho, -largo), rotar(ancho, largo), rotar(-ancho, largo)], 0.02);
}

export interface OpcionesAmbulancia {
  /** Color del estado de la unidad: pinta la franja lateral. */
  colorEstado: string;
  /** En movimiento las luces de la barra se prenden y emiten un resplandor. */
  enMovimiento: boolean;
}

const COLOR = {
  chapa: '#F3F5F8',
  vidrio: '#27456B',
  neumatico: '#141B2B',
  llanta: '#B8C2D1',
  estrella: '#1D4ED8',
  faro: '#FFF3C4',
  trasera: '#D92D2D',
  luzRoja: '#EF4444',
  luzAzul: '#3B82F6',
  luzRojaApagada: '#7F1D1D',
  luzAzulApagada: '#1E3A8A',
} as const;

const v0 = (x: number, y: number, z: number): Vec => [x, y, z];

/** Construye todas las caras del modelo. Depende sólo del estado, no del rumbo. */
function construirModelo({ colorEstado, enMovimiento }: OpcionesAmbulancia): Cara[] {
  const centro: Vec = [0, 0, 1.2];
  const caras: Cara[] = [];

  // Cuerpo: un tramo del perfil extruido por cada par de puntos consecutivos.
  PERFIL.forEach(([y0, z0], i) => {
    const [y1, z1] = PERFIL[(i + 1) % PERFIL.length];
    const nombre = NOMBRE_TRAMO[i];
    const esVidrio = nombre === 'parabrisas';
    caras.push(
      caraDe(
        nombre,
        [
          [-MEDIO_ANCHO, y0, z0],
          [MEDIO_ANCHO, y0, z0],
          [MEDIO_ANCHO, y1, z1],
          [-MEDIO_ANCHO, y1, z1],
        ],
        esVidrio ? COLOR.vidrio : COLOR.chapa,
        centro,
        esVidrio ? { brillo: 1.25 } : {},
      ),
    );
  });
  // Costados: el perfil completo a cada lado.
  const perfilLado = (lado: 1 | -1): Vec[] => PERFIL.map(([y, z]) => [lado * MEDIO_ANCHO, y, z] as Vec);
  caras.push(caraDe('lado-izquierdo', perfilLado(-1), COLOR.chapa, centro));
  caras.push(caraDe('lado-derecho', perfilLado(1), COLOR.chapa, centro));

  for (const lado of [-1, 1] as const) {
    const nombreLado = lado === 1 ? 'lado-derecho' : 'lado-izquierdo';
    const lateral = (nombre: string, puntos: Vec[], color: string, extra: Partial<Cara> = {}): void => {
      caras.push(caraDe(`${nombre}-${nombreLado}`, puntos, color, centro, { decal: true, ...extra }));
    };

    // Franja del color del estado a lo largo de la caja, con un filete oscuro debajo.
    lateral('franja', enLado(lado, [[-2.55, 0.92], [0.8, 0.92], [0.8, 1.26], [-2.55, 1.26]]), colorEstado);
    lateral('filete', enLado(lado, [[-2.55, 0.8], [0.8, 0.8], [0.8, 0.9], [-2.55, 0.9]]), '#CBD3DE');
    // Ventana de la cabina.
    lateral('ventana', enLado(lado, [[1.0, 1.52], [1.0, 1.9], [1.42, 1.9], [1.88, 1.46]]), COLOR.vidrio, { brillo: 1.2 });
    // Estrella de la Vida sobre la caja: tres brazos a 0°, 60° y 120°.
    for (const grados of [0, 60, 120]) {
      lateral('estrella', brazoEstrella(lado, -1.0, 1.82, 0.5, 0.075, grados), COLOR.estrella, { sesgo: -0.02 });
    }
    // Pasarruedas, neumático y llanta.
    for (const y of [-1.55, 1.75]) {
      lateral('pasarueda', disco(lado, y, 0.55, 0.62, 0.014), '#0B1020');
      lateral('neumatico', disco(lado, y, 0.52, 0.5, 0.03), COLOR.neumatico, { sesgo: -0.02 });
      lateral('llanta', disco(lado, y, 0.52, 0.22, 0.045, 10), COLOR.llanta, { sesgo: -0.04 });
    }
  }

  // Franja del color del estado a lo largo del techo: el techo se ve desde cualquier rumbo, así que
  // es lo que permite distinguir los estados cuando la ambulancia no muestra su costado.
  caras.push(
    caraDe(
      'franja-techo',
      [v0(-0.62, -2.2, 2.412), v0(0.62, -2.2, 2.412), v0(0.62, 0.62, 2.412), v0(-0.62, 0.62, 2.412)],
      colorEstado,
      centro,
      { decal: true, sesgo: -0.02, brillo: 1.08 },
    ),
  );

  // Barra de luces sobre el techo de la cabina: una caja baja con el techo mitad rojo, mitad azul.
  const luzRoja = enMovimiento ? COLOR.luzRoja : COLOR.luzRojaApagada;
  const luzAzul = enMovimiento ? COLOR.luzAzul : COLOR.luzAzulApagada;
  const barra = { y0: 1.0, y1: 1.32, z0: 2.0, z1: 2.22, x: 0.78 };
  const cajaBarra: Vec = [0, (barra.y0 + barra.y1) / 2, (barra.z0 + barra.z1) / 2];
  const v = (x: number, y: number, z: number): Vec => [x, y, z];
  const barraCara = (nombre: string, puntos: Vec[], color: string, extra: Partial<Cara> = {}): void => {
    caras.push(caraDe(nombre, puntos, color, cajaBarra, { sesgo: -0.3, ...extra }));
  };
  barraCara('barra-techo-rojo', [v(-barra.x, barra.y0, barra.z1), v(0, barra.y0, barra.z1), v(0, barra.y1, barra.z1), v(-barra.x, barra.y1, barra.z1)], luzRoja, { brillo: 1.15 });
  barraCara('barra-techo-azul', [v(0, barra.y0, barra.z1), v(barra.x, barra.y0, barra.z1), v(barra.x, barra.y1, barra.z1), v(0, barra.y1, barra.z1)], luzAzul, { brillo: 1.15 });
  barraCara('barra-trasera-rojo', [v(-barra.x, barra.y0, barra.z0), v(0, barra.y0, barra.z0), v(0, barra.y0, barra.z1), v(-barra.x, barra.y0, barra.z1)], luzRoja);
  barraCara('barra-trasera-azul', [v(0, barra.y0, barra.z0), v(barra.x, barra.y0, barra.z0), v(barra.x, barra.y0, barra.z1), v(0, barra.y0, barra.z1)], luzAzul);
  barraCara('barra-frente-rojo', [v(-barra.x, barra.y1, barra.z0), v(0, barra.y1, barra.z0), v(0, barra.y1, barra.z1), v(-barra.x, barra.y1, barra.z1)], luzRoja);
  barraCara('barra-frente-azul', [v(0, barra.y1, barra.z0), v(barra.x, barra.y1, barra.z0), v(barra.x, barra.y1, barra.z1), v(0, barra.y1, barra.z1)], luzAzul);
  barraCara('barra-izquierda', [v(-barra.x, barra.y0, barra.z0), v(-barra.x, barra.y1, barra.z0), v(-barra.x, barra.y1, barra.z1), v(-barra.x, barra.y0, barra.z1)], luzRoja);
  barraCara('barra-derecha', [v(barra.x, barra.y0, barra.z0), v(barra.x, barra.y1, barra.z0), v(barra.x, barra.y1, barra.z1), v(barra.x, barra.y0, barra.z1)], luzAzul);

  // Detalles de las puntas: luces traseras y faros, pegados al plano de cada punta.
  for (const x of [-0.8, 0.8]) {
    caras.push(caraDe('luz-trasera', [v(x - 0.16, -2.612, 0.62), v(x + 0.16, -2.612, 0.62), v(x + 0.16, -2.612, 1.0), v(x - 0.16, -2.612, 1.0)], COLOR.trasera, centro, { decal: true, sesgo: -0.02, brillo: 1.1 }));
    caras.push(caraDe('faro', [v(x - 0.18, 2.812, 0.66), v(x + 0.18, 2.812, 0.66), v(x + 0.18, 2.812, 0.92), v(x - 0.18, 2.812, 0.92)], COLOR.faro, centro, { decal: true, sesgo: -0.02, brillo: 1.2 }));
  }
  // Junta de las puertas traseras.
  caras.push(caraDe('puertas', [v(-0.02, -2.612, 0.5), v(0.02, -2.612, 0.5), v(0.02, -2.612, 2.1), v(-0.02, -2.612, 2.1)], '#9AA6B6', centro, { decal: true, sesgo: -0.02 }));

  return caras;
}

// ─── Cámara ─────────────────────────────────────────────────────────────────

/** Rota un vector del modelo al mundo según el rumbo (grados, horario desde el norte). */
function aMundo(p: Vec, rumbo: number): Vec {
  const a = (rumbo * Math.PI) / 180;
  const s = Math.sin(a);
  const c = Math.cos(a);
  return [p[0] * c + p[1] * s, -p[0] * s + p[1] * c, p[2]];
}

/** Proyección de la cámara fija: x queda igual y lo más lejano (al norte) y lo más alto suben. */
function proyectar(p: Vec): readonly [number, number] {
  return [ORIGEN.x + p[0] * ESCALA, ORIGEN.y - (p[1] * SEN_EL + p[2] * COS_EL) * ESCALA];
}

/** Distancia a la cámara, sin escala: mayor es más lejos. */
const profundidad = (p: Vec): number => p[1] * COS_EL - p[2] * SEN_EL;

/** Nombres de las caras (sin repetir) que la cámara ve cuando la ambulancia va hacia `rumbo`. */
export function carasVisiblesDe(rumbo: number): string[] {
  const nombres = new Set<string>();
  for (const cara of construirModelo({ colorEstado: '#10B981', enMovimiento: false })) {
    if (punto(aMundo(cara.normal, rumbo), HACIA_CAMARA) > 1e-6) nombres.add(cara.nombre);
  }
  return [...nombres];
}

// ─── Rumbos discretos ───────────────────────────────────────────────────────

/** Lleva un rumbo cualquiera a la franja (0…PASOS_RUMBO−1) cuyo sprite se muestra. */
export function rumboABucket(rumbo: number): number {
  const normalizado = ((rumbo % 360) + 360) % 360;
  return Math.round(normalizado / (360 / PASOS_RUMBO)) % PASOS_RUMBO;
}

/** Rumbo central de una franja. */
export function rumboDeBucket(bucket: number): number {
  return bucket * (360 / PASOS_RUMBO);
}

/** Nombre con el que se registra el sprite en el mapa. */
export function nombreIcono(colorEstado: string, enMovimiento: boolean, bucket: number): string {
  return `amb3d-${colorEstado.replace('#', '').toUpperCase()}${enMovimiento ? '-MOVING' : ''}-${bucket}`;
}

// ─── Pintado ────────────────────────────────────────────────────────────────

/** Mezcla un color #RRGGBB con un brillo (1 = igual) y un leve tinte frío en las sombras. */
function sombrear(hex: string, brillo: number): string {
  const n = parseInt(hex.slice(1), 16);
  const canal = (desplazamiento: number, frio: number): number => {
    const base = (n >> desplazamiento) & 255;
    const oscuridad = Math.max(0, 1 - brillo);
    // En la sombra se acerca un poco al azul: se ve más natural que un gris plano.
    return Math.max(0, Math.min(255, Math.round(base * Math.min(brillo, 1.12) + frio * oscuridad * 40)));
  };
  return `rgb(${canal(16, -0.4)},${canal(8, -0.1)},${canal(0, 1)})`;
}

function trazarPoligono(ctx: CanvasRenderingContext2D, puntos: ReadonlyArray<readonly [number, number]>): void {
  ctx.beginPath();
  puntos.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/** Sombra proyectada en el suelo: la huella del cuerpo, corrida hacia el sureste y difusa. */
function pintarSombra(ctx: CanvasRenderingContext2D, rumbo: number, densidad: number): void {
  const huella: Vec[] = [
    [-MEDIO_ANCHO - 0.1, -2.7, 0],
    [MEDIO_ANCHO + 0.1, -2.7, 0],
    [MEDIO_ANCHO + 0.1, 2.9, 0],
    [-MEDIO_ANCHO - 0.1, 2.9, 0],
  ];
  ctx.save();
  ctx.shadowColor = 'rgba(8,15,30,0.55)';
  ctx.shadowBlur = 4 * densidad;
  ctx.fillStyle = 'rgba(8,15,30,0.38)';
  // Tres pasos entre la huella y su desplazamiento dan una sombra alargada, no un simple duplicado.
  for (const t of [0.35, 0.7, 1]) {
    const desplazada = huella.map((p) => aMundo(p, rumbo)).map((p): Vec => [p[0] + 1.1 * t, p[1] - 0.8 * t, 0]);
    trazarPoligono(ctx, desplazada.map(proyectar));
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Dibuja la ambulancia mirando hacia `rumbo` en un contexto de `LADO_SPRITE × densidad` píxeles.
 * Cada rumbo es una imagen distinta: no se rota, se vuelve a dibujar el modelo.
 */
export function dibujarAmbulancia(ctx: CanvasRenderingContext2D, densidad: number, rumbo: number, opciones: OpcionesAmbulancia): void {
  ctx.setTransform(densidad, 0, 0, densidad, 0, 0);
  ctx.clearRect(0, 0, LADO_SPRITE, LADO_SPRITE);
  ctx.lineJoin = 'round';

  pintarSombra(ctx, rumbo, densidad);

  // Se descartan las caras que dan la espalda a la cámara y se ordenan de lejos a cerca.
  const visibles = construirModelo(opciones)
    .map((cara) => {
      const normal = aMundo(cara.normal, rumbo);
      const puntos = cara.puntos.map((p) => aMundo(p, rumbo));
      const centro: Vec = [
        puntos.reduce((s, p) => s + p[0], 0) / puntos.length,
        puntos.reduce((s, p) => s + p[1], 0) / puntos.length,
        puntos.reduce((s, p) => s + p[2], 0) / puntos.length,
      ];
      return { cara, normal, puntos, orden: profundidad(centro) + (cara.sesgo ?? 0) - (cara.decal ? 0.25 : 0) };
    })
    .filter(({ normal }) => punto(normal, HACIA_CAMARA) > 1e-6)
    .sort((a, b) => b.orden - a.orden);

  for (const { cara, normal, puntos } of visibles) {
    // Sombreado: base ambiente más la parte difusa que recibe de la luz.
    const difusa = Math.max(0, punto(normal, LUZ));
    const brillo = (0.5 + 0.62 * difusa) * (cara.brillo ?? 1);
    trazarPoligono(ctx, puntos.map(proyectar));
    ctx.fillStyle = sombrear(cara.color, brillo);
    ctx.fill();
    // Contorno fino: da definición a tamaño chico, donde las caras claras se funden entre sí.
    ctx.lineWidth = cara.decal ? 0.25 : 0.55;
    ctx.strokeStyle = cara.decal ? 'rgba(15,23,42,0.22)' : 'rgba(15,23,42,0.4)';
    ctx.stroke();
  }

  // Resplandor de las luces en movimiento, en el espacio de pantalla, sobre el techo de la cabina.
  if (opciones.enMovimiento) {
    const [cx, cy] = proyectar(aMundo([0, 1.16, 2.22], rumbo));
    for (const [dx, color] of [[-0.5, 'rgba(239,68,68,0.5)'], [0.5, 'rgba(59,130,246,0.5)']] as const) {
      const g = ctx.createRadialGradient(cx + dx * 6, cy, 0, cx + dx * 6, cy, 11);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx + dx * 6 - 11, cy - 11, 22, 22);
    }
  }
}

/** Insignia "estacionada" (la P): va sin rotar, en su propia capa, para que siempre se lea derecha. */
export function dibujarInsigniaEstacionada(ctx: CanvasRenderingContext2D, densidad: number): void {
  ctx.setTransform(densidad, 0, 0, densidad, 0, 0);
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
