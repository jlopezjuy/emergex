import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';

let pluginsRegistered = false;

/** Registered lazily: ScrollTrigger touches window.matchMedia on registration. */
function registerPlugins(): void {
  if (!pluginsRegistered) {
    gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin);
    pluginsRegistered = true;
  }
}

const EASE_OUT = 'power3.out';
const NO_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Wires the landing page animations and returns a cleanup that reverts every tween,
 * ScrollTrigger and text split it created.
 *
 * Principles (kept on purpose, see docs/ux-landing):
 * - Animations react to normal scrolling; native scroll is never replaced or hijacked.
 * - Content is visible without JavaScript: tweens animate *from* a hidden state.
 * - `prefers-reduced-motion: reduce` gets a static page.
 */
export function initLandingMotion(root: HTMLElement): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => undefined;
  }

  registerPlugins();
  const mm = gsap.matchMedia(root);

  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      reduced: NO_MOTION,
      wide: '(min-width: 1025px)',
    },
    (ctx) => {
      const { motion, wide } = ctx.conditions as { motion: boolean; reduced: boolean; wide: boolean };
      if (!motion) {
        return;
      }

      const q = gsap.utils.selector(root);

      animateTopBar(q);
      animateHero(q);
      animateConsole(q);
      animateSectionHeads(q);
      animateFlow(q, wide);
      animateModules(q);
      animateRoles(q);
      animateSecurity(q);
      animateCta(q);
    },
  );

  return () => mm.revert();
}

type Selector = (selector: string) => Element[];

function animateTopBar(q: Selector): void {
  const [bar] = q('.lp-top');
  if (!bar) return;
  ScrollTrigger.create({
    start: 'top -24',
    end: 'max',
    toggleClass: { targets: bar, className: 'is-scrolled' },
  });
}

function animateHero(q: Selector): void {
  const tl = gsap.timeline({ defaults: { ease: EASE_OUT } });

  tl.from(q('.lp-hero__eyebrow'), { y: 12, autoAlpha: 0, duration: 0.6 });

  const [title] = q('.lp-hero__title');
  if (title) {
    SplitText.create(title, {
      type: 'lines,words',
      mask: 'lines',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.words, {
          yPercent: 110,
          duration: 0.9,
          stagger: 0.045,
          ease: 'power4.out',
          delay: 0.1,
        }),
    });
  }

  // fromTo with explicit end values: when matchMedia re-runs (breakpoint change, tablet
  // rotation) a plain from() would read a half-reverted value as its destination and leave
  // the element hidden. clearProps hands transform back to CSS hover states afterwards.
  tl.fromTo(q('.lp-hero__lead'), { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, 0.45)
    .fromTo(
      q('.lp-hero__ctas > *'),
      { y: 14, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08, clearProps: 'transform' },
      0.6,
    )
    .fromTo(
      q('.lp-hero__facts > div'),
      { y: 12, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08 },
      0.75,
    )
    .fromTo(
      q('.lp-wa-float'),
      { scale: 0.4, autoAlpha: 0 },
      { scale: 1, autoAlpha: 1, duration: 0.6, ease: 'back.out(2)', clearProps: 'transform' },
      1.4,
    );
}

