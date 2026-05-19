# SDD — Internación Domiciliaria: Frontend Dashboard

**Versión:** 1.0
**Fecha:** 2026-05-19
**Stack:** Angular 21 (standalone), Tailwind CSS, Signals, RxJS HTTP, JWT
**Backend de referencia:** `/backend` — 42 endpoints de internación implementados (Chunks H–E)

---

## 0. Resumen ejecutivo

El backend de Internación Domiciliaria expone 42 endpoints REST cubriendo el ciclo completo: creación desde ticket, evaluación, plan de cuidado, equipo tratante, visitas, prescripciones, insumos, autorizaciones, adjuntos, consentimientos, cierre, alertas y reportes.

Este SDD define el frontend Angular que consume esos endpoints, organizado en 14 pantallas, siguiendo las convenciones del proyecto emerx-frontend: standalone components, inline templates con Tailwind, signals, `inject()` DI, y lazy loading.

Cada pantalla incluye un prompt detallado para maquetar en Google Stitch.

---

## 1. Arquitectura frontend

### 1.1 Estructura de archivos

```
src/app/
├── features/
│   └── internacion/
│       ├── internacion.routes.ts          # Lazy-loaded routes
│       ├── internacion-list.component.ts   # Dashboard / listado
│       ├── internacion-create.component.ts # Nueva internación (desde ticket)
│       ├── internacion-detail.component.ts # Detalle (layout padre con tabs)
│       ├── tabs/
│       │   ├── overview-tab.component.ts   # Vista general + timeline
│       │   ├── evaluacion-tab.component.ts # Evaluación domiciliaria
│       │   ├── plan-tab.component.ts       # Plan de cuidado + medicamentos + equipamiento
│       │   ├── equipo-tab.component.ts     # Equipo tratante
│       │   ├── visitas-tab.component.ts    # Visitas programadas
│       │   ├── prescripciones-tab.component.ts  # Prescripciones
│       │   ├── signos-tab.component.ts     # Signos vitales (gráfico)
│       │   ├── insumos-tab.component.ts    # Insumos consumibles
│       │   ├── autorizaciones-tab.component.ts  # Autorizaciones del financiador
│       │   ├── adjuntos-tab.component.ts   # Adjuntos + consentimientos
│       │   └── cierre-tab.component.ts     # Cierre / alta
│       └── modals/
│           ├── generar-visitas-modal.component.ts
│           ├── asignar-equipo-modal.component.ts
│           ├── solicitar-insumo-modal.component.ts
│           ├── solicitar-autorizacion-modal.component.ts
│           └── cerrar-internacion-modal.component.ts
├── data-access/
│   ├── api/
│   │   └── internacion.api.ts             # Servicio HTTP (42 endpoints)
│   └── dto/
│       └── internacion.dto.ts             # Interfaces TypeScript
├── core/
│   └── stores/
│       └── internacion.store.ts           # Signal store (activas, seleccionada)
└── app.routes.ts                          # + ruta 'internacion' lazy
```

### 1.2 Convenciones

| Aspecto | Convención |
|---------|------------|
| Componentes | Standalone, inline template, signals |
| Inyección | `inject()` funcional |
| HTTP | `HttpClient` → `Observable<T>` |
| Reactividad | `signal()`, `computed()`, `effect()` |
| Estado global | `core/stores/internacion.store.ts` |
| Estilos | Tailwind utility + CSS design system (glassmorphism) |
| Formularios | `ReactiveFormsModule` |
| Gráficos | `shared/components/charts/` (bars-chart, donut-chart, sparkline) |
| Modales | `shared/components/modal-shell/` |
| Estados UI | `loading-state`, `error-state`, `empty-state` |

### 1.3 Routing

```typescript
// app.routes.ts
{
  path: 'internacion',
  canActivate: [authGuard],
  loadChildren: () => import('./features/internacion/internacion.routes')
    .then(m => m.INTERNACION_ROUTES)
}

// internacion.routes.ts
export const INTERNACION_ROUTES: Routes = [
  { path: '', component: InternacionListComponent },           // dashboard
  { path: 'nueva', component: InternacionCreateComponent },     // crear desde ticket
  { path: ':id', component: InternacionDetailComponent },       // detalle con tabs
];
```

---

## 2. Pantallas — definición y prompts para Google Stitch

Cada pantalla se describe con: propósito, endpoints consumidos, componentes visuales clave, estados (loading/empty/error), y un prompt listo para Google Stitch.

---

### 2.1 Dashboard — Listado de Internaciones Activas

**Ruta:** `/internacion`
**Componente:** `InternacionListComponent`

**Propósito:** Vista principal con KPIs (total activas, visitas pendientes hoy, alertas abiertas) y tabla/listado de internaciones activas con filtros por estado (ADMITIDA, EVALUADA, ACTIVA, SUSPENDIDA) y búsqueda por paciente.

**Endpoints:**
- `GET /api/v1/internaciones/activas`
- `GET /api/v1/internaciones/reportes/visitas-pendientes`
- `GET /api/v1/alertas/abiertas`

**Estados:**
- **Loading:** 3 skeletons de KPI cards (glass-card con shimmer) + tabla con 5 rows fantasma
- **Empty:** `empty-state` component: "No hay internaciones activas" + botón "Nueva Internación"
- **Error:** `error-state` component con botón "Reintentar"
- **Data:** KPIs + tabla con filas clickeables

