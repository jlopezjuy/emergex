/**
 * Renderizado 3D real (three.js) de la ambulancia para el mapa de operaciones.
 *
 * Reemplaza al dibujo por polígonos de `ambulance-icon.ts`, que a tamaño chico se lee como clip-art:
 * acá el cuerpo es un perfil extruido con bordes redondeados, iluminado con una luz de estudio y
 * con reflejos en la chapa y el vidrio, y proyecta su propia sombra sobre el suelo.
 *
 * El mapa no rota la imagen (una vista en perspectiva girada se rompe): se vuelve a renderizar el
 * modelo para cada rumbo y se guarda el resultado como sprite. Este archivo importa `three`, así
 * que el componente lo carga con `import()` dinámico y la librería queda en un chunk aparte que
 * sólo se descarga al abrir un mapa.
 *
 * Convenciones del mundo de three: +X es el este, +Y es arriba y −Z es el norte. La ambulancia mira
 * hacia −Z con rumbo 0 y se gira sobre Y. La cámara es ortogonal, está al sur y elevada.
 */

import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  HemisphereLight,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  OrthographicCamera,
  PCFSoftShadowMap,
  PMREMGenerator,
  PlaneGeometry,
  Quaternion,
  Scene,
  Shape,
  ShapeGeometry,
  ShadowMaterial,
  SRGBColorSpace,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

/** Lado, en píxeles lógicos, del sprite; debe coincidir con `LADO_SPRITE` del dibujo de respaldo. */
const LADO = 72;
/** Píxeles por unidad del modelo (la ambulancia mide ~5.6 de largo). */
const ESCALA = 9.5;
/** Altura, en píxeles lógicos desde arriba, a la que queda el suelo bajo el centro del vehículo. */
const SUELO_Y = 47;
/** Elevación de la cámara sobre el horizonte, en grados. */
const ELEVACION = 38;

export interface OpcionesRender3D {
  colorEstado: string;
  enMovimiento: boolean;
  /** Rumbo en grados desde el norte, en sentido horario. */
  rumbo: number;
  /** Píxeles reales por píxel lógico (la densidad de pantalla). */
  densidad: number;
}

// ─── Carrocería ─────────────────────────────────────────────────────────────

/** Perfil lateral (adelante, arriba) desde atrás-abajo: caja alta, escalón, parabrisas, capot. */
const PERFIL: ReadonlyArray<readonly [number, number]> = [
  [-2.6, 0.38],
  [-2.6, 2.2],
  [-2.45, 2.4],
  [0.85, 2.4],
  [0.85, 2.0],
  [1.45, 2.0],
  [2.05, 1.4],
  [2.65, 1.2],
  [2.8, 1.0],
  [2.8, 0.5],
  [2.6, 0.38],
];

const MEDIO_ANCHO = 1.0;
const BISEL = 0.13;

/**
 * Arma una forma cerrada a partir de un polígono redondeando cada esquina con una curva.
 * El radio se limita a la mitad del tramo más corto para que las curvas no se pisen.
 */
function formaRedondeada(puntos: ReadonlyArray<readonly [number, number]>, radio: number): Shape {
  const n = puntos.length;
  const shape = new Shape();
  for (let i = 0; i < n; i++) {
    const [px, py] = puntos[(i + n - 1) % n];
    const [cx, cy] = puntos[i];
    const [nx, ny] = puntos[(i + 1) % n];
    const dPrev = Math.hypot(cx - px, cy - py);
    const dNext = Math.hypot(nx - cx, ny - cy);
    const r = Math.min(radio, dPrev / 2, dNext / 2);
    const desde: [number, number] = [cx + ((px - cx) / dPrev) * r, cy + ((py - cy) / dPrev) * r];
    const hasta: [number, number] = [cx + ((nx - cx) / dNext) * r, cy + ((ny - cy) / dNext) * r];
    if (i === 0) shape.moveTo(desde[0], desde[1]);
    else shape.lineTo(desde[0], desde[1]);
    shape.quadraticCurveTo(cx, cy, hasta[0], hasta[1]);
  }
  shape.closePath();
  return shape;
}

