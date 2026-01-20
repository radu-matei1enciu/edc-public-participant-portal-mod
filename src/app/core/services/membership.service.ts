import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Membership } from '../models/membership.model';
import { ConfigService } from './config.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class MembershipService {
  private http = inject(HttpClient);
  private configService = inject(ConfigService);
  private authService = inject(AuthService);

  private get baseUrl(): string {
    return this.configService.config?.apiUrl || 'http://localhost:3001/api/ui';
  }

  private getIds(): { providerId: number; tenantId: number; participantId: number } | null {
    const providerId = this.configService.config?.defaultServiceProviderId || 1;
    const tenantId = this.authService.getTenantId();
    const participantId = this.authService.getParticipantId();

    if (!tenantId || !participantId) {
      return null;
    }

    return { providerId, tenantId, participantId };
  }

  getMemberships(): Observable<Membership[]> {
    const ids = this.getIds();
    if (!ids) {
      return of([]);
    }

    return this.http.get<Membership[]>(
      `${this.baseUrl}/service-providers/${ids.providerId}/tenants/${ids.tenantId}/participants/${ids.participantId}/memberships`
    ).pipe(
      catchError(() => of([]))
    );
  }

  getMembershipDetails(membershipId: string): Observable<Membership> {
    const ids = this.getIds();
    if (!ids) {
      return of({} as Membership);
    }

    return this.http.get<Membership>(
      `${this.baseUrl}/service-providers/${ids.providerId}/tenants/${ids.tenantId}/participants/${ids.participantId}/memberships/${membershipId}`
    ).pipe(
      catchError(() => {
        throw new Error('Failed to load membership details');
      })
    );
  }
}
