import { Injectable, inject, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, timer, Subject, from, of } from 'rxjs';
import { map, catchError, takeUntil, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { KeycloakService } from 'keycloak-angular';
import { AuthUser, UserProfile } from '../models/participant.model';
import { ConfigService } from './config.service';

interface KeycloakRealmAccess {
  roles: string[];
}

interface KeycloakResourceAccess {
  roles: string[];
}

interface KeycloakTokenParsed {
  realm_access?: KeycloakRealmAccess;
  resource_access?: Record<string, KeycloakResourceAccess>;
  sub?: string;
  email?: string;
  preferred_username?: string;
  exp?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly configService = inject(ConfigService);
  private readonly keycloakService = inject(KeycloakService);

  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private readonly destroySubject = new Subject<void>();

  readonly currentUser$ = this.currentUserSubject.asObservable().pipe(distinctUntilChanged());

  async initializeAuth(): Promise<void> {
    try {
      await this.syncAuthState();
      this.startTokenRefreshTimer();
    } catch (error) {
      this.handleAuthError('Auth initialization failed', error);
    }
  }

  private async syncAuthState(): Promise<void> {
    try {
      const isLoggedIn = this.keycloakService.isLoggedIn();
      this.isAuthenticatedSubject.next(isLoggedIn);

      if (isLoggedIn) {
        this.loadUserFromKeycloak();
      } else {
        this.currentUserSubject.next(null);
      }
    } catch (error) {
      this.handleAuthError('Auth state sync failed', error);
    }
  }

  private loadUserFromKeycloak(): void {
    try {
      const tokenParsed = this.keycloakService.getKeycloakInstance().tokenParsed;

      if (tokenParsed) {
        const user: AuthUser = {
          id: tokenParsed.sub || '',
          username: tokenParsed['preferred_username'] || '',
          email: tokenParsed['email'] || '',
          token: this.keycloakService.getKeycloakInstance().token || '',
          roles: this.getRolesFromToken(tokenParsed)
        };

        this.currentUserSubject.next(user);
      }
    } catch (error) {
      console.error('Error loading user from Keycloak:', error);
      this.currentUserSubject.next(null);
    }
  }

  private getRolesFromToken(tokenParsed: KeycloakTokenParsed): string[] {
    const roles: string[] = [];

    try {
      if (tokenParsed.realm_access?.roles) {
        roles.push(...tokenParsed.realm_access.roles);
      }

      if (tokenParsed.resource_access) {
        Object.values(tokenParsed.resource_access).forEach((resource: KeycloakResourceAccess) => {
          if (resource.roles) {
            roles.push(...resource.roles);
          }
        });
      }
    } catch (error) {
      console.error('Error extracting roles from token:', error);
    }

    return roles;
  }

  private startTokenRefreshTimer(): void {
    timer(0, 5 * 60 * 1000)
        .pipe(takeUntil(this.destroySubject))
        .subscribe(() => {
          if (this.isAuthenticatedSync()) {
            this.refreshTokenSilently();
          }
        });
  }

  private refreshTokenSilently(): void {
    try {
      const keycloakInstance = this.keycloakService.getKeycloakInstance();
      const tokenPromise = keycloakInstance.updateToken(30);

      (tokenPromise as Promise<boolean>)
          .then((refreshed: boolean) => {
            if (refreshed) {
              this.loadUserFromKeycloak();
            }
          })
          .catch((error: unknown) => {
            this.logout();
          });
    } catch (error) {
      console.error('Token refresh error:', error);
    }
  }

  isAuthEnabled(): boolean {
    return this.configService.config?.auth?.enableAuth || false;
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  isAuthenticatedSync(): boolean {
    return this.isAuthenticated();
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    try {
      return this.keycloakService.getKeycloakInstance().token || null;
    } catch {
      return null;
    }
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    const adminRole = this.configService.config?.auth?.roles?.admin || 'EDC_ADMIN';
    return user?.roles?.includes(adminRole) || false;
  }

  isParticipant(): boolean {
    const user = this.getCurrentUser();
    const participantRole = this.configService.config?.auth?.roles?.participant || 'EDC_USER_PARTICIPANT';
    return user?.roles?.includes(participantRole) || false;
  }

  hasValidRoles(): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.roles || user.roles.length === 0) {
      return false;
    }

    const validRoles = this.configService.config?.auth?.roles?.validRoles || ['EDC_ADMIN', 'EDC_USER_PARTICIPANT'];
    return validRoles.some(role => user.roles.includes(role));
  }

  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.roles) return false;
    return roles.some(role => user.roles.includes(role));
  }

  getRoleError(): string | null {
    const user = this.getCurrentUser();
    if (!user) {
      return 'No user found';
    }

    if (!user.roles || user.roles.length === 0) {
      return 'No roles assigned to user';
    }

    const validRoles = this.configService.config?.auth?.roles?.validRoles || ['EDC_ADMIN', 'EDC_USER_PARTICIPANT'];
    const hasValidRole = validRoles.some(role => user.roles.includes(role));

    if (!hasValidRole) {
      return `Invalid roles: ${user.roles.join(', ')}. Expected: ${validRoles.join(' or ')}`;
    }

    return null;
  }

  getPostLoginBehavior(): 'admin-portal' | 'user-dashboard' {
    if (this.isAdmin()) {
      return 'admin-portal';
    } else if (this.isParticipant()) {
      return 'user-dashboard';
    }
    return 'admin-portal';
  }

  login(): Observable<boolean> {
    return from(this.keycloakService.login()).pipe(
        switchMap(() => from(this.syncAuthState())),
        map(() => this.isAuthenticatedSync()),
        catchError(error => {
          console.error('Login failed:', error);
          return of(false);
        })
    );
  }

  logout(): Promise<void> {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);

    const redirectUrl = `${window.location.origin}/customers/`;

    return this.keycloakService.logout(redirectUrl);
  }


  loadUserProfile(): Observable<UserProfile> {
    const apiUrl = this.configService.config?.apiUrl || 'http://localhost:3001';
    return this.http.get<UserProfile>(`${apiUrl}/participants/me`);
  }

  private handleAuthError(message: string, error: unknown): void {
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
  }

  ngOnDestroy(): void {
    this.destroySubject.next();
    this.destroySubject.complete();
    this.currentUserSubject.complete();
    this.isAuthenticatedSubject.complete();
  }
}
