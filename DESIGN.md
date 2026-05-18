# Emergex — Sistema de Diseño

> **Cuando cada minuto cuenta.**

Plataforma SaaS de gestión de emergencias médicas de alta complejidad. La interfaz debe sentirse **Premium**, **Grado Militar** y **Tecnológicamente Avanzada** — pensada para operadores que toman decisiones bajo presión, donde la legibilidad y la jerarquía visual son críticas.

Este documento es el ADN completo del producto: tokens, componentes, layouts, y especificación de cada una de las pantallas y modales construidos.

---

## 1. Principios

1. **Claridad bajo presión.** Cada elemento responde a "¿qué necesito saber AHORA?".
2. **Densidad informada.** Mucha data organizada en zonas claras. Sin ornamento decorativo.
3. **Estados inequívocos.** Color + forma + animación refuerzan el mismo mensaje (no solo color).
4. **Telemetría como ritual.** Los números son protagonistas; tipografía monoespaciada los eleva.
5. **Calma cromática, alerta selectiva.** El fondo neutro permite que las prioridades resalten.
6. **Dos temperaturas.** Modo noche (default, sala de control 24/7) y modo día (luz ambiente, supervisión).

---

## 2. Color

### 2.1 Modo Noche (default)

| Token | Valor | Uso |
|---|---|---|
| `--bg-deep` | `#020617` | Background global |
| `--bg-elevated` | `#0B1220` | Áreas de mapa, paneles base |
| `--bg-map` | `#06101F` | Lienzo del mapa |
| `--surface-glass` | `rgba(30, 41, 59, 0.7)` | GlassCard (backdrop-blur 12px) |
| `--surface-glass-strong` | `rgba(30, 41, 59, 0.92)` | Modales, popovers |
| `--border-glass` | `rgba(255, 255, 255, 0.08)` | Borde sutil de cards |
| `--border-strong` | `rgba(255, 255, 255, 0.14)` | Hover / focus |
| `--border-hairline` | `rgba(255, 255, 255, 0.05)` | Divisores internos |

### 2.2 Modo Día

| Token | Valor | Uso |
|---|---|---|
| `--bg-deep` | `#EEF2F7` | Background global, gris-azulado frío |
| `--bg-elevated` | `#FFFFFF` | Cards y superficies elevadas |
| `--bg-map` | `#DCE5F2` | Lienzo del mapa |
| `--surface-glass` | `#FFFFFF` (96% / sólido) | GlassCard — sin blur, con sombra |
| `--border-glass` | `rgba(15, 23, 42, 0.10)` | Borde de cards |
| `--border-strong` | `rgba(15, 23, 42, 0.20)` | Hover / focus |
| Sombra de card | `0 1px 2px rgba(15,23,42,0.04), 0 4px 14px rgba(15,23,42,0.05)` | Reemplaza el blur en day mode |

**Decisión clave:** en modo día el glassmorphism se desactiva (`backdrop-filter: none`) y se reemplaza por superficies blancas sólidas con sombra suave. Sobre fondo casi-blanco el blur no aporta contraste y degrada la legibilidad.

### 2.3 Texto

| Token | Noche | Día |
|---|---|---|
| `--text-primary`   | `#F1F5F9` | `#0F172A` |
| `--text-secondary` | `#94A3B8` | `#475569` |
| `--text-muted`     | `#64748B` | `#64748B` |
| `--text-dim`       | `#475569` | `#94A3B8` |

### 2.4 Acentos semánticos (invariantes entre temas)

| Token | Valor | Significado |
|---|---|---|
| `--accent-red`     | `#EF4444` | Código Rojo · emergencia crítica · alerta |
| `--accent-amber`   | `#F59E0B` | Código Amarillo · urgencia · advertencia |
| `--accent-emerald` | `#10B981` | Código Verde · disponible · estable |
| `--accent-blue`    | `#3B82F6` | Información técnica · navegación activa |
| `--accent-cyan`    | `#22D3EE` | Telemetría · datos en tiempo real |

Cada acento tiene su versión "dim" (≈14–16% alpha) para fondos de chips y badges. En modo día los dim son ligeramente más opacos para mantener contraste.

### 2.5 Glow halos

