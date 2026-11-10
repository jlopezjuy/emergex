import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { errorInterceptor } from './core/auth/error.interceptor';
import { feedbackInterceptor } from './core/notifications/feedback.interceptor';
import { LOCALE_AR_PROVIDERS } from './core/i18n/locale';

export const appConfig: ApplicationConfig = {
  providers: [
    ...LOCALE_AR_PROVIDERS,
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor, feedbackInterceptor, errorInterceptor])),
    provideAnimationsAsync(),
  ],
};
