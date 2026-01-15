import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ConfigService } from './config.service';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  animations: boolean;
  fontSize: 'small' | 'medium' | 'large';
  colorScheme: 'default' | 'blue' | 'green' | 'purple' | 'orange';
  language: 'it' | 'en';
  
  sidebarCollapsed: boolean;
  showNotifications: boolean;
  autoRefreshInterval: number;
  defaultPageSize: number;
  
  defaultDateRange: 'today' | 'week' | 'month' | 'year';
  favoriteFilters: string[];
  savedSearches: SavedSearch[];
  
  developerMode: boolean;
  debugMode: boolean;
  experimentalFeatures: boolean;
  apiEndpoint: string;
  
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  keyboardNavigation: boolean;
}

export interface SearchFilters {
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  createdAt: Date;
}

export interface UsageStats {
  themeUsage: 'light' | 'dark' | 'system';
  featuresEnabled: {
    compactMode: boolean;
    animations: boolean;
    developerMode: boolean;
    debugMode: boolean;
    experimentalFeatures: boolean;
  };
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
    keyboardNavigation: boolean;
  };
  dataUsage: {
    autoRefreshInterval: number;
    defaultPageSize: number;
    savedSearchesCount: number;
    favoriteFiltersCount: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserPreferencesService {
  private readonly STORAGE_KEY = 'edc-client-participant-preferences';
  private readonly THEME_KEY = 'edc-client-participant-theme';
  private configService = inject(ConfigService);
  
  private readonly defaultPreferences: UserPreferences = {
    theme: 'system',
    compactMode: false,
    animations: true,
    fontSize: 'medium',
    colorScheme: 'default',
    language: 'en',
    
    sidebarCollapsed: false,
    showNotifications: true,
    autoRefreshInterval: 30,
    defaultPageSize: 10,
    
    defaultDateRange: 'week',
    favoriteFilters: [],
    savedSearches: [],
    
    developerMode: false,
    debugMode: false,
    experimentalFeatures: false,
    apiEndpoint: this.configService.config?.apiUrl || 'http://localhost:3001/v1',
    
    highContrast: false,
    reducedMotion: false,
    screenReader: false,
    keyboardNavigation: false
  };

  private preferencesSubject = new BehaviorSubject<UserPreferences>(this.loadPreferences());

  constructor() {
    const themeFromStorage = localStorage.getItem(this.THEME_KEY);
    if (themeFromStorage && themeFromStorage !== this.preferencesSubject.value.theme) {
      const prefs = { ...this.preferencesSubject.value, theme: themeFromStorage as 'light' | 'dark' | 'system' };
      this.preferencesSubject.next(prefs);
      this.savePreferences(prefs);
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      if (this.preferencesSubject.value.theme === 'system') {
        this.applyTheme('system');
      }
    });

    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEY && e.newValue) {
        try {
          const newPreferences = JSON.parse(e.newValue);
          this.preferencesSubject.next(newPreferences);
          this.applyPreferences(newPreferences);
        } catch (error) {
          console.error('Error parsing preferences from storage:', error);
        }
      }
      if (e.key === this.THEME_KEY && e.newValue) {
        const prefs = { ...this.preferencesSubject.value, theme: e.newValue as 'light' | 'dark' | 'system' };
        this.preferencesSubject.next(prefs);
        this.savePreferences(prefs);
        this.applyPreferences(prefs);
      }
    });

    this.applyPreferences(this.preferencesSubject.value);
  }

  get preferences$(): Observable<UserPreferences> {
    return this.preferencesSubject.asObservable();
  }

  get currentPreferences(): UserPreferences {
    return this.preferencesSubject.value;
  }

  private loadPreferences(): UserPreferences {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.defaultPreferences, ...parsed };
      }
    } catch (error) {
      console.error('Error loading preferences from localStorage:', error);
    }
    return this.defaultPreferences;
  }

  private savePreferences(preferences: UserPreferences): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences to localStorage:', error);
    }
  }

  updatePreferences(updates: Partial<UserPreferences>): void {
    const newPreferences = { ...this.preferencesSubject.value, ...updates };
    this.savePreferences(newPreferences);
    this.preferencesSubject.next(newPreferences);
    this.applyPreferences(newPreferences);
  }

  resetPreferences(): void {
    const defaultPrefs = { ...this.defaultPreferences };
    this.savePreferences(defaultPrefs);
    this.preferencesSubject.next(defaultPrefs);
    this.applyPreferences(defaultPrefs);
  }

  exportPreferences(): string {
    return JSON.stringify(this.currentPreferences, null, 2);
  }

  importPreferences(preferencesJson: string): boolean {
    try {
      const imported = JSON.parse(preferencesJson);
      if (typeof imported === 'object' && imported !== null) {
        const mergedPreferences = { ...this.defaultPreferences, ...imported };
        this.updatePreferences(mergedPreferences);
        return true;
      }
    } catch (error) {
      console.error('Error importing preferences:', error);
    }
    return false;
  }

  addSavedSearch(name: string, query: string, filters: SearchFilters): void {
    const savedSearch: SavedSearch = {
      id: Date.now().toString(),
      name,
      query,
      filters,
      createdAt: new Date()
    };
    
    const currentSearches = this.currentPreferences.savedSearches;
    this.updatePreferences({
      savedSearches: [...currentSearches, savedSearch]
    });
  }

  removeSavedSearch(id: string): void {
    const currentSearches = this.currentPreferences.savedSearches;
    this.updatePreferences({
      savedSearches: currentSearches.filter(search => search.id !== id)
    });
  }

  addFavoriteFilter(filter: string): void {
    const currentFilters = this.currentPreferences.favoriteFilters;
    if (!currentFilters.includes(filter)) {
      this.updatePreferences({
        favoriteFilters: [...currentFilters, filter]
      });
    }
  }

  removeFavoriteFilter(filter: string): void {
    const currentFilters = this.currentPreferences.favoriteFilters;
    this.updatePreferences({
      favoriteFilters: currentFilters.filter(f => f !== filter)
    });
  }

  private applyPreferences(preferences: UserPreferences): void {
    this.applyTheme(preferences.theme);
    localStorage.setItem(this.THEME_KEY, preferences.theme);
    this.applyFontSize(preferences.fontSize);
    this.applyAnimations(preferences.animations);
    this.applyHighContrast(preferences.highContrast);
    this.applyReducedMotion(preferences.reducedMotion);
    this.applyColorScheme(preferences.colorScheme);
  }
  
  private applyTheme(theme: 'light' | 'dark' | 'system'): void {
    const html = document.documentElement;
    
    html.classList.remove('dark');
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        html.classList.add('dark');
      }
    } else if (theme === 'dark') {
      html.classList.add('dark');
    }
    
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      metaThemeColor.setAttribute('content', isDark ? '#1f2937' : '#ffffff');
    }
  }

  private applyFontSize(fontSize: 'small' | 'medium' | 'large'): void {
    const html = document.documentElement;
    html.classList.remove('text-sm', 'text-base', 'text-lg');
    
    switch (fontSize) {
      case 'small':
        html.classList.add('text-sm');
        break;
      case 'large':
        html.classList.add('text-lg');
        break;
      default:
        html.classList.add('text-base');
    }
  }

  private applyAnimations(enabled: boolean): void {
    const html = document.documentElement;
    if (!enabled) {
      html.style.setProperty('--animation-duration', '0s');
      html.style.setProperty('--transition-duration', '0s');
    } else {
      html.style.removeProperty('--animation-duration');
      html.style.removeProperty('--transition-duration');
    }
  }

  private applyHighContrast(enabled: boolean): void {
    document.documentElement.classList.toggle('high-contrast', enabled);
  }

  private applyReducedMotion(enabled: boolean): void {
    document.documentElement.classList.toggle('reduce-motion', enabled);
  }

  private applyColorScheme(scheme: string): void {
    const html = document.documentElement;
    html.classList.remove('scheme-blue', 'scheme-green', 'scheme-purple', 'scheme-orange');
    
    if (scheme !== 'default') {
      html.classList.add(`scheme-${scheme}`);
    }
  }

  getUsageStats(): UsageStats {
    const preferences = this.currentPreferences;
    return {
      themeUsage: preferences.theme,
      featuresEnabled: {
        compactMode: preferences.compactMode,
        animations: preferences.animations,
        developerMode: preferences.developerMode,
        debugMode: preferences.debugMode,
        experimentalFeatures: preferences.experimentalFeatures
      },
      accessibility: {
        highContrast: preferences.highContrast,
        reducedMotion: preferences.reducedMotion,
        screenReader: preferences.screenReader,
        keyboardNavigation: preferences.keyboardNavigation
      },
      dataUsage: {
        autoRefreshInterval: preferences.autoRefreshInterval,
        defaultPageSize: preferences.defaultPageSize,
        savedSearchesCount: preferences.savedSearches.length,
        favoriteFiltersCount: preferences.favoriteFilters.length
      }
    };
  }
}
