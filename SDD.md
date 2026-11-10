# Emergex Frontend — SDD (Spec-Driven Development)

> **Versión**: 1.0.0  
> **Fecha**: 2026-05-14  
> **Fuente**: Auditoría profesional de emergex-frontend contra maqueta original (emergex 01) y backend JHipster 9.0.0  
> **Propósito**: Guía ejecutable de punta a punta para implementar, corregir y completar el frontend

---

## 1. Contexto de proyecto

### 1.1 Stack

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Angular (standalone) | 21.2.x |
| Lenguaje | TypeScript strict | 5.9 |
| Estilos | Tailwind CSS + CSS custom properties | 4.3 |
| Estado | Angular Signals (computed, signal, input, output) | — |
| HTTP | `@angular/common/http` con interceptors funcionales | — |
| Realtime | STOMP sobre SockJS (`@stomp/stompjs`) | 7.3 |
| Autenticación | JWT (`localStorage` → `Authorization: Bearer`) | — |
| Build | `@angular/build:application` (esbuild) | — |
| Backend | JHipster 9.0.0 (Spring Boot + Maven + PostgreSQL) | — |
| Proxy dev | `proxy.conf.json` → `http://localhost:8080` | — |

### 1.2 Maqueta de referencia

`/emergex 01/` — Prototipo React 18 con 14 archivos (~7300 líneas):
- `DESIGN.md` — Sistema de diseño completo (tokens, componentes, animaciones)
- `styles.css` — 2636 líneas de CSS implementando el sistema de diseño
- `Emergex Dashboard.html` — Entry point (zero build)
- 11 archivos JSX: `app.jsx`, `components.jsx`, `data.jsx`, `map.jsx`, `feed.jsx`, `telemetry.jsx`, `screens.jsx`, `quick-create.jsx`, `unit-modals.jsx`, `emergency-detail.jsx`, `tweaks-panel.jsx`

### 1.3 Backend real

`/backend/.../web/` — 100+ controladores REST y WebSocket:
- **Auth**: `POST /api/authenticate` → `{"id_token": "..."}`, `GET /api/account`
- **Asistencias (V1)**: `POST /api/v1/asistencias/recibir-llamada`, `PATCH .../despachar`, `.../en-camino`, `.../en-sitio`, `.../cerrar`, `.../cancelar`, `GET .../activos`, `.../{id}/detalle`, `.../{id}/timeline`
- **Flota**: `GET /api/flota/dashboard`, `/ambulancias`, `/ambulancias-disponibles`, `/turnos-movil` CRUD, `/tripulacion`, `/guardias`, `/metricas`
- **Dashboard**: `GET /api/v1/dashboard/operativo`
- **Tracking**: `POST/GET /api/v1/ambulancias/{id}/ubicacion`, `/historial`
- **Notificaciones**: `POST /api/v1/notificaciones/enviar`, `GET .../log`
- **Operador**: `GET /api/operador-emergencias/buscar-afiliado`, `POST .../tickets/alta-rapida`
- **WebSocket**: STOMP `/websocket/tracker`, topic `/topic/geo/posiciones`, `/topic/tracker`

### 1.4 Estado actual (auditado)

- **Compila**: Sí (0 errores, 2 warnings CommonJS)
- **Lint**: No configurado
- **Tests**: 0 (skipTests global)
- **Endpoints mapeados**: ~90% correctos
- **Funcionalidad maqueta**: ~65% implementado, 35% faltante o mock
- **Veredicto**: NO APROBADO — REQUIERE REFACTOR ANTES DE CONTINUAR

---

## 2. Arquitectura objetivo

```
src/app/
├── core/
│   ├── auth/
│   │   ├── auth.service.ts           # Login/logout, JWT en localStorage, signals auth state
│   │   ├── auth.guard.ts             # CanActivateFn → redirect /login
│   │   ├── no-auth.guard.ts          # CanActivateFn → redirect /dashboard
│   │   ├── role.guard.ts             # [NUEVO] CanActivateFn con roles requeridos
│   │   ├── auth.interceptor.ts       # HttpInterceptorFn: agrega Bearer token
│   │   ├── error.interceptor.ts      # HttpInterceptorFn: 401 → logout, 403 → /access-denied
│   │   ├── account.service.ts        # [NUEVO] GET /api/account, signal con datos usuario
│   │   └── models/
│   │       ├── login.model.ts
│   │       └── account.model.ts
│   ├── stores/
│   │   ├── emergency.store.ts        # Signals: emergencies[], loading, error, selectedId, ticker
│   │   ├── fleet.store.ts            # Signals: ambulances[], WebSocket tracking
│   │   ├── notification.store.ts     # Signals: notifications[], unreadCount
│   │   └── session.store.ts          # Computed: roles, permissions
│   ├── theme/
│   │   └── theme.service.ts          # Dark/light toggle, localStorage persistence
│   └── websocket/
│       └── websocket.service.ts      # STOMP/SockJS: connect, subscribe, publish, cleanup
├── layout/
│   ├── shell/
│   │   └── shell.component.ts        # Sidebar + Header + router-outlet + QC modal + shortcut N
│   ├── sidebar/
│   │   └── sidebar.component.ts      # 64px nav: 7 items + theme + settings + fleet badge dot
│   └── header/
│       └── header.component.ts       # Title, tenant (from API), stats, clock, user chip (from API)
├── features/
│   ├── auth/
│   │   └── login/
│   │       └── login.component.ts    # Reactive form: username, password, rememberMe, reset link
│   ├── operations/
│   │   ├── operations.component.ts   # Map + Feed + Telemetry + Dispatch modal
│   │   └── emergency-detail/
│   │       └── emergency-detail.component.ts  # 3-column layout: patient/clinical/transport
│   ├── map/
│   │   └── map.component.ts          # Full-screen map
│   ├── fleet/
│   │   ├── fleet.component.ts        # Summary + Table + Detail panel
│   │   ├── new-unit-modal/
│   │   └── unit-schedule-modal/
│   ├── staff/
│   │   └── staff.component.ts        # List + Detail (expandible)
│   ├── hospitals/
│   │   └── hospitals.component.ts    # Cards con métricas reales desde API
│   ├── communications/
│   │   └── communications.component.ts  # Canales + PTT + Radio log
│   └── analytics/
│       └── analytics.component.ts    # Period tabs + 6 charts
├── shared/
│   ├── components/
│   │   ├── map/operations-map/
│   │   │   └── operations-map.component.ts   # SVG map completo: calles, distritos, brújula, trails, scale
│   │   ├── emergency/
│   │   │   ├── emergency-list-item/
│   │   │   ├── emergency-quick-create-modal/
│   │   │   ├── emergency-sla-bar/
│   │   │   ├── emergency-priority-badge/
│   │   │   └── dispatch-modal/              # [NUEVO] Extraído de ops y detail
│   │   ├── fleet/
│   │   │   ├── fleet-table/
│   │   │   ├── fleet-status-donut/
│   │   │   └── fleet-detail/                # [NUEVO] Panel detalle de unidad
│   │   ├── charts/
│   │   │   ├── donut-chart/
│   │   │   ├── sparkline/
│   │   │   └── bars-chart/
│   │   ├── telemetry-bar/
│   │   ├── kpi-card/
│   │   ├── glass-card/
│   │   ├── modal-shell/
│   │   ├── status-badge/
│   │   ├── action-icon/
│   │   ├── loading-state/
│   │   ├── error-state/
│   │   └── empty-state/
│   └── pages/
│       ├── access-denied/                    # [NUEVO] Página 403
│       └── not-found/                        # [NUEVO] Página 404
├── data-access/
│   ├── api/
│   │   ├── auth.api.ts
│   │   ├── emergency.api.ts
│   │   ├── fleet.api.ts
│   │   ├── dashboard.api.ts
│   │   ├── notification.api.ts
│   │   ├── tracking.api.ts
│   │   ├── hospital.api.ts                   # [NUEVO] API de áreas protegidas/hospitales
│   │   └── staff.api.ts                      # [NUEVO] API de personal
│   ├── dto/
│   │   ├── ticket.dto.ts
│   │   ├── ambulancia.dto.ts
│   │   ├── account.dto.ts
│   │   ├── dashboard.dto.ts
│   │   ├── hospital.dto.ts                   # [NUEVO]
│   │   └── staff.dto.ts                      # [NUEVO]
│   ├── mappers/                              # [NUEVO] Capa de transformación DTO → Model
│   │   ├── ticket.mapper.ts
│   │   ├── ambulancia.mapper.ts
│   │   └── dashboard.mapper.ts
│   └── mock/                                 # [REFACTOR] Aislar con barrel exports condicionales
│       ├── dashboard.mock.ts
│       ├── ambulance.mock.ts
│       └── emergency.mock.ts
└── app/
    ├── app.config.ts                         # Providers: router, httpClient, animations
    ├── app.routes.ts                         # Lazy routes con guards de rol
    ├── app.ts                                # Root component (renombrar a AppComponent)
    └── app.scss                              # [ELIMINAR] Vacío
```

