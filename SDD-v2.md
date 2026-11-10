# Emergex Frontend — SDD v2 (Nuevas pantallas)

> **Versión**: 2.0.0
> **Fecha**: 2026-05-15
> **Base**: SDD v1.0.0 (ver `SDD.md`)
> **Fuente**: Auditoría de `emergex 01/` — archivos nuevos agregados en esta iteración

Este documento es el **addendum** al SDD original. Solo cubre lo **nuevo o modificado**. Todo lo definido en `SDD.md` sigue vigente.

---

## 1. Qué cambió en el prototipo

### 1.1 Nuevas pantallas (4)

| Ruta | Pantalla | Archivo fuente |
|------|----------|---------------|
| `/events` | Coberturas de Eventos | `event-coverage.jsx` |
| `/patients` | Pacientes / Afiliados | `patients.jsx` (era `plans.jsx` en v1) |
| `/institutions` | Instituciones corporativas | `institutions.jsx` |
| `/plans` | Planes comerciales | `plans.jsx` |

### 1.2 Nuevo modal global

| Modal | Trigger | Archivo fuente |
|-------|---------|---------------|
| `InstitutionalEmergencyModal` | Botón en Header | `institutional-modal.jsx` |

### 1.3 Pantallas existentes rediseñadas

| Pantalla | Cambio | Archivo fuente |
|----------|--------|---------------|
| Personal operativo (`/staff`) | Reemplazo completo — de lista simple a CRUD completo con paginación, formulario con especialidades multiselect y habilitaciones operativas | `staff.jsx` (nuevo archivo, reemplaza `StaffScreen` de `screens.jsx`) |

### 1.4 Cambios en layout

- **Sidebar**: 4 nuevos ítems de navegación (Eventos, Pacientes, Instituciones, Planes) + reordenamiento (ver sección 4.1)
- **Header**: botón secundario "Nueva emergencia institucional" (además del botón rojo existente)
- **Routes**: 4 rutas nuevas con `authGuard`

---

## 2. Arquitectura de archivos nuevos

```
src/app/
├── features/
│   ├── events/
│   │   ├── events.component.ts              # [NUEVO] Screen principal (lista + calendario)
│   │   ├── new-event-modal/
│   │   │   └── new-event-modal.component.ts # [NUEVO] Wizard 3 pasos
│   │   └── event-detail-popover/
│   │       └── event-detail-popover.component.ts # [NUEVO] Popover de detalle
│   ├── staff/
│   │   ├── staff.component.ts               # [REDISEÑO] Tabla paginada + KPI header + filtros
│   │   └── staff-form-modal/
│   │       └── staff-form-modal.component.ts # [NUEVO] Alta/edición (2 secciones: personal + médica)
│   ├── patients/
│   │   ├── patients.component.ts            # [NUEVO] Tabla paginada + toolbars
│   │   ├── patient-form-modal/
│   │   │   └── patient-form-modal.component.ts # [NUEVO] Alta/edición (2 tabs)
│   │   └── patient-detail-slideover/
│   │       └── patient-detail-slideover.component.ts # [NUEVO] Slide-over
│   ├── institutions/
│   │   ├── institutions.component.ts        # [NUEVO] Tabla paginada + toolbars
│   │   ├── institution-form-modal/
│   │   │   └── institution-form-modal.component.ts # [NUEVO] Alta/edición (2 tabs + mini-map)
│   │   └── contract-modal/
│   │       └── contract-modal.component.ts  # [NUEVO] Configuración de contrato
│   └── plans/
│       ├── plans.component.ts               # [NUEVO] Grid de pricing cards
│       └── plan-form-modal/
│           └── plan-form-modal.component.ts # [NUEVO] Alta/edición (4 bloques)
├── shared/
│   └── components/
│       ├── institutional-emergency-modal/   # [NUEVO] Modal global de emergencia institucional
│       │   └── institutional-emergency-modal.component.ts
│       ├── slideover/                       # [NUEVO] Panel lateral deslizante
│       │   └── slideover.component.ts
│       ├── spec-multiselect/                # [NUEVO] Multiselect de especialidades con grupos y chips
│       │   └── spec-multiselect.component.ts
│       ├── photo-uploader/                  # [NUEVO] Avatar + botón de subida de foto (staff)
│       │   └── photo-uploader.component.ts
│       ├── toggle-switch/                   # [NUEVO] Switch on/off reutilizable
│       │   └── toggle-switch.component.ts
│       ├── mini-map/                        # [NUEVO] SVG mini-mapa interactivo
│       │   └── mini-map.component.ts
│       ├── wizard-steps/                    # [NUEVO] Stepper de pasos de wizard
│       │   └── wizard-steps.component.ts
│       ├── pagination/                      # [NUEVO] Paginación reutilizable
│       │   └── pagination.component.ts
│       ├── row-menu/                        # [NUEVO] Menú contextual de fila en tabla
│       │   └── row-menu.component.ts
│       ├── plan-badge/                      # [NUEVO] Badge de plan con color
│       │   └── plan-badge.component.ts
│       └── events/
│           ├── event-calendar/              # [NUEVO] Vista calendario mensual
│           │   └── event-calendar.component.ts
│           └── event-list/                  # [NUEVO] Vista lista agrupada por mes
│               └── event-list.component.ts
└── data-access/
    ├── api/
    │   ├── events.api.ts                    # [NUEVO]
    │   ├── patients.api.ts                  # [NUEVO]
    │   ├── institutions.api.ts              # [NUEVO]
    │   └── plans.api.ts                     # [NUEVO]
    └── dto/
        ├── event.dto.ts                     # [NUEVO]
        ├── patient.dto.ts                   # [NUEVO]
        ├── institution.dto.ts               # [NUEVO]
        └── plan.dto.ts                      # [NUEVO]
```

---

## 3. Especificaciones por pantalla

### 3.1 Coberturas de Eventos (`/events`)

**Objetivo**: Gestión de coberturas sanitarias para eventos públicos y privados.

**Estado actual**: Feature no existe. Crear desde cero.

**Layout principal**:
```
┌─────────────────────────────────────────┐
│  SCREEN-HEAD: título + 4 KPIs + acciones│
├─────────────────────────────────────────┤
│  [Lista] [Calendario]    [Nuevo evento] │
├─────────────────────────────────────────┤
│  VISTA LISTA o VISTA CALENDARIO         │
│  (ocupa el resto de la pantalla)        │
└─────────────────────────────────────────┘
```

