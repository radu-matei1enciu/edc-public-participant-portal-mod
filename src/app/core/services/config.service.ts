import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface KeycloakInitOptions {
  onLoad?: 'login-required' | 'check-sso';
  checkLoginIframe?: boolean;
  pkceMethod?: 'S256';
  storageKey?: string;
  enableLogging?: boolean;
  flow?: 'standard' | 'implicit' | 'hybrid';
  adapter?: 'default' | 'cordova' | 'cordova-native';
  redirectUri?: string;
  silentCheckSsoRedirectUri?: string;
  checkLoginIframeInterval?: number;
  responseMode?: 'query' | 'fragment';
  timeSkew?: number;
}

export interface AppConfig {
  production: boolean;
  apiUrl: string;
  appName: string;
  version: string;
  features: {
    enableMockData: boolean;
    enableAnalytics: boolean;
    enableDebugMode: boolean;
    enableDevMode: boolean;
  };
  auth: {
    enableAuth: boolean;
    tokenKey: string;
    roles?: {
      admin: string;
      participant: string;
      validRoles: string[];
    };
    keycloak?: {
      url: string;
      realm: string;
      clientId: string;
      initOptions: {
        onLoad: 'login-required' | 'check-sso';
        checkLoginIframe: boolean;
        pkceMethod: 'S256';
        storageKey?: string;
      };
      bearerExcludedUrls: string[];
    };
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
        if (config.auth?.keycloak?.initOptions) {
          config.auth.keycloak.initOptions.storageKey = this.getStorageKey();
        }
        this.configSubject.next(config);
        this.configLoaded = true;
      }),
      catchError(error => {
        const fallbackConfig: AppConfig = {
          production: false,
          apiUrl: 'http://localhost:3001/v1',
          appName: 'EDC Participant Portal',
          version: '1.0.0',
          features: {
            enableMockData: true,
            enableAnalytics: false,
            enableDebugMode: true,
            enableDevMode: true
          },
          auth: {
            enableAuth: false,
            tokenKey: 'auth_token',
            roles: {
              admin: 'EDC_ADMIN',
              participant: 'EDC_USER_PARTICIPANT',
              validRoles: ['EDC_ADMIN', 'EDC_USER_PARTICIPANT']
            },
            keycloak: {
              url: 'http://localhost:8080',
              realm: 'edc',
              clientId: 'edc-participant-portal',
              initOptions: {
                onLoad: 'check-sso',
                checkLoginIframe: false,
                pkceMethod: 'S256',
                storageKey: this.getStorageKey()
              },
              bearerExcludedUrls: ['/assets']
            }
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
    return this.config?.apiUrl || 'http://localhost:3001/v1';
  }

  private getStorageKey(): string {
    const clientId = 'edc-customers';
    return `kc-${clientId}`;
  }
}
