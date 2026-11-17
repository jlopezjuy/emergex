import { describe, it, expect, afterEach, vi } from 'vitest';
import { SIREN_TIMING, initLandingMotion } from './landing.motion';

const stubMatchMedia = (reduceMotion: boolean) =>
  vi.fn((query: string) => ({
    matches: query.includes('no-preference')
      ? !reduceMotion
      : query.includes('prefers-reduced-motion: reduce')
        ? reduceMotion
        : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

const buildRoot = () => {
  const root = document.createElement('div');
  root.innerHTML = `
    <section class="lp-hero">
      <div class="lp-hero__eyebrow">Eyebrow</div>
      <h1 class="lp-hero__title">Del llamado al cierre facturado</h1>
      <p class="lp-hero__lead">Lead</p>
      <div class="lp-siren"><div class="lp-siren__wash"></div></div>
    </section>`;
  document.body.appendChild(root);
  return root;
};

describe('initLandingMotion', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    document.body.innerHTML = '';
  });

  it('is a no-op when the environment has no matchMedia (tests, non-browser)', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    const root = buildRoot();
    const revert = initLandingMotion(root);
    expect(root.querySelector('.lp-hero__lead')?.getAttribute('style')).toBeNull();
    expect(() => revert()).not.toThrow();
  });

  it('leaves the page static when the user prefers reduced motion', () => {
    window.matchMedia = stubMatchMedia(true) as unknown as typeof window.matchMedia;
    const root = buildRoot();
    const revert = initLandingMotion(root);

    expect(root.querySelector('.lp-hero__lead')?.getAttribute('style')).toBeNull();
    expect(root.querySelector('.lp-hero__title')?.textContent).toBe('Del llamado al cierre facturado');
    expect(root.querySelector('.lp-siren')?.getAttribute('style')).toBeNull();
    revert();
  });
});

describe('siren light sweep timing (WCAG 2.3.1 Three Flashes)', () => {
  it('alternates red/blue well below 3 flashes per second (a flash = brighten + dim)', () => {
    const flashesPerSecond = 1 / (2 * SIREN_TIMING.halfCycle);
    expect(flashesPerSecond).toBeLessThan(3);
    expect(flashesPerSecond).toBeLessThanOrEqual(1.5);
  });

  it('passes frequently (every ~8–9 s) but keeps a dark breather between passes', () => {
    const interval = SIREN_TIMING.pass + SIREN_TIMING.pause;
    expect(interval).toBeLessThanOrEqual(9);
    expect(SIREN_TIMING.pause).toBeGreaterThanOrEqual(1.5);
  });
});
