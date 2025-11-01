import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  currentTheme = signal<Theme>('light');
  private prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    this.initializeTheme();

    // Listen for system theme changes
    this.prefersDark.addEventListener('change', (e) => {
      // Only update if no preference is saved
      if (localStorage.getItem('silabala_theme') === null) {
        this.setTheme(e.matches ? 'dark' : 'light', false);
      }
    });

    // Effect to update body class
    effect(() => {
      document.body.classList.toggle('dark-theme', this.currentTheme() === 'dark');
    });
  }

  private initializeTheme() {
    if (typeof localStorage === 'undefined') {
        this.currentTheme.set(this.prefersDark.matches ? 'dark' : 'light');
        return;
    }
    const savedTheme = localStorage.getItem('silabala_theme') as Theme | null;
    if (savedTheme) {
      this.currentTheme.set(savedTheme);
    } else {
      this.currentTheme.set(this.prefersDark.matches ? 'dark' : 'light');
    }
  }

  setTheme(theme: Theme, savePreference: boolean = true) {
    this.currentTheme.set(theme);
    if (savePreference && typeof localStorage !== 'undefined') {
      localStorage.setItem('silabala_theme', theme);
    }
  }

  toggleTheme() {
    this.currentTheme.update(current => {
        const newTheme = current === 'light' ? 'dark' : 'light';
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('silabala_theme', newTheme);
        }
        return newTheme;
    });
  }
}