**Componentes:**
```
┌─────────────────────────────────────────────────────────┐
│  Internación Domiciliaria                    [+ Nueva]   │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Activas  │  │ Visitas  │  │ Alertas  │              │
│  │    12    │  │ hoy: 5   │  │ abiertas │              │
│  │  KPI     │  │  KPI     │  │    3     │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                         │
│  [Buscar paciente...]  [Estado ▼]                       │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │ Paciente      │ Estado   │ Inicio    │ Equipo  │    ││
│  │─────────────────────────────────────────────────────││
│  │ Juan Pérez    │ ACTIVA   │ 15/05/26  │ 3 prof. │ →  ││
│  │ María Gómez   │ EVALUADA │ 16/05/26  │ 2 prof. │ →  ││
│  │ Carlos Ruiz   │ ADMITIDA │ 18/05/26  │ —       │ →  ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

**Prompt para Google Stitch:**
> Design a dark-themed dashboard screen for "Internación Domiciliaria" (Home Hospitalization). 
> 
> Top section: page title "Internación Domiciliaria" on the left, a glassmorphism "+ Nueva" button on the right with a subtle emerald glow. Below the title, three KPI cards in a row using the existing glass-card style: "Activas" showing number 12, "Visitas pendientes hoy" showing 5, "Alertas abiertas" showing 3 with an amber warning dot.
> 
> Middle section: a search input with placeholder "Buscar paciente..." and a dropdown filter for estado (Todos, ADMITIDA, EVALUADA, ACTIVA, SUSPENDIDA). Use glass input style with subtle border.
> 
> Bottom section: a data table with glassmorphism rows. Columns: Paciente (name + small avatar icon), Estado (colored status badge: green for ACTIVA, blue for EVALUADA, yellow for ADMITIDA, orange for SUSPENDIDA), Fecha Inicio (dd/mm/aa format), Equipo (count of assigned professionals), and a right arrow "→" for navigation. Each row is clickable with a subtle hover glow effect. The table uses a dark glass card container with thin border.
> 
> Use the project's design system: Inter font, dark background (--bg-deep), glass surfaces (--surface-glass), status colors (--accent-emerald, --accent-blue, --accent-amber).

---

### 2.2 Nueva Internación (desde ticket)

**Ruta:** `/internacion/nueva`
**Componente:** `InternacionCreateComponent`

**Propósito:** Iniciar una internación desde un ticket de asistencia existente. Formulario de 2 pasos: (1) seleccionar ticket, (2) completar datos clínicos.

**Endpoints:**
- `POST /api/v1/internaciones/desde-ticket`
- (Buscar tickets activos — endpoint existente en `emergency.api.ts`)

**Campos del formulario:**
| Campo | Tipo | Validación | Paso |
|-------|------|-----------|------|
| `ticketId` | select/search | Requerido | 1 |
| `diagnosticoPrincipal` | textarea | Requerido | 2 |
| `direccionInternacion` | text | Requerido | 2 |
| `familiarResponsable` | text | Requerido | 2 |
| `telefonoEmergencia` | text | Requerido | 2 |
| `observaciones` | textarea | Opcional | 2 |

**Estados:**
- **Ticket selection:** lista de tickets activos del paciente, con búsqueda
- **Form step 2:** preview del paciente seleccionado + formulario
- **Submitting:** botón con spinner, deshabilitado
- **Success:** toast + redirección a `/internacion/:id`
- **Error:** mensaje de error (ej: "Paciente ya tiene internación activa")

**Prompt para Google Stitch:**
> Design a two-step creation screen for starting a new "Internación Domiciliaria" from an existing emergency ticket.
> 
> Step indicator at top: "1. Seleccionar Ticket" → "2. Datos Clínicos" with the first step highlighted.
> 
> Step 1: A searchable list of active tickets. Each ticket card shows: ticket ID, patient name (bold), symptoms description (truncated), urgency level badge (ROJO/AMARILLO/VERDE), and creation time. Cards are glassmorphism style with hover glow. User selects one and clicks "Continuar".
> 
> Step 2: Left side shows a patient summary card (name, age, DNI, health insurance logo). Right side shows the clinical form with labeled inputs: Diagnóstico Principal (textarea, 3 rows), Dirección de Internación (text), Familiar Responsable (text), Teléfono de Emergencia (text), Observaciones (textarea, optional). All inputs use glass style.
> 
> Bottom: "Cancelar" text button (left) and "Iniciar Internación" primary button with emerald glow (right). The primary button shows a loading spinner while submitting.
> 
> Use the project's design system: Inter font, dark background, glass inputs, status badges.

---

### 2.3 Detalle de Internación — Layout padre con tabs

**Ruta:** `/internacion/:id`
**Componente:** `InternacionDetailComponent`

**Propósito:** Layout maestro con header de paciente + tabs de navegación para todas las secciones de seguimiento.

**Endpoints:**
- `GET /api/v1/internaciones/{id}/timeline`
- `GET /api/v1/internaciones/{id}/contactos-utiles`

**Header:**
```
┌─────────────────────────────────────────────────────────┐
│  ← Volver    Juan Pérez · 45 años · DNI 30123456        │
│  OSECAC · Internación #1042                             │
│                                                         │
│  [ESTADO: ACTIVA]  Desde: 15/05/2026  ·  4 días         │
│                                                         │
│  [General] [Evaluación] [Plan] [Equipo] [Visitas]       │
│  [Prescripciones] [Signos] [Insumos] [Autorizaciones]   │
│  [Adjuntos] [Cierre]                              [···] │
└─────────────────────────────────────────────────────────┘
```

**Tabs (11):** General, Evaluación, Plan, Equipo, Visitas, Prescripciones, Signos, Insumos, Autorizaciones, Adjuntos, Cierre.

**Prompt para Google Stitch:**
> Design the header section of an "Internación Domiciliaria" detail page. This is NOT the full page — just the header + tab navigation bar.
> 
> Top bar: "← Volver" text link on left. Patient identity card in the center: full name (bold), age, DNI, health insurance logo/name (OSECAC), Internación number (#1042) in a muted label.
> 
> Status row below: a colored status badge "ACTIVA" (emerald green) with a subtle glow. Next to it: "Desde: 15/05/2026 · 4 días" in secondary text.
> 
> Tab navigation bar: horizontal scrollable row of pill-shaped tabs. Active tab has a highlighted background. Tabs: General, Evaluación, Plan de Cuidado, Equipo, Visitas, Prescripciones, Signos Vitales, Insumos, Autorizaciones, Adjuntos, Cierre. The active tab is "General" (first one).
> 
> A subtle timeline indicator on the far right showing key events count "···" button.
> 
> Use Inter font, dark background, glassmorphism effects, the status badge uses --accent-emerald with soft glow.

### 2.4 Tab: General / Vista general

**Componente:** `OverviewTabComponent`

**Propósito:** Timeline de eventos + datos clave de un vistazo + contactos útiles.

**Endpoints:**
- `GET /api/v1/internaciones/{id}/timeline`
- `GET /api/v1/internaciones/{id}/contactos-utiles`

**Secciones:**
1. **Barra de acciones rápidas:** botones glass para acciones frecuentes (registrar evento, agregar nota, generar visita).
2. **Timeline:** lista vertical de eventos ordenados por fecha descendente. Cada item muestra: tipo (icono + color), descripción, fecha/hora relativa ("hace 2h"), profesional que registró.
3. **Contactos útiles:** tarjeta lateral con contactos del equipo + familiar responsable + teléfono de emergencia.

**Prompt para Google Stitch:**
> Design the "General" overview tab for an Internación Domiciliaria detail page.
> 
> Top: action bar with 3 glass buttons in a row: "Registrar Evento" (with + icon), "Agregar Nota" (with note icon), "Generar Visitas" (with calendar icon). Each button has a subtle icon and label.
> 
> Main content area split 70/30:
> 
> Left (70%): Vertical timeline. Title "Línea de Tiempo". Each event is a row with a colored dot on the left connected by a vertical line to the next event. Event types have distinct colors: CAMBIO_ESTADO (blue), EVALUACION (purple), PRESCRIPCION (cyan), VISITA (emerald), EVENTO_CRITICO (red). Each event shows: icon + type label, description text, relative timestamp ("hace 2 horas"), and professional name. Most recent event at top with a subtle glow highlight.
> 
> Right (30%): "Contactos Útiles" card. Shows 3-4 contact entries in a list: Familiar Responsable (name + phone icon), Teléfono Emergencia (number + phone icon), Médico Coordinador (name + phone icon), Enfermero/a asignado/a (name + phone icon). Each row has a quick-call icon button on the right.
> 
> Use glassmorphism cards, dark theme, Inter font.

### 2.5 Tab: Evaluación Domiciliaria

**Componente:** `EvaluacionTabComponent`

**Propósito:** Mostrar/completar la evaluación del entorno domiciliario. Solo editable si estado = ADMITIDA.

**Endpoints:**
- `POST /api/v1/internaciones/{id}/evaluacion` (si no existe)
- Datos vienen en `GET timeline` o endpoint dedicado

**Secciones:**
1. Datos del evaluador (profesional, fecha)
2. Resultado de evaluación (Apto / Apto con observaciones / No apto)
3. Puntajes: accesibilidad (1-5), higiene (1-5), seguridad zona (1-5)
4. Servicios: electricidad, agua, espacio adecuado (booleans)
5. Observaciones del entorno + soporte familiar

**Prompt para Google Stitch:**
> Design the "Evaluación Domiciliaria" tab. This shows the home environment assessment for a home hospitalization case.
> 
> If no evaluation exists yet, show a form. If it exists, show a read-only view with edit option.
> 
> Form layout in a glass card:
> - Header: "Evaluación Domiciliaria" title + evaluator name and date (if editing, date is auto-filled)
> - Result section: 3 radio-style cards for "Apto", "Apto con observaciones", "No apto". Selected card has a colored border (emerald, amber, red respectively).
> - Score section: 3 rows with labels "Accesibilidad", "Condiciones de Higiene", "Seguridad de Zona". Each has a 1-5 slider/star rating with emerald fill.
> - Conditions section: 3 toggle switches for "Electricidad", "Agua potable", "Espacio adecuado". Green when on.
> - Two textarea fields: "Observaciones del entorno" and "Soporte familiar" with character count.
> - Bottom: "Guardar Evaluación" button (emerald glow).
> 
> If read-only: all fields are displayed as text with labels. An "Editar" button in the top-right corner.
> 
> Use glassmorphism, dark theme, Inter font.

### 2.6 Tab: Plan de Cuidado

**Componente:** `PlanTabComponent`

**Propósito:** Definir/ver plan de cuidado con medicamentos y equipamiento requerido. Solo editable si estado = EVALUADA.

**Endpoints:**
- `POST /api/v1/internaciones/{id}/plan-cuidado`
- Historial de cambios vía `GET /api/v1/internaciones/{id}/historial-plan`

**Secciones:**
1. **Datos generales:** objetivo, descripción, frecuencia de visitas, duración estimada (días), cuidadores necesarios, costo diario.
2. **Medicamentos:** tabla de `PlanCuidadoMedicamento` (medicamento, dosis, frecuencia, vía). Botón "Agregar medicamento".
3. **Equipamiento:** tabla de `PlanCuidadoEquipamiento` (producto, cantidad, observación). Botón "Agregar equipamiento".
4. **Historial de cambios:** lista colapsable de versiones anteriores del plan.

**Prompt para Google Stitch:**
> Design the "Plan de Cuidado" tab with a comprehensive care plan form in 3 sections.
> 
> Section 1 — "Datos Generales": grid of labeled inputs. Row 1: Objetivo (text, full width). Row 2: Descripción General (textarea, full width). Row 3: Frecuencia de Visitas (text, e.g. "Diaria"), Duración Estimada (number, days), Cuidadores Necesarios (number). Row 4: Costo Diario (currency input, ARS $), Observación Familia (text).
> 
> Section 2 — "Medicamentos": A compact table. Columns: Medicamento (select dropdown), Dosis (text, e.g. "500mg"), Frecuencia (text, e.g. "c/8hs"), Vía (select: Oral/IV/IM/SC), Acciones (trash icon). Below the table: "+ Agregar Medicamento" button with dashed border. Each row has glass styling.
> 
> Section 3 — "Equipamiento Requerido": Similar compact table. Columns: Producto (select dropdown), Cantidad (number), Observación (text), Acciones (trash). "+ Agregar Equipamiento" button below.
> 
> Right sidebar: "Historial de Cambios" card showing previous plan versions in a collapsible list. Each entry shows date, reason for change, and expandable before/after diff.
> 
> Bottom: "Guardar Plan" primary button (emerald). If viewing read-only, show "Editar Plan" instead.
> 
> Use glassmorphism cards, dark theme, Inter font.

### 2.7 Tab: Equipo Tratante

**Componente:** `EquipoTabComponent`

**Propósito:** Gestionar profesionales asignados a la internación con sus roles y disciplinas.

**Endpoints:**
- `POST /api/v1/internaciones/{id}/equipo`

**Secciones:**
1. Lista de miembros actuales: foto/avatar, nombre, rol (Médico, Enfermero, Kinesiólogo, etc.), disciplina (MEDICINA, ENFERMERIA, KINESIOLOGIA, etc.), fecha asignación, disponibilidad 24x7.
2. Botón "Asignar profesional" → modal de selección.

**Prompt para Google Stitch:**
> Design the "Equipo Tratante" tab showing assigned healthcare professionals.
> 
> Header: "Equipo Tratante" title + "+ Asignar Profesional" button (glass, emerald glow).
> 
> Professional cards in a 2-column grid. Each card is a glass card showing:
> - Left: circular avatar with initials (e.g., "JP" for Juan Pérez)
> - Center: full name (bold), role + discipline badges. Role is a colored pill (e.g., "Médico" in blue, "Enfermero" in cyan, "Kinesiólogo" in purple). Discipline is a smaller muted badge below.
> - Right column: "Desde: 15/05/26" date, "24x7" badge if true (emerald), contact phone number with phone icon.
> 
> Empty state (no team assigned yet): "Aún no hay profesionales asignados" with a dashed-border card and "+ Asignar primer profesional" CTA.
> 
> Use the project's avatar pattern, glass cards, status badges.

### 2.8 Tab: Visitas Programadas

**Componente:** `VisitasTabComponent`

**Propósito:** Ver, generar y gestionar visitas programadas. Acciones: iniciar, finalizar, reprogramar.

**Endpoints:**
- `POST /api/v1/internaciones/{id}/visitas/generar`
- `POST /api/v1/visitas/{id}/iniciar`
- `POST /api/v1/visitas/{id}/finalizar`
- `POST /api/v1/visitas/{id}/reprogramar`

**Secciones:**
1. **Generar visitas:** formulario con rango de fechas (desde/hasta) + tipo de visita default (select: MÉDICA, ENFERMERÍA, KINESIOLOGÍA, CONTROL_GENERAL, etc.)
2. **Calendario / lista:** visitas agrupadas por día. Cada visita muestra hora, tipo, profesional asignado, estado (badge: PROGRAMADA/EN_CURSO/REALIZADA/VENCIDA), dirección, contacto en sitio.
3. **Acciones por visita:** Iniciar (solo PROGRAMADA), Finalizar (solo EN_CURSO), Reprogramar (abre modal con nueva fecha + motivo).

**Prompt para Google Stitch:**
> Design the "Visitas Programadas" tab.
> 
> Top section: a compact form row. Date range picker ("Desde" and "Hasta" date inputs), Tipo de Visita dropdown (MÉDICA, ENFERMERÍA, KINESIOLOGÍA, PSICOLOGÍA, NUTRICIÓN, CONTROL_GENERAL), and "Generar Visitas" button (emerald glow). All in one horizontal row inside a glass card.
> 
> Below: visits grouped by day in a timeline-like list. Each day is a section header (e.g., "Lunes 19 de Mayo") with date. Under each day, visit cards:
> - Left: time (e.g., "09:00") in bold
> - Center: tipo badge (colored pill), professional name (if assigned, otherwise "Sin asignar" in muted text)
> - Right: status badge (PROGRAMADA=blue, EN_CURSO=amber with pulse animation, REALIZADA=emerald, VENCIDA=red)
> - Below center: address and contact person in smaller text
> - Hover reveals action buttons: ▶ Iniciar (blue), ✓ Finalizar (emerald), ↻ Reprogramar (amber). Only relevant actions shown per state.
> 
> Bottom of each visit card: "Dirección: Av. Siempre Viva 742 · Contacto: Juan Pérez · +54 11 1234-5678"
> 
> Use glassmorphism cards, dark theme, status badges with animations for EN_CURSO.

### 2.9 Tab: Prescripciones

**Componente:** `PrescripcionesTabComponent`

**Propósito:** Gestionar prescripciones continuas y registrar administraciones de medicamentos.

**Endpoints:**
- `POST /api/v1/internaciones/{id}/prescripciones`
- `PUT /api/v1/prescripciones/{id}/suspender`
- `POST /api/v1/prescripciones/{id}/administraciones`
- `GET /api/v1/internaciones/{id}/prescripciones`

**Secciones:**
1. Lista de prescripciones activas: medicamento, dosis, vía, frecuencia, fecha inicio, estado (ACTIVA/SUSPENDIDA).
2. Botón "Nueva Prescripción" → formulario inline/desplegable.
3. Cada prescripción expandible muestra historial de administraciones (fecha, hora, profesional, observación).
4. Botón "Registrar Administración" por prescripción.

**Prompt para Google Stitch:**
> Design the "Prescripciones" tab for ongoing medication management.
> 
> Top: "+ Nueva Prescripción" button (emerald glow).
> 
> Prescription cards stacked vertically. Each card (glass style) shows:
> - Header row: medicamento name (bold) + "ACTIVA" badge (emerald) or "SUSPENDIDA" badge (red, strikethrough style)
> - Info row: "Dosis: 500mg · Vía: Oral · Frecuencia: c/8hs"
> - Dates row: "Inicio: 15/05/26" + (if suspended) "Fin: 18/05/26 · Motivo: alta médica"
> - Actions row: "Registrar Administración" button (small, glass), "Suspender" button (small, red hover)
> - Expandable section (chevron toggle): "Historial de Administraciones" table. Columns: Fecha/Hora, Profesional, Observación. Most recent first.
> 
> New prescription form (expandable inline): medicamento select, dosis text, vía select (Oral/IV/IM/SC), frecuencia text, indicaciones textarea, fecha inicio auto-filled. "Guardar" + "Cancelar" buttons.
> 
> Use glassmorphism cards, dark theme, status badges.

### 2.10 Tab: Signos Vitales

**Componente:** `SignosTabComponent`

**Propósito:** Visualizar serie temporal de signos vitales registrados durante las visitas.

**Endpoints:**
- `GET /api/v1/internaciones/{id}/signos-vitales/serie`

**Secciones:**
1. Selector de signo vital a graficar: Temperatura, Frecuencia Cardíaca, Presión Sistólica/Diastólica, Saturación O2, Frecuencia Respiratoria.
2. Gráfico de línea temporal (usar `bars-chart` o un componente simple SVG/Canvas).
3. Tabla debajo del gráfico con los datos crudos (fecha, valor, visita asociada).

**Prompt para Google Stitch:**
> Design the "Signos Vitales" tab with a time-series chart.
> 
> Top: a horizontal pill selector for vital sign type: "Temperatura", "FC", "Presión Arterial", "SatO2", "FR". Selected pill is highlighted with emerald.
> 
> Main area: a line/area chart showing the selected vital sign over time. X-axis: dates (dd/mm). Y-axis: value range appropriate for the metric (e.g., 35-42°C for temperature, 60-180 for HR). The line uses an emerald-to-transparent gradient fill. Data points are small circles on hover show exact value + timestamp. Use the project's existing chart patterns (bars-chart component style adapted).
> 
> Below chart: a compact data table. Columns: Fecha/Hora, Valor, Unidad, Visita #. Rows alternate subtle glass backgrounds.
> 
> Empty state: "No hay registros de signos vitales" with a pulse icon and muted text.
> 
> Use dark theme, glassmorphism cards, emerald accent for chart line.

### 2.11 Tab: Insumos

**Componente:** `InsumosTabComponent`

**Propósito:** Gestionar insumos consumibles de la internación.

**Endpoints:**
- `POST /api/v1/internaciones/{id}/insumos`
- `PATCH /api/v1/insumos/{id}/entregar`
- `PATCH /api/v1/insumos/{id}/consumir`
- `PATCH /api/v1/insumos/{id}/devolver`

**Secciones:**
1. Botón "Solicitar Insumo" → modal con: producto (select), cantidad requerida, lote (opcional), fecha vencimiento (opcional).
2. Tabla de insumos: producto, cantidades (requerida/entregada/consumida/devuelta), estado (badge), lote, vencimiento.
3. Acciones por fila según estado: Entregar (SOLICITADO), Consumir (ENTREGADO/EN_USO), Devolver (ENTREGADO/EN_USO).

**Prompt para Google Stitch:**
> Design the "Insumos" tab for managing consumable supplies.
> 
> Top: "+ Solicitar Insumo" button (emerald glow) + filter dropdown for estado (Todos, SOLICITADO, ENTREGADO, EN_USO, CONSUMIDO, DEVUELTO, VENCIDO).
> 
> Supply cards in a grid (2 columns). Each card is a glass card showing:
> - Product name (bold)
> - Status badge: SOLICITADO (blue), ENTREGADO (amber), EN_USO (cyan), CONSUMIDO (emerald), DEVUELTO (purple), VENCIDO (red)
> - Progress bar-style row showing 4 quantities: Requerida | Entregada | Consumida | Devuelta, with color fills proportional to amounts
> - Below: Lote # (if set) + Fecha Vencimiento (if set, with warning icon if near expiry)
> - Action buttons at bottom: "Entregar" (amber, if SOLICITADO), "Consumir" (emerald, if ENTREGADO/EN_USO), "Devolver" (purple, if ENTREGADO/EN_USO)
> 
> Each action opens a small inline form (not modal) with: cantidad (number input) + optional fields (lote for entregar, motivo for devolver) + Confirm/Cancel buttons.
> 
> Use glassmorphism cards, status badges, progress indicators.

### 2.12 Tab: Autorizaciones

**Componente:** `AutorizacionesTabComponent`

**Propósito:** Gestionar autorizaciones del financiador/obra social.

**Endpoints:**
- `POST /api/v1/internaciones/{id}/autorizaciones`
- `GET /api/v1/internaciones/{id}/autorizaciones`
- `PATCH /api/v1/autorizaciones/{id}/aprobar`
- `PATCH /api/v1/autorizaciones/{id}/rechazar`
- `PATCH /api/v1/autorizaciones/{id}/marcar-vencida`

**Secciones:**
1. Botón "Solicitar Autorización" → modal con: número autorización, obra social (select), contrato cobertura (select), fechas vigencia, observaciones.
2. Lista de autorizaciones: número, obra social, estado, fechas, días autorizados, tope importe.
3. Acciones: Aprobar (SOLICITADA), Rechazar (SOLICITADA), Marcar Vencida (AUTORIZADA).

**Prompt para Google Stitch:**
> Design the "Autorizaciones" tab for managing health insurance authorizations.
> 
> Top: "+ Solicitar Autorización" button (emerald glow).
> 
> Authorization cards stacked vertically. Each glass card shows:
> - Header row: authorization number (bold, e.g., "AUTH-2026-0042") + status badge. SOLICITADA (blue, clock icon), AUTORIZADA (emerald, check icon), RECHAZADA (red, X icon), VENCIDA (gray, hourglass icon)
> - Obra Social name + logo placeholder
> - Vigencia: "Desde: 15/05/26 · Hasta: 15/06/26" with a progress bar showing days remaining (green if >7 days, amber if ≤7, red if expired)
> - Extra row: "Días autorizados: 30 · Tope: ARS $150,000"
> - Action buttons: "Aprobar" (emerald, if SOLICITADA), "Rechazar" (red, if SOLICITADA), "Marcar Vencida" (gray, if AUTORIZADA)
> 
> Aprobar opens inline form with: Número Autorización (text), Fechas vigencia (date from/to), Días autorizados (number), Tope importe (currency). Confirm/Cancel.
> Rechazar opens inline form with: Motivo (textarea, required). Confirm/Cancel.
> 
> Use glassmorphism cards, progress bars, status badges.

### 2.13 Tab: Adjuntos y Consentimientos

**Componente:** `AdjuntosTabComponent`

**Propósito:** Vincular archivos adjuntos y consentimientos informados existentes a la internación.

**Endpoints:**
- `POST /api/v1/internaciones/{id}/adjuntos`
- `POST /api/v1/internaciones/{id}/consentimientos`

**Secciones:**
1. **Adjuntos:** botón "Vincular Archivo" → búsqueda/selector de archivos existentes asociados al paciente/ticket. Lista de adjuntos vinculados con tipo, nombre, fecha subida.
2. **Consentimientos:** botón "Vincular Consentimiento" → búsqueda/selector de consentimientos del paciente. Lista con tipo, estado, fecha firma.

**Prompt para Google Stitch:**
> Design the "Adjuntos" tab with two sections.
> 
> Section 1 — "Archivos Adjuntos": "+ Vincular Archivo" button. Below, a list of linked files. Each file row shows: file type icon (Foto/Documento/Audio), file name (truncated if long), upload date, uploaded by. Click opens/downloads file. Each row has an "×" to unlink.
> 
> Section 2 — "Consentimientos Informados": "+ Vincular Consentimiento" button. List of linked consents. Each row shows: consent type (e.g., "TRATAMIENTO_MEDICO_GENERAL"), status badge (FIRMADO=emerald, PENDIENTE=amber, REVOCADO=red), signature date, professional responsible. Each row has an "×" to unlink.
> 
> Both "Vincular" buttons open a modal with a searchable list of existing items from the patient's record, with checkboxes for multi-select and "Vincular seleccionados" confirm button.
> 
> Use glassmorphism cards, file type icons, status badges.

### 2.14 Tab: Cierre

**Componente:** `CierreTabComponent`

**Propósito:** Cerrar la internación con resumen de alta. Muestra validaciones (visitas pendientes, prescripciones activas).

**Endpoints:**
- `POST /api/v1/internaciones/{id}/cerrar`

**Secciones:**
1. **Validaciones previas:** checklist de condiciones para el cierre (sin visitas pendientes, sin prescripciones activas, al menos 1 visita realizada). Cada item con ✓ (ok) o ✗ (pendiente) en tiempo real.
2. **Formulario Resumen de Alta:** fecha alta, diagnóstico egreso, resumen evolución, indicaciones alta, motivo alta (opcional: RECHAZO_PACIENTE permite cerrar sin visitas).
3. **Preview del resumen** antes de confirmar.

**Prompt para Google Stitch:**
> Design the "Cierre" tab for discharging a home hospitalization case.
> 
> Left section (40%): "Condiciones para el Cierre" checklist card. 3 items, each with icon:
> - "Sin visitas pendientes" — ✓ emerald or ✗ red with count of pending
> - "Sin prescripciones activas" — ✓ emerald or ✗ red with count of active
> - "Al menos 1 visita realizada" — ✓ emerald or ✗ red
> 
> Right section (60%): "Resumen de Alta" form in a glass card.
> - Fecha de Alta (date input, auto-filled with today)
> - Diagnóstico de Egreso (textarea, 3 rows)
> - Resumen de Evolución (textarea, 5 rows)
> - Indicaciones al Alta (textarea, 5 rows)
> - Motivo de Alta (optional text, with hint: 'Usar "RECHAZO_PACIENTE" si el paciente rechazó atención para omitir validación de visitas')
> 
> Bottom: warning text if conditions aren't met: "No se puede cerrar: hay 2 visitas pendientes y 1 prescripción activa" in amber text.
> 
> "Cerrar Internación" button (red glow, disabled if conditions not met). When clicked, shows confirmation dialog: "¿Confirma el cierre de la internación? Esta acción no se puede deshacer." with "Cancelar" and "Confirmar Cierre" buttons.
> 
> Use glassmorphism cards, status checkmarks, amber warnings.

---

## 3. Plan de desarrollo — orden de implementación

### Chunk F1 — Infraestructura base (día 1)
- [ ] `internacion.dto.ts` — todas las interfaces
- [ ] `internacion.api.ts` — servicio HTTP con los 42 endpoints
- [ ] `internacion.store.ts` — signal store (activas, seleccionada)
- [ ] `internacion.routes.ts` — rutas lazy
- [ ] Registrar ruta en `app.routes.ts`

### Chunk F2 — Listado y creación (día 2)
- [ ] `InternacionListComponent` — dashboard con KPIs + tabla
- [ ] `InternacionCreateComponent` — formulario 2 pasos

### Chunk F3 — Detalle y tabs principales (días 3-4)
- [ ] `InternacionDetailComponent` — layout padre con header + tabs
- [ ] `OverviewTabComponent` — timeline + contactos
- [ ] `EvaluacionTabComponent` — formulario/lectura evaluación
- [ ] `PlanTabComponent` — plan de cuidado + medicamentos + equipamiento

### Chunk F4 — Equipo, visitas, prescripciones (días 5-6)
- [ ] `EquipoTabComponent` — asignar/ver equipo tratante
- [ ] `VisitasTabComponent` — generar, listar, iniciar, finalizar, reprogramar
- [ ] `PrescripcionesTabComponent` — crear, suspender, administrar

### Chunk F5 — Signos, insumos, autorizaciones (días 7-8)
- [ ] `SignosTabComponent` — gráfico serie temporal
- [ ] `InsumosTabComponent` — solicitar, entregar, consumir, devolver
- [ ] `AutorizacionesTabComponent` — solicitar, aprobar, rechazar, vencer

### Chunk F6 — Adjuntos, cierre, alertas (día 9)
- [ ] `AdjuntosTabComponent` — vincular archivos y consentimientos
- [ ] `CierreTabComponent` — validaciones + formulario alta
- [ ] Integrar alertas en el shell (badge en sidebar, toast para nuevas alertas)

### Chunk F7 — Pulido (día 10)
- [ ] Estados loading/empty/error en todos los tabs
- [ ] Responsive: tabs colapsan a dropdown en mobile
- [ ] Animaciones de transición entre tabs
- [ ] Toast notifications para acciones exitosas
- [ ] WebSocket para actualizaciones en tiempo real (cambios de estado, nuevas alertas)

---

## 4. DTOs TypeScript necesarios

```typescript
// internacion.dto.ts

