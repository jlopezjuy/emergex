import { isDevMode } from '@angular/core';

export function logError(context: string, err?: unknown): void {
  if (isDevMode()) {
    if (err !== undefined) {
      console.error(context, err);
    } else {
      console.error(context);
    }
  }
  // TODO: Producción: enviar a Sentry/Datadog sin datos sensibles
}

export function logWarn(context: string, msg?: unknown): void {
  if (isDevMode()) {
    if (msg !== undefined) {
      console.warn(context, msg);
    } else {
      console.warn(context);
    }
  }
}
