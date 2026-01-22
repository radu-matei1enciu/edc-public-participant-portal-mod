import { Injectable, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthUser, UserProfile } from '../models/participant.model';
import { SelectedParticipant } from '../models/auth.model';
import {ConfigService} from "./config.service";

const SELECTED_PARTICIPANT_KEY = 'selected_participant';

@Injectable({
  providedIn: 'root'
})
export class AuthService implements OnDestroy {
  private readonly router = inject(Router);

  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private readonly destroySubject = new Subject<void>();
  private readonly configService = inject(ConfigService);

  readonly currentUser$ = this.currentUserSubject.asObservable().pipe(distinctUntilChanged());

  constructor() {
    this.loadSelectedParticipant();
  }

  private loadSelectedParticipant(): void {
    const stored = localStorage.getItem(SELECTED_PARTICIPANT_KEY);
    if (stored) {
      try {
        const selected: SelectedParticipant = JSON.parse(stored);
        this.updateAuthState(selected);
      } catch {
        this.clearAuthState();
      }
    } else {
      this.clearAuthState();
    }
  }

  private updateAuthState(selected: SelectedParticipant): void {
    const user: AuthUser = {
      id: selected.participantId.toString(),
      username: selected.participantIdentifier,
      email: '',
      token: '',
      roles: []
    };
    this.currentUserSubject.next(user);
    this.isAuthenticatedSubject.next(true);
  }

  private clearAuthState(): void {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  getSelectedParticipant(): SelectedParticipant | null {
    const stored = localStorage.getItem(SELECTED_PARTICIPANT_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  setSelectedParticipant(selected: SelectedParticipant): void {
    localStorage.setItem(SELECTED_PARTICIPANT_KEY, JSON.stringify(selected));
    this.updateAuthState(selected);
  }

  getTenantId(): number | null {
    const selected = this.getSelectedParticipant();
    return selected?.tenantId || null;
  }

  getParticipantId(): number | null {
    const selected = this.getSelectedParticipant();
    return selected?.participantId || null;
  }

  getCurrentUserIds(): { providerId: number; tenantId: number; participantId: number } | null {
    const providerId = this.configService.config?.defaultServiceProviderId || 1;
    const tenantId = this.getTenantId();
    const participantId = this.getParticipantId();

    if (!tenantId || !participantId) {
      return null;
    }

    return { providerId, tenantId, participantId };
  }

  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return null;
  }

  getPostLoginBehavior(): 'admin-portal' | 'user-dashboard' {
    return 'user-dashboard';
  }

  login(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    localStorage.removeItem(SELECTED_PARTICIPANT_KEY);
    this.clearAuthState();
    this.router.navigate(['/']);
  }

  loadUserProfile(): Observable<UserProfile> {
    const selected = this.getSelectedParticipant();
    if (!selected) {
      return of({} as UserProfile);
    }

    const profile: UserProfile = {
      user: {
        id: selected.participantId.toString(),
        username: selected.participantIdentifier,
        metadata: {},
        createdAt: '',
        updatedAt: ''
      },
      participant: {
        id: selected.participantId,
        name: selected.tenantName,
        description: '',
        currentOperation: 'ACTIVE',
        metadata: {},
        createdAt: '',
        updatedAt: '',
        identifier: selected.participantIdentifier
      }
    };

    return of(profile);
  }

  ngOnDestroy(): void {
    this.destroySubject.next();
    this.destroySubject.complete();
    this.currentUserSubject.complete();
    this.isAuthenticatedSubject.complete();
  }
}
