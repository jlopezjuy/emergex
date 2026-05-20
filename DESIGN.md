# DESIGN.md

## 1. Propósito del documento

Este documento sirve como la **guía oficial de diseño y referencia visual** para la interfaz de **Emergex**. Su propósito es doble:
1. **Mantener la coherencia visual:** Asegurar que cualquier desarrollador, al crear nuevas pantallas o refactorizar las existentes, utilice exactamente el mismo sistema de tokens, clases globales y convenciones estéticas.
2. **Eliminar la deuda visual:** Identificar inconsistencias actuales en el frontend y establecer un estándar técnico riguroso que evite la duplicación de código CSS o estilos en línea inline.

Cada elemento en pantalla debe sentirse **Premium, Grado Militar y Tecnológicamente Avanzado**, optimizado para operadores de salas de control que toman decisiones críticas bajo extrema presión.

---

## 2. Identidad visual actual

La interfaz de Emergex proyecta una estética moderna de "centro de control" o *war room*:
- **Tono visual:** Industrial, limpio, oscuro por defecto pero funcional en ambientes de alta luz, con un enfoque absoluto en la legibilidad.
- **Nivel de formalidad:** Altamente profesional y técnico. No hay espacio para adornos superfluos; cada píxel debe ganarse su lugar informando o jerarquizando datos.
- **Tipo de interfaz:** Dashboard de densidad informada con mapas interactivos de telemetría en tiempo real y paneles colapsables.
- **Sensación visual:** Calma cromática general (fondos profundos mate y vidrios esmerilados) combinada con **alerta selectiva** muy vibrante (glow halos e indicadores dinámicos en acentos semánticos como rojo y amarillo).

---

## 3. Stack visual detectado

El análisis técnico del repositorio revela las siguientes bases tecnológicas del layout:
- **Framework Frontend:** Angular v21.2.0 (arquitectura standalone, Signals, Control Flow moderno `@if`, `@for`).
- **Sistema de Estilos:** Tailwind CSS ^3.4.19 con el plugin `@tailwindcss/forms` ^0.5.11 para normalización de inputs.
- **Librería de Mapas:** `maplibre-gl` ^5.24.0 (con su CSS importado globalmente al inicio de `styles.css`).
- **Configuración de Temas:** Custom layout dinámico implementado a través del atributo HTML `data-theme` (`[data-theme="light"]` y `[data-theme="dark"]` / por defecto) controlado por un servicio de Angular `ThemeService` inyectado.

---

## 4. Paleta de colores

Los colores se gestionan a través de variables CSS nativas definidas dentro del bloque `@layer base` en `src/styles.css`. A continuación, se detalla el uso y ubicación real en la base de código:

| Uso | Color | Hex/RGB/Clase | Dónde aparece | Recomendación / Normalización |
|---|---|---|---|---|
| **Fondo principal (Noche)** | Profundo | `--bg-deep` (`#020617`) | `styles.css` base, `body` | Estándar absoluto. Evitar redefiniciones locales. |
| **Fondo principal (Día)** | Gris frío | `--bg-deep` (`#EEF2F7`) | `styles.css` (`[data-theme="light"]`) | Usar siempre a través de la variable. |
| **Superficie panel (Noche)**| Azul-grisáceo | `--bg-elevated` (`#0B1220`) | Sidebar, sidebar nav, detail cards | Utilizar para layouts fijos laterales y áreas elevadas. |
| **Superficie panel (Día)** | Blanco puro | `--bg-elevated` (`#FFFFFF`) | Sidebar y layouts en día | Standard. En modo día requiere sombras suaves. |
| **Glass Card (Noche)** | Vidrio sutil | `--surface-glass` (`rgba(30, 41, 59, 0.7)`) | `.glass` class global, components | Combina blur 12px con saturación al 140%. |
| **Glass Card (Día)** | Opaco | `--surface-glass` (`#FFFFFF`) | `.glass` en Light mode | Desactiva el blur para no degradar el contraste. |
| **Borde vidriado sutil** | Hairline | `--border-glass` (`rgba(255, 255, 255, 0.08)`) | Bordes de cards, inputs y divisores | Cambia a `rgba(15, 23, 42, 0.10)` en modo día. |
| **Texto Primario** | Claro / Oscuro | `--text-primary` | `#F1F5F9` (Noche) / `#0F172A` (Día) | Títulos principales, textos base y números destacados. |
| **Texto Secundario** | Muted slate | `--text-secondary` | `#94A3B8` (Noche) / `#475569` (Día) | Textos de apoyo, etiquetas secundarias e inventario. |
| **Acento Rojo (Crítico)** | Rojo alerta | `--accent-red` (`#EF4444`) | Código Rojo, emergencias críticas, botones danger | Usar con moderación para alertas que requieran acción inmediata. |
| **Acento Ámbar (Urgencia)** | Naranja/Amarillo | `--accent-amber` (`#F59E0B`) | Código Amarillo, warnings, batería media | Color de atención preventiva. |
| **Acento Esmeralda (Estable)**| Verde | `--accent-emerald` (`#10B981`) | Código Verde, unidades estables, sistema OK | Indica disponibilidad y estado normal. |
| **Acento Azul (UI)** | Azul vibrante | `--accent-blue` (`#3B82F6`) | Elementos activos de navegación, botones primarios | Define el foco interactivo y la acción principal. |
| **Acento Cyan (Datos)** | Turquesa | `--accent-cyan` (`#22D3EE`) | Telemetría, etiquetas técnicas, ID de unidad | Eleva la sensación tecnológica de la data. |

---

## 5. Tipografía

La tipografía está perfectamente orquestada para contrastar narrativa y telemetría:

| Elemento | Tamaño | Peso | Line-height | Clase/Origen | Uso recomendado |
|---|---|---|---|---|---|
| **Títulos de Pantalla** | `17px` o `18px` | `600` (SemiBold) | `1.2` | `font-sans` | Usar `h1` o `h2` en cabeceras de pantalla (`.screen-head__title`). |
| **Textos Base / Body** | `13px` o `14px` | `400` / `500` | `1.4` | `font-sans` | Párrafos, descripciones e información general. |
| **Labels / Eyebrows** | `10.5px` | `500` (Medium) | `1.1` | `font-mono upper` | `.eyebrow` para nombres de métricas e indicadores de tarjetas. |
| **Data / Identificadores**| `12px` / `13px` | `600` (SemiBold) | `1` | `font-mono` | ID de emergencias (E-2387), ID de unidades, relojes y KPIs. |
| **KPIs Destacados** | `24px` | `600` (SemiBold) | `1` | `font-mono` | Cifras principales en `KpiCardComponent`. |

*Nota técnica:* Se ha configurado globalmente `font-feature-settings: "ss01", "cv11"` sobre la fuente sans-serif (**Inter**) para activar variantes estilísticas más geométricas y legibles. Los datos numéricos siempre utilizan **IBM Plex Mono** con la propiedad de números tabulares (`tabular-nums`) para evitar oscilaciones de ancho en actualizaciones de tiempo real.

---

## 6. Espaciado y layout

El layout de Emergex está basado en un modelo rígido de **cuadrícula y flexbox** que maximiza la pantalla útil (viewport-locked layouts):
- **Layout de Dashboard (`operations.component.ts`):** Un contenedor bloqueado `h-screen flex flex-col overflow-hidden` que se divide en una cuadrícula de dos columnas: `flex-1 grid` con `grid-template-columns: 1fr 340px;` (60% mapa interactivo, 340px feed lateral).
- **Layout de Flota (`fleet.component.ts`):** Cuadrícula responsiva que pasa de columna única a `xl:grid-cols-[280px_minmax(0,1fr)]` para alojar gráficos de estado al lado de las tablas de datos, más un panel lateral fijo de detalle de 320px (`w-[380px] max-w-[92vw] 2xl:w-[320px]`).
- **Márgenes y paddings comunes:**
  - Espacio entre secciones del dashboard / tarjetas: `gap-6` (24px) o `gap-4` (16px).
  - Padding interno de tarjetas vidriadas: `.glass p-4` (16px) o `.rounded-panel p-3` (12px).
  - Padding de modales: `px-6 py-4` (24px horizontal, 16px vertical).
  - Separación entre campos de formulario: `flex flex-col gap-4`.

