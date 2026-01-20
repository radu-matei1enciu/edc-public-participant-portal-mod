import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface AppConfig {
  production: boolean;
  apiUrl: string;
  defaultServiceProviderId?: number;
  appName: string;
  version: string;
  features: {
    enableMockData: boolean;
    enableAnalytics: boolean;
    enableDebugMode: boolean;
    enableDevMode: boolean;
  };
  upload?: {
    maxFileSize: number;
    allowedFileTypes: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private http = inject(HttpClient);
  private configSubject = new BehaviorSubject<AppConfig | null>(null);
  private configLoaded = false;

  get config(): AppConfig | null {
    return this.configSubject.value;
  }

  loadConfig(): Observable<AppConfig> {
    if (this.configLoaded) {
      return of(this.config!);
    }

    return this.http.get<AppConfig>(document.baseURI +'assets/config/config.json').pipe(
      tap(config => {
        this.configSubject.next(config);
        this.configLoaded = true;
      }),
      catchError(() => {
        const fallbackConfig: AppConfig = {
          production: false,
          apiUrl: 'http://localhost:3001/api/ui',
          defaultServiceProviderId: 1,
          appName: 'EDC Participant Portal',
          version: '1.0.0',
          features: {
            enableMockData: true,
            enableAnalytics: false,
            enableDebugMode: true,
            enableDevMode: true
          }
        };
        this.configSubject.next(fallbackConfig);
        this.configLoaded = true;
        return of(fallbackConfig);
      })
    );
  }

  getNestedValue<T = unknown>(path: string): T | null {
    const keys = path.split('.');
    let value: unknown = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && value !== null && key in value) {
        value = (value as { [key: string]: unknown })[key];
      } else {
        return null;
      }
    }

    return value as T;
  }

  getApiUrl(): string {
    return this.config?.apiUrl || 'http://localhost:3001/api/ui';
  }
}