Para estados pulsantes y elementos críticos:
- `--glow-red: 0 0 24px rgba(239, 68, 68, 0.55)` (noche) / `0 0 18px rgba(239, 68, 68, 0.32)` (día)
- `--glow-emerald: 0 0 18px rgba(16, 185, 129, 0.45)` (noche) / `0 0 14px rgba(16, 185, 129, 0.28)` (día)
- `--glow-blue: 0 0 18px rgba(59, 130, 246, 0.45)` (noche) / `0 0 14px rgba(59, 130, 246, 0.28)` (día)

---

## 3. Tipografía

| Rol | Familia | Pesos | Notas |
|---|---|---|---|
| Headers & UI | **Inter** | 400 / 500 / 600 / 700 | tracking -0.01em en titulares |
| Data & métricas | **IBM Plex Mono** | 400 / 500 / 600 | `tabular-nums`, uppercase en labels |
| Eyebrows / labels | IBM Plex Mono | 500 | uppercase, tracking 0.14em, 11px |

### Escala
- Display (KPI grandes): 56px / 600 / mono
- KPI medio: 38px / 500 / mono
- H1 pantalla: 18–20px / 600 / Inter
- H2 panel: 14px / 600 / Inter
- Body: 13–14px / 400 / Inter
- Caption: 12px / 500 / Inter
- Mono-tag: 10–11px / 500 / mono uppercase

`font-feature-settings: "ss01", "cv11"` activo para que Inter tenga formas alternas más industriales.

---

## 4. Forma y espaciado

- **Radii**: contenedores principales `16px`, sub-paneles `12px`, botones y chips `8px`, tags `4–6px`, pills `999px`.
- **Spacing base**: grilla de 4px. Padding de GlassCard: `16–24px` según densidad.
- **Bordes**: 1px hairline. Nunca bordes pesados.
- **Sombras**: glow halos en acentos (modo noche), sombra blanda en cards (modo día). No sombras grises tipo Material.
- **Densidad**: tweak `comfortable` (default) / `dense`. En modo denso el padding y los KPI grandes se reducen ~20%.

---

## 5. Sistema de componentes

### 5.1 `GlassCard`
Contenedor base. Noche: `var(--surface-glass)` + `backdrop-filter: blur(12px) saturate(140%)`. Día: blanco sólido + sombra. Radius 16px, borde hairline.

### 5.2 `StatusBadge`
Pill con dot animado. Variantes: `critical` (rojo pulso), `urgent` (amber), `stable` (emerald), `info` (blue), `cyan` (telemetría). El `pulse` es un keyframe que escala un halo `currentColor` de 0.6 → 2.2 con opacidad inversa, ciclo 1.6s.

### 5.3 `ActionIcon`
Botón cuadrado 32×32, radius 8. Glass background, borde hairline. Hover: borde acento según `variant` (`danger`, `info`, `success`).

### 5.4 Botones
| Variante | Uso |
|---|---|
| `.btn` | Default neutro |
| `.btn--primary` | Acento azul, sombra de halo blue |
| `.btn--danger` | Acento rojo, sombra de halo red — emergencias |
| `.btn--ghost` | Transparente, borde hairline |
| `.btn--sm` | Altura 26px en lugar de 32px |

### 5.5 `EmergencyListItem`
Card horizontal compacta:
- Banda vertical izquierda de 3px en color de prioridad (con glow si rojo)
- StatusBadge con ID de emergencia (E-2387)
- Eyebrow con código de triaje
- Tiempo transcurrido en mono — color cambia a amber/rojo según ratio
- Tipo de emergencia y dirección con ícono pin
- Barra SLA: gradiente continuo verde → amber → rojo según ratio elapsed/SLA
- Meta footer: paciente, unidad asignada, y acciones (Asignar / Seguir / Llamar)

### 5.6 `Donut`
SVG circular, configurable size + stroke. Cifra central en mono, label "DE N". Slices con `stroke-dasharray` animado.

### 5.7 `Sparkline`
SVG inline, stroke 1.5px en acento, área con gradient sutil bottom-fade. Punto final con halo.

### 5.8 `Bars` (histograma)
Barras verticales con altura proporcional. Las que cruzan el 85% del máximo se marcan en rojo (`bar--peak`).