**KPIs del header**:
- Hoy (count de eventos del día actual)
- Este mes (count del mes en curso)
- En curso (count de eventos `status === 'inprogress'`)
- Móviles afectados (distinct ambulances comprometidas en eventos no cerrados)

**Vista Lista** (`EventListComponent`):
- Toolbar: buscador full-width + chips de estado (Todos / En curso / Programado / Cerrado) + select de tipo
- Lista agrupada por mes con header de mes y count
- Cada fila (`event-row`): fecha grande + día semana mono | banda de color por tipo | nombre + ID + horario + dirección | badge de tipo | asistentes | count de móviles | `StatusBadge`
- Clic en fila → `EventDetailPopover`
- Scroll interno independiente

**Vista Calendario** (`EventCalendarComponent`):
- Header: botón ‹ + título "Mes Año" + count de eventos del mes + botón "Hoy" + botón ›
- Grilla días-de-semana (L-M-X-J-V-S-D)
- Celdas: número de día con outline azul si es hoy, fondo tinted si weekend
- Eventos dentro de cada celda: chips con hora + nombre truncado, color por tipo. Si hay >3, chip "+ N más"
- Clic en chip → `EventDetailPopover`
- Leyenda al pie con todos los tipos y sus colores

**`NewEventModal`** (wizard 3 pasos):
- Header eyebrow azul "● ALTA DE COBERTURA"
- `WizardStepsComponent` con 3 pasos: Datos generales / Ubicación y horarios / Asignación de móviles
- **Paso 1**: Nombre (text, required) + Tipo (select de 8 tipos) + Institución organizadora (autocomplete con lista de orgs) + Responsable (text) + Asistentes (number)
- **Paso 2**: Dirección (input con icono pin + botón "Ver mapa") + Inicio (date + time) + Fin (date + time) + Duración calculada automáticamente (read-only pill mono)
- **Paso 3**: Badge "FALTAN UNIDADES" / "COBERTURA OK" según fórmula `ceil(asistentes / 5000)` + Lista de unidades asignadas (event-chips removibles) + Pool de disponibles con filtro ALS/BLS/Todos + botón Asignar por unidad
- Footer: hint Esc + Paso N de 3 + botones Anterior/Siguiente/Registrar

**`EventDetailPopover`**:
- Overlay + modal 560px
- Header: eyebrow con tipo+color, nombre, ID+org, close
- Body: StatusBadge + asistentes | detail-grid (inicio/fin/responsable/móviles) | separador | dirección | lista de móviles asignados con crew
- Footer: Editar + Generar parte + Cerrar

**Criterios de aceptación**:
- [ ] Alternancia Lista/Calendario funcional
- [ ] Wizard con validación de pasos (botón Siguiente disabled si el paso no es válido)
- [ ] Duración calculada en tiempo real
- [ ] Badge de cobertura reactivo al count de unidades vs. fórmula
- [ ] Eventos nuevos aparecen en ambas vistas sin recargar
- [ ] Eventos agrupados por mes en vista lista
- [ ] Calendario navega entre meses y muestra eventos correctamente

---

### 3.2 Pacientes / Afiliados (`/patients`)

**Objetivo**: Gestión del padrón de afiliados (B2C) con sus grupos familiares, planes y pagos.

**Estado actual**: Feature no existe. Crear desde cero.

**Layout principal**:
```
┌─────────────────────────────────────────┐
│  SCREEN-HEAD: título + 4 KPIs + acciones│
├─────────────────────────────────────────┤
│  GlassCard con toolbar + tabla + pager  │
└─────────────────────────────────────────┘
                          (Slideover aparece a la derecha al seleccionar)
```

**KPIs del header**:
- Afiliados totales (titulares + dependientes)
- Titulares
- Al día (emerald)
- En deuda (rojo)

**Tabla de pacientes**:
- Toolbar: buscador (nombre/DNI/ID) + chips Estado (Todos/Al día/En deuda) + select Plan
- Columnas: Avatar+Nombre+ID | DNI | Tipo (Titular/Dependiente tag) | Plan (plan-badge con color) | Estado (StatusBadge) | Grupo familiar (dep-count o "—") | Acciones (⋮)
- Paginación con 10 items/página y navegación de páginas
- Click en fila → `PatientDetailSlideover`
- Menú ⋮ (`RowMenuComponent`): Ver detalle / Editar / Registrar pago / Descargar carnet / **Dar de baja** (danger)

**`PatientFormModal`** (Alta/edición, 2 tabs):
- Tab "Datos del titular": Nombre+Apellido | DNI | Fecha nacimiento + Género (3 botones M/F/X) | Teléfono + Email | Dirección (addr-input) | Plan (plan-grid: 5 cards con color, dot animado, nombre, precio/mes)
- Tab "Grupo familiar": counter de dependientes + botón Agregar | Lista de dep-rows (número, Nombre, DNI, Parentesco select) con botón remove | Empty state si no hay dependientes
- Footer: hint Esc + botones Cancelar/Guardar

**`PatientDetailSlideover`** (panel lateral derecho):
- Overlay semitransparente + `aside` glass-strong
- Header: avatar grande con gradiente en color del plan + nombre + ID/DNI + plan-badge
- Body (scroll):
  1. **Status hero**: bloque verde (al día) o rojo (en deuda) con icono + "Estado de cuenta" + fecha desde afiliado
  2. **Due grid**: Próximo vencimiento (fecha mono, rojo si deuda) + Monto cuota (emerald)
  3. **Plan activo**: lista de beneficios con check icon en color del plan
  4. **Grupo familiar**: chips de dependientes con avatar+nombre+DNI+parentesco. Empty state si no hay.
  5. **Historial de pagos**: tabla con fecha(cyan)/período/monto/estado(color)/botón Recibo
- Footer: Editar + Actualizar plan + Registrar pago

**Criterios de aceptación**:
- [ ] Búsqueda reactiva (filtra mientras se tipea)
- [ ] Filtros de estado y plan combinables
- [ ] Paginación funcional (avanzar/retroceder, saltar a página)
- [ ] Menú ⋮ cierra al clickear fuera
- [ ] `PatientFormModal` en modo edición pre-popula todos los campos
- [ ] Dependientes se agregan/remueven dinámicamente en el modal
- [ ] Slide-over muestra datos correctos del paciente seleccionado
- [ ] Status hero cambia de verde a rojo según `status`

---

### 3.3 Instituciones Corporativas (`/institutions`)

**Objetivo**: Gestión de clientes B2B (colegios, empresas, clubes, hospitales) con sus contratos.

**Estado actual**: Feature no existe. Crear desde cero.