---

## 3. Sistema de diseño (Design Tokens)

### 3.1 CSS Custom Properties (cumplimiento OBLIGATORIO)

Estos tokens YA existen en `src/styles.css` (1059 líneas). Cualquier componente NUEVO debe usar exclusivamente estas variables. **PROHIBIDO** usar colores hardcodeados (hex, rgb, hsl) en templates.

```css
/* Surfaces — dark mode (default) */
--bg-deep: #020617;
--bg-elevated: #0B1220;
--bg-map: #06101F;
--surface-glass: rgba(30, 41, 59, 0.7);
--surface-glass-strong: rgba(30, 41, 59, 0.92);
--surface-inset: rgba(2, 6, 23, 0.55);
--border-glass: rgba(255, 255, 255, 0.08);
--border-strong: rgba(255, 255, 255, 0.14);
--border-hairline: rgba(255, 255, 255, 0.05);

/* Text */
--text-primary: #F1F5F9;
--text-secondary: #94A3B8;
--text-muted: #64748B;
--text-dim: #475569;

/* Accents — invariantes semánticos */
--accent-red: #EF4444;
--accent-red-dim: rgba(239, 68, 68, 0.16);
--accent-amber: #F59E0B;
--accent-amber-dim: rgba(245, 158, 11, 0.16);
--accent-emerald: #10B981;
--accent-emerald-dim: rgba(16, 185, 129, 0.16);
--accent-blue: #3B82F6;
--accent-blue-dim: rgba(59, 130, 246, 0.16);
--accent-cyan: #22D3EE;
--accent-cyan-dim: rgba(34, 211, 238, 0.16);

/* Glow halos */
--glow-red: 0 0 24px rgba(239, 68, 68, 0.55);
--glow-emerald: 0 0 18px rgba(16, 185, 129, 0.45);
--glow-blue: 0 0 18px rgba(59, 130, 246, 0.45);

/* Typography */
--font-sans: 'Inter', system-ui, sans-serif;
--font-mono: 'IBM Plex Mono', ui-monospace, monospace;

/* Radii */
--r-card: 16px;
--r-panel: 12px;
--r-btn: 8px;
--r-chip: 6px;
--r-pill: 999px;
```

### 3.2 Modo claro

El modo claro YA existe en `styles.css` con `[data-theme="light"]`. La regla crítica: en light mode, `backdrop-filter: none` y superficies sólidas con sombras.

### 3.3 Clases de componentes CSS (YA definidas en styles.css)

| Clase | Uso |
|-------|-----|
| `.glass` | Card con blur. `background: var(--surface-glass)`, `backdrop-filter: blur(12px)`, `border: 1px solid var(--border-glass)`, `border-radius: var(--r-card)` |
| `.glass-strong` | Card opaco. `background: var(--surface-glass-strong)`, blur 20px, border strong |
| `.btn` | Botón base. 32px height, Inter 12.5px, gap 6px, `border-radius: var(--r-btn)` |
| `.btn--primary` | Azul con glow. Background `var(--accent-blue)`, box-shadow blue |
| `.btn--danger` | Rojo con glow. Background `var(--accent-red)` |
| `.btn--ghost` | Transparente con borde glass. Hover → surface-glass |
| `.btn--sm` | 26px height, 11.5px font |
| `.badge` | Pill mono 10.5px uppercase. `border-radius: var(--r-pill)` |
| `.badge--critical` | Rojo con dim bg |
| `.badge--urgent` | Amber |
| `.badge--stable` | Emerald |
| `.badge--info` | Blue |
| `.badge--cyan` | Cyan |
| `.badge--pulse` | Animación pulse-dot en el dot |
| `.action-icon` | 32×32 icon button con hover variants (danger/info/success) |
| `.eyebrow` | Mono 10.5px uppercase tracking 0.16em color muted |
| `.font-mono` | IBM Plex Mono con tabular-nums |
| `.rounded-card` | `border-radius: var(--r-card)` |
| `.rounded-panel` | `border-radius: var(--r-panel)` |
| `.rounded-btn` | `border-radius: var(--r-btn)` |
| `.rounded-pill` | `border-radius: var(--r-pill)` |
| `.hr-thin` | Divider 1px `var(--border-hairline)` |
| `.dot` | Circle 6px color currentColor |
| `.nav-active` | Sidebar item active: color blue, bg blue-dim, border blue, glow |

### 3.4 Animaciones requeridas (YA en styles.css)

```css
@keyframes pulse-dot    { /* dot pulse 1.6s */ }
@keyframes pulse-halo   { /* ring expansion */ }
@keyframes pulse-bg     { /* background pulse para diversion tags */ }
@keyframes fade-in      { /* opacity + translateY */ }
@keyframes modal-pop    { /* scale + translateY para modales */ }
```

### 3.5 Animaciones FALTANTES (implementar en styles.css)

```css
/* Doble pulso staggered para marcadores de emergencia (usado en mapa) */
@keyframes pulse-ring {
  0%   { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(2.4); opacity: 0; }
}

/* Pulso en el step activo del status flow (emergency detail) */
@keyframes status-pulse {
  0%, 100% { box-shadow: 0 0 4px currentColor; }
  50%      { box-shadow: 0 0 16px currentColor; }
}

/* Montaje progresivo del sparkline (dasharray animado) */
@keyframes sparkline-mount {
  from { stroke-dashoffset: 1000; }
  to   { stroke-dashoffset: 0; }
}

/* Deriva suave de ambulancia en mapa */
@keyframes ambulance-drift {
  0%   { transform: translate(-50%, -50%) translate(0, 0); }
  50%  { transform: translate(-50%, -50%) translate(1px, -1px); }
  100% { transform: translate(-50%, -50%) translate(0, 0); }
}
```

### 3.6 Reglas de lenguaje y tono

- **Idioma**: Español operativo (es-AR, voseo rioplatense)
- **Prohibido**: Emojis en la UI
- **Acciones**: Verbos en imperativo ("Despachar", "Cerrar", "Asignar")
- **Códigos/Métricas**: Siempre en IBM Plex Mono con `font-variant-numeric: tabular-nums`
- **Labels destructivos**: Siempre con texto explícito (nunca solo íconos)

---

## 4. Especificaciones por pantalla

### 4.1 Login (`/login`)

**Estado actual**: ACEPTABLE — compila y funciona.

**Cambios requeridos**:
- [ ] Agregar link "¿Olvidaste tu contraseña?" que navegue a reset password
- [ ] Validar complejidad mínima de contraseña (8+ chars)
- [ ] Mejorar mensaje de error: diferenciar "usuario no existe" vs "contraseña incorrecta" (si el backend lo permite)