### 5.9 Tabla de datos (`.data-table`)
Header sticky con bg opaco, fila activa con shadow inset y borde acento. Hover con tint sutil. Cells de mini-bar inline para batería/combustible/ocupación.

### 5.10 Avatar
Círculo con gradient slate-900 → blue-800. Tamaños `--sm` (28px) y `--lg` (52px). Texto mono de iniciales.

### 5.11 Cert chip
Pill cyan con texto mono uppercase 9.5px. Para certificaciones (ACLS, PALS, BLS, ATLS, NRP, EMD). En modo día se usa cyan oscuro `#0E7490` para mantener contraste.

### 5.12 KBD
Tag de tecla en footer de modales. Mono 10px, fondo deep, borde sutil.

---

## 6. Pantallas

### 6.1 Centro de Operaciones (Ops)
Layout maestro 3-zonas:

```
┌──┬─────────────────────────────────────────────────────┐
│N │  HEADER  ·  clock  ·  tenant  ·  KPIs  ·  CTA       │
│av├────────────────────────┬────────────────────────────┤
│  │   MAPA OPERACIONAL    │   FEED DE EMERGENCIAS      │
│  │   (60% ancho)         │   ─────────────            │
│  │                       │   E-2387 · CRÍTICO         │
│  │                       │   E-2389 · URGENTE         │
│  ├───────────────────────┴────────────────────────────┤
│  │  TELEMETRÍA · Unidades · Tiempo Resp · Carga · ⚠  │
└──┴─────────────────────────────────────────────────────┘
```

**Header global:** título del centro, switch multi-tenant con icono colorido, reloj de precisión cyan (HH:mm:ss) con glow, fecha mono UTC-6, KPIs inline (Activas / Críticas / Disp.), `StatusBadge` "Sistema OK" pulsante, **CTA roja "Nueva emergencia"** con atajo `N`, notificaciones con dot, chip de usuario.

**Mapa:** SVG estilizado con distritos de colores sutiles, río, parque, autopista azul punteada, calles secundarias en grilla, compass rose. Filtros chip (Rojo/Amarillo/Verde/Unidades). Overlays: leyenda (BL), readout LAT/LNG en cyan (TR), scale bar (BR). Detail shelf que aparece al seleccionar una unidad. Trayectorias dashed azules de unidades en ruta hacia su emergencia. Cursor → coordenadas en vivo.

**Feed:** tabs (Activas / Sin asignar / Críticas), buscador, `EmergencyListItem` ordenados por prioridad y tiempo descendente. Live badge emerald pulsante.

**Telemetría (fila inferior):** 4 KPI cards:
1. **Unidades disponibles** — Donut con 5 slices (Disponible / En ruta / En sitio / Traslado / Mant.) + leyenda
2. **Tiempo promedio respuesta** — KPI mono grande + Sparkline cyan + footer SLA/P95
3. **Carga del sistema** — porcentaje + Bars de 18 ventanas con peaks rojos
4. **Activas críticas** — número rojo grande con glow + sub-tiles Urgentes/Verdes + "sin asignar"

### 6.2 Mapa (full screen)
El mismo `MapArea` pero ocupando todo el grid (`grid-column: 1 / -1`). Útil para supervisión de campo o despachadores con segunda pantalla.

### 6.3 Gestión de Flota
Grid 3 columnas: resumen / tabla / detalle.

**Resumen (320px):** donut grande de distribución, salud operativa (batería/combustible/kit/inspección) con barras horizontales.

**Tabla central:** tabs por estado (Todas, Disponibles, En ruta, En sitio, Traslado, Mantenimiento). Filas con ID, tripulación, tipo (ALS/BLS), `StatusBadge` con pulso si está activa, objetivo/ETA, mini-bars de batería y combustible, ActionIcons (Configurar = cog, Localizar, Llamar).

**Detalle (320px):** avatar grande emerald, ID + StatusBadge, grid 2×3 (Sede, Turno, Km hoy, Servicios, Próx. mant., Última conex.), inventario crítico con barras (Oxígeno, Adrenalina, Tubos, DEA, Suero, Morfina) — rojo si < 30%. Botones Despachar / Configurar / Llamar.

