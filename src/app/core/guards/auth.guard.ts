import { Injectable, inject } from '@angular/core';
import { CanActivate, CanActivateChild, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { KeycloakService } from 'keycloak-angular';
import { AuthService } from '../services/auth.service';
import { ConfigService } from '../services/config.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  private keycloakService = inject(KeycloakService);
  private authService = inject(AuthService);
  private configService = inject(ConfigService);
  private router = inject(Router);

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkAuth(route, state);
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkAuth(route, state);
  }

  private checkAuth(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    if (!this.authService.isAuthEnabled()) {
      return of(true);
    }

    const isLoggedIn = this.keycloakService.isLoggedIn();
    return of(isLoggedIn).pipe(
      switchMap(isLoggedIn => {
        if (!isLoggedIn) {
          this.redirectToLogin(state.url);
          return of(false);
        }

        const requiredRoles = route.data['roles'] as string[];
        if (requiredRoles && requiredRoles.length > 0) {
          const hasRequiredRole = this.authService.hasAnyRole(requiredRoles);
          if (!hasRequiredRole) {
            this.router.navigate(['/unauthorized']);
            return of(false);
          }
        }

        return of(true);
      }),
      catchError(() => {
        this.redirectToLogin(state.url);
        return of(false);
      })
    );
  }

  private redirectToLogin(returnUrl: string): void {
    if (returnUrl && returnUrl !== '/') {
      localStorage.setItem('returnUrl', returnUrl);
    }

    const redirectUrl = `${window.location.origin}/customers/`;

    this.keycloakService.login({
      redirectUri: redirectUrl
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  private authService = inject(AuthService);

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const requiredRoles = route.data['roles'] as string[];
    
    if (!requiredRoles || requiredRoles.length === 0) {
      return of(true);
    }

    if (!this.authService.isAuthEnabled()) {
      return of(true);
    }

    const hasRequiredRole = this.authService.hasAnyRole(requiredRoles);
    return of(hasRequiredRole);
  }
}
