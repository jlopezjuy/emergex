import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { LandingComponent } from './landing.component';
import { LANDING_CONTACT_EMAIL, LANDING_SEO } from './landing.content';
import { SITE_URL } from '../../core/seo/seo.service';
import { ThemeService } from '../../core/theme/theme.service';

describe('LandingComponent', () => {
  let root: HTMLElement;
  let fixture: ComponentFixture<LandingComponent>;
  let theme: ReturnType<typeof signal<'dark' | 'light'>>;
  let themeMock: { theme: () => 'dark' | 'light'; toggleTheme: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    theme = signal<'dark' | 'light'>('dark');
    themeMock = {
      theme: () => theme(),
      toggleTheme: vi.fn(() => theme.update((t) => (t === 'dark' ? 'light' : 'dark'))),
    };

    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [provideRouter([]), { provide: ThemeService, useValue: themeMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(LandingComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
  });

  const themeToggle = () => root.querySelector<HTMLButtonElement>('button.lp-theme');

  it('offers a day-mode switch while the dark theme is active', () => {
    expect(themeToggle()?.getAttribute('aria-label')).toBe('Activar modo día');
  });

  it('switches the shared app theme and relabels the control for night mode', () => {
    themeToggle()?.click();
    fixture.detectChanges();

    expect(themeMock.toggleTheme).toHaveBeenCalledOnce();
    expect(themeToggle()?.getAttribute('aria-label')).toBe('Activar modo noche');
  });

  it('has a single h1 with the product headline', () => {
    const headings = root.querySelectorAll('h1');
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toContain('Del llamado al cierre facturado');
  });

  it('links to the login page', () => {
    const loginLinks = Array.from(root.querySelectorAll('a')).filter(
      (a) => a.getAttribute('href') === '/login',
    );
    expect(loginLinks.length).toBeGreaterThan(0);
  });

  it('offers a demo request that opens an email to the contact address', () => {
    const demo = Array.from(root.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('Solicitar demo'),
    );
    expect(demo?.getAttribute('href')).toContain(`mailto:${LANDING_CONTACT_EMAIL}`);
  });

  it('offers WhatsApp contact links that open a chat with the sales number in a new tab', () => {
    const whatsapp = Array.from(root.querySelectorAll<HTMLAnchorElement>('a')).filter((a) =>
      a.getAttribute('href')?.startsWith('https://wa.me/'),
    );
    expect(whatsapp.length).toBeGreaterThan(0);
    for (const link of whatsapp) {
      expect(link.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/5493884105177\?text=/);
      expect(link.target).toBe('_blank');
      expect(link.rel).toContain('noopener');
    }
    expect(root.querySelector('[aria-label="Escribinos por WhatsApp"]')).not.toBeNull();
  });

  it('does not publish unverified metrics or certifications', () => {
    const text = root.textContent ?? '';
    expect(text).not.toMatch(/ISO 27001|SLA|2,847/);
  });

  it('has no placeholder links', () => {
    expect(root.querySelectorAll('a[href="#"]')).toHaveLength(0);
  });

  it('publishes indexable search metadata with a canonical URL on the production domain', () => {
    expect(document.title).toBe(LANDING_SEO.title);
    expect(LANDING_SEO.title.length).toBeLessThanOrEqual(60);
    expect(LANDING_SEO.description.length).toBeLessThanOrEqual(160);
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(LANDING_SEO.description);
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('index, follow');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${SITE_URL}/`);
  });
});