**Layout principal**: Idéntico al de Pacientes — `GlassCard` con toolbar + tabla paginada.

**KPIs del header**:
- Instituciones totales
- Activas (emerald)
- Inactivas (muted)
- Personas cubiertas (blue)

**Tabla de instituciones**:
- Toolbar: buscador (nombre de fantasía/razón social/CUIT) + chips Estado + select Tipo
- Columnas: `institution-avatar` (iniciales con bg color plan) + Nombre+ID+personas | Razón social | CUIT | Tipo (type-pill con icono) | Estado (StatusBadge/badge-inactive) | Plan comercial (plan-badge) | Acciones (⋮)
- Click en fila → `ContractModal` (ver contrato)
- Menú ⋮: Editar / Ver contrato / Renovar contrato / **Dar de baja** (danger, cambia status a inactiva)

**`InstitutionFormModal`** (Alta/edición, 2 tabs):
- Tab "Datos generales": Nombre de fantasía + CUIT | Razón social | Tipo de institución (type-grid: 8 pills con icono) | Plan comercial (select) + nota descriptiva del plan | Estado (ToggleSwitchComponent con descripción contextual)
- Tab "Contacto y ubicación" (2 columnas): [izq] Email + Teléfono | Contacto admin | Contacto operativo | Dirección (addr-input) | Lat + Lng | [der] `MiniMapComponent` SVG interactivo

**`ContractModal`** (Configuración del contrato):
- Header: institution-avatar + nombre + "CONFIGURACIÓN DE CONTRATO Y PLAN" + código contrato + CUIT
- Body:
  1. **Plan selector card**: dot con glow + nombre del plan + tier + tarifa base | select para cambiar plan
  2. **Condiciones del contrato** (contract-grid 4 cols): Vigencia desde | Vigencia hasta | Estado del contrato (4 pills: Activo/Suspendido/Finalizado/Borrador) | Duración en meses (calculada, read-only)
  3. **Segunda fila** (contract-grid): Precio mensual (input con prefijo $ y sufijo ARS/mes) | Tope mensual (input con sufijo "servicios") | KPI de respuesta (input con sufijo "minutos máx.") | Costo unitario derivado (calculado = precio/tope, read-only en cyan)
  4. **Condiciones particulares**: textarea libre
  5. **Resumen comercial** (wiz-summary): anual estimado | atenciones máx./año | SLA acordado | vigencia
- Footer: hint + Cancelar / Guardar contrato

**`MiniMapComponent`** (SVG interactivo):
- ViewBox 100×100, background var(--bg-map)
- Grid de fondo con pattern
- Río (path cyan semitransparente), avenida principal (dashed azul), parques (rect emerald semitransparente), bloques urbanos (rect gris)
- Marcador: círculo rojo dim (r=6) + círculo rojo sólido (r=3) con borde blanco
- Click en el SVG → recalcula lat/lng y mueve el marcador
- Overlay con "POSICIÓN GEOREFERENCIADA" + coordenadas en tiempo real
- Hint "click para fijar"

**`ToggleSwitchComponent`**:
- Input: `on: boolean`, `labelOn: string`, `labelOff: string`
- Output: `changed: EventEmitter<boolean>`
- CSS: `.toggle-switch`, `.toggle-switch__track`, `.toggle-switch__thumb` (transición suave)

**Criterios de aceptación**:
- [ ] MiniMap actualiza marcador al hacer click
- [ ] Coordenadas se reflejan en los inputs de Lat/Lng y viceversa
- [ ] ContractModal calcula en tiempo real: duración, costo unitario, anual estimado
- [ ] Estado del contrato (pills) sincronizado visualmente
- [ ] Dar de baja cambia status en la tabla sin recargar
- [ ] plan-badge usa el color correcto del plan activo

---

### 3.4 Planes Comerciales (`/plans`)

**Objetivo**: Catálogo CRUD de planes de cobertura (B2C e institucionales) con pricing y coberturas configurables.

**Estado actual**: Feature no existe. Crear desde cero.

**Layout principal**:
```
┌──────────────────────────────────────────────┐
│  SCREEN-HEAD: título + 4 KPIs + acciones     │
├──────────────────────────────────────────────┤
│  [PARTICULARES ▶ Individual/Familiar N planes]│
│  [CORPORATIVOS ▶ Instituciones/Área N planes] │
├──────────────────────────────────────────────┤
│  Grid de pricing-cards (auto-fill min 280px) │
└──────────────────────────────────────────────┘
```

**KPIs del header**:
- Particulares (blue)
- Corporativos (cyan)
- Activos (emerald)
- Pausados (muted)

**Big tabs** (`plans-tabs`):
- 2 tabs grandes con icono + título + subtítulo + count
- Tab activo con borde izquierdo azul + fondo blue-dim

**`PricingCard`** (`pricing-card`):
- Ribbon "RECOMENDADO" para planes premium activos (posición absoluta esquina superior derecha)
- Header: tier-badge (dot con glow + texto nivel) + `ToggleSwitchComponent` (sin label) para activar/pausar
- Nombre del plan (h3) + ID mono + modalidad
- Precio mensual grande: `$` + cifra mono + `/ mes`
- Precio anual + porcentaje de descuento si aplica (emerald)
- Descripción (12px, text-secondary)
- Iconos de coberturas activas (grid de hasta 7 íconos en color)
- Footer: Atenciones/mes (valor + entre paréntesis las sin cargo) + Carencia (0 en emerald, Nd días si aplica) + botón "Configurar"
- Card pausada con opacity reducida (`.pricing-card--off`)
- Card vacía al final del grid para crear nuevo plan

**`PlanFormModal`** (Alta/edición, 4 bloques):
- **Bloque 1 — Información general** (step indicador en tier-color):
  - Nombre del plan + Nivel del plan (segmented buttons Básico/Medio/Premium, cada uno en su color)
  - Descripción (textarea)
  - Modalidad (modality-grid: 3 cards con icono + nombre + subtítulo + check si activo)
- **Bloque 2 — Configuración de precios** (step indicador emerald):
  - 4 inputs: mensual (featured, más grande), trimestral, anual, descuento
  - Debajo de trimestral y anual: cálculo automático del ahorro vs. mensual (emerald si hay ahorro)
  - Si modalidad es "familiar": adherent-strip con input de precio por dependiente
- **Bloque 3 — Límites y carencias** (step indicador amber):
  - 3 inputs: Tope mensual + Atenciones sin cargo + Días de carencia
  - Notas contextuales debajo de cada campo (ej. "Sin carencia · cobertura desde día 1" en emerald)
  - Validación: si `freeIncluded > monthlyCap` → texto rojo