export interface InternacionDomiciliariaDTO {
  id: number;
  fechaInicio: string;        // ISO instant
  fechaFin?: string;
  diagnosticoPrincipal: string;
  estado: EstadoInternacion;
  direccionInternacion: string;
  familiarResponsable: string;
  telefonoEmergencia: string;
  paciente?: PacienteDTO;
  medicoSolicitante?: ProfesionalSaludDTO;
  ticketOrigen?: TicketAsistenciaDTO;
  evaluacion?: EvaluacionDomiciliariaDTO;
  planCuidado?: PlanCuidadoDTO;
  equipoTratantes?: EquipoTratanteDTO[];
  diagnostico?: DiagnosticoDTO;
  motivoAlta?: string;
}

export type EstadoInternacion =
  | 'ADMITIDA' | 'EVALUADA' | 'ACTIVA'
  | 'SUSPENDIDA_POR_TRASLADO' | 'FINALIZADA' | 'RECHAZADA';

export interface IniciarInternacionDTO {
  ticketId: number;
  diagnosticoPrincipal: string;
  direccionInternacion: string;
  familiarResponsable: string;
  telefonoEmergencia: string;
  diagnosticoId?: number;
  observaciones?: string;
}

export interface EvaluacionDomiciliariaDTO {
  id?: number;
  resultado?: string;
  observacionEntorno?: string;
  soporteFamiliar?: string;
  accesibilidadDomicilio?: number;
  condicionesHigiene?: number;
  seguridadZona?: number;
  servicioBasico?: boolean;
  espacioAdecuado?: boolean;
  familiarResponsable?: string;
  telefonoFamiliar?: string;
  direccionExacta?: string;
  evaluador?: { id: number };
}