**Header CTA:** "Nueva unidad" → modal.

### 6.4 Personal Operativo
Grid 2 columnas: lista / detalle.

Tabs por rol (Todos, Médicos, Paramédicos, Enfermería, Despacho) + buscador. Tabla con avatar mono, nombre, ID, rol, unidad asignada, `StatusBadge` de estado actual, certificaciones como chips, experiencia.

**Detalle (360px):** avatar grande, status badge, grid 2×3 (Unidad, Turno, Servicios hoy/mes, Horas semana, Rendimiento %), tarjetas de certificaciones VIGENTES con año, sparkline de carga semanal.

### 6.5 Red Hospitalaria
Grid auto-fill de cards mínimo 360px. Cada card de hospital:
- Icono azul + nombre + nivel + distancia
- Tag "DESVÍO ACTIVO" rojo pulsante si aplica
- `StatusBadge` (Disponible / Limitado / Saturado)
- 3 métricas con mini-bar: Camas libres, Urgencias ocupación %, Espera estimada (color escalado)
- Chips de especialidades
- Botones Pre-aviso / Derivar (deshabilitado si desvío activo)

### 6.6 Comunicaciones
Grid 2 columnas: canales / log.

**Canales (360px):** lista de 5 canales con dot live, nombre, frecuencia mono, contador de operadores, **mini-traffic bars** de 12 segmentos en cyan. Canal activo con borde y shadow inset cyan. Bloque **PTT** abajo: botón rojo grande con ring dashed interno, glow rojo, label "HABLAR" mono.

**Log operacional:** filas con timestamp mono, tag tipificado (DESPACHO/ESTADO/PRE-AVISO/RUTA/ACUSE/ALERTA/SOLICITUD — cada uno con color), from → to mono, mensaje. Borde izquierdo en color para alertas y solicitudes.

### 6.7 Analítica Operativa
Grid 3 columnas con cards de altura variable. Header con KPIs (Servicios, Tiempo medio, SLA, Críticos) y tabs 7/30/90 días.

- **Tiempo de respuesta** (wide): KPI grande + sparkline cyan + delta vs. mes anterior
- **Cumplimiento SLA**: KPI + sparkline emerald
- **Volumen por hora** (wide): barras 0–23h con pico marcado en rojo
- **Distribución por prioridad**: donut R/A/V + leyenda con %
- **Top tipos** (wide): tabla con mini-bars
- **Top unidades**: ranking 1–5 con servicios totales

---

## 7. Modales

### 7.1 `NewEmergencyModal` (Alta Rápida)
Atajo `N`. Header con eyebrow rojo "● ALTA RÁPIDA". Form:
- **Tipo** (input libre + 10 chips de tipos comunes para tap)
- **Prioridad** — 3 botones grandes (Rojo / Amarillo / Verde) con dot luminoso
- **Dirección + Sector** (select)
- **Paciente + Notas**

Footer con hint `Esc`/`⏎` y CTA roja "Registrar y despachar".

### 7.2 `NewUnitModal` (Alta de unidad)
Header con eyebrow emerald "● ALTA DE UNIDAD". Form:
- **Identificador** (uppercase, ej. U-42)
- **Tipo** — botones grandes ALS (emerald) / BLS (azul) con sub-label
- **Sede / Base** (select), **Placas**, **Año modelo**
- **Tripulación inicial**
- **Banner informativo emerald**: la unidad entra en estado *Mantenimiento* hasta validar GPS/radio/inventario

CTA emerald "Dar de alta unidad".

### 7.3 `UnitScheduleModal` (Configurar unidad)
Modal ancho (900px) con avatar, ID, StatusBadge, y **3 tabs**:

**Tripulación**
- Tarjetas 2-col con avatar grande, nombre, rol, selector de rol-en-unidad (Líder/Soporte/Enfermería/Conductor), chips de certificaciones, botón remove rojo.
- Botón "Agregar miembro" abre picker con personal disponible del pool real, mostrando avatar/nombre/rol/cert.

