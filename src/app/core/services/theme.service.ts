import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'edc-client-participant-theme';
  private themeSubject = new BehaviorSubject<Theme>('system');
  private currentTheme$ = this.themeSubject.asObservable();

  constructor() {
    this.initializeTheme();
    this.listenToSystemTheme();
  }

  get theme$(): Observable<Theme> {
    return this.currentTheme$;
  }

  get currentTheme(): Theme {
    return this.themeSubject.value;
  }

  setTheme(theme: Theme): void {
    this.themeSubject.next(theme);
    localStorage.setItem(this.THEME_KEY, theme);
    this.applyTheme(theme);
  }

  toggleTheme(): void {
    const currentTheme = this.themeSubject.value;
    let newTheme: Theme;
    
    if (currentTheme === 'system') {
      newTheme = this.getSystemTheme() === 'dark' ? 'light' : 'dark';
    } else {
      newTheme = currentTheme === 'light' ? 'dark' : 'light';
    }
    
    this.setTheme(newTheme);
  }

  private getSystemTheme(): 'light' | 'dark' {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  private initializeTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme || 'system';
    this.themeSubject.next(savedTheme);
    this.applyTheme(savedTheme);
  }

  private applyTheme(theme: Theme): void {
    const htmlElement = document.documentElement;
    const isDark = theme === 'dark' || (theme === 'system' && this.getSystemTheme() === 'dark');
    
    if (isDark) {
      htmlElement.classList.add('dark');
    } else {
      htmlElement.classList.remove('dark');
    }

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#1f2937' : '#ffffff');
    }
  }

  private listenToSystemTheme(): void {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    mediaQuery.addEventListener('change', (e) => {
      if (this.themeSubject.value === 'system') {
        this.applyTheme('system');
      }
    });
  }

  getEffectiveTheme(): 'light' | 'dark' {
    const theme = this.themeSubject.value;
    if (theme === 'system') {
      return this.getSystemTheme();
    }
    return theme;
  }

  isDark(): boolean {
    return this.getEffectiveTheme() === 'dark';
  }

  isLight(): boolean {
    return this.getEffectiveTheme() === 'light';
  }
}