**Template de referencia**: Maqueta no incluye login (el prototipo arranca directo). El diseño actual con glass-card centrada, logo azul, y formulario es aceptable.

**Aceptación**: Login exitoso → navega a `/dashboard`. Error → mensaje específico bajo el formulario. Loading → spinner en botón.

---

### 4.2 Shell (layout base)

**Estado actual**: PARCIAL — estructura sólida pero con valores hardcodeados.

**Cambios requeridos**:
- [ ] **P0**: Cargar datos del usuario desde `GET /api/account` → reemplazar "OP" / "Operador" hardcodeado
- [ ] **P0**: Cargar tenant desde API → reemplazar "EMERGEX DEMO" hardcodeado (usar `empresa.nombre` del account DTO)
- [ ] **P1**: Agregar `HostListener('window:keydown')` para shortcut `N` (abre QC modal, bloqueado si input focused o modal ya abierto)
- [ ] **P2**: Mover `availableCount` del header a datos reales (actualmente hardcodeado a 0 en ShellComponent)

**Template de referencia** (`app.jsx` líneas 230-283):
```
<Sidebar active={active} onNavigate={setActive} ... />
<Header ... onNewEmergency />
<div class="body">
  {active === 'ops' && <MapArea ... />}
  {active === 'ops' && <FeedPanel ... />}
  {active === 'ops' && <Telemetry ... />}
  {active === 'map' && <MapArea fullScreen />}
  {active === 'fleet' && <FleetScreen ... />}
  ...
</div>
```

**Aceptación**: El shell debe cargar datos del usuario al iniciar. Shortcut `N` debe abrir el modal de alta rápida. Header debe reflejar tenant real.

---

### 4.3 Sidebar

**Estado actual**: INCORRECTO — dimensiones y colores equivocados.

**Cambios requeridos**:
- [ ] **P1**: Cambiar ancho de 56px a **64px** (como la maqueta)
- [ ] **P1**: Logo debe ser **rojo con gradiente y glow halo** (actualmente azul sólido):
  ```
  background: linear-gradient(135deg, #DC2626, #EF4444);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
  ```
- [ ] **P1**: Agregar indicador izquierdo de 3px en el ítem activo (left tab indicator):
  ```
  .nav-active { border-left: 3px solid var(--accent-blue); }
  ```
- [ ] **P3**: Agregar badge dot rojo en el ítem Fleet (cuando hay unidades en mantenimiento o críticas)
- [ ] **P0**: Reemplazar `[innerHTML]` con `bypassSecurityTrustHtml` por componentes SVG inline. Cada ícono debe ser un template string SVG seguro.
- [ ] **P2**: Eliminar ruta `/settings` del sidebar o crear la ruta correspondiente en `app.routes.ts`

**Aceptación**: Sidebar 64px, logo rojo con glow, ítem activo con left tab azul de 3px, sin `bypassSecurityTrustHtml`.

---

### 4.4 Header

**Estado actual**: PARCIAL — clock, stats y botones OK; user y tenant hardcodeados.

**Cambios requeridos**:
- [ ] **P1**: Clock debe tener glow cyan: `text-shadow: 0 0 12px rgba(34, 211, 238, 0.5)`
- [ ] **P1**: Tenant switch debe mostrar `empresa.nombre` real (cargado de `AccountService`)
- [ ] **P1**: User chip debe mostrar iniciales reales (ej. `MR` de `account.firstName + account.lastName`)
- [ ] **P1**: Stats del header (activas/críticas/disponibles) deben usar datos reales del `EmergencyStore` y `FleetStore`, no inputs del padre
- [ ] **P1**: Botón "Nueva Emergencia" debe incluir hint de teclado `N` en un `<kbd>`:
  ```html
  <span class="mono text-xs opacity-60 ml-1">N</span>
  ```

**Aceptación**: Header muestra datos reales del usuario y tenant. Clock con glow cyan. Botón QC muestra shortcut `N`.

---

### 4.5 Centro de Operaciones (`/dashboard`)

**Estado actual**: FUNCIONAL — layout 3 zonas (mapa + feed + telemetría) OK.

**Cambios requeridos**:
- [ ] **P2**: Agregar filtros de mapa en toolbar: chips toggle para Rojo/Amber/Verde/Unidades (como `map.jsx`)
- [ ] **P0**: Implementar `onCall()` real en vez de `console.log` — abrir modal de llamada o integración
- [ ] **P0**: Arreglar memory leak en `EmergencyStore.startTicker()` — el `interval(1000)` debe limpiarse con `takeUntilDestroyed()`
- [ ] **P2**: Agregar detail shelf en el mapa cuando se selecciona una ambulancia (status, ID, crew, ETA, battery, fuel, acciones)
- [ ] **P1**: Mover dispatch modal a componente compartido `DispatchModalComponent` (está duplicado en operations y emergency-detail)
- [ ] **P1**: El feed debe recargar datos reales desde `GET /api/v1/asistencias/activos` al crear/despachar/cerrar emergencia (ya lo hace parcialmente)

**Template de referencia** (`app.jsx` líneas 160-230): Layout 3 zonas con grid CSS. MapArea + FeedPanel + Telemetry.

**Aceptación**: Mapa con filtros toggle, feed con datos vivos, telemetry con datos reales del dashboard API. Memory leak resuelto. Dispatch modal no duplicado.

---

### 4.6 Feed de Emergencias (panel derecho en `/dashboard`)

**Estado actual**: PARCIAL — lista funcional pero sin filtrado ni búsqueda.

**Cambios requeridos**:
- [ ] **P2**: Agregar tabs: "Activas" | "Sin asignar" | "Críticas" (cada una con count en badge)
- [ ] **P2**: Agregar barra de búsqueda (filtra por código, tipo, dirección)
- [ ] **P2**: Ordenar lista: prioridad (crítica > urgente > normal), luego tiempo transcurrido descendente
- [ ] **P2**: La lista debe tener scroll interno con altura fija, no empujar el layout
- [ ] **P3**: Agregar animación de entrada a nuevos items (fade-in)

**Template de referencia** (`feed.jsx`): Tabs con counts, search bar, lista ordenada con `EmergencyListItem`.

**Aceptación**: Feed con tabs funcionales, búsqueda reactiva, ordenamiento correcto. Scroll independiente.

---

### 4.7 Mapa Operativo (SVG)

**Estado actual**: PARCIAL — grid overlay básico, marcadores funcionales pero minimalista.

**Cambios requeridos**:
- [ ] **P2**: Agregar capas geográficas al SVG:
  - Distritos/zones con nombres (6 polígonos)
  - Calles primarias (curvas con double-stroke: fondo + línea fina)
  - Grid secundario (calles menores, 14 vertical × 10 horizontal)
  - Áreas verdes (parques, elipses con borde emerald)
  - Cuerpos de agua (ríos, path con gradiente)
- [ ] **P2**: Agregar brújula (círculo + cruz + flecha N roja, esquina superior derecha):
  ```svg
  <g transform="translate(940, 60)">
    <circle cx="0" cy="0" r="14" fill="none" stroke="var(--text-dim)" stroke-width="1"/>
    <line x1="0" y1="-10" x2="0" y2="10" stroke="var(--text-dim)" stroke-width="0.8"/>
    <line x1="-10" y1="0" x2="10" y2="0" stroke="var(--text-dim)" stroke-width="0.8"/>
    <polygon points="0,-10 -3,-3 3,-3" fill="var(--accent-red)"/>
  </g>
  ```
- [ ] **P2**: Marcadores de emergencia con **doble pulso** (pulse-ring staggered, 1.6s):
  ```html
  <div class="marker-ring" style="animation: pulse-ring 1.6s ease-out infinite;"></div>
  <div class="marker-ring" style="animation: pulse-ring 1.6s ease-out 0.5s infinite;"></div>
  ```
