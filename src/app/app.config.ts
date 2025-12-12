import { ApplicationConfig, importProvidersFrom, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';
import { KeycloakService } from 'keycloak-angular';

import { routes } from './app.routes';
import { ConfigService } from './core/services/config.service';
import { AuthService } from './core/services/auth.service';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { keycloakFactory } from './core/init/keycloak-init.factory';

export function configFactory(configService: ConfigService) {
  return () => configService.loadConfig().toPromise();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    ConfigService,
    AuthService,
    provideAppInitializer(() => {
        const configService = inject(ConfigService);
        const authService = inject(AuthService);
        const keycloakService = inject(KeycloakService);
        
        return configService.loadConfig().toPromise().then(() => {
          if (authService.isAuthEnabled()) {
            const keycloakConfig = {
              config: {
                url: configService.getNestedValue('auth.keycloak.url'),
                realm: configService.getNestedValue('auth.keycloak.realm'),
                clientId: configService.getNestedValue('auth.keycloak.clientId')
              },
              initOptions: configService.getNestedValue('auth.keycloak.initOptions') || {}
            };
            
            return keycloakService.init(keycloakConfig).then(() => {
              authService.initializeAuth();
              return Promise.resolve();
            }).catch((error) => {
              throw error;
            });
          } else {
            return Promise.resolve();
          }
        }).catch((error) => {
          throw error;
        });
      }),
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: ErrorInterceptor,
      multi: true
    },
    ...keycloakFactory()
  ]
};