export interface PlanCuidadoDTO {
  id?: number;
  objetivo?: string;
  descripcionGeneral?: string;
  frecuenciaVisitas?: string;
  duracionEstimada?: number;
  cuidadoresNecesarios?: number;
  costoDiario?: number;
  observacionFamilia?: string;
  medicamentoIncluido?: string;
  equipamientoRequerido?: string;
}

export interface EquipoTratanteDTO {
  id?: number;
  rol: string;
  disciplina?: DisciplinaSalud;
  fechaAsignacion: string;
  disponibilidad24x7?: boolean;
  contactoEmergencia?: string;
  profesional?: { id: number; nombre?: string; apellido?: string };
}

export type DisciplinaSalud =
  | 'MEDICINA' | 'ENFERMERIA' | 'KINESIOLOGIA'
  | 'FONOAUDIOLOGIA' | 'NUTRICION' | 'PSICOLOGIA'
  | 'TRABAJO_SOCIAL' | 'CUIDADOS_PALIATIVOS';

export interface VisitaProgramadaDTO {
  id?: number;
  fechaHoraProgramada: string;
  tipoVisita: TipoVisita;
  estado: EstadoVisita;
  direccionVisita?: string;
  contactoEnSitio?: string;
  telefonoContacto?: string;
  profesionalAsignado?: { id: number; nombre?: string };
}

