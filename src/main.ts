import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// sockjs-client is CJS and references Node's `global` — polyfill for browser
(window as any).global = window;

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