- [ ] **P2**: Marcadores de ambulancia con forma de rectángulo redondeado + cruz (ícono médico)
- [ ] **P2**: Trails animados: líneas dashed animadas entre ambulancia asignada y su emergencia target
- [ ] **P2**: Leyenda (bottom-left): colores de estado ambulancia + marcador emergencia
- [ ] **P2**: Scale bar (bottom-right): "2 km" con barra gráfica
- [ ] **P2**: Coordinate readout (top-right): LAT/LNG/ZOOM fake o real
- [ ] **P3**: Ambulance drift animation en marcadores (movimiento suave con `transition: transform 2s`)

**Template de referencia** (`map.jsx` 293 líneas): SVG 1000×700 viewbox con todos los elementos listados.

**Aceptación**: Mapa con distritos, calles, ríos, parques, brújula, leyenda, scale bar, coordenadas. Marcadores con doble pulso. Trails animados. Detail shelf al seleccionar ambulancia.

---

### 4.8 Telemetry Bar

**Estado actual**: CONFIRMADO — 4 KPIs funcionales. Usa señales computadas.

**Cambios requeridos**:
- [ ] **P2**: Los valores de sparkline y bars deben venir de datos históricos reales del backend, no de `HOURLY_PATTERN` hardcodeado
- [ ] **P2**: Agregar tooltips en hover para cada KPI (mostrar breakdown detallado)

**Aceptación**: Telemetry bar con datos del `DashboardOperativoDTO`. Sparkline con rolling window real de tiempos de respuesta. Bars con carga por hora real.

---

### 4.9 Alta Rápida de Emergencia (modal)

**Estado actual**: PARCIAL — formulario funcional pero simplificado.

**Cambios requeridos**:
- [ ] **P2**: Agregar chips de tipos comunes (10 tipos predefinidos, click para autocompletar):
  ```
  Paro cardíaco | Trauma vehicular | Dificultad respiratoria | ACV | 
  Convulsiones | Hemorragia | Quemaduras | Parto | Intoxicación | Electrocución
  ```
- [ ] **P2**: Prioridad como 3 botones grandes (no radio buttons pequeños). Cada botón debe mostrar:
  - Dot del color correspondiente
  - Label ("CRÍTICA", "URGENTE", "NORMAL")
  - Sub-label descriptivo ("Riesgo vital inmediato", "Requiere atención rápida", "Sin riesgo vital")
- [ ] **P2**: Sector como dropdown (`<select>`) con sectores predefinidos:
  ```
  Zona Norte | Zona Sur | Zona Centro | GBA Norte | GBA Sur | GBA Oeste
  ```
- [ ] **P2**: Validación visual inmediata (borde rojo en campos inválidos al blur, no solo al submit)
- [ ] **P2**: El botón "Registrar" debe estar disabled hasta que tipo Y dirección estén completos (ya lo hace)
- [ ] **P3**: Hint de teclado `Esc` para cerrar, `Enter` para submit

**Template de referencia** (`quick-create.jsx` 176 líneas): Chips, botones de prioridad grandes, dropdown sector.

**Aceptación**: Modal con chips de tipos, botones de prioridad grandes, dropdown sector, validación inline, hints de teclado.

---

### 4.10 Detalle de Emergencia (`/dashboard/emergency/:id`)

**Estado actual**: PARCIAL — 2 columnas con ~7 secciones. Faltan 7 secciones de la maqueta.

**Cambios requeridos**:
- [ ] **P2**: Cambiar layout de 2 columnas a **3 columnas**:
  - **Left**: Patient card + Triage initial + Procedures + Medications
  - **Center**: Vital signs (2×2 grid con sparklines) + Timeline + Notes
  - **Right**: Unit assigned + Mini map + Transport + Evidence
- [ ] **P2**: Agregar **Status Flow bar** (7 pasos: Creada → Despachada → En ruta → En sitio → Traslado → Entregado → Cerrada). Step activo con pulse animado. Steps completados con fill.
- [ ] **P2**: Agregar **Patient Card** completo:
  - Avatar circular con iniciales y gradiente rojo
  - Nombre, edad, sexo, CURP
  - Blood type pill (rojo)
  - Allergy alert block (rojo con ícono de alerta)
  - Pre-existing conditions chips (amber)
  - Current medications list
  - Emergency contact + Insurance en grid 2-columnas
  - Reported-by info
- [ ] **P2**: Agregar **Triage Initial Card**: síntomas, onset, conciencia, Glasgow 3, initial vitals
- [ ] **P2**: Agregar **Vital Signs 2×2 grid** con mini sparklines (HR, SpO2, SBP, GCS). Cada uno muestra:
  - Valor actual grande (28px mono, color-coded por banda: normal/amber/crítico)
  - Unidad pequeña
  - Mini sparkline de las últimas mediciones
  - Extra row: BP, Temp, Resp Rate, Glucose
- [ ] **P2**: **Procedures** como checklist con íconos de check (emerald para done, "N/A" para not-needed). Columnas: tiempo, procedimiento, performer, estado.
- [ ] **P2**: **Medications** como data table: tiempo (cyan), droga + notas, dosis (emerald), vía (uppercase mono), performer.
- [ ] **P2**: **Mini Map** SVG (400×200): ruta animada dashed cyan del incidente al hospital. Marcadores: emergencia (rojo), ambulancia (azul con glow), hospital (emerald).
- [ ] **P2**: **Transport Card**: hospital info (ícono, nombre, ID, distancia), departure/ETA times, pre-advice status, bed assigned, receiving doctor.
- [ ] **P2**: **Evidence Card**: 
  - Photos en grid 2-columnas (con placeholder diagonal stripe para slots vacíos)
  - Audio recordings (ícono play, label, duración)
  - Signatures (3 filas, cada una con estado signed/unsigned)
- [ ] **P2**: **Notes interactivas**: textarea + send button. Lista de notas con timestamp + autor.
- [ ] **P2**: **Unit Assigned Card**: muestra unidad asignada o estado vacío "Sin unidad asignada" (ícono rojo dashed con pulso + botón Asignar)

**Template de referencia** (`emergency-detail.jsx` 998 líneas): La pantalla más rica de la maqueta. Estructura 3-columnas con 14 secciones.

**Aceptación**: Layout 3-columnas completo con las 14 secciones. Status flow bar animado. Paciente con avatar, alergias, blood type. Signos vitales con sparklines. Mapa mini con ruta. Evidencia con fotos/audio/firmas. Notas interactivas.

---

### 4.11 Flota (`/fleet`)

**Estado actual**: PARCIAL — KPIs + donut + tabla. Falta detalle de unidad.

**Cambios requeridos**:
- [ ] **P2**: Agregar panel de **detalle de unidad** (al hacer clic en una fila o botón "Ver"):
  - Avatar grande emerald con ID de unidad
  - StatusBadge con pulso si está activa
  - Grid 2×3 de detalle: Base, Turno, Kilometraje, Servicios hoy, Último mantenimiento, Conexión
  - Inventory crítico: 6 items con barras de nivel y thresholds de color (rojo <30%, amber <50%, verde ≥50%)
  - Health bars: Battery avg, Fuel avg, Medical kit, Inspection (con mini-bars horizontales)
  - Action buttons: Config, Llamar, Localizar
- [ ] **P2**: Tabla de unidades debe tener tabs: "Todas" | "Disponibles" | "En ruta" | "En sitio" | "Traslado" | "Mantenimiento"
- [ ] **P3**: Fleet badge dot rojo en sidebar cuando hay unidades críticas

**Template de referencia** (`screens.jsx` FleetScreen): 3-columnas (summary/table/detail).

**Aceptación**: Panel de detalle completo con inventory y health bars. Tabs funcionales en tabla.

---

### 4.12 Nueva Unidad (modal)

**Estado actual**: FUNCIONAL — formulario OK pero bypasses FleetApiService.