export type TipoVisita =
  | 'MEDICA' | 'ENFERMERIA' | 'KINESIOLOGIA' | 'PSICOLOGIA'
  | 'TRABAJO_SOCIAL' | 'NUTRICION' | 'CONTROL_EQUIPOS'
  | 'EMERGENCIA' | 'CONTROL_GENERAL';

export type EstadoVisita =
  | 'PROGRAMADA' | 'EN_CURSO' | 'REALIZADA' | 'CANCELADA_PROFESIONAL'
  | 'CANCELADA_PACIENTE' | 'REPROGRAMADA' | 'VENCIDA';

export interface PrescripcionContinuaDTO {
  id?: number;
  medicamento?: { id: number; nombreGenerico?: string };
  dosis: string;
  via: string;
  frecuencia: string;
  indicaciones?: string;
  fechaInicio: string;
  fechaFin?: string;
  estado: EstadoPrescripcion;
  administraciones?: AdministracionMedicamentoDTO[];
}

export type EstadoPrescripcion = 'ACTIVA' | 'SUSPENDIDA' | 'FINALIZADA';

export interface AdministracionMedicamentoDTO {
  id?: number;
  fechaHora: string;
  observacion?: string;
  administradoPor?: { id: number };
}

export interface SignosVitalesDTO {
  id?: number;
  fechaHora: string;
  temperatura?: number;
  frecuenciaCardiaca?: number;
  presionSistolica?: number;
  presionDiastolica?: number;
  saturacionOxigeno?: number;
  frecuenciaRespiratoria?: number;
}

