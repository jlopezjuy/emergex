import { Injectable, signal, effect } from '@angular/core';

type Theme = 'dark' | 'light';
const THEME_KEY = 'emergex_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _theme = signal<Theme>(
    (localStorage.getItem(THEME_KEY) as Theme) ?? 'dark',
  );

  readonly theme = this._theme.asReadonly();

  constructor() {
    effect(() => {
      const t = this._theme();
      document.documentElement.setAttribute('data-theme', t);
      localStorage.setItem(THEME_KEY, t);
    });
    // Apply immediately on service init
    document.documentElement.setAttribute('data-theme', this._theme());
  }

  toggleTheme(): void {
    this._theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  setTheme(theme: Theme): void {
    this._theme.set(theme);
  }
}
