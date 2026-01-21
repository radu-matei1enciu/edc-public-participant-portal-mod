import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi, HTTP_INTERCEPTORS } from '@angular/common/http';

import { routes } from './app.routes';
import { ConfigService } from './core/services/config.service';
import { AuthService } from './core/services/auth.service';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { ErrorInterceptor } from './core/interceptors/error.interceptor';
import { keycloakFactory } from './core/init/keycloak-init.factory';
import {Configuration, provideApi} from "./core/redline";

export function configFactory(configService: ConfigService) {
  return () => configService.loadConfig().toPromise();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: Configuration,
      useFactory: () => {
        const configService = inject(ConfigService);
        return new Configuration({
          basePath: configService.getNestedValue<string>('redlineUrl') || 'http://redline.localhost'
        })
      }
    },
    ConfigService,
    AuthService,
    provideAppInitializer(() => {
        const configService = inject(ConfigService);
        return configService.loadConfig().toPromise();
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
    }
  ]
};
