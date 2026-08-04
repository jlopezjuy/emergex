# Emergex Web Frontend Rules (Angular 21)

This file extends the root [`AGENTS.md`](file:///Users/juanlopez/Proyectos/Propios/AliviarSalud/AGENTS.md) with web-frontend-specific rules for `emergex-frontend/`.

## Architecture & Technology Stack
- **Framework**: Angular 21 (Angular `^21.2.0`, TypeScript, RxJS).
- **Patterns**: Standalone Components (`standalone: true`), reactive Signals (`signal()`, `computed()`), inject function (`inject()`).
- **Styling**: Vanilla CSS / Angular Material / Tailwind. Hallmark scope applies ONLY to visual audits here.

## Critical Mandatory Rules
1. **ACTIVE FRONTEND**: `emergex-frontend/` is the SINGLE active web application. Do NOT use `old-frontend/`.
2. **Signals & RxJS State**: Expose Signals or Observables in services using `providedIn: 'root'`.
3. **No View Logic Leakage**: Keep component templates focused on presentation; delegate business operations to services.
4. **Strict Typing & ESLint**: Enforce strict TypeScript types. ESLint must pass with zero warnings (`--max-warnings 0`).

## Verification Commands
- Dev Server: `npm start` or `npm run start:dev`
- Production Build: `npm run build:prod`
- Unit Tests: `npm test` or `npm run test:ci`
- Linting: `npm run lint` (`eslint "src/**/*.ts" --max-warnings 0`)