**Turnos**
- Cards verticales con borde de color según preset (Matutino azul / Nocturno cyan / Partido emerald).
- Selector de preset (que cambia color), días L–D como segmented buttons (toggle por día), selector de líder de turno desde el crew asignado.
- Botón "Nuevo turno".

**Calendario**
- Vista mensual 7×n, navegación ‹ › entre meses.
- Cada celda pintada según los turnos asignados a ese día de la semana:
  - 1 turno → fondo tinted en su color + tag mono (MAT/NOC/PAR)
  - 2+ turnos → fondo cyan + tag "2T"
  - sin turnos → tag "OFF" gris
- Día actual con outline azul.
- Leyenda al pie con todos los presets activos.

Footer con CTA azul "Guardar configuración".

---

## 8. Sidebar

Ultra-slim 64px. Layout vertical:
1. Logo Emergex rojo con cruz médica (gradient red, glow halo, ring sutil)
2. Stack de nav items (Operaciones, Mapa, Flota, Personal, Hospitales)
3. Divider hairline
4. Comunicaciones, Analítica
5. Push hacia abajo:
6. **Toggle de tema** (sol/luna) — ámbar con borde tinted, alterna data-theme
7. Engrane de configuración

Cada nav-item: 40×40, radius 10, ícono. Activo: bg `accent-blue-dim`, borde tinted, color azul, **glow blue**, y una pestañita vertical de 3px azul que sobresale a la izquierda. Badge dot rojo pulsante en items con notificaciones (ej. Flota).

---

## 9. Tweaks (panel de personalización)

Panel flotante con 4 secciones:

1. **Apariencia** — radio Tema (Oscuro/Día), swatches de acento primario (azul/cyan/emerald/violeta)
2. **Densidad** — radio Confortable/Compacta
3. **Tenant** — select Empresa/Sede (3 opciones mock)
4. **Mapa** — toggle trayectorias

El tema también se cambia desde el sidebar; ambos controles están sincronizados via `setTweak`.

---

## 10. Animaciones

| Animación | Duración | Easing | Trigger |
|---|---|---|---|
| Pulse dot (crítico) | 1.6s | ease-out, infinito | StatusBadge `--pulse` |
| Pulse ring (marcador mapa) | 1.6s | ease-out, infinito | Emergencia activa |
| Slide-in (entry) | 300ms | ease | Item nuevo en feed |
| Modal pop | 220ms | cubic-bezier(.2,.9,.3,1.2) | Apertura de modal |
| Modal fade overlay | 160ms | ease | Apertura de modal |
| Pulse bg (DESVÍO ACTIVO) | 1.6s | ease-in-out, infinito | Tag de hospital |
| SLA bar | 1s | linear (width), 0.3s color | Tick del segundero |
| Drift de ambulancia | 2s | tick | Unidades en ruta |
| Sparkline mount | 600ms | stroke-dashoffset | Aparición |
| Hover lift | 150ms | ease | Cards, botones |

---

## 11. Idioma y tono

- **Español operativo**, conciso, neutro de región.
- **Verbos directos**: Asignar, Despachar, Localizar, Llamar, Derivar, Pre-aviso, Registrar, Configurar, Guardar.
- **Códigos cortos**: E-2387, U-12, S-04, H-03, P-014, CH-04.
- **Sin emojis**. Sin signos de admiración. Sin exclamación.
- **Mayúsculas solo en labels mono**.
- **Tildes correctas** siempre (asignación, asistencia, médico, paramédico, configuración).

---

## 12. Reglas de oro

1. **Nunca colores fuera de la paleta.** Todo acento debe mapear a uno de los 5 semánticos.
2. **Nunca un dato sin contexto.** Toda métrica numérica lleva eyebrow mono uppercase con su unidad o significado.
3. **Nunca un estado sin redundancia.** Color + texto + forma. Daltonismo y monitores baratos son la regla.
4. **Nunca un modal sin atajo de teclado** (`Esc` mínimo, `⏎` para confirmar cuando aplica).
5. **Nunca un botón destructivo sin etiqueta** completa (no solo ícono).
6. **Nunca animaciones en datos críticos** que distraigan; el pulso es para llamar atención, no decorar.
7. **Mono para datos, sans para narrativa.** Mezclar las dos voluntariamente, nunca por accidente.