- **Bloque 4 — Coberturas incluidas** (step indicador blue):
  - 7 coverage-cards en grid (toggle individual por cobertura)
  - Cada card: icono en color si activo + nombre + subtítulo + mini toggle switch
  - Header de bloque muestra "X/7 ACTIVAS" reactivo

**Criterios de aceptación**:
- [ ] Toggle de activar/pausar plan desde la card (sin abrir modal)
- [ ] PricingCard se actualiza instantáneamente al guardar el modal
- [ ] Alternancia tabs Particulares/Corporativos funcional
- [ ] Cálculos de ahorro se actualizan en tiempo real al tipear
- [ ] Counter de coberturas activas en el header del bloque 4 es reactivo
- [ ] Card vacía siempre al final del grid
- [ ] Ribbon "RECOMENDADO" solo en premium activos

---

### 3.5 InstitutionalEmergencyModal (global)

**Objetivo**: Registrar emergencias provenientes de instituciones corporativas (clientes B2B).

**Trigger**: Botón secundario en el Header (además del botón rojo "Nueva emergencia"). Distinguible del flujo individual.

**Wizard 3 pasos**:

**Paso 1 — Institución y ubicación**:
- Autocomplete de institución: input con icono search → lista de resultados (ícono building, nombre, tipo, área, dirección)
- Al seleccionar: muestra card de confirmación con datos de la institución
- Ubicación específica: input de texto libre ("Aula 104 · 1er piso", "Sector estacionamiento B")
- Dirección se auto-completa con la de la institución (editable)
- Canal de ingreso: 6 botones grandes (Llamada / App móvil / Botón de pánico / Radio / SMS / Aviso presencial)

**Paso 2 — Paciente**:
- Toggle Tipo de paciente: "Miembro afiliado" | "Transeúnte / Visitante"
- Si **Miembro**: autocomplete de miembros de la institución seleccionada (nombre, rol, doc). Al seleccionar → card de confirmación
- Si **Transeúnte**: campos nombre/apellido + DNI + Edad

**Paso 3 — Emergencia**:
- Prioridad: 4 botones grandes (Rojo/Amarillo/Verde/Azul) — nota: el azul "no urgente" es específico del flujo institucional
- Síntomas / motivo de consulta: textarea
- Preview del caso: resumen en cards (institución seleccionada, paciente, dirección, prioridad)

**CTA final**: "Registrar y despachar" → crea emergency con `institutional: true` + `institution` referenciado

**Criterios de aceptación**:
- [ ] Autocomplete de instituciones filtra en tiempo real
- [ ] Autocomplete de miembros filtra solo los de la institución seleccionada
- [ ] Paso 1 requiere institución seleccionada para continuar
- [ ] Paso 2 requiere paciente (miembro seleccionado O datos de transeúnte completos)
- [ ] Preview del paso 3 muestra resumen correcto
- [ ] El modal diferencia visualmente el código azul del resto

---

### 3.6 Personal operativo — Rediseño (`/staff`)

**Objetivo**: Reemplazar el `StaffScreen` simple (lista + detail pane) por una pantalla CRUD completa con paginación, filtros y formulario de alta/edición de profesionales.

**Estado actual**: Existe `StaffComponent` básico. Se reemplaza completamente su lógica y template.

**Layout principal**:
```
┌────────────────────────────────────────────────────┐
│  SCREEN-HEAD: título + 4 KPIs + acciones           │
│  [Reporte de turnos]  [Alta de profesional ▶]      │
├────────────────────────────────────────────────────┤
│  GlassCard: toolbar (search + filtros)             │
│  ─────────────────────────────────────────────────│
│  Tabla: Profesional | Especialidades | Hab. | Estado│
│  ─────────────────────────────────────────────────│
│  Paginación: count + controles de página           │
└────────────────────────────────────────────────────┘
```

**KPIs del header**:
- Plantilla (total de profesionales, mono)
- Activos (emerald)
- Domiciliaria (blue — profesionales con `domiciliary: true`)
- Emergencias (red — profesionales con `emergency: true`)

**Toolbar**:
- Buscador: filtra por nombre completo, matrícula o ID (`P-xxx`)
- Chips Estado: Todos / Activos / Inactivos
- Chips Habilitación: Todas / Domiciliaria / Emergencias

**Tabla de profesionales** (5 columnas):
- **Profesional**: `staff-avatar` (foto o iniciales mono) + nombre completo con prefijo + matrícula + ID en mono
- **Especialidades / Certificaciones**: hasta 5 `spec-chip` con color según grupo (Médica=blue, Operativa=emerald, Certificación=cyan); si hay más de 5 → chip `+N más`
- **Habilitaciones operativas**: 2 `hab-tag` (casa icono → "Domiciliaria" / ambulance → "Emergencias"); cada uno con `data-on` true/false
- **Estado**: `StatusBadge` "Activo" o `.badge-inactive` "Inactivo"
- **Acciones** (⋮): `RowMenuComponent` con Editar / Contactar / línea divisoria / Desactivar|Reactivar (danger)
- Clic en fila → abre `StaffFormModal` en modo edición

**`StaffFormModal`** (Alta/edición, 2 secciones):

Layout: modal fullscreen con step indicators + dos secciones separadas por `form-section__divider`. No es wizard — ambas secciones visibles simultáneamente con scroll.

- **Sección 1 — Datos personales y contacto**:
  - `PhotoUploaderComponent`: avatar circular 80px con foto o iniciales; botón "Subir foto"/"Reemplazar foto"/"Quitar"; acepta PNG/JPG max 2MB
  - Fila 1: select Prefijo (Dr./Dra./Lic./Enf./Tec./Op.) + input Nombre * + input Apellido * + input Matrícula * (mono)
  - Fila 2: input Teléfono + input Email
  - `link-user-card`: botón toggle que crea credenciales de sistema → muestra texto descriptivo + icono shield

- **Sección 2 — Perfil médico y operativo**:
  - `SpecMultiselectComponent`: campo con chips removibles + input de búsqueda + dropdown agrupado (Médica / Operativa / Certificación); al escribir filtra; chips con color por grupo
  - Counter bajo el multiselect: "N elementos seleccionados · incluye certificaciones vigentes"
  - **Hab-cards** (habilitaciones operativas, 2 cards con toggle integrado):
    - "Atención domiciliaria" (casa icon, azul) con descripción
    - "Atención de emergencias" (ambulance icon, rojo) con descripción
  - **Active-strip**: barra full-width con dot animado + texto contextual ("Visible para asignación…" / "No será considerado…") + `ToggleSwitchComponent`