**Cambios requeridos**:
- [ ] **P2**: `NewUnitModalComponent` debe usar `FleetApiService` en vez de inyectar `HttpClient` directamente
- [ ] **P3**: Agregar banner informativo emerald después del formulario: "La unidad iniciará en estado *Mantenimiento* hasta validar GPS, radio e inventario"
- [ ] **P3**: Tipo ALS/BLS como 2 botones grandes (como en la maqueta), no radio buttons

**Aceptación**: Modal usa FleetApiService. Banner informativo visible. Botones ALS/BLS grandes.

---

### 4.13 Configuración de Unidad (modal de horarios)

**Estado actual**: CONFIRMADO — 3 tabs funcionales (crew/shifts/calendar). Buena implementación.

**Cambios requeridos**:
- [ ] **P2**: Validación de conflictos de horario (cruce de turnos, cruce de medianoche)
- [ ] **P2**: Calendar: today cell con outline azul, multi-turn cells con tag "2T" cyan, off days con tag "OFF" gray
- [ ] **P3**: Verificar integración con `POST /api/flota/turnos-movil` y endpoints de tripulación

**Aceptación**: Validación de conflictos implementada. Calendar con today highlight y tags de estado.

---

### 4.14 Personal (`/staff`)

**Estado actual**: PARCIAL — solo tabla básica, sin detalle.

**Cambios requeridos**:
- [ ] **P2**: Layout 2-columnas: list (izquierda) + detail (derecha, visible al seleccionar)
- [ ] **P2**: Panel de detalle:
  - Avatar grande con iniciales
  - Nombre completo, role, ID, experiencia (años)
  - StatusBadge
  - Grid 2×3: Unidad actual, Turno, Hoy, Este mes, Esta semana, Rendimiento
  - Certificaciones como chips: "VIGENTE · 2027" en emerald, "POR VENCER" en amber
  - Sparkline de carga semanal
  - Action buttons: Asignar, Contactar, Ver perfil completo
- [ ] **P2**: Tabs en la lista: "Todos" | "Médicos" | "Paramédicos" | "Enfermería" | "Despacho"
- [ ] **P2**: Barra de búsqueda en la lista
- [ ] **P3**: Reemplazar `Math.random()` por `crypto.randomUUID()` para IDs fallback

**Template de referencia** (`screens.jsx` StaffScreen): 2-columnas con detalle rico.

**Aceptación**: Layout 2-columnas con detalle expandible. Cert chips. Sparkline de carga. Tabs funcionales.

---

### 4.15 Hospitales (`/hospitals`)

**Estado actual**: MOCK TEMPORAL — datos estáticos hardcodeados, sin API.

**Cambios requeridos**:
- [ ] **P0**: Crear `HospitalApiService` con endpoint `GET /api/area-protegidas` (o el endpoint de hospitales del backend)
- [ ] **P0**: Eliminar `MOCK_HOSPITALS`, reemplazar con datos reales del backend
- [ ] **P2**: Cada card de hospital debe mostrar:
  - Ícono azul + nombre + nivel + distancia
  - "DESVÍO ACTIVO" pill rojo con pulse-bg animado (si `diversion === true`)
  - StatusBadge (Disponible/Limitado/Saturado)
  - 3 métricas con mini-bars: camas libres, ocupación ER %, tiempo espera
  - Chips de especialidades
  - Botones: Pre-aviso (siempre), Derivar (disabled si desvío activo)
- [ ] **P2**: Layout: grid auto-fill con `min-width: 360px`

**Template de referencia** (`screens.jsx` HospitalsScreen): 8 hospitales en grid con toda la info.

**Aceptación**: Datos desde API real. Cards con diversion tags, métricas, chips de especialidades. Botones Pre-aviso/Derivar funcionales.

---

### 4.16 Comunicaciones (`/communications`)

**Estado actual**: FALTA — placeholder absoluto.

**Cambios requeridos** (implementación completa):
- [ ] **P0**: Layout 2-columnas: canales (izquierda) + radio log (derecha)
- [ ] **P0**: **Lista de canales** (5 canales):
  - Dot live/off (emerald animado vs gray)
  - Nombre del canal + frecuencia
  - Cantidad de operadores conectados
  - Traffic bars: 12 barras cyan con altura/opacidad proporcional
- [ ] **P0**: **PTT Button** (Push-To-Talk):
  - Botón rojo grande (80×80) centrado debajo de los canales
  - Gradiente radial rojo oscuro → claro
  - Anillo punteado interno (dashed stroke)
  - Glow shadow rojo
  - Label "HABLAR" en mono bold
  - Indicador de canal activo debajo
- [ ] **P0**: **Radio Log** (10+ entradas):
  - Sticky header con nombre del canal + "LIVE" badge emerald
  - Filas con: timestamp (mono), type badge (7 tipos: dispatch/status/preavis/route/ack/alert/request con colores distintos), from→to, mensaje
  - Alert rows: borde izquierdo rojo
  - Request rows: borde izquierdo amber

**Template de referencia** (`screens.jsx` CommsScreen): Canales + PTT + Log completos.

**Aceptación**: Canales con traffic bars, PTT button funcional (aunque sea mock visual inicialmente), radio log con 7 tipos de eventos coloreados.

---

### 4.17 Analítica (`/analytics`)

**Estado actual**: PARCIAL — KPIs básicos, faltan charts.

**Cambios requeridos**:
- [ ] **P2**: Agregar tabs de período en el header: "7 días" | "30 días" | "90 días"
- [ ] **P2**: Completar 6 charts:
  1. **Response Time** (wide, 2-col span): KPI grande + sparkline + delta vs mes anterior
  2. **SLA Compliance**: KPI + sparkline
  3. **Volume by Hour** (wide): 24 barras, peaks (18:00-21:00) en rojo
  4. **Priority Distribution**: Donut rojo/amber/emerald + legend con %
  5. **Top Types** (wide): Tabla con mini-bars, 6 filas
  6. **Top Units**: Ranking 1-5 con posición, ID, crew, service count
- [ ] **P2**: Layout: grid auto-fill con cards que pueden spanear 2 columnas (wide)

**Template de referencia** (`screens.jsx` AnalyticsScreen): 6 charts con period tabs.

**Aceptación**: Tabs de período funcionales. 6 charts completos con datos del backend.

---

### 4.18 Pantalla de Mapa full-screen (`/map`)

**Estado actual**: BÁSICO — mismo mapa que en ops.

**Cambios requeridos**:
- [ ] **P2**: Mapa debe ocupar viewport completo (sin feed panel)
- [ ] **P2**: Toolbar superior con título + filtros
- [ ] **P2**: Mismos elementos visuales que el mapa de ops (ver sección 4.7)

**Aceptación**: Mapa full-screen con toolbar y todos los elementos visuales.

---

### 4.19 Access Denied (`/access-denied`) — NUEVO

**Estado actual**: FALTA.

**Cambios requeridos**:
- [ ] **P2**: Crear `AccessDeniedComponent`:
  - Ícono de candado/shield grande (rojo)
  - "Acceso denegado" (text-primary, 24px)
  - "No tenés permisos para acceder a esta sección" (text-secondary)
  - Botón "Volver al centro de operaciones" → navega a `/dashboard`
- [ ] **P2**: Agregar ruta en `app.routes.ts`
- [ ] **P2**: `error.interceptor.ts` debe redirigir a `/access-denied` en 403

**Aceptación**: Página 403 funcional con navegación de retorno.

---

### 4.20 Not Found (`/not-found`) — NUEVO

**Estado actual**: FALTA.

**Cambios requeridos**:
- [ ] **P2**: Crear `NotFoundComponent`:
  - "404" grande (mono, text-muted, 64px)
  - "Página no encontrada" (text-secondary)
  - Botón "Ir al inicio" → navega a `/dashboard`
- [ ] **P2**: Agregar ruta `**` al final de `app.routes.ts`

**Aceptación**: Página 404 funcional.

---

## 5. Tasks de implementación

