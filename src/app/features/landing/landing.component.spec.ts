import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LandingComponent } from './landing.component';
import { LANDING_CONTACT_EMAIL } from './landing.content';

describe('LandingComponent', () => {
  let root: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LandingComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(LandingComponent);
    fixture.detectChanges();
    root = fixture.nativeElement as HTMLElement;
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
});