**Catálogo de especialidades** (`SPECIALTIES_CATALOG`): 24 entradas en 3 grupos:
- `Médica`: Clínico, Cardiología, Pediatría, Neonatología, Traumatología, Emergentología, Ginecología, Neurología, Anestesiología, Cirugía General, Medicina Familiar, Geriatría, Psiquiatría
- `Operativa`: Paramédico, Enfermería, Enfermería UTI, Técnico en Emergencias, Despacho médico (EMD)
- `Certificación`: ACLS, BLS, PALS, ATLS, NRP, EMD

**Colores por grupo**:
```typescript
const SPEC_GROUP_COLOR = {
  'Médica':        { bg: 'rgba(59,130,246,0.16)',  fg: 'var(--accent-blue)',    border: 'rgba(59,130,246,0.30)' },
  'Operativa':     { bg: 'rgba(16,185,129,0.16)',  fg: 'var(--accent-emerald)', border: 'rgba(16,185,129,0.30)' },
  'Certificación': { bg: 'rgba(34,211,238,0.16)',  fg: '#0E7490',               border: 'rgba(34,211,238,0.32)' },
};
```

**Criterios de aceptación**:
- [ ] Tabla paginada (PAGE_SIZE=10), misma estructura que PatientsScreen
- [ ] Buscador filtra por nombre, matrícula e ID en tiempo real
- [ ] Chips de estado y habilitación combinables
- [ ] Menú ⋮ cierra al hacer click fuera
- [ ] `StaffFormModal` en modo edición pre-popula todos los campos incluyendo especialidades y hab-cards
- [ ] `SpecMultiselect`: búsqueda filtra por nombre y grupo; chips se agregan/remueven; dropdown muestra grupos
- [ ] `PhotoUploader` muestra preview de la imagen subida; "Quitar" restablece a iniciales
- [ ] `link-user-card` toggle cambia estado visual del icono shield
- [ ] Nuevo profesional aparece en la tabla sin recargar
- [ ] Toggle Activo/Inactivo desde el menú ⋮ se refleja instantáneamente en la tabla
- [ ] KPIs del header se actualizan al cambiar estado de profesionales
- [ ] Sin regresión en los componentes existentes del módulo staff

---

## 4. Cambios en componentes existentes

### 4.1 Sidebar

**Cambios requeridos**:
- [ ] Agregar 4 nuevos nav-items: Eventos (icono calendar, cyan), Pacientes (icono users, blue), Instituciones (icono building, blue), Planes (icono package, cyan)
- [ ] Mantener el orden lógico del sidebar: Ops / Mapa / Flota / Personal / Hospitales → separador → Comms / Analytics → separador → **Eventos / Pacientes / Instituciones / Planes** → separador → Config

**Posición en el sidebar** (definir con el orden del prototipo `app.jsx`):
- `ops`, `map`, `fleet`, `staff`, `hosp` → zona operativa
- `comms`, `kpi` → zona de gestión
- `events`, `patients`, `institutions`, `plans` → zona comercial/administrativa
- `settings` (cog) → zona inferior

### 4.2 Header

**Cambios requeridos**:
- [ ] Agregar botón ghost "Nueva emergencia institucional" junto al botón rojo existente
- [ ] El botón abre `InstitutionalEmergencyModal`
- [ ] En mobile, el botón puede colapsar a icono

### 4.3 Routes (`app.routes.ts`)

```typescript
// Agregar lazy routes:
{ path: 'events',       component: ..., canActivate: [authGuard] },
{ path: 'patients',     component: ..., canActivate: [authGuard] },
{ path: 'institutions', component: ..., canActivate: [authGuard] },
{ path: 'plans',        component: ..., canActivate: [authGuard] },
```

---

## 5. DTOs nuevos

### 5.0 `staff.dto.ts`

```typescript
export type SpecialtyId =
  | 'clinico' | 'cardio' | 'pediatria' | 'neonato' | 'trauma' | 'emerg'
  | 'ginecologia' | 'neurologia' | 'anestesia' | 'cirugia' | 'familiar'
  | 'geriatria' | 'psiquiatria'
  | 'paramedico' | 'enfermeria' | 'enf-uti' | 'tecnico' | 'despacho'
  | 'acls' | 'bls' | 'pals' | 'atls' | 'nrp' | 'emd';

export type SpecialtyGroup = 'Médica' | 'Operativa' | 'Certificación';

export interface SpecialtyDTO {
  id: SpecialtyId;
  name: string;
  group: SpecialtyGroup;
}

export interface StaffDTO {
  id: string;               // 'P-004'
  firstName: string;
  lastName: string;
  prefix: 'Dr.' | 'Dra.' | 'Lic.' | 'Enf.' | 'Tec.' | 'Op.';
  matricula: string;        // 'MP 14887'
  phone?: string;
  email?: string;
  linkedUser: boolean;      // si tiene credenciales de plataforma
  role: string;             // 'Médico ALS' | 'Paramédico' | 'Enfermero' | 'Despachadora' | ...
  unit?: string;            // ID de unidad asignada, '—' si no aplica
  shift?: string;           // '06:00–18:00' | '—'
  exp: number;              // años de experiencia
  avatar: string;           // iniciales, ej: 'MS'
  photoUrl?: string | null; // base64 o URL
  specialties: SpecialtyId[];
  domiciliary: boolean;     // habilitado para atención domiciliaria
  emergency: boolean;       // habilitado para emergencias
  active: boolean;
}
```

### 5.1 `event.dto.ts`

```typescript
export type EventStatus = 'scheduled' | 'inprogress' | 'closed';

export interface EventDTO {
  id: string;               // 'EV-1241'
  name: string;
  type: EventType;          // 'Deportivo' | 'Cultural' | 'Corporativo' | ...
  org?: string;
  responsible?: string;
  attendees: number;
  address: string;
  dateFrom: string;         // 'YYYY-MM-DD'
  timeFrom: string;         // 'HH:mm'
  dateTo: string;
  timeTo: string;
  units: string[];          // ambulance IDs: ['U-04', 'U-09']
  status: EventStatus;
}
```

### 5.2 `patient.dto.ts`