/** Pone una geometría en el espacio del modelo: perfil (adelante, arriba) → adelante = −Z, ancho = X. */
function alMundo(geometria: { rotateY(a: number): unknown; translate(x: number, y: number, z: number): unknown }, anchoCentrado: number): void {
  geometria.translate(0, 0, -anchoCentrado);
  geometria.rotateY(Math.PI / 2);
}

// ─── Materiales ─────────────────────────────────────────────────────────────

function materiales(colorEstado: string, enMovimiento: boolean) {
  const brilloLuz = enMovimiento ? 2.4 : 0.35;
  return {
    chapa: new MeshPhysicalMaterial({ color: 0xf1f4f8, roughness: 0.3, metalness: 0.02, clearcoat: 0.85, clearcoatRoughness: 0.22 }),
    vidrio: new MeshPhysicalMaterial({ color: 0x16273d, roughness: 0.06, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04 }),
    plastico: new MeshStandardMaterial({ color: 0x1c2331, roughness: 0.55, metalness: 0.1 }),
    neumatico: new MeshStandardMaterial({ color: 0x0e1219, roughness: 0.92 }),
    llanta: new MeshStandardMaterial({ color: 0xcfd6e0, roughness: 0.25, metalness: 0.9 }),
    // El mapeo de tonos de la luz lava los colores; el leve brillo propio mantiene el color del estado
    // saturado, que es lo que el operador tiene que reconocer de un vistazo.
    estado: new MeshStandardMaterial({ color: new Color(colorEstado), emissive: new Color(colorEstado), emissiveIntensity: 0.45, roughness: 0.4, metalness: 0.05 }),
    luzRoja: new MeshStandardMaterial({ color: 0x5b0f12, emissive: 0xff2a2a, emissiveIntensity: brilloLuz, roughness: 0.3 }),
    luzAzul: new MeshStandardMaterial({ color: 0x0f2352, emissive: 0x2f6bff, emissiveIntensity: brilloLuz, roughness: 0.3 }),
    faro: new MeshStandardMaterial({ color: 0xfff4cf, emissive: 0xfff0b8, emissiveIntensity: 1.2, roughness: 0.2 }),
    trasera: new MeshStandardMaterial({ color: 0x7a1010, emissive: 0xff3030, emissiveIntensity: 0.9, roughness: 0.3 }),
    sombraArco: new MeshBasicMaterial({ color: 0x05080f, side: DoubleSide }),
    vidrioDecal: new MeshPhysicalMaterial({ color: 0x16273d, roughness: 0.06, metalness: 0.15, clearcoat: 1, side: DoubleSide }),
  };
}

/** Estrella de la Vida: seis brazos azules con borde blanco, sobre transparente. */
function texturaEstrella(): CanvasTexture {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 256;
  const ctx = lienzo.getContext('2d')!;
  ctx.translate(128, 128);
  const brazo = (grados: number, color: string, ancho: number, largo: number): void => {
    ctx.save();
    ctx.rotate((grados * Math.PI) / 180);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-ancho / 2, -largo / 2, ancho, largo, ancho * 0.28);
    ctx.fill();
    ctx.restore();
  };
  for (const g of [0, 60, 120]) brazo(g, '#FFFFFF', 54, 236);
  for (const g of [0, 60, 120]) brazo(g, '#1D4ED8', 36, 224);
  const textura = new CanvasTexture(lienzo);
  textura.colorSpace = SRGBColorSpace;
  return textura;
}

/** Resplandor suave para las luces encendidas. */
function texturaResplandor(r: number, g: number, b: number): CanvasTexture {
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 128;
  const ctx = lienzo.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${r},${g},${b},0.95)`);
  grad.addColorStop(0.35, `rgba(${r},${g},${b},0.4)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const textura = new CanvasTexture(lienzo);
  textura.colorSpace = SRGBColorSpace;
  return textura;
}

