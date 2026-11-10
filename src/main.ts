import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { logError } from './app/core/utils/logger';
import { initializeGlobalSanitizer } from './app/core/utils/sanitizer';

// M3: Sanitización global para prevenir inyecciones HTML en text fields
initializeGlobalSanitizer();

bootstrapApplication(App, appConfig)
  .catch((err) => logError('Bootstrap Error', err));