```typescript
export type PatientStatus = 'al-dia' | 'deuda';
export type PlanId = 'basico' | 'familiar' | 'premium' | 'joven' | 'empresa';

export interface DependentDTO {
  id: string;
  name: string;
  dni: string;
  parentesco: string;
  birth?: string;
}

export interface PaymentDTO {
  id: string;
  date: string;
  period: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  method: string;
}

export interface PatientDTO {
  id: string;               // 'AF-1003'
  name: string;
  dni: string;
  type: 'titular' | 'dependiente';
  plan: PlanId;
  status: PatientStatus;
  birth: string;
  gender: 'M' | 'F' | 'X';
  phone?: string;
  email?: string;
  addr?: string;
  sinceMonth?: string;
  deps?: DependentDTO[];
  payments?: PaymentDTO[];
  nextDue?: string;
  nextAmount?: number;
}
```

### 5.3 `institution.dto.ts`

```typescript
export interface ContractDTO {
  code: string;
  plan: string;
  from: string;
  to: string;
  status: 'active' | 'suspended' | 'ended' | 'draft';
  monthlyPrice: number;
  monthlyCap: number;
  kpiMinutes: number;
  conditions?: string;
}

export interface InstitutionDTO {
  id: string;               // 'INS-1001'
  name: string;
  razonSocial: string;
  cuit: string;
  type: InstitutionType;    // 'colegio' | 'universidad' | 'empresa' | 'club' | ...
  status: 'activa' | 'inactiva';
  plan: string;
  email?: string;
  phone?: string;
  adminContact?: string;
  opsContact?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  members?: number;
  sinceMonth?: string;
  contract?: ContractDTO;
}
```

### 5.4 `plan.dto.ts`

```typescript
export interface PlanCoverages {
  emergency: boolean;
  homeVisit: boolean;
  phoneOrientation: boolean;
  homeNursing: boolean;
  monthlyControl: boolean;
  scheduledTransport: boolean;
  interurbanTransport: boolean;
}

export interface PlanDTO {
  id: string;               // 'PL-001'
  name: string;
  description?: string;
  tier: 'basico' | 'medio' | 'premium';
  modality: 'individual' | 'familiar' | 'institucional';
  audience: 'particulares' | 'corporativos';
  pricing: {
    monthly: number;
    quarterly: number;
    annual: number;
    perDependent: number;
    discountPct: number;
  };
  limits: {
    monthlyCap: number;
    freeIncluded: number;
    carencyDays: number;
  };
  coverages: PlanCoverages;
  active: boolean;
}
```

---

## 6. CSS nuevo (agregar a `styles.css`)

Las pantallas nuevas requieren las siguientes clases que NO existen aún en `styles.css`:

### 6.1 Clases de layout de pantallas

```css
/* Plan pricing grid */
.plans-tabs         { /* 2 tabs grandes con icono */ }
.plans-tab          { /* Tab individual con borde izquierdo activo */ }
.plans-grid         { /* Grid auto-fill min(280px, 100%) */ }
.pricing-card       { /* Card de plan con ribbon, toggle, precio */ }
.pricing-card--off  { /* opacity 0.45 */ }
.pricing-card--empty{ /* Card punteada "Crear nuevo" */ }

/* Event calendar */
.cal-card           { /* GlassCard con layout de calendario */ }
.cal-head           { /* Header del calendario con nav */ }
.cal-grid           { /* CSS grid 7 columnas */ }
.cal-cell           { /* Celda del calendario */ }
.cal-event          { /* Chip de evento dentro de celda */ }
.cal-legend         { /* Leyenda de colores por tipo */ }

/* Event list */
.event-list-card    { /* GlassCard con toolbar + lista */ }
.event-list-toolbar { /* Flex row: buscador + chips + select */ }
.event-row          { /* Fila de evento: fecha | banda | info | meta | móviles | status */ }
.event-month        { /* Agrupación por mes */ }

/* Wizard steps */
.wiz-steps          { /* Flex row de pasos con barras de conexión */ }
.wiz-step           { /* Paso individual: círculo + texto */ }
.wiz-bar            { /* Línea de conexión entre pasos */ }

/* Slideover */
.slideover-overlay  { /* Fondo semitransparente fixed */ }
.slideover          { /* Panel lateral right, width 420px, glass-strong */ }
.slideover__head    { /* Header con avatar + nombre + close */ }
.slideover__body    { /* Área con scroll */ }
.slideover__foot    { /* Footer con acciones */ }

/* Status hero */
.status-hero        { /* Bloque verde/rojo de estado de cuenta */ }
.status-hero--ok    { /* Verde emerald */ }
.status-hero--debt  { /* Rojo */ }

/* Patient/Institution table extras */
.patients-card      { /* GlassCard que envuelve tabla + toolbar + pager */ }
.patients-toolbar   { /* Flex con buscador + filtros */ }
.patients-pagination{ /* Footer con count + controles de página */ }
.page-btn           { /* Botón de página individual */ }
.type-tag           { /* Tag Titular/Dependiente */ }
.plan-badge         { /* Badge de plan con dot de color */ }
.dep-count          { /* Chip de count de dependientes */ }
.row-menu           { /* Menú contextual flotante */ }
.dep-row            { /* Fila de dependiente en el modal */ }
.dep-chip           { /* Chip de dependiente en slideover */ }
.plan-grid          { /* Grid de cards de plan en PatientFormModal */ }
.plan-card          { /* Card individual de plan */ }
.due-grid           { /* Grid 2 cols para próximo vencimiento */ }
.due-card           { /* Card de vencimiento */ }
.plan-features      { /* Lista de beneficios del plan */ }

/* Institution extras */
.institution-avatar { /* Avatar de institución con iniciales */ }
.type-pill          { /* Pill de tipo de institución con icono */ }
.badge-inactive     { /* Badge para estado inactiva */ }
.contract-grid      { /* Grid para campos del contrato */ }
.contract-cell-display { /* Read-only display de campo calculado */ }
.plan-select-card   { /* Card de selección de plan en ContractModal */ }
.wiz-summary        { /* Resumen comercial al final del ContractModal */ }
.numeric-input      { /* Wrapper de input con prefijo/sufijo */ }
.ctr-status-pill    { /* Pills de estado de contrato */ }

/* Toggle switch */
.toggle-switch      { /* Wrapper del switch */ }
.toggle-switch__track { /* Track del switch */ }
.toggle-switch__thumb { /* Thumb del switch */ }
.toggle-switch.is-on  { /* Estado activo del switch */ }

/* Mini map */
.mini-map           { /* Contenedor relativo del SVG */ }
.mini-map__overlay  { /* Overlay con coordenadas */ }
.mini-map__hint     { /* Hint "click para fijar" */ }

/* Plans form */
.form-section       { /* Bloque numerado del PlanFormModal */ }
.form-section__head { /* Header del bloque con step circular */ }
.form-section__step { /* Círculo numerado con glow */ }
.form-section__body { /* Contenido del bloque */ }
.form-section__divider { /* Línea divisoria entre bloques */ }
.tier-segment       { /* Segmented buttons de nivel */ }
.modality-grid      { /* Grid de 3 modalidad-cards */ }
.modality-card      { /* Card de modalidad */ }
.pricing-grid       { /* Grid de inputs de pricing */ }
.pricing-input      { /* Wrapper de input de precio */ }
.pricing-input--featured { /* Input mensual, más destacado */ }
.adherent-strip     { /* Fila de precio por dependiente */ }
.limits-grid        { /* Grid de 3 inputs de límites */ }
.coverages-grid     { /* Grid de 7 coverage-cards */ }
.coverage-card      { /* Card de cobertura toggleable */ }
.tier-badge         { /* Badge de nivel en pricing-card */ }
.cov-icon           { /* Icono de cobertura en pricing-card */ }

/* Staff — especialidades multiselect */
.spec-multi         { /* Wrapper del multiselect */ }
.spec-multi__field  { /* Input area con chips + input de texto */ }
.spec-multi__input  { /* Input de búsqueda interno */ }
.spec-chip          { /* Chip de especialidad: bg/fg/border por grupo */ }
.spec-chip--removable { /* Chip con botón X */ }
.spec-chip__x       { /* Botón X del chip */ }
.spec-chip--more    { /* Chip "+N más" */ }

/* Staff — foto uploader */
.photo-uploader     { /* Flex row: avatar + controles */ }
.photo-uploader__avatar { /* Círculo 80px con overlay edit */ }
.photo-uploader__edit { /* Botón edit sobre el avatar */ }

/* Staff — habilitaciones operativas */
.hab-grid           { /* Grid 2 columnas para hab-cards */ }
.hab-card           { /* Card con toggle integrado: flex row */ }
.hab-card__icon     { /* Icono con fondo: --blue o --red */ }
.hab-card__icon--blue { /* Fondo azul semitransparente */ }
.hab-card__icon--red  { /* Fondo rojo semitransparente */ }
.hab-card__toggle   { /* Mini toggle derecho */ }
.hab-card__thumb    { /* Thumb del toggle */ }
.hab-tag            { /* Tag inline en tabla: casa+texto o ambulance+texto */ }
.hab-tag--red       { /* Variante roja para emergencias */ }

/* Staff — active strip */
.active-strip       { /* Barra full-width con dot + texto + toggle */ }
.active-strip__pulse{ /* Contenedor del dot animado */ }

/* Staff — link user card */
.link-user-card     { /* Botón toggle de credenciales */ }
.link-user-card__check { /* Checkbox custom del card */ }

/* Staff — avatar en tabla */
.staff-avatar       { /* Avatar circular 34px con foto o iniciales */ }

/* Event coverage form */
.event-pool         { /* Lista de ambulancias disponibles */ }
.event-pool-row     { /* Fila de ambulancia disponible */ }
.event-chip         { /* Chip de ambulancia asignada */ }
.event-chip__remove { /* Botón remove del chip */ }
.event-assigned     { /* Contenedor de asignadas */ }
.event-row__type    { /* Badge de tipo de evento en event-row */ }
.filter-chip        { /* Chip de filtro (ya existe en comunicaciones, verificar) */ }
.view-switch        { /* Toggle lista/calendario */ }
.view-switch__btn   { /* Botón del toggle */ }
.duration-pill      { /* Pill de duración calculada (mono, centered) */ }

/* Institutional modal */
.autocomplete           { /* Wrapper de input con dropdown */ }
.autocomplete__input    { /* Row de input con icono */ }
.autocomplete__list     { /* Lista de resultados */ }
.autocomplete__row      { /* Fila de resultado */ }
.patient-tabs           { /* Tabs de tipo de paciente en el modal */ }
.patient-tab            { /* Tab individual M/F/X */ }
.addr-input             { /* Input con icono de pin (ya puede existir, verificar) */ }
```

