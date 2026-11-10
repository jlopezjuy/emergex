# Emergex Web Frontend Rules (Angular 21)

This file extends the root [`AGENTS.md`](file:///Users/juanlopez/Proyectos/Propios/AliviarSalud/AGENTS.md) with web-frontend-specific rules.

## Technology Stack

- **Framework**: Angular 21.2.x, TypeScript 5.9.x, RxJS 7.8.x
- **State**: Signals (`signal()`, `computed()`, `update()`) via root-provided Store classes
- **Components**: 136 Standalone Components (`standalone: true`), functional `inject()`
- **Routing**: Lazy-loaded routes with `loadComponent` / `loadChildren`, functional guards
- **Styling**: Tailwind CSS 3.4.x + custom CSS design system (glassmorphism, dark/light themes)
- **Maps**: MapLibre GL 5.x (`maplibre-gl`)
- **Charts**: Chart.js 4.x
- **WebSocket**: STOMP via `@stomp/stompjs` + `sockjs-client`
- **Testing**: Vitest 4.x via `@angular/build:unit-test`
- **Linting**: ESLint 10.x + `@angular-eslint` 21.x (strict, zero warnings)
- **31 feature modules**, 36 API services, 5 Signal stores

## Architecture

- **NO PrimeNG, NO Angular Material** — custom Tailwind + CSS variables design system
- Stores in `src/app/core/stores/` (SessionStore, EmergencyStore, FleetStore, etc.)
- API services in `src/app/data-access/api/`
- Shared components in `src/app/shared/`
- Component prefix: `emx`

## Critical Rules

1. **ACTIVE FRONTEND**: `emergex-frontend/` is the ONLY active web app. Do NOT use `old-frontend/`.
2. **Signals & RxJS**: Services expose Signals or Observables via `providedIn: 'root'`.
3. **No View Logic Leakage**: Templates are pure presentation; business ops delegate to services.
4. **ESLint Zero Warnings**: `npm run lint` must pass with `--max-warnings 0`.
5. **No PrimeNG/Material**: Use existing Tailwind + CSS custom property design system.

## Proxy Configuration

- Dev: `/api` → `http://localhost:8080`, `/websocket` → `http://localhost:8080` (WebSocket)
- Prod: `https://aliviar.appcanvas.store`

## Verification Commands

| Command | Purpose |
|---|---|
| `npm start` | Dev server (port 4200) |
| `npm run build:prod` | Production build |
| `npm run lint` | ESLint (zero warnings) |
| `npm run test:ci` | Run tests (Vitest, no watch) |