---

## 7. Bordes, radios y sombras

- **Radios (Border Radius):**
  - Contenedores / Cards grandes: `--r-card: 16px` (clase `.rounded-card`).
  - Paneles intermedios y sub-cards: `--r-panel: 12px` (clase `.rounded-panel`).
  - Botones y inputs: `--r-btn: 8px` (clase `.rounded-btn`).
  - Chips de certificados: `--r-chip: 6px`.
  - Badges de estado y pills: `--r-pill: 999px` (clase `.rounded-pill`).
- **Sombras y halos luminosos (Glows):**
  - En modo oscuro, se utilizan halos de color semántico en lugar de sombras tradicionales para simular luz de pantallas industriales: `box-shadow: var(--glow-emerald)` o `var(--glow-blue)`.
  - En modo día, se anulan los brillos y se aplica una sombra sutil: `box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.05)`.
- **Bordes:** Bordes ultrafinos de 1px (`border`, `border-t`, `border-l`) pintados con `var(--border-glass)` o la línea divisoria sutil `.hr-thin` que utiliza `--border-hairline`.

---

## 8. Componentes UI detectados

### 8.1 Botones
El sistema de botones de Emergex tiene una altura estandarizada de 32px (o 26px para variantes compactas) y se estructura bajo las siguientes clases en `styles.css`:

- **Botón por defecto / secundario (`.btn`):**
  - *Clases:* `btn`
  - *Estilo:* Fondo sutil translúcido `rgba(255, 255, 255, 0.03)`, borde `var(--border-glass)`, color de texto primario.
  - *Uso:* Acciones secundarias, exportación, cancelaciones.
- **Botón Primario (`.btn--primary`):**
  - *Clases:* `btn btn--primary`
  - *Estilo:* Fondo `--accent-blue`, sombra de halo sutil. Hover a `#2563EB` con halo de brillo intensificado.
  - *Uso:* Confirmar formularios, despachar unidades, registrar datos primarios.
- **Botón Danger (`.btn--danger`):**
  - *Clases:* `btn btn--danger`
  - *Estilo:* Fondo `--accent-red`. Hover a `#DC2626` con halo de brillo rojo intenso.
  - *Uso:* Registro de emergencias críticas, cancelaciones destructivas.
- **Botón Ghost (`.btn--ghost`):**
  - *Clases:* `btn btn--ghost`
  - *Estilo:* Fondo transparente, borde de cristal sutil, texto secundario.
  - *Uso:* Botones secundarios integrados en tablas o paneles compactos.
- **Compacto (`.btn--sm`):**
  - *Clases:* `btn--sm`
  - *Estilo:* Reduce la altura a 26px y el padding a `0 10px`.

### 8.2 Cards
La estructura de tarjetas utiliza el componente compartido `GlassCardComponent` (`<emx-glass-card>`):
- **Estructura base:**
  ```html
  <div class="glass rounded-card p-4 h-full">
    <ng-content />
  </div>
  ```
- **Variaciones de Padding:** Se pueden inyectar clases extra a través del input `extraClass` (por ejemplo, `!p-0` para tarjetas que albergan tablas o feeds y que requieren que el contenido toque los bordes).

### 8.3 Formularios
El sistema dispone de controles estandarizados en CSS pero con deuda técnica de implementación inline:
- **Inputs estándar (`.qc-input`):**
  - *Clase:* `qc-input`
  - *Estilo:* Altura 36px, background profundo `rgba(2, 6, 23, 0.5)`, borde vidriado, texto primario. En focus cambia el borde a `--accent-blue` y el fondo a opaco.
  - *Deuda visual:* Hay componentes como `NewUnitModalComponent` que implementan este estilo con clases Tailwind locales (`rounded px-3 py-2 text-sm w-full`) y estilos inline redundantes en lugar de heredar `.qc-input`.