### FASE 1 — Correcciones críticas (P0)

#### T1.1: Arreglar memory leak en EmergencyStore
- **Archivo**: `src/app/core/stores/emergency.store.ts`
- **Problema**: `interval(1000).subscribe()` nunca se limpia
- **Solución**: Inyectar `DestroyRef`, usar `pipe(takeUntilDestroyed(this.destroyRef))` o almacenar `subscription` y llamar `.unsubscribe()` en un método `destroy()`
- **Verificación**: Abrir y cerrar la pantalla de operaciones 5 veces → NO deben acumularse timers (verificar en Performance tab de DevTools)

#### T1.2: Arreglar memory leak en WebsocketService
- **Archivo**: `src/app/core/websocket/websocket.service.ts`
- **Problema**: `StompSubscription` guardado nunca se desuscribe
- **Solución**: Implementar `ngOnDestroy` en el servicio o exponer método `disconnect()` que haga `.unsubscribe()` + `.deactivate()`
- **Verificación**: El WebSocket debe desconectarse al navegar fuera de operaciones

#### T1.3: Implementar Comunicaciones (pantalla completa)
- **Archivo**: `src/app/features/communications/communications.component.ts`
- **Especificación**: Ver sección 4.16
- **Dependencias**: `ModalShellComponent` para PTT (o componente propio)
- **Mock inicial**: Datos de canales y log pueden ser mock si no hay endpoint backend
- **Verificación**: Pantalla renderiza canales, PTT button, y radio log

#### T1.4: Implementar Hospitales con API real
- **Archivos**: 
  - `src/app/data-access/api/hospital.api.ts` (NUEVO)
  - `src/app/data-access/dto/hospital.dto.ts` (NUEVO)
  - `src/app/features/hospitals/hospitals.component.ts` (REFACTOR)
- **Endpoint**: `GET /api/area-protegidas` (verificar si es el correcto para hospitales)
- **Especificación**: Ver sección 4.15
- **Verificación**: Cards de hospitales muestran datos reales del backend. Sin `MOCK_HOSPITALS`.

#### T1.5: Configurar ESLint
- **Archivos**: `package.json`, `.eslintrc.json` (NUEVO)
- **Acción**: `ng add @angular-eslint/schematics`
- **Verificación**: `npm run lint` ejecuta sin errores de configuración

#### T1.6: Configurar Test runner
- **Archivo**: `angular.json`
- **Acción**: Agregar target `test` con builder Jest o Karma
- **Verificación**: `npm test` ejecuta (aunque sin tests aún)

---

### FASE 2 — Integración backend real (P1)

#### T2.1: Cargar datos de usuario y tenant reales
- **Archivos**:
  - `src/app/core/auth/account.service.ts` (NUEVO)
  - `src/app/layout/header/header.component.ts`
  - `src/app/layout/shell/shell.component.ts`
- **Solución**: Crear `AccountService` con signal `account: Signal<Account | null>`. Cargar en `APP_INITIALIZER` o en `ShellComponent.ngOnInit()`. Header y Shell consumen esta signal.
- **Verificación**: Header muestra iniciales reales del usuario y nombre real de la empresa

#### T2.2: Reemplazar [innerHTML] con SVG inline components
- **Archivo**: `src/app/layout/sidebar/sidebar.component.ts`
- **Solución**: Cada ícono SVG como template string interpolado, SIN `bypassSecurityTrustHtml`. Usar `[innerHTML]` con pipe `safeHtml` o mejor: crear componente por ícono.
- **Enfoque recomendado**: Crear componentes SVG standalone (ej. `IconPulseComponent`, `IconMapComponent`) con `viewBox`, `fill`, `stroke` como inputs. Más seguro y reusable.
- **Verificación**: Sin llamadas a `bypassSecurityTrustHtml`. Íconos visibles. Sin errores de seguridad.

#### T2.3: Implementar onCall real
- **Archivo**: `src/app/features/operations/operations.component.ts`
- **Solución**: Reemplazar `console.log` con:
  - Opción A: Abrir modal de confirmación de llamada (número, protocolo)
  - Opción B: Enviar notificación vía `POST /api/v1/notificaciones/enviar`
  - Opción C: Integrar con servicio WebRTC/telefonía (si existe)
- **Verificación**: Botón "Llamar" en feed de emergencia ejecuta acción real

#### T2.4: Agregar Guard de roles por ruta
- **Archivo**: `src/app/core/auth/role.guard.ts` (NUEVO), `src/app/app.routes.ts`
- **Solución**: `CanActivateFn` que recibe array de roles permitidos. Redirige a `/access-denied` si el usuario no tiene ninguno.
- **Verificación**: Usuario sin rol DESPACHANTE no puede acceder a `/fleet`

#### T2.5: Completar roles en SessionStore
- **Archivo**: `src/app/core/stores/session.store.ts`
- **Solución**: Agregar computed signals para `isChofer`, `isMedicoCampo`, `isAdministrador`, `isPropietario`
- **Verificación**: `SessionStore` expone todos los roles del backend

#### T2.6: Corregir dimensiones y colores del Sidebar
- **Archivo**: `src/app/layout/sidebar/sidebar.component.ts`
- **Solución**: 
  - Width: `64px` (cambiar de `56px`)
  - Logo: `background: linear-gradient(135deg, #DC2626, #EF4444); box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);`
  - Ítem activo: `border-left: 3px solid var(--accent-blue)` en `.nav-active`
- **Verificación**: Sidebar 64px, logo rojo con glow, left tab indicator

---

### FASE 3 — UX/UI parity con maqueta (P2)

#### T3.1: Rediseñar mapa SVG completo
- **Archivo**: `src/app/shared/components/map/operations-map/operations-map.component.ts`
- **Especificación**: Ver sección 4.7
- **Alcance**: Distritos, calles, ríos, parques, brújula, leyenda, scale bar, coordinates, doble pulso en marcadores, trails, detail shelf
- **Verificación**: Comparar visualmente contra `map.jsx`

#### T3.2: Emergency Detail 3-columnas
- **Archivo**: `src/app/features/operations/emergency-detail/emergency-detail.component.ts`
- **Especificación**: Ver sección 4.10
- **Alcance**: Layout 3-columnas, 14 secciones. Status flow bar. Patient card completo. Vital signs con sparklines. Mini map. Evidence. Notes.
- **Verificación**: Comparar visualmente contra `emergency-detail.jsx`

#### T3.3: Feed con tabs, búsqueda y ordenamiento
- **Archivo**: `src/app/features/operations/operations.component.ts` (o componente separado `FeedPanelComponent`)
- **Especificación**: Ver sección 4.6
- **Verificación**: Tabs funcionales con counts, search bar reactiva, ordenamiento correcto

#### T3.4: Quick Create modal mejorado
- **Archivo**: `src/app/shared/components/emergency/emergency-quick-create-modal/emergency-quick-create-modal.component.ts`
- **Especificación**: Ver sección 4.9
- **Verificación**: Chips de tipos, botones de prioridad grandes, dropdown sector, hints de teclado

#### T3.5: Dispatch Modal compartido
- **Archivos**: 
  - `src/app/shared/components/emergency/dispatch-modal/dispatch-modal.component.ts` (NUEVO)
  - Refactorizar `operations.component.ts` y `emergency-detail.component.ts` para usarlo
- **Verificación**: Un solo componente de dispatch modal. Sin código duplicado.

#### T3.6: Fleet detail panel
- **Archivo**: `src/app/shared/components/fleet/fleet-detail/fleet-detail.component.ts` (NUEVO)
- **Especificación**: Ver sección 4.11
- **Verificación**: Panel de detalle con inventory, health bars, métricas

#### T3.7: Staff detail panel
- **Archivo**: `src/app/features/staff/staff.component.ts` (REFACTOR)
- **Especificación**: Ver sección 4.14
- **Verificación**: Layout 2-columnas con detalle, cert chips, sparkline