// ─── Modelo ─────────────────────────────────────────────────────────────────

/** Construye la ambulancia entera. El modelo mira hacia −Z. */
function construirAmbulancia(colorEstado: string, enMovimiento: boolean): Group {
  const m = materiales(colorEstado, enMovimiento);
  const modelo = new Group();
  const agregar = (geometria: ConstructorParameters<typeof Mesh>[0], material: Material, x: number, y: number, z: number, sombra = true): Mesh => {
    const malla = new Mesh(geometria, material);
    malla.position.set(x, y, z);
    malla.castShadow = sombra;
    malla.receiveShadow = true;
    modelo.add(malla);
    return malla;
  };

  // Cuerpo: el perfil redondeado, extruido a lo ancho con bisel.
  const profundidad = 2 * MEDIO_ANCHO - 2 * BISEL;
  const cuerpo = new ExtrudeGeometry(formaRedondeada(PERFIL, 0.32), {
    depth: profundidad,
    bevelEnabled: true,
    bevelThickness: BISEL,
    bevelSize: 0.1,
    bevelSegments: 5,
    curveSegments: 10,
  });
  alMundo(cuerpo, profundidad / 2);
  agregar(cuerpo, m.chapa, 0, 0, 0);

  // Franja del color del estado: rodea la caja, así se ve de costado y por detrás.
  agregar(new BoxGeometry(2 * MEDIO_ANCHO + 0.05, 0.5, 3.35), m.estado, 0, 1.05, 0.88);
  // Filete oscuro debajo de la franja.
  agregar(new BoxGeometry(2 * MEDIO_ANCHO + 0.04, 0.07, 3.35), m.plastico, 0, 0.77, 0.88, false);
  // Franja a lo largo del techo: es lo que se ve desde cualquier rumbo.
  agregar(new BoxGeometry(1.1, 0.03, 3.0), m.estado, 0, 2.515, 0.8, false);

  // Parabrisas: un plano oscuro pegado a la parte inclinada.
  const orientar = (malla: Mesh, normal: Vector3): void => {
    malla.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), normal.clone().normalize()));
  };
  const parabrisas = agregar(new PlaneGeometry(1.7, 0.88), m.vidrio, 0, 1.76, -1.77, false);
  orientar(parabrisas, new Vector3(0, 0.72, -0.69));
  parabrisas.position.add(new Vector3(0, 0.72, -0.69).normalize().multiplyScalar(0.115));
  // Luneta trasera: dos ventanitas en las puertas.
  for (const x of [-0.42, 0.42]) agregar(new PlaneGeometry(0.66, 0.6), m.vidrioDecal, x, 1.8, 2.725, false);
  // Junta de las puertas traseras.
  agregar(new BoxGeometry(0.03, 1.7, 0.04), m.plastico, 0, 1.25, 2.73, false);

  // Detalles de cada costado.
  const estrella = texturaEstrella();
  for (const lado of [1, -1]) {
    const x = lado * (MEDIO_ANCHO + 0.135);
    // Ventana de la cabina (polígono en el plano lateral).
    const contorno = ([[1.0, 1.5], [1.0, 1.88], [1.4, 1.88], [1.92, 1.42]] as const).map(
      ([u, v]) => [lado === 1 ? u : -u, v] as const,
    );
    const ventana = new Shape();
    contorno.forEach(([u, v], i) => (i === 0 ? ventana.moveTo(u, v) : ventana.lineTo(u, v)));
    ventana.closePath();
    const geometriaVentana = new ShapeGeometry(ventana);
    geometriaVentana.rotateY(lado === 1 ? Math.PI / 2 : -Math.PI / 2);
    agregar(geometriaVentana, m.vidrioDecal, x, 0, 0, false);

    // Estrella de la Vida sobre la caja.
    const plano = new Mesh(
      new PlaneGeometry(1.15, 1.15),
      new MeshStandardMaterial({ map: estrella, transparent: true, roughness: 0.4, side: DoubleSide }),
    );
    plano.position.set(x, 1.82, 1.0);
    plano.rotation.y = lado === 1 ? Math.PI / 2 : -Math.PI / 2;
    modelo.add(plano);

    // Espejo.
    agregar(new BoxGeometry(0.1, 0.34, 0.22), m.plastico, lado * (MEDIO_ANCHO + 0.2), 1.6, -1.3);

    // Ruedas con su pasarruedas oscuro.
    for (const z of [1.55, -1.75]) {
      const arco = new Mesh(new CircleGeometry(0.66, 24), m.sombraArco);
      arco.position.set(lado * (MEDIO_ANCHO + 0.13), 0.55, z);
      arco.rotation.y = lado === 1 ? Math.PI / 2 : -Math.PI / 2;
      modelo.add(arco);
      const neumatico = agregar(new CylinderGeometry(0.52, 0.52, 0.36, 28), m.neumatico, lado * (MEDIO_ANCHO - 0.02), 0.52, z);
      neumatico.rotation.z = Math.PI / 2;
      const llanta = agregar(new CylinderGeometry(0.3, 0.3, 0.38, 20), m.llanta, lado * (MEDIO_ANCHO - 0.0), 0.52, z, false);
      llanta.rotation.z = Math.PI / 2;
      const tapa = agregar(new CylinderGeometry(0.1, 0.1, 0.4, 12), m.plastico, lado * (MEDIO_ANCHO + 0.01), 0.52, z, false);
      tapa.rotation.z = Math.PI / 2;
    }
  }

  // Barra de luces sobre el techo de la cabina (la cabina está hacia −Z).
  agregar(new BoxGeometry(1.7, 0.1, 0.46), m.plastico, 0, 2.05, -1.18);
  agregar(new BoxGeometry(0.8, 0.2, 0.36), m.luzRoja, -0.42, 2.16, -1.18);
  agregar(new BoxGeometry(0.8, 0.2, 0.36), m.luzAzul, 0.42, 2.16, -1.18);

  // Paragolpes, parrilla, faros y luces traseras.
  agregar(new BoxGeometry(2.0, 0.3, 0.24), m.plastico, 0, 0.55, -2.84);
  agregar(new BoxGeometry(0.95, 0.24, 0.05), m.plastico, 0, 0.86, -2.9, false);
  for (const x of [-0.72, 0.72]) agregar(new BoxGeometry(0.36, 0.2, 0.05), m.faro, x, 0.88, -2.9, false);
  agregar(new BoxGeometry(2.0, 0.26, 0.2), m.plastico, 0, 0.55, 2.72);
  for (const x of [-0.8, 0.8]) agregar(new BoxGeometry(0.28, 0.5, 0.05), m.trasera, x, 0.85, 2.74, false);

  // Resplandor de las luces cuando están encendidas.
  if (enMovimiento) {
    for (const [x, r, g, b] of [[-0.42, 255, 60, 60], [0.42, 70, 120, 255]] as const) {
      const brillo = new Sprite(new SpriteMaterial({ map: texturaResplandor(r, g, b), blending: AdditiveBlending, depthWrite: false, transparent: true }));
      brillo.position.set(x, 2.3, -1.18);
      brillo.scale.set(2.6, 2.6, 1);
      modelo.add(brillo);
    }
  }
  return modelo;
}

