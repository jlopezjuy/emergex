import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FeedbackToastsComponent } from './shared/components/feedback-toasts/feedback-toasts.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FeedbackToastsComponent],
  template: `
    <router-outlet />
    <emx-feedback-toasts />
  `,
})
export class App {}