#### T3.8: Analytics completo
- **Archivo**: `src/app/features/analytics/analytics.component.ts` (REFACTOR)
- **Especificación**: Ver sección 4.17
- **Verificación**: 6 charts con period tabs

#### T3.9: NewUnitModal usa FleetApiService
- **Archivo**: `src/app/features/fleet/new-unit-modal/new-unit-modal.component.ts`
- **Solución**: Reemplazar `HttpClient` directo por `FleetApiService`
- **Verificación**: Modal usa FleetApiService para crear unidad

---

### FASE 4 — Hardening (P2-P3)

#### T4.1: Responsive layout
- **Archivos**: Todos los componentes de layout y features
- **Solución**: Agregar breakpoints Tailwind:
  - `< 640px`: Layouts apilados verticalmente. Sidebar colapsado o bottom nav.
  - `640-1024px`: Feed más angosto, mapa principal
  - `> 1024px`: Layout completo
- **Verificación**: Probar en viewport 375px, 768px, 1440px

#### T4.2: Accesibilidad (ARIA, focus, keyboard)
- **Archivos**: `modal-shell`, `sidebar`, `header`, `emergency-list-item`, `quick-create-modal`
- **Verificación**: Lighthouse audit > 80% en accessibility

#### T4.3: Mappers DTO → Model
- **Archivos**: `src/app/data-access/mappers/` (NUEVO)
- **Solución**: Crear mappers para `TicketAsistenciaDTO`, `UnidadMovilDTO`, `DashboardOperativoDTO`
- **Verificación**: Componentes consumen modelos propios, no DTOs de API

#### T4.4: Páginas 403 y 404
- **Archivos**: `src/app/shared/pages/access-denied/`, `src/app/shared/pages/not-found/`
- **Especificación**: Ver secciones 4.19, 4.20
- **Verificación**: Navegar a `/sin-permiso` → Access Denied. Navegar a `/cualquier-cosa` → Not Found.

#### T4.5: Shortcut N global
- **Archivo**: `src/app/layout/shell/shell.component.ts`
- **Solución**: `@HostListener('window:keydown', ['$event'])` que detecta tecla `n` (sin modifier). No dispara si focus está en input/textarea/select.
- **Verificación**: Presionar `N` en cualquier pantalla → abre QC modal

#### T4.6: Eliminar dead code
- **Archivos**: 
  - `src/app/app.html` (ELIMINAR)
  - `src/styles.scss` (ELIMINAR, es duplicado de styles.css)
  - `src/app/app.scss` (si está vacío, ELIMINAR o limpiar)
- **Verificación**: Build sin errores. Sin archivos no referenciados.

---

### FASE 5 — Optimización (P3)

#### T5.1: Animaciones faltantes
- **Archivo**: `src/styles.css`
- **Acción**: Agregar keyframes `pulse-ring`, `status-pulse`, `sparkline-mount`, `ambulance-drift`
- **Verificación**: Animaciones visibles en mapa y emergency detail

#### T5.2: Reemplazar Math.random() por IDs determinísticos
- **Archivos**: `sparkline.component.ts`, `staff.component.ts`
- **Solución**: 
  - Sparkline: usar counter incremental `let gradientId = 0` para gradientes SVG
  - Staff: usar `crypto.randomUUID()` para IDs fallback
- **Verificación**: Sin `Math.random()` en código productivo

#### T5.3: Completar light mode overrides
- **Archivo**: `src/styles.css`
- **Solución**: Revisar que todos los componentes se vean bien en light mode (glass cards, modales, KPI cards, tablas, botones)
- **Verificación**: Toggle theme → todos los componentes legibles y estéticamente correctos

#### T5.4: Fleet badge dot en sidebar
- **Archivo**: `src/app/layout/sidebar/sidebar.component.ts`
- **Solución**: Agregar dot rojo en el ítem Fleet cuando `fleetStore` tenga unidades en mantenimiento o batería <20%
- **Verificación**: Badge dot visible cuando hay unidades críticas

#### T5.5: Sidebar settings route
- **Archivo**: `src/app/app.routes.ts`
- **Solución**: Agregar ruta `/settings` con componente (o eliminar el link del sidebar)
- **Verificación**: Clic en settings no da 404

---

## 6. Matriz de verificación

### 6.1 Endpoints frontend ↔ backend

| Frontend Service | Método | Endpoint | Backend Controller | Match |
|-----------------|--------|----------|-------------------|-------|
| `AuthApiService` | POST | `/api/authenticate` | `AuthenticateController` | ✓ |
| `AuthApiService` | GET | `/api/account` | `AccountResource` | ✓ |
| `EmergencyApiService` | GET | `/api/v1/asistencias/activos` | `AsistenciaResourceV1` | ✓ |
| `EmergencyApiService` | GET | `/api/v1/asistencias/{id}` | `AsistenciaResourceV1` | ✓ |
| `EmergencyApiService` | GET | `/api/v1/asistencias/{id}/detalle` | `AsistenciaResourceV1` | ✓ |
| `EmergencyApiService` | GET | `/api/v1/asistencias/{id}/timeline` | `AsistenciaResourceV1` | ✓ |
| `EmergencyApiService` | POST | `/api/v1/asistencias/recibir-llamada` | `AsistenciaResourceV1` | ✓ |
| `EmergencyApiService` | PATCH | `/api/v1/asistencias/{id}/despachar` | `AsistenciaResourceV1` | ✓ |
| `EmergencyApiService` | PATCH | `/api/v1/asistencias/{id}/en-camino` | `AsistenciaResourceV1` | ✓ |
| `EmergencyApiService` | PATCH | `/api/v1/asistencias/{id}/en-sitio` | `AsistenciaResourceV1` | ✓ |
| `EmergencyApiService` | PATCH | `/api/v1/asistencias/{id}/cerrar` | `AsistenciaResourceV1` | ✓ |
| `EmergencyApiService` | PATCH | `/api/v1/asistencias/{id}/cancelar` | `AsistenciaResourceV1` | ✓ |
| `EmergencyApiService` | GET | `/api/v1/asistencias/{id}/sugerir-movil` | `AsistenciaResourceV1` | ✓ |
| `FleetApiService` | GET | `/api/flota/dashboard` | `FlotaResource` | ✓ |
| `FleetApiService` | GET | `/api/flota/ambulancias` | `FlotaResource` | ✓ |
| `FleetApiService` | GET | `/api/flota/ambulancias-disponibles` | `FlotaResource` | ✓ |
| `FleetApiService` | GET | `/api/flota/turnos-movil` | `FlotaResource` | ✓ |
| `FleetApiService` | POST | `/api/flota/turnos-movil` | `FlotaResource` | ✓ |
| `FleetApiService` | POST | `/api/flota/turnos-movil/{id}/tripulacion` | `FlotaResource` | ✓ |
| `FleetApiService` | GET | `/api/flota/profesionales-disponibles` | `FlotaResource` | ✓ |
| `FleetApiService` | GET | `/api/flota/metricas` | `FlotaResource` | ✓ |
| `FleetApiService` | GET | `/api/flota/ambulancias/{id}/guardias` | `FlotaResource` | ✓ |
| `FleetApiService` | PUT | `/api/flota/ambulancias/{id}/guardias` | `FlotaResource` | ✓ |
| `DashboardApiService` | GET | `/api/v1/dashboard/operativo` | `DashboardResourceV1` | ✓ |
| `NotificationApiService` | GET | `/api/v1/notificaciones/log` | `NotificacionResourceV1` | ✓ |
| `NotificationApiService` | POST | `/api/v1/notificaciones/enviar` | `NotificacionResourceV1` | ✓ |
| `TrackingApiService` | GET | `/api/v1/ambulancias/{id}/ubicacion` | `TrackingOperativoResource` | ✓ |
| `TrackingApiService` | POST | `/api/v1/ambulancias/{id}/ubicacion` | `TrackingOperativoResource` | ✓ |