---

## 7. Tasks de implementación

### FASE A — Infraestructura común (implementar primero)

#### TA.1: Crear DTOs nuevos
- **Archivos**: `event.dto.ts`, `patient.dto.ts`, `institution.dto.ts`, `plan.dto.ts`
- **Verificación**: Sin errores de TypeScript

#### TA.2: Crear componentes compartidos nuevos
- `toggle-switch.component.ts` (input `on/labelOn/labelOff`, output `changed`)
- `pagination.component.ts` (inputs: `page`, `totalPages`, `totalItems`, `pageSize`; output: `pageChange`)
- `row-menu.component.ts` (input `items: MenuItem[]`; output `action`)
- `wizard-steps.component.ts` (input `steps: WizardStep[]`, `current: number`; output `stepChange`)
- `slideover.component.ts` (input `open`, `width`; output `closed`)
- `mini-map.component.ts` (inputs `lat`, `lng`; output `positionChange`)
- `spec-multiselect.component.ts` (input `value: SpecialtyId[]`, output `valueChange`; catálogo interno)
- `photo-uploader.component.ts` (input `initials`, `photoUrl`; output `photoChange: string | null`)
- **Verificación**: Cada componente compila y se puede importar sin errores

#### TA.3: Agregar CSS nuevo a `styles.css`
- Agregar todas las clases listadas en la sección 6
- **Verificación**: Sin errores de CSS. Clases visibles en DevTools

#### TA.4: Agregar rutas nuevas a `app.routes.ts`
- 4 rutas lazy con `authGuard`
- **Verificación**: Navegar manualmente a cada ruta → pantalla carga (aunque sea placeholder)

#### TA.5: Actualizar Sidebar con 4 nuevos ítems
- **Archivo**: `src/app/layout/sidebar/sidebar.component.ts`
- Orden: zona comercial/admin separada por `hr-thin` del resto
- **Verificación**: 4 nuevos ítems visibles, activos al hacer clic, sin romper los existentes

#### TA.6: Actualizar Header con botón institucional
- **Archivo**: `src/app/layout/header/header.component.ts`
- Output nuevo: `newInstitutionalEmergency = output<void>()`
- **Verificación**: Botón visible junto al botón rojo existente

---

### FASE B — Pantallas (una por sprint, en este orden)

#### TB.0: StaffScreen — Rediseño completo

**Razón del orden**: Es una pantalla ya existente que necesita CRUD completo antes de comenzar con las nuevas features. Comparte los mismos componentes compartidos (Pagination, RowMenu, ToggleSwitch) que usan las pantallas nuevas, así que valida la infraestructura primero.

