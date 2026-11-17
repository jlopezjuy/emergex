import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LANDING_CONTACT_EMAIL,
  LANDING_FLOW,
  LANDING_HIGHLIGHTS,
  LANDING_MODULES,
  LANDING_ROLES,
  LANDING_SECURITY,
  LANDING_WHATSAPP_MESSAGE,
  LANDING_WHATSAPP_NUMBER,
} from './landing.content';
import { initLandingMotion } from './landing.motion';
import { ThemeService } from '../../core/theme/theme.service';

/** Public, unauthenticated entry page. Signed-in users never reach it (see noAuthGuard). */
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  protected readonly highlights = LANDING_HIGHLIGHTS;
  protected readonly flow = LANDING_FLOW;
  protected readonly modules = LANDING_MODULES;
  protected readonly roles = LANDING_ROLES;
  protected readonly security = LANDING_SECURITY;
  protected readonly contactHref = `mailto:${LANDING_CONTACT_EMAIL}?subject=${encodeURIComponent('Solicitud de demo Emergex')}`;
  protected readonly contactEmail = LANDING_CONTACT_EMAIL;
  protected readonly whatsappHref = `https://wa.me/${LANDING_WHATSAPP_NUMBER}?text=${encodeURIComponent(LANDING_WHATSAPP_MESSAGE)}`;
  protected readonly year = new Date().getFullYear();

  /** Same preference the signed-in app uses, so the choice carries over after login. */
  private readonly themeService = inject(ThemeService);
  protected readonly isLight = computed(() => this.themeService.theme() === 'light');
  protected readonly themeToggleLabel = computed(() =>
    this.isLight() ? 'Activar modo noche' : 'Activar modo día',
  );

  protected toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef);
    const destroyRef = inject(DestroyRef);

    // Browser-only and after the first render, so the DOM targets exist.
    afterNextRender(() => {
      const revert = initLandingMotion(host.nativeElement);
      destroyRef.onDestroy(revert);
    });
  }
}