export interface InsumoDomiciliarioDTO {
  id?: number;
  productoId: number;
  cantidadRequerida: number;
  cantidadEntregada?: number;
  cantidadConsumida?: number;
  cantidadDevuelta?: number;
  lote?: string;
  fechaVencimiento?: string;
  estado: string;
  internacionId?: number;
}

export interface AutorizacionInternacionDTO {
  id?: number;
  numeroAutorizacion?: string;
  fechaEmision?: string;
  fechaVigenciaDesde: string;
  fechaVigenciaHasta: string;
  diasAutorizados?: number;
  topeImporte?: number;
  estado: EstadoAutorizacion;
  motivoRechazo?: string;
  observaciones?: string;
  internacion?: { id: number };
  obraSocial?: { id: number; nombre?: string };
  contratoCobertura?: { id: number };
}

export type EstadoAutorizacion =
  | 'SOLICITADA' | 'AUTORIZADA' | 'RECHAZADA' | 'VENCIDA' | 'AGOTADA';

export interface ResumenAltaDTO {
  fechaAlta: string;
  diagnosticoEgreso: string;
  resumenEvolucion: string;
  indicacionesAlta: string;
  motivoAlta?: string;
}

export interface RechazoInternacionDTO {
  motivo: string;
}

export interface EventoInternacionDTO {
  id?: number;
  fechaHora: string;
  tipo: TipoEventoInternacion;
  descripcion: string;
  internacionDomiciliaria?: { id: number };
  registradoPor?: { id: number };
}