- **Estructura recomendada:**
  ```html
  <div class="flex flex-col gap-1">
    <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
      Nombre del Campo *
    </label>
    <input type="text" class="qc-input" placeholder="Escribí aquí..." />
    @if (invalido) {
      <span class="text-xs" style="color: var(--accent-red);">Campo requerido</span>
    }
  </div>
  ```

### 8.4 Tablas / Listados
Estructura implementada a través de la clase `.data-table` en `styles.css` y reusada en componentes dedicados como `FleetTableComponent`:
- **Cabeceras (`thead th`):**
  - *Estilo:* Padding `8px 10px`, alineación izquierda, fuente mono de 10px uppercase tracking-wider, color `--text-muted`. Fondo opaco profundo para soporte sticky.
- **Filas (`tbody tr`):**
  - *Estilos:* Border-bottom hairline sutil, transición suave de hover `rgba(255,255,255,0.03)`.
  - *Fila Activa:* La fila seleccionada usa `[data-active="true"]` con un fondo azul sutil `rgba(59,130,246,0.08)` e inset shadow izquierdo con borde `--accent-blue`.

### 8.5 Modales / Dialogs
Encapsulado en el componente compartido `ModalShellComponent` (`<emx-modal-shell>`):
- **Visual:** Backdrop con fondo oscuro `rgba(2,6,23,0.75)` y desenfoque suave `backdrop-filter: blur(4px)`.
- **Contenedor:** Utiliza la clase `.glass-strong` y `.rounded-card` con ancho máximo de 560px y mínimo de 320px.
- **Header:** Borde de separación sutil, título en mono uppercase con tracking-wider y botón de cierre en cruz con clase `.action-icon`.
- **Estructura HTML:**
  ```html
  <emx-modal-shell title="Título del Modal" (closed)="onCerrar()">
    <div class="contenido"> ... </div>
    <div footer class="flex gap-2">
      <button class="btn btn--ghost btn--sm">Cancelar</button>
      <button class="btn btn--primary btn--sm">Confirmar</button>
    </div>
  </emx-modal-shell>
  ```

### 8.6 Badges / Chips / Estados
- **Variantes de Estado:** Implementado en `StatusBadgeComponent` (`<emx-status-badge>`) con dot y texto en mono uppercase tracking-widest de 10.5px.
- **Clases semánticas asociadas:**
  - `.badge--critical` (Rojo): Emergencia activa crítica / Unidad en mantenimiento crítico.
  - `.badge--urgent` (Amber): Urgencia / Unidad ocupada en ruta.
  - `.badge--stable` (Emerald): Estable / Unidad disponible para despacho.
  - `.badge--info` (Blue): Soporte técnico / Unidad ALS activa.
  - `.badge--cyan` (Cyan): Telemetría activa / Frecuencia de radio en vivo.

### 8.7 Navegación
- **Menú lateral (Sidebar):** Ancho fijo de 64px, fondo `--bg-elevated`, borde de separación `--border-glass`.
- **Botones de menú (`.nav-icon-btn`):** Cuadrados de 40px con hover vidriado sutil.
- **Estado Activo (`.nav-active`):** En `styles.css` se define con glow azul y borde vidriado, pero en el componente `SidebarComponent` se sobreescribe localmente con un fondo azul translúcido y una sombra interior (`box-shadow: -3px 0 0 var(--accent-blue) inset`) para crear la pestaña de selección izquierda.

### 8.8 Dashboards / KPIs
- **Métricas Operativas:** Implementado en `KpiCardComponent` (`<emx-kpi-card>`).
- **Diseño:** Tarjeta de fondo `.glass` y borde `.rounded-panel`, padding de 12px (`p-3`). Muestra la etiqueta en mono uppercase coloreada según el acento (`--accent-cyan`, `--accent-red`, etc.), la cifra destacada en mono de 24px y un indicador de tendencia sutil (▲ o ▼) pintado con acentos semánticos de éxito o error.

---

## 9. Responsive design

El sistema está optimizado para su despliegue en pantallas de alta resolución en salas de control (1080p y 1440p) pero cuenta con reglas adaptativas fluidas:

| Breakpoint | Medida | Uso detectado | Recomendación |
|---|---|---|---|
| **sm** | `640px` | Ajuste de paddings internos en formularios y KPI Grids. | Usar para transiciones de padding `p-4` a `p-6` en layouts principales. |
| **lg** | `1024px` | Reordenamiento de KPIs en cabeceras de pantallas. | Evitar ocultar telemetría crítica en tablets; preferir scroll horizontal. |
| **xl** | `1280px` | Transición de layouts verticales a horizontales de dos columnas en Fleet y Operations. | Breakpoint principal para la distribución de la mesa de operaciones. |
| **2xl**| `1536px` | Transformación de paneles flotantes superpuestos de detalles de flota a paneles estáticos integrados en la grilla. | Layout maestro óptimo para pantallas de alta resolución. |

---

## 10. Accesibilidad visual

- **Correcto (Buenas prácticas):**
  - Los contrastes de color en modo noche son excelentes debido al fondo negro slate y acentos luminosos.
  - El uso de tipografía monoespaciada para cifras y estados semánticos previene errores de lectura rápida.
  - El sistema no depende únicamente del color para comunicar estados; todos los badges semánticos van acompañados de etiquetas textuales en mayúsculas y animaciones de pulso.
- **Mejorable:**
  - El modo día requiere una rigurosa supervisión del contraste de los textos secundarios (`--text-secondary` a `#475569`) sobre fondos blancos esmerilados.
  - Los estados focus en botones secundarios son meramente de cambio de borde a `--border-strong`, lo cual puede ser imperceptible para navegación por teclado pura.
- **Crítico / Deuda urgente:**
  - Ausencia de tags de accesibilidad `aria-` en botones de iconos puros (`.action-icon` y botones compactos de tablas).
  - Los contrastes de los indicadores de barras de progreso (combustible, batería) que se pintan dinámicamente con colores hexadecimales crudos en lugar de variables del tema.

---

## 11. Inconsistencias detectadas

Durante la auditoría visual se encontraron las siguientes divergencias de diseño que constituyen deuda técnica:

| Problema | Archivo/Componente | Impacto | Recomendación de Normalización |
|---|---|---|---|
| **Duplicación de Estilos en Activo** | [sidebar.component.ts](file:///Users/juanlopez/Proyectos/Propios/AliviarSalud/emergex-frontend/src/app/layout/sidebar/sidebar.component.ts#L195-L200) vs [styles.css](file:///Users/juanlopez/Proyectos/Propios/AliviarSalud/emergex-frontend/src/styles.css#L1022-L1028) | Medio | La clase `.nav-active` global en `styles.css` difiere en sombras y bordes de la declaración local inline en el sidebar. Se debe unificar en la clase global y remover el CSS local del componente. |
| **Redundancia en Botones de Tabla** | [fleet-table.component.ts](file:///Users/juanlopez/Proyectos/Propios/AliviarSalud/emergex-frontend/src/app/shared/components/fleet/fleet-table/fleet-table.component.ts#L85-L98) | Bajo | En lugar de utilizar la clase global `.action-icon` definida en `styles.css` para botones de fila en tablas, se duplican propiedades inline (`width: 28px; height: 28px; padding: 0`) sobre la clase `.btn`. |
| **Colores Hexadecimales Hardcoded**| [fleet-table.component.ts](file:///Users/juanlopez/Proyectos/Propios/AliviarSalud/emergex-frontend/src/app/shared/components/fleet/fleet-table/fleet-table.component.ts#L153-L158) | Alto | La función `resourceColor` retorna colores en crudo (`#EF4444`, `#F59E0B`, `#10B981`) para el relleno de barras de progreso. Esto rompe la coherencia cromática y el soporte de temas día/noche. Debe cambiarse para retornar variables CSS `--accent-*`. |
| **Duplicación de Inputs en Modales**| [new-unit-modal.component.ts](file:///Users/juanlopez/Proyectos/Propios/AliviarSalud/emergex-frontend/src/app/features/fleet/new-unit-modal/new-unit-modal.component.ts#L23-L25) | Medio | Los controles de formulario en modales redefinen clases Tailwind locales y estilos inline duplicando visualmente la clase `.qc-input` que ya está declarada de forma centralizada en el design system global. |
| **Duplicación de Tabs Locales** | `operations.component.ts` vs `fleet.component.ts` | Bajo | Las pestañas de filtrado de listados se implementan con lógicas visuales de botones locales en lugar de un componente de navegación de pestañas (`<emx-tab-group>`) reutilizable. |

---

## 12. Reglas oficiales recomendadas

Para garantizar la coherencia visual en el futuro desarrollo de Emergex, se dictan las siguientes normas obligatorias de UI Engineering:

1. **Jerarquía en Estilos:** NUNCA escribas estilos inline `style="..."` ni clases de color de borde/fondo duras de Tailwind (`bg-slate-900`, `border-gray-800`). Usa siempre variables semánticas (`var(--bg-elevated)`, `var(--border-glass)`).
2. **Estructura de Cards:** Toda tarjeta debe implementarse usando el componente común `<emx-glass-card>`. No crees divs con la clase `.glass` a mano a menos que sea estrictamente necesario para animaciones complejas.
3. **Formularios Homogéneos:** Todo input o selector de formulario debe vestir la clase `.qc-input`. Queda estrictamente prohibido usar clases de padding locales para inputs.
4. **Acciones con Icono:** Todo botón interactivo que contenga únicamente un elemento SVG debe usar la clase `.action-icon` y definir un atributo de accesibilidad `title` descriptivo.
5. **Navegación e Indicadores:** Todos los listados de estado deben apoyarse en el componente `<emx-status-badge>` para mantener la consistencia en el diseño de dots pulsantes y colores semánticos.

---

## 13. Tokens de diseño sugeridos

A partir del análisis cromático y dimensional real, se proponen los siguientes tokens de diseño en `:root` para centralizar la configuración:

```css
:root {
  /* Surfaces */
  --color-bg-page: var(--bg-deep);
  --color-bg-card: var(--surface-glass);
  --color-bg-elevated: var(--bg-elevated);
  --color-border: var(--border-glass);
  --color-border-hover: var(--border-strong);
  
  /* Text */
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);
  
  /* Semantics */
  --color-danger: var(--accent-red);
  --color-warning: var(--accent-amber);
  --color-success: var(--accent-emerald);
  --color-info: var(--accent-blue);
  --color-telemetry: var(--accent-cyan);
  
  /* Radii */
  --radius-card: var(--r-card);
  --radius-panel: var(--r-panel);
  --radius-button: var(--r-btn);
  
  /* Spacing (4px base) */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;
  --spacing-xl: 24px;
}
```

---

## 14. Ejemplos base reutilizables

### 14.1 Layout Estándar de Nueva Pantalla (Template Angular)
```html
<div class="h-full flex flex-col overflow-hidden p-4 sm:p-6 gap-6">
  <!-- Cabecera de Pantalla -->
  <div class="screen-head flex-shrink-0">
    <div class="screen-head__title">
      <div class="screen-head__icon">
        <svg class="w-4 h-4" style="color: var(--accent-blue);">...</svg>
      </div>
      <div>
        <h2>Título de la Pantalla</h2>
        <p class="eyebrow">Categoría / Sección</p>
      </div>
    </div>
    <div class="screen-head__actions">
      <button type="button" class="btn btn--ghost btn--sm">Acción Secundaria</button>
      <button type="button" class="btn btn--primary btn--sm">Acción Principal</button>
    </div>
  </div>

  <!-- Contenedor de Contenido Principal -->
  <div class="flex-1 grid grid-cols-1 xl:grid-cols-3 gap-6 overflow-hidden">
    <emx-glass-card class="xl:col-span-2">
      <!-- Tabla o listado principal -->
    </emx-glass-card>
    <emx-glass-card>
      <!-- Panel de control o filtros -->
    </emx-glass-card>
  </div>
</div>
```

### 14.2 Formulario Estandarizado en Modal
```html
<emx-modal-shell title="Registrar Operación" (closed)="onCerrar()">
  <form [formGroup]="form" class="flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
        Código Operativo *
      </label>
      <input type="text" formControlName="codigo" class="qc-input" placeholder="OP-999" />
    </div>
    
    <div class="flex flex-col gap-1">
      <label class="text-xs font-semibold uppercase tracking-wider" style="color: var(--text-secondary);">
        Tipo de Incidente
      </label>
      <select formControlName="tipo" class="qc-input">
        <option value="TRAUMA">Trauma menor</option>
        <option value="CARDIO">Cardiovascular</option>
      </select>
    </div>
  </form>
  <div footer class="flex gap-2">
    <button type="button" class="btn btn--ghost btn--sm" (click)="onCerrar()">Cerrar</button>
    <button type="submit" class="btn btn--primary btn--sm" [disabled]="form.invalid">Guardar</button>
  </div>
</emx-modal-shell>
```

---

## 15. Plan de mejora visual

Se propone una hoja de ruta estructurada en tres fases incrementales para limpiar la deuda visual sin interrumpir el roadmap de negocio:

### Fase 1 — Normalización Rápida (1 a 2 sprints)
- **Acciones:**
  1. Corregir la discrepancia de la clase `.nav-active` en el sidebar, eliminando las reglas locales en `sidebar.component.ts` y centralizándolas en `styles.css`.
  2. Reemplazar los retornos de color hexadecimal crudos en `fleet-table.component.ts` (`resourceColor`) por variables semánticas nativas `--accent-*`.
  3. Refactorizar los inputs del formulario en `NewUnitModalComponent` para vestir la clase global `.qc-input`, eliminando los estilos en línea repetidos.

### Fase 2 — Componentización de UI Común (2 a 3 sprints)
- **Acciones:**
  1. Crear un componente de formulario reutilizable para agrupar campos con etiquetas y mensajes de error (`<emx-form-field>`), reduciendo el marcado repetitivo en un 40%.
  2. Implementar un componente de navegación de pestañas común (`<emx-tabs>`) que encapsule la lógica y el diseño de la pestaña activa para uso unificado en listados y modales.
  3. Reemplazar los botones locales de las tablas por el componente `<button class="action-icon">` unificando la biblioteca de iconografía del proyecto.

### Fase 3 — Consolidación del Design System (Fase continua)
- **Acciones:**
  1. Migrar las variables de tema base de `styles.css` a Tailwind Tokens extendidos en `tailwind.config.js` para habilitar el uso directo de clases Tailwind semánticas (ej. `text-accent-red`, `bg-bg-elevated`).
  2. Configurar una instancia de Storybook integrada en el monorepo para documentar los componentes comunes de la capa `shared/` en aislamiento de la lógica de negocio.

---

## 16. Checklist para nuevas pantallas

Antes de aprobar el despliegue de una nueva vista en Emergex, el ingeniero frontend debe certificar el cumplimiento del siguiente checklist técnico:

- [ ] **Viewport Lock:** La pantalla no genera scrollbars globales incontrolados en el viewport; el layout usa contenedores con `overflow-hidden` y zonas internas con `overflow-y-auto`.
- [ ] **Tokens Únicos:** No existen estilos inline `style="..."` hardcodeando colores o bordes. Todos los layouts usan variables CSS semánticas.
- [ ] **Botones Oficiales:** Los botones interactivos son instancias estrictas de las clases `.btn` y sus modificadores o de la clase `.action-icon`.
- [ ] **Tablas Coherentes:** Las tablas de datos heredan estrictamente la clase `.data-table` con filas interactivas y cabeceras sticky oscuras.
- [ ] **Formularios Homogéneos:** Todo input, select o textarea viste la clase `.qc-input` y cuenta con un contenedor flex estructurado con etiquetas e indicadores de obligatoriedad semánticos.
- [ ] **Uso de Shared:** Los badges, tarjetas y modales se implementan reutilizando `<emx-status-badge>`, `<emx-glass-card>` y `<emx-modal-shell>` de la capa compartida.
- [ ] **Compatibilidad de Temas:** La pantalla es perfectamente legible tanto en el Modo Noche por defecto como en el Modo Día, respetando las variables de contraste.
- [ ] **Accesibilidad Mínima:** Todos los botones interactivos sin texto disponen de un atributo descriptivo `title` para que los lectores de pantalla puedan interpretarlos.