- Reemplazar template y lógica de `staff.component.ts` con tabla paginada + filtros + KPI header
- Crear `staff-form-modal.component.ts` (2 secciones: datos personales + perfil médico)
- Crear `spec-multiselect.component.ts` (dropdown agrupado + chips con color por grupo)
- Crear `photo-uploader.component.ts` (avatar + file input + preview)
- Agregar `SPECIALTIES_CATALOG` y `SPEC_GROUP_COLOR` a `staff.mock.ts`
- Agregar `STAFF_FULL_SEED` (14 profesionales) con el tipo `StaffDTO`
- **Verificación**: Buscar/filtrar, paginar, abrir modal en alta y edición, agregar/remover especialidades, toggle habilitaciones, activar/desactivar desde menú ⋮

#### TB.1: PlansScreen + PlanFormModal

**Razón del orden**: Es la más autónoma, solo datos locales, sin dependencias de otras features nuevas.

- Crear `plans.component.ts` con big tabs + plans-grid
- Crear `plan-form-modal.component.ts` con 4 bloques y validaciones
- Crear `pricing-card.component.ts` (o inline en plans si no se reutiliza)
- Crear API mock `plans.api.ts` → devuelve `PLANS_SEED`
- **Verificación**: Listar planes, alternar tabs, toggle activo/pausado, crear/editar plan completo

#### TB.2: PatientsScreen + PatientFormModal + PatientDetailSlideover

- Crear `patients.component.ts` con tabla, toolbar, paginación
- Crear `patient-form-modal.component.ts` (2 tabs, deps dinámicos)
- Crear `patient-detail-slideover.component.ts` (5 secciones)
- Crear `patients.api.ts` → devuelve `PATIENTS_SEED`
- **Verificación**: Buscar, filtrar, paginar, abrir modal alta, editar, ver slideover, registrar pago (mock)

#### TB.3: InstitutionsScreen + InstitutionFormModal + ContractModal

- Crear `institutions.component.ts` con tabla, toolbar, paginación
- Crear `institution-form-modal.component.ts` (2 tabs + MiniMap)
- Crear `contract-modal.component.ts` con cálculos reactivos
- Crear `institutions.api.ts` → devuelve `INSTITUTIONS_SEED`
- **Verificación**: Tabla con tipos/planes/estados, abrir modal, interactuar con mini-map, abrir/guardar contrato, dar de baja

#### TB.4: EventCoverageScreen + NewEventModal + EventDetailPopover

- Crear `events.component.ts` con toggle vista + ScreenHead
- Crear `event-list.component.ts` (lista agrupada por mes)
- Crear `event-calendar.component.ts` (grilla mensual navegable)
- Crear `new-event-modal.component.ts` (wizard 3 pasos + pool de ambulancias)
- Crear `event-detail-popover.component.ts`
- Crear `events.api.ts` → devuelve `SEED_EVENTS`
- **Verificación**: Alternar lista/calendario, navegar meses, crear evento wizard completo, ver detalle

#### TB.5: InstitutionalEmergencyModal (global)

- Crear `institutional-emergency-modal.component.ts` (wizard 3 pasos)
- Agregar al `ShellComponent` junto con el `NewEmergencyModal` existente
- Conectar con `Header` via output
- Verificar que al submit crea una emergencia con `institutional: true`
- **Verificación**: Botón en header abre modal, wizard 3 pasos funciona, crea emergencia en el feed

---

### FASE C — Integración backend (cuando existan los endpoints)

#### TC.1: APIs reales para cada feature

> **Nota**: El backend aún no tiene estos endpoints (son features nuevas del producto). Implementar con mock aislado en `mock/` y estructura lista para conectar a API real. Los mocks deben cumplir el patrón existente de `data-access/mock/`.

```
mock/
├── events.mock.ts       # SEED_EVENTS tipado con EventDTO
├── patients.mock.ts     # PATIENTS_SEED tipado con PatientDTO
├── institutions.mock.ts # INSTITUTIONS_SEED tipado con InstitutionDTO
└── plans.mock.ts        # PLANS_SEED tipado con PlanDTO
```

Los servicios de API deben tener la firma correcta para que cuando exista el endpoint, solo se cambie el body del método sin tocar los componentes.

---

## 8. Convenciones (hereda de SDD v1)

- Todos los tokens de color via `var(--token)` — prohibido hex hardcodeado
- Signals: `input.required<T>()`, `output<T>()`, `signal<T>()`, `computed<T>()`
- Templates inline (backticks), NO archivos `.html` separados
- Selectores con prefijo `emx-`
- Control flow de Angular 17+: `@if`, `@for`, `@let`
- Mocks en `data-access/mock/`, nunca mezclados con lógica productiva
- `font-mono` para datos numéricos, `font-sans` para narrativa
- Sin `console.log` en código productivo
- Sin `any` — TypeScript strict

---

## 9. Criterios de aceptación final (adicionales a SDD v1)

El proyecto se considera **APROBADO v2** cuando, además de los criterios del SDD v1:

- [ ] Sidebar tiene los 4 nuevos ítems y navega correctamente
- [ ] Header tiene botón de emergencia institucional funcional
- [ ] PlansScreen: CRUD completo de planes, toggle activo/pausado desde card
- [ ] PatientsScreen: tabla con búsqueda/filtros/paginación, alta, edición, slideover con historial
- [ ] InstitutionsScreen: tabla, modal con mini-map interactivo, contrato con cálculos reactivos
- [ ] EventCoverageScreen: ambas vistas funcionales, wizard de nuevo evento, detalle de evento
- [ ] InstitutionalEmergencyModal: wizard 3 pasos, autocomplete de instituciones y miembros
- [ ] StaffScreen rediseñado: tabla paginada con especialidades, habilitaciones, filtros por estado y habilitación, modal con `SpecMultiselect` y `PhotoUploader`
- [ ] `SpecMultiselect` funciona: busca, agrupa por categoría, chips coloreados, removibles
- [ ] `PhotoUploader` muestra preview y permite quitar la foto
- [ ] Sin regresiones en las pantallas existentes (Ops, Flota, Personal, Hospitales, Comms, Analytics)
- [ ] Todos los componentes compartidos nuevos (ToggleSwitch, Pagination, RowMenu, Slideover, MiniMap, WizardSteps) reutilizables y testeables en aislamiento
- [ ] Mocks aislados en `data-access/mock/` con tipos correctos, listos para swap por API real
