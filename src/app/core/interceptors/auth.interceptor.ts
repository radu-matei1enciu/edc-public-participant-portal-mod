import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { KeycloakService } from 'keycloak-angular';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private keycloakService = inject(KeycloakService);
  private authService = inject(AuthService);

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const headers: { [key: string]: string } = {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };

    if (this.authService.isAuthEnabled() && this.authService.isAuthenticatedSync()) {
      const token = this.authService.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const authReq = req.clone({
      setHeaders: headers
    });

    return next.handle(authReq);
  }
}