### 6.2 DTOs frontend ↔ backend

| Frontend DTO | Backend Java Class | Match |
|-------------|-------------------|-------|
| `LoginRequest { username, password, rememberMe }` | `LoginVM { username, password, rememberMe }` | ✓ |
| `JwtToken { id_token }` | `JWTToken { @JsonProperty("id_token") idToken }` | ✓ |
| `CrearTicketRequest` | `CrearTicketRequest` | ✓ |
| `TicketAsistenciaDTO` | `TicketAsistenciaDTO` | ✓ |
| `TicketDetalleDTO` | `TicketDetalleDTO` | ✓ |
| `DespacharRequest { ambulanciaId }` | `DespacharRequest` | ✓ |
| `CerrarTicketRequest` | `CerrarTicketRequest` | ✓ |
| `LogEstadoTicketDTO` | `LogEstadoTicketDTO` | ✓ |
| `SignosVitalesDTO` | `SignosVitalesDTO` | ✓ |
| `ProcedimientoDTO` | `ProcedimientoDTO` | ✓ |
| `MedicacionDTO` | `MedicacionDTO` | ✓ |
| `UnidadMovilDTO` | `UnidadMovilDTO` | ✓ |
| `FlotaDashboardDTO` | `FlotaDashboardDTO` | ✓ |
| `FlotaMetricasDTO` | `FlotaMetricasDTO` | ✓ |
| `TurnoMovilDTO` | `TurnoMovilDTO` | ✓ |
| `TripulacionMovilDTO` | `TripulacionMovilDTO` | ✓ |
| `GeoPosicionDTO` | `GeoPosicionDTO` | ✓ |
| `AsignarMovilRequestDTO` | `AsignarMovilRequestDTO` | ✓ |
| `GuardiaMovilDTO` | `GuardiaMovilDTO` | ✓ |
| `DashboardOperativoDTO` | `DashboardOperativoDTO` | ✓ |

---

## 7. Convenciones de código

### 7.1 Naming

- **Componentes**: `PascalCase`, sufijo `Component` (ej. `EmergencyListItemComponent`)
- **Selectors**: Prefijo `emx-` (ej. `emx-emergency-list-item`)
- **Archivos**: `kebab-case.component.ts` (ej. `emergency-list-item.component.ts`)
- **Servicios**: `kebab-case.service.ts` (ej. `auth.service.ts`)
- **Stores**: `kebab-case.store.ts` (ej. `emergency.store.ts`)
- **DTOs**: `kebab-case.dto.ts` (ej. `ticket.dto.ts`)
- **APIs**: `kebab-case.api.ts` (ej. `emergency.api.ts`)
- **Mappers**: `kebab-case.mapper.ts` (ej. `ticket.mapper.ts`)

### 7.2 Signals (patrón obligatorio)

```typescript
// Input: usa input.required<T>() para props obligatorios
readonly unit = input.required<UnidadMovilDTO>();

// Output: usa output<T>() para eventos
readonly closed = output<void>();

// Estado interno: usa signal<T>()
readonly loading = signal(false);

// Derivado: usa computed<T>()
readonly available = computed(() => this.units().filter(u => u.estado === 'DISPONIBLE'));
```

### 7.3 Templates

- **Inline templates**: Template literals con backticks (patrón actual del proyecto)
- **NO** archivos `.component.html` separados
- **Estilos**: `style="color: var(--text-muted);"` con CSS custom properties (NO hex colors hardcodeados en templates)
- **Condicionales**: `@if`, `@for`, `@let` (Angular 17+ control flow)
- **Eventos**: `(click)`, `(submit)`, etc. Siempre con `$event.stopPropagation()` en botones dentro de elementos clickeables

### 7.4 HTTP

- **Servicios API**: Todos los endpoints deben estar en `data-access/api/`
- **Manejo de errores**: `catchError` con fallback a mock (solo en desarrollo) o mensaje de error
- **Paginación**: Usar tipos genéricos `Page<T>` del backend JHipster
- **Interceptors**: Funcionales (`HttpInterceptorFn`), NO clases

### 7.5 CSS

- **Custom properties**: Usar `var(--token)` SIEMPRE. Prohibido `#FFFFFF`, `rgba(..., ...)` en templates.
- **Utility classes**: `.glass`, `.btn`, `.badge`, `.eyebrow`, `.font-mono`, `.rounded-card`, etc.
- **Tailwind utility**: `flex`, `grid`, `gap-3`, `px-4`, etc. para layout y espaciado
- **NO** estilos inline con valores mágicos. Si un estilo no existe como token, AGREGARLO a `styles.css`.

---

## 8. Criterios de aceptación final

El proyecto emergex-frontend se considera **APROBADO** cuando:

- [ ] Compila sin errores (0 errores, solo warnings ESM conocidos)
- [ ] `npm run lint` pasa sin errores
- [ ] `npm test` ejecuta (con al menos tests de integración básicos)
- [ ] Sin memory leaks (0 timers/websockets sin cleanup)
- [ ] Sin `[innerHTML]` con `bypassSecurityTrustHtml`
- [ ] Sin mocks presentados como datos reales (mocks OK solo como fallback aislado en `mock/`)
- [ ] Sin `console.log` en código productivo
- [ ] Sidebar: 64px, logo rojo con glow, left tab indicator
- [ ] Header: datos de usuario y tenant reales desde API
- [ ] Mapa: SVG completo con distritos, calles, brújula, leyenda, doble pulso
- [ ] Feed: tabs, búsqueda, ordenamiento funcionales
- [ ] Emergency Detail: layout 3-columnas con 14 secciones
- [ ] Fleet: detalle de unidad con inventory y health bars
- [ ] Staff: detalle expandible con cert chips
- [ ] Hospitals: datos desde API real, diversion tags
- [ ] Comms: canales + PTT + radio log (aunque datos sean mock inicialmente)
- [ ] Analytics: 6 charts con period tabs
- [ ] Responsive: funcional en tablet (768px+) y desktop (1024px+)
- [ ] Accesibilidad: Lighthouse > 80%
- [ ] Páginas 403 y 404 funcionales
- [ ] Shortcut `N` global funcional
- [ ] Light mode visualmente correcto
- [ ] Todas las rutas tienen guard de auth (y roles donde corresponda)
- [ ] Sin archivos dead code (`app.html`, `styles.scss`)
- [ ] `NewUnitModal` usa `FleetApiService` (no `HttpClient` directo)
- [ ] `DispatchModalComponent` compartido (no duplicado)
- [ ] `Math.random()` reemplazado por `crypto.randomUUID()` o counters

---

## 9. Notas para el asistente codificador

### Antes de empezar
1. Leer este documento completo
2. Familiarizarse con `src/styles.css` — todos los tokens y clases están definidos ahí
3. Revisar la maqueta original en `/emergex 01/` para referencia visual
4. Verificar que el backend esté corriendo en `http://localhost:8080`
5. Ejecutar `npm run build` para verificar estado actual

### Orden de implementación
Seguir el orden de fases (1 → 2 → 3 → 4 → 5). Dentro de cada fase, completar una task antes de pasar a la siguiente.

### Verificación continua
Después de cada task:
1. `npm run build` — debe compilar sin errores
2. Verificar visualmente en el navegador (`npm start`)
3. Si la task involucra API, verificar con backend corriendo

### No hacer
- NO modificar entidades del backend (`backend/.../domain/`)
- NO inventar endpoints — verificar contra este documento (sección 6.1)
- NO hardcodear colores — usar `var(--token)` de `styles.css`
- NO usar `any` — el proyecto es strict TypeScript
- NO dejar `console.log` en producción
- NO mezclar mocks con lógica productiva
- NO usar `style={{...}}` (objeto JS) — usar `[style.property]="value"` o `style="css-property: var(--token);"`