export type TipoEventoInternacion =
  | 'DETERIORO' | 'MEJORIA' | 'REINGRESO_EMERGENCIA' | 'TRASLADO'
  | 'COMPLICACION' | 'ALTA_VOLUNTARIA' | 'FALLECIMIENTO'
  | 'ESTABILIZACION' | 'CAMBIO_PLAN_CUIDADO' | 'INTERCONSULTA'
  | 'CAMBIO_ESTADO' | 'OTRO';

export interface InternacionTimelineItemDTO {
  tipo: string;
  fecha: string;
  descripcion: string;
  profesional?: string;
}

export interface AlertaInternacion {
  id?: number;
  tipo: TipoAlertaInternacion;
  severidad: 'INFO' | 'ATENCION' | 'URGENTE';
  mensaje: string;
  fechaGeneracion: string;
  atendida: boolean;
}

export type TipoAlertaInternacion =
  | 'VISITA_VENCIDA' | 'MEDICACION_NO_APLICADA' | 'EVENTO_CRITICO'
  | 'PLAN_VENCIDO' | 'AUTORIZACION_POR_VENCER'
  | 'AUTORIZACION_VENCIDA' | 'INSUMO_VENCIDO';
```

---

## 5. API Service

```typescript
// internacion.api.ts
@Injectable({ providedIn: 'root' })
export class InternacionApiService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/api/v1`;

  // Orquestador
  iniciarDesdeTicket(dto: IniciarInternacionDTO): Observable<InternacionDomiciliariaDTO> { ... }
  cargarEvaluacion(id: number, dto: EvaluacionDomiciliariaDTO): Observable<InternacionDomiciliariaDTO> { ... }
  definirPlanCuidado(id: number, dto: PlanCuidadoDTO): Observable<InternacionDomiciliariaDTO> { ... }
  asignarEquipo(id: number, dto: AsignarEquipoDTO): Observable<EquipoTratanteDTO> { ... }
  cerrarInternacion(id: number, dto: ResumenAltaDTO): Observable<InternacionDomiciliariaDTO> { ... }
  rechazarInternacion(id: number, dto: RechazoInternacionDTO): Observable<InternacionDomiciliariaDTO> { ... }

  getTimeline(id: number): Observable<InternacionTimelineItemDTO[]> { ... }
  getContactosUtiles(id: number): Observable<Record<string, string>> { ... }
  getActivas(): Observable<InternacionDomiciliariaDTO[]> { ... }
  getSignosVitalesSerie(id: number): Observable<SignosVitalesDTO[]> { ... }
  getPrescripciones(id: number): Observable<PrescripcionContinuaDTO[]> { ... }

  // Visitas
  generarVisitas(id: number, desde: string, hasta: string, tipo: string): Observable<void> { ... }
  iniciarVisita(visitaId: number): Observable<VisitaProgramadaDTO> { ... }
  finalizarVisita(visitaId: number, dto: FinalizarVisitaDTO): Observable<VisitaProgramadaDTO> { ... }
  reprogramarVisita(visitaId: number, nuevaFecha: string, motivo: string): Observable<VisitaProgramadaDTO> { ... }

  // Prescripciones
  crearPrescripcion(id: number, dto: PrescripcionContinuaDTO): Observable<PrescripcionContinuaDTO> { ... }
  suspenderPrescripcion(prescripcionId: number, motivo: string): Observable<PrescripcionContinuaDTO> { ... }
  registrarAdministracion(prescripcionId: number, dto: AdministracionMedicamentoDTO): Observable<AdministracionMedicamentoDTO> { ... }

  // Eventos y notas
  registrarEvento(id: number, dto: EventoInternacionDTO): Observable<EventoInternacionDTO> { ... }
  agregarNota(id: number, dto: NotaEvolucionInternacionDTO): Observable<NotaEvolucionInternacionDTO> { ... }

  // Insumos
  solicitarInsumo(id: number, dto: InsumoDomiciliarioDTO): Observable<InsumoDomiciliarioDTO> { ... }
  entregarInsumo(insumoId: number, cantidad: number, lote?: string, fechaVencimiento?: string): Observable<InsumoDomiciliarioDTO> { ... }
  consumirInsumo(insumoId: number, cantidad: number): Observable<InsumoDomiciliarioDTO> { ... }
  devolverInsumo(insumoId: number, cantidad: number, motivo: string): Observable<InsumoDomiciliarioDTO> { ... }

  // Autorizaciones
  solicitarAutorizacion(id: number, dto: AutorizacionInternacionDTO): Observable<AutorizacionInternacionDTO> { ... }
  listarAutorizaciones(id: number): Observable<AutorizacionInternacionDTO[]> { ... }
  aprobarAutorizacion(id: number, dto: AprobarAutorizacionDTO): Observable<AutorizacionInternacionDTO> { ... }
  rechazarAutorizacion(id: number, dto: RechazarAutorizacionDTO): Observable<AutorizacionInternacionDTO> { ... }
  marcarVencidaAutorizacion(id: number): Observable<void> { ... }

  // Adjuntos y consentimientos
  vincularAdjunto(internacionId: number, archivoId: number): Observable<void> { ... }
  vincularConsentimiento(internacionId: number, consentimientoId: number): Observable<void> { ... }

  // Reportes
  getVisitasPendientes(): Observable<VisitaProgramadaDTO[]> { ... }
  getAutorizacionesPorVencer(): Observable<AutorizacionInternacionDTO[]> { ... }

  // Alertas
  getAlertasActivas(id: number): Observable<AlertaInternacion[]> { ... }
  atenderAlerta(id: number): Observable<AlertaInternacion> { ... }
  getAlertasAbiertas(): Observable<AlertaInternacion[]> { ... }
}
```

