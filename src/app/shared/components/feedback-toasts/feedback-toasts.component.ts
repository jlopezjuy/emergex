import { Component, inject } from '@angular/core';
import { UserFeedbackService } from '../../../core/notifications/user-feedback.service';

@Component({
  selector: 'emx-feedback-toasts',
  standalone: true,
  template: `
    <div class="toasts" aria-live="polite" aria-atomic="true">
      @for (toast of feedback.toasts(); track toast.id) {
        <article class="toast" [attr.data-type]="toast.type" role="status">
          <div class="toast__icon">
            @switch (toast.type) {
              @case ('success') { ✓ }
              @case ('warning') { ⚠ }
              @case ('error') { ⛔ }
              @default { i }
            }
          </div>
          <div class="toast__content">
            <div class="toast__title">{{ toast.title }}</div>
            <div class="toast__message">{{ toast.message }}</div>
          </div>
          <button type="button" class="toast__close" (click)="feedback.dismiss(toast.id)" aria-label="Cerrar alerta">
            ✕
          </button>
        </article>
      }
    </div>
  `,
  styles: [`
    .toasts {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 1100;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: min(420px, calc(100vw - 24px));
      pointer-events: none;
    }

    .toast {
      display: grid;
      grid-template-columns: 42px 1fr 34px;
      align-items: center;
      gap: 10px;
      padding: 10px;
      border-radius: 14px;
      border: 1px solid var(--border-glass);
      background: var(--surface-glass-strong);
      color: var(--text-primary);
      box-shadow: 0 6px 20px rgba(2, 6, 23, 0.18);
      backdrop-filter: blur(10px);
      pointer-events: auto;
    }
    .toast[data-type='success'] {
      background: color-mix(in srgb, var(--accent-emerald-dim) 72%, var(--surface-glass-strong));
    }
    .toast[data-type='warning'] {
      background: color-mix(in srgb, var(--accent-amber-dim) 72%, var(--surface-glass-strong));
    }
    .toast[data-type='error'] {
      background: color-mix(in srgb, var(--accent-red-dim) 72%, var(--surface-glass-strong));
    }
    .toast[data-type='info'] {
      background: color-mix(in srgb, var(--accent-blue-dim) 65%, var(--surface-glass-strong));
    }

    .toast__icon {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      font-size: 18px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.55);
      color: var(--text-primary);
    }
    [data-theme='dark'] .toast__icon {
      background: rgba(2, 6, 23, 0.28);
    }

    .toast__title {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.2;
      margin-bottom: 2px;
    }

    .toast__message {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.3;
    }

    .toast__close {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
    }
    .toast__close:hover {
      border-color: var(--border-strong);
      color: var(--text-primary);
    }
  `],
})
export class FeedbackToastsComponent {
  readonly feedback = inject(UserFeedbackService);
}

