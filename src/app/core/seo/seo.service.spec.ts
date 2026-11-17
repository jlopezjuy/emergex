import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { describe, it, expect, beforeEach } from 'vitest';
import { SITE_URL, SeoService } from './seo.service';

describe('SeoService', () => {
  let service: SeoService;
  let doc: Document;

  const meta = (selector: string) => doc.head.querySelector(`meta[${selector}]`)?.getAttribute('content');
  const canonical = () => doc.head.querySelector('link[rel="canonical"]')?.getAttribute('href');

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeoService);
    doc = TestBed.inject(DOCUMENT);
    doc.head.querySelectorAll('meta[name], meta[property], link[rel="canonical"]').forEach((el) => el.remove());
  });

  it('sets title, description and the matching Open Graph / Twitter tags', () => {
    service.apply({ title: 'Emergex | Test', description: 'Descripción de prueba', path: '/' });

    expect(TestBed.inject(Title).getTitle()).toBe('Emergex | Test');
    expect(meta('name="description"')).toBe('Descripción de prueba');
    expect(meta('property="og:title"')).toBe('Emergex | Test');
    expect(meta('property="og:description"')).toBe('Descripción de prueba');
    expect(meta('name="twitter:title"')).toBe('Emergex | Test');
    expect(meta('name="twitter:description"')).toBe('Descripción de prueba');
  });

  it('points og:url and the canonical link at the absolute production URL', () => {
    service.apply({ title: 'T', description: 'D', path: '/login' });

    expect(meta('property="og:url"')).toBe(`${SITE_URL}/login`);
    expect(canonical()).toBe(`${SITE_URL}/login`);
  });

  it('uses a trailing slash for the home canonical and reuses a single canonical link', () => {
    service.apply({ title: 'T', description: 'D', path: '/login' });
    service.apply({ title: 'T', description: 'D', path: '/' });

    expect(canonical()).toBe(`${SITE_URL}/`);
    expect(doc.head.querySelectorAll('link[rel="canonical"]').length).toBe(1);
  });

  it('defaults to indexable and honours an explicit noindex', () => {
    service.apply({ title: 'T', description: 'D', path: '/' });
    expect(meta('name="robots"')).toContain('index, follow');

    service.apply({ title: 'T', description: 'D', path: '/login', robots: 'noindex, follow' });
    expect(meta('name="robots"')).toBe('noindex, follow');
  });

  it('never targets a non-production origin', () => {
    expect(SITE_URL).toBe('https://aliviar.appcanvas.store');
  });
});