---

## 6. Signal Store

```typescript
// internacion.store.ts
@Injectable({ providedIn: 'root' })
export class InternacionStore {
  private api = inject(InternacionApiService);

  // Estado
  readonly activas = signal<InternacionDomiciliariaDTO[]>([]);
  readonly seleccionada = signal<InternacionDomiciliariaDTO | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Derivados
  readonly countActivas = computed(() => this.activas().length);
  readonly countPorEstado = computed(() => { /* agrupa por estado */ });

  // Acciones
  async cargarActivas() { ... }
  async seleccionarInternacion(id: number) { ... }
  async refrescarSeleccionada() { ... }
}
```

---

## 7. Notas finales

1. **No hay diseño responsive complejo en esta fase** — el dashboard está pensado para desktop/tablet (1024px+). Mobile se maneja con tabs colapsables.
2. **WebSocket** — las actualizaciones en tiempo real (cambio de estado, nueva alerta) se integran vía el `WebsocketService` existente, suscribiéndose a tópicos como `/topic/internacion/{empresaId}`.
3. **Adjuntos y consentimientos** — el flujo asume que los archivos y consentimientos ya existen (creados en otros módulos). Esta pantalla solo los vincula.
4. **Alertas en sidebar** — el store de alertas debería exponer un contador que el `SidebarComponent` muestre como badge en el ítem "Internación".
5. **Prioridad de endpoints** — los endpoints del orquestador están todos implementados en el backend. Los únicos que requieren endpoints CRUD adicionales (como listar archivos de un paciente) deben verificarse contra el backend existente.

**Fin del SDD.**
