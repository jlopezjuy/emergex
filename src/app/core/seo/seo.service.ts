import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

/**
 * Public production origin. Canonical and Open Graph URLs must always be absolute and point here,
 * even in local builds, so search engines never index a development host.
 * Keep in sync with the static tags in src/index.html, public/robots.txt and public/sitemap.xml.
 */
export const SITE_URL = 'https://aliviar.appcanvas.store';

export const DEFAULT_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1';

export interface SeoPage {
  /** Full document title, 50–60 characters. */
  title: string;
  /** Meta description, ~150–160 characters. */
  description: string;
  /** Root-relative path, e.g. '/' or '/login'. */
  path: string;
  robots?: string;
}

/**
 * Updates per-route title, description, canonical and social tags.
 *
 * Social crawlers (WhatsApp, LinkedIn, Facebook) do not run JavaScript and only read the static
 * tags in index.html; this service keeps the rendered DOM correct for Google, which does render.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  apply(page: SeoPage): void {
    const url = `${SITE_URL}${page.path.startsWith('/') ? page.path : `/${page.path}`}`;

    this.title.setTitle(page.title);
    this.meta.updateTag({ name: 'description', content: page.description });
    this.meta.updateTag({ name: 'robots', content: page.robots ?? DEFAULT_ROBOTS });
    this.meta.updateTag({ property: 'og:title', content: page.title });
    this.meta.updateTag({ property: 'og:description', content: page.description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ name: 'twitter:title', content: page.title });
    this.meta.updateTag({ name: 'twitter:description', content: page.description });
    this.setCanonical(url);
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