// ─── Escena y render ────────────────────────────────────────────────────────

interface Escena3D {
  renderer: WebGLRenderer;
  scene: Scene;
  camara: OrthographicCamera;
}

let escena: Escena3D | null = null;

/** Crea (una sola vez) el renderizador, la luz y la cámara. Lanza si no hay WebGL. */
function obtenerEscena(): Escena3D {
  if (escena) return escena;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  // Reflejos de estudio: sin esto la chapa y el vidrio se ven opacos.
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  scene.add(new HemisphereLight(0xdfe9ff, 0x2a3446, 0.55));
  scene.add(new AmbientLight(0xffffff, 0.12));
  // Luz principal desde el noroeste y arriba: la sombra cae hacia el sureste, abajo a la derecha.
  const luz = new DirectionalLight(0xfff6e8, 2.6);
  luz.position.set(-5, 8, -4);
  luz.castShadow = true;
  luz.shadow.mapSize.set(1024, 1024);
  luz.shadow.camera.left = -6;
  luz.shadow.camera.right = 6;
  luz.shadow.camera.top = 6;
  luz.shadow.camera.bottom = -6;
  luz.shadow.camera.near = 1;
  luz.shadow.camera.far = 30;
  luz.shadow.radius = 5;
  luz.shadow.bias = -0.0004;
  scene.add(luz);
  // Relleno frío desde el lado opuesto para que las caras en sombra no queden negras.
  const relleno = new DirectionalLight(0xbfd4ff, 0.55);
  relleno.position.set(5, 3, 5);
  scene.add(relleno);

  const suelo = new Mesh(new PlaneGeometry(30, 30), new ShadowMaterial({ opacity: 0.42, color: 0x050914 }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  scene.add(suelo);

  // Cámara ortogonal al sur y elevada. Se desplaza el objetivo para que el suelo bajo el vehículo
  // caiga en SUELO_Y y no en el centro del sprite.
  const mitad = LADO / ESCALA / 2;
  const camara = new OrthographicCamera(-mitad, mitad, mitad, -mitad, 0.1, 100);
  const el = (ELEVACION * Math.PI) / 180;
  const desplazamiento = (SUELO_Y - LADO / 2) / ESCALA;
  const objetivo = new Vector3(0, desplazamiento * Math.cos(el), -desplazamiento * Math.sin(el));
  camara.position.copy(objetivo).add(new Vector3(0, Math.sin(el), Math.cos(el)).multiplyScalar(30));
  camara.lookAt(objetivo);

  escena = { renderer, scene, camara };
  return escena;
}

function liberar(grupo: Group): void {
  grupo.traverse((obj) => {
    const malla = obj as Mesh;
    malla.geometry?.dispose();
    const material = malla.material as Material | Material[] | undefined;
    for (const mat of Array.isArray(material) ? material : material ? [material] : []) {
      (mat as MeshStandardMaterial).map?.dispose();
      mat.dispose();
    }
  });
}

/**
 * Renderiza la ambulancia para un estado y un rumbo y devuelve el sprite como `ImageData` de
 * `LADO × densidad` píxeles. Lanza si el navegador no puede crear un contexto WebGL.
 */
export function renderizarAmbulancia3D({ colorEstado, enMovimiento, rumbo, densidad }: OpcionesRender3D): ImageData {
  const { renderer, scene, camara } = obtenerEscena();
  const lado = Math.round(LADO * densidad);
  // Se renderiza al doble y se reduce: el antialiasing del contexto solo no alcanza para los bordes
  // finos del techo a este tamaño.
  const sobremuestreo = 2;
  renderer.setPixelRatio(1);
  renderer.setSize(lado * sobremuestreo, lado * sobremuestreo, false);

  const ambulancia = construirAmbulancia(colorEstado, enMovimiento);
  // Un rumbo horario visto desde arriba es un giro negativo sobre Y.
  ambulancia.rotation.y = (-rumbo * Math.PI) / 180;
  scene.add(ambulancia);
  renderer.render(scene, camara);
  scene.remove(ambulancia);
  liberar(ambulancia);

  const copia = document.createElement('canvas');
  copia.width = copia.height = lado;
  const ctx = copia.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(renderer.domElement, 0, 0, lado, lado);
  return ctx.getImageData(0, 0, lado, lado);
}
