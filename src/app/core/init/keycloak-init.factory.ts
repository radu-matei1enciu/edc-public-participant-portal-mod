import { KeycloakService } from 'keycloak-angular';
import { KeycloakInitOptions } from 'keycloak-js';
import { ConfigService } from '../services/config.service';
import { Provider } from '@angular/core';

let refreshInterval: any = null;

export function stopTokenRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

export function keycloakFactory(): Provider[] {
  return [
    KeycloakService
  ];
}
