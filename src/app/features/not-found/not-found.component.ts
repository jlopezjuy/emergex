import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="h-screen flex flex-col items-center justify-center gap-6" style="background: var(--bg-deep);">
      <div class="font-mono text-8xl font-bold" style="color: var(--border-glass);">404</div>
      <div class="flex flex-col items-center gap-1">
        <p class="font-semibold text-lg" style="color: var(--text-primary);">Página no encontrada</p>
        <p class="text-sm" style="color: var(--text-muted);">La ruta solicitada no existe en este sistema.</p>
      </div>
      <a routerLink="/dashboard" class="btn btn--primary btn--sm">Volver al dashboard</a>
    </div>
  `,
})
export class NotFoundComponent {}