function animateConsole(q: Selector): void {
  const [panel] = q('.lp-console');
  const [route] = q('.lp-map__route');
  const [unit] = q('.lp-map__unit');
  if (!panel) return;

  const tl = gsap.timeline({ defaults: { ease: EASE_OUT }, delay: 0.35 });
  tl.from(panel, { y: 40, rotateX: 8, transformPerspective: 1200, autoAlpha: 0, duration: 1.1 })
    .from(q('.lp-map__street'), { drawSVG: 0, duration: 1.2, stagger: 0.12, ease: 'power2.inOut' }, 0.3)
    .from(q('.lp-map__poi'), { scale: 0, transformOrigin: '50% 50%', duration: 0.4, stagger: 0.1, ease: 'back.out(3)' }, 0.8)
    .from(q('.lp-queue li'), { x: -16, autoAlpha: 0, duration: 0.5, stagger: 0.12 }, 0.9)
    .from(q('.lp-map__incident'), { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(3)' }, 1.0);

  if (route && unit) {
    tl.from(route, { drawSVG: 0, duration: 1.4, ease: 'power2.inOut' }, 1.1);

    // The unit keeps driving to the incident: a calm, looping "live" signal.
    gsap.to(unit, {
      motionPath: { path: route as SVGPathElement, align: route as SVGPathElement, alignOrigin: [0.5, 0.5] },
      duration: 6,
      ease: 'sine.inOut',
      repeat: -1,
      repeatDelay: 1.2,
      delay: 2.4,
    });
  }

  // Gentle depth while scrolling past the hero (scrub only, never blocks scrolling).
  gsap.to(panel, {
    yPercent: -6,
    ease: 'none',
    scrollTrigger: { trigger: '.lp-hero', start: 'top top', end: 'bottom top', scrub: 0.6 },
  });
}

function animateSectionHeads(q: Selector): void {
  for (const head of q('.lp-head')) {
    const trigger = { trigger: head, start: 'top 82%', once: true };
    const title = head.querySelector('h2');
    const tl = gsap.timeline({ defaults: { ease: EASE_OUT }, scrollTrigger: trigger });

    tl.fromTo(head.querySelector('.eyebrow'), { y: 10, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5 });
    const lead = head.querySelector('p');
    if (lead) {
      tl.fromTo(lead, { y: 12, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6 }, 0.35);
    }
    if (title) {
      // Returned from onSplit so SplitText can revert and replay it when it re-splits on resize.
      SplitText.create(title, {
        type: 'lines,words',
        mask: 'lines',
        autoSplit: true,
        onSplit: (self) =>
          gsap.from(self.words, {
            yPercent: 110,
            duration: 0.8,
            stagger: 0.035,
            ease: 'power4.out',
            delay: 0.1,
            scrollTrigger: trigger,
          }),
      });
    }
  }
}

function animateFlow(q: Selector, wide: boolean): void {
  const steps = q('.lp-flow__step');
  if (!steps.length) return;

  if (!wide) {
    gsap.from(steps, {
      y: 20,
      autoAlpha: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: EASE_OUT,
      scrollTrigger: { trigger: '.lp-flow', start: 'top 85%', once: true },
    });
    return;
  }

  // Desktop: the circuit "fills" as the reader scrolls through it, step by step.
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: '.lp-flow', start: 'top 75%', end: 'bottom 45%', scrub: 0.8 },
  });
  tl.fromTo(q('.lp-flow__progress'), { scaleX: 0 }, { scaleX: 1, duration: steps.length });
  steps.forEach((step, i) => {
    tl.from(step, { autoAlpha: 0.25, y: 10, duration: 0.6 }, i)
      .from(step.querySelector('.lp-flow__pulse'), { scale: 0, autoAlpha: 0, duration: 0.4 }, i);
  });
}

function animateModules(q: Selector): void {
  const cards = q('.lp-module');
  if (!cards.length) return;
  gsap.set(cards, { autoAlpha: 0, y: 28 });

  ScrollTrigger.batch(cards, {
    start: 'top 88%',
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.09, ease: EASE_OUT, clearProps: 'transform' });
      gsap.from(
        batch.map((card) => card.querySelector('.lp-module__icon')),
        { scale: 0.4, rotate: -12, duration: 0.6, stagger: 0.09, ease: 'back.out(2.4)', delay: 0.15 },
      );
    },
  });
}

function animateRoles(q: Selector): void {
  const rows = q('.lp-roles__list li');
  if (!rows.length) return;
  const tl = gsap.timeline({
    defaults: { ease: EASE_OUT },
    scrollTrigger: { trigger: '.lp-roles__list', start: 'top 80%', once: true },
  });
  tl.from(rows.map((r) => r.querySelector('.lp-roles__role')), { x: -14, autoAlpha: 0, duration: 0.5, stagger: 0.1 })
    .from(rows.map((r) => r.querySelector('.lp-roles__line')), { scaleX: 0, transformOrigin: 'left center', duration: 0.6, stagger: 0.1 }, 0.15)
    .from(rows.map((r) => r.querySelector('.lp-roles__screen')), { x: 10, autoAlpha: 0, duration: 0.5, stagger: 0.1 }, 0.45);
}

function animateSecurity(q: Selector): void {
  const items = q('.lp-security__item');
  if (!items.length) return;
  const tl = gsap.timeline({
    defaults: { ease: EASE_OUT },
    scrollTrigger: { trigger: '.lp-security', start: 'top 82%', once: true },
  });
  tl.from(items, { y: 18, autoAlpha: 0, duration: 0.6, stagger: 0.1 })
    .from(q('.lp-security__shield'), { drawSVG: 0, duration: 0.8, stagger: 0.1, ease: 'power2.inOut' }, 0.1)
    .from(q('.lp-security__check'), { drawSVG: 0, duration: 0.4, stagger: 0.1 }, 0.6);
}

function animateCta(q: Selector): void {
  const [cta] = q('.lp-cta');
  if (!cta) return;
  gsap.fromTo(
    cta,
    { y: 30, scale: 0.97, autoAlpha: 0 },
    {
      y: 0,
      scale: 1,
      autoAlpha: 1,
      duration: 0.9,
      ease: EASE_OUT,
      scrollTrigger: { trigger: cta, start: 'top 85%', once: true },
    },
  );
}
